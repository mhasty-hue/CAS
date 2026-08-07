import type {
  AppraisalReportVersion,
  ComparableSaleSummary,
  ExtractedField,
  FieldVerificationStatus,
  IngestionSourceFile,
  NormalizedAppraisalReport,
  ReportAttachmentSummary,
  ReportFileKind,
  ReportIngestionRequest,
  ReportIngestionResult,
  ReviewAssetKind,
  ReviewProfile
} from "@/types/report-review";
import { resolveAiReviewProvider } from "@/lib/report-review/ai-provider";
import { selectReportProfile, selectReviewOverlays } from "@/lib/report-review/profiles";
import { runDeterministicReview, summarizeReviewFindings } from "@/lib/report-review/rules";

const maxReportUploadBytes = 100 * 1024 * 1024;
const demoCreatedAt = "2026-07-27T12:00:00Z";

export function identifyReportFileKind(fileName: string, mimeType: string): ReportFileKind {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType.toLowerCase();
  if (lowerName.includes("addendum")) return "addendum";
  if (lowerName.includes("sketch")) return "sketch";
  if (lowerName.includes("map")) return "map";
  if (lowerName.includes("invoice")) return "invoice";
  if (lowerMime.includes("image/") || /\.(jpg|jpeg|png|heic)$/i.test(lowerName)) return "photo_exhibit";
  if (lowerName.includes("uad36") || lowerName.includes("uad-3-6") || lowerName.includes("uad_3_6")) return lowerName.endsWith(".zip") ? "uad_3_6_package" : "uad_3_6_xml";
  if (lowerMime.includes("xml") || lowerName.endsWith(".xml")) return "legacy_xml";
  if (lowerMime.includes("pdf") || lowerName.endsWith(".pdf")) return "pdf_report";
  return "other";
}

export function validateReportUploadSize(file: IngestionSourceFile) {
  if (file.sizeBytes <= 0) return `${file.fileName} is empty. Upload the original report file again.`;
  if (file.sizeBytes > maxReportUploadBytes) return `${file.fileName} is larger than the 100 MB review limit. Split supporting exhibits or upload a smaller report package.`;
  return "";
}

export function detectDuplicateReportUpload(existingVersions: AppraisalReportVersion[], sourceFile: IngestionSourceFile) {
  return existingVersions.some((version) =>
    version.sourceFiles.some((existingFile) =>
      Boolean(sourceFile.checksum && existingFile.checksum && sourceFile.checksum === existingFile.checksum) ||
      (existingFile.fileName === sourceFile.fileName && existingFile.sizeBytes === sourceFile.sizeBytes)
    )
  );
}

function sourceOrDefault(sourceFiles: IngestionSourceFile[]) {
  return sourceFiles[0] ?? {
    id: "demo-source",
    fileName: "demo-report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 1,
    storagePath: "demo/report.pdf",
    uploadedBy: "CAS Demo",
    uploadedAt: demoCreatedAt,
    kind: "pdf_report" as const
  };
}

function extracted<T>(
  key: string,
  label: string,
  value: T | null,
  source: IngestionSourceFile,
  options: {
    sourcePage?: number;
    xmlPath?: string;
    confidence?: number;
    verificationStatus?: FieldVerificationStatus;
  } = {}
): ExtractedField<T> {
  return {
    key,
    label,
    value,
    normalizedValue: value === null || value === undefined ? undefined : String(value),
    sourceFileId: source.id,
    sourceFileName: source.fileName,
    sourcePage: options.sourcePage,
    xmlPath: options.xmlPath,
    method: source.kind === "legacy_xml" ? "legacy_xml_path" : source.kind === "uad_3_6_xml" || source.kind === "uad_3_6_package" ? "uad_3_6_data_point" : "demo_parser",
    confidence: options.confidence ?? 0.86,
    verificationStatus: options.verificationStatus ?? "unverified"
  };
}

function attachment(source: IngestionSourceFile, kind: ReviewAssetKind, label: string, present: boolean): ReportAttachmentSummary {
  return {
    id: `${source.id}-${kind}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    kind,
    label,
    present: extracted(`${kind}.${label}`, label, present, source, { confidence: present ? 0.88 : 0.42, verificationStatus: present ? "manual_confirmed" : "missing" })
  };
}

function buildSections(profile: ReviewProfile, source: IngestionSourceFile, missing: string[] = []) {
  const missingSet = new Set(missing);
  return Object.fromEntries(
    profile.requiredSections.map((section) => [
      section,
      extracted(`sections.${section}`, section, !missingSet.has(section), source, { confidence: missingSet.has(section) ? 0.41 : 0.9, verificationStatus: missingSet.has(section) ? "missing" : "manual_confirmed" })
    ])
  );
}

function comparable(source: IngestionSourceFile, id: string, overrides: Partial<Record<keyof ComparableSaleSummary, number | string>> = {}): ComparableSaleSummary {
  const salePrice = typeof overrides.salePrice === "number" ? overrides.salePrice : 540000;
  const adjustedValue = typeof overrides.adjustedValue === "number" ? overrides.adjustedValue : 560000;
  const netAdjustment = typeof overrides.netAdjustment === "number" ? overrides.netAdjustment : 20000;
  const grossAdjustment = typeof overrides.grossAdjustment === "number" ? overrides.grossAdjustment : 46000;
  const calculatedNetAdjustment = typeof overrides.calculatedNetAdjustment === "number" ? overrides.calculatedNetAdjustment : netAdjustment;
  const calculatedGrossAdjustment = typeof overrides.calculatedGrossAdjustment === "number" ? overrides.calculatedGrossAdjustment : grossAdjustment;
  return {
    id,
    address: extracted(`comps.${id}.address`, `${id} address`, String(overrides.address ?? "1150 Demo Comparable Lane"), source, { sourcePage: 5 }),
    salePrice: extracted(`comps.${id}.salePrice`, `${id} sale price`, salePrice, source, { sourcePage: 5 }),
    adjustedValue: extracted(`comps.${id}.adjustedValue`, `${id} adjusted value`, adjustedValue, source, { sourcePage: 5 }),
    netAdjustment: extracted(`comps.${id}.netAdjustment`, `${id} net adjustment`, netAdjustment, source, { sourcePage: 5 }),
    grossAdjustment: extracted(`comps.${id}.grossAdjustment`, `${id} gross adjustment`, grossAdjustment, source, { sourcePage: 5 }),
    calculatedNetAdjustment: extracted(`comps.${id}.calculatedNetAdjustment`, `${id} calculated net adjustment`, calculatedNetAdjustment, source, { sourcePage: 5 }),
    calculatedGrossAdjustment: extracted(`comps.${id}.calculatedGrossAdjustment`, `${id} calculated gross adjustment`, calculatedGrossAdjustment, source, { sourcePage: 5 })
  };
}

function scenarioForRequest(request: ReportIngestionRequest) {
  const text = `${request.scenarioHint ?? ""} ${request.order.id} ${request.order.productType} ${request.order.loanType} ${request.sourceFiles.map((file) => file.fileName).join(" ")}`.toLowerCase();
  if (text.includes("revised") || text.includes("corrected") || request.existingVersions?.length) return "revised";
  if (text.includes("fha")) return "fha-condition";
  if (/\bva\b/.test(text) || text.includes("va 1004")) return "va-condition";
  if (text.includes("estate") || text.includes("retrospective")) return "estate-effective-date";
  if (text.includes("desktop") || text.includes("clean") || text.includes("ready")) return "clean";
  if (text.includes("uad 3.6")) return "uad36";
  return "conventional-inconsistency";
}

export function buildDemoNormalizedReport(request: ReportIngestionRequest, profile: ReviewProfile, sourceFiles: IngestionSourceFile[]): NormalizedAppraisalReport {
  const source = sourceOrDefault(sourceFiles);
  const scenario = scenarioForRequest(request);
  const order = request.order;
  const isClean = scenario === "clean" || scenario === "uad36" || scenario === "revised";
  const isFha = scenario === "fha-condition";
  const isVa = scenario === "va-condition";
  const isEstate = scenario === "estate-effective-date";
  const finalValue = isClean ? 560000 : isEstate ? 550000 : 580000;
  const indicatedValue = isClean ? finalValue : isEstate ? 550000 : 585000;
  const reportType = isFha ? "FHA 1004" : isVa ? "VA 1004" : isEstate ? "Estate appraisal" : profile.name.includes("UAD") ? "UAD 3.6 URAR" : order.productType;
  const inspectionDate = order.inspectionDate ?? order.inspection?.scheduledDate ?? "2026-07-07";
  const signatureDate = isEstate ? "2026-07-25" : "2026-07-10";
  const effectiveDate = isEstate ? inspectionDate : inspectionDate;
  const retrospectiveDate = isEstate ? "2024-03-14" : undefined;
  const missingSections = isFha ? ["Contract"] : [];
  const photosPresent = !isFha;
  const sketchGla = isClean ? 2184 : 2148;
  const bedrooms = 4;
  const sketchBedrooms = isClean ? 4 : 3;
  const baths = isClean ? 3 : 2.5;
  const sketchBaths = isClean ? 3 : 3;
  const compOne = comparable(source, "Comp 1", isClean ? {} : { netAdjustment: 18500, calculatedNetAdjustment: 20000, grossAdjustment: 42000, calculatedGrossAdjustment: 46000 });
  const compTwo = comparable(source, "Comp 2", { salePrice: 555000, adjustedValue: isClean ? 558000 : 0, netAdjustment: 3000, grossAdjustment: 22000, calculatedNetAdjustment: 3000, calculatedGrossAdjustment: 22000 });
  const comparableSales = isFha ? [compOne, { ...compTwo, adjustedValue: extracted<number>("comps.Comp 2.adjustedValue", "Comp 2 adjusted value", null, source, { sourcePage: 5, confidence: 0.35, verificationStatus: "missing" }) }] : [compOne, compTwo];
  const sectionMap = buildSections(profile, source, missingSections);

  return {
    id: `${order.id}-${scenario}-normalized`,
    orderId: order.id,
    profileId: profile.id,
    sourceFiles,
    reportIdentity: {
      fileNumber: extracted("identity.fileNumber", "File number", order.fileNumber, source, { sourcePage: 1, verificationStatus: "matched_order" }),
      clientName: extracted("identity.clientName", "Client", order.client, source, { sourcePage: 1, verificationStatus: "matched_order" }),
      intendedUser: extracted("identity.intendedUser", "Intended user", isEstate ? order.client : `${order.client} and assigns`, source, { sourcePage: 1 }),
      reportType: extracted("identity.reportType", "Report type", reportType, source, { sourcePage: 1 }),
      loanNumber: extracted("identity.loanNumber", "Loan number", isFha ? `FHA-${order.fileNumber}` : isVa ? `VA-${order.fileNumber}` : `${order.fileNumber}-LN`, source, { sourcePage: 1 })
    },
    subject: {
      borrowerName: extracted("subject.borrower", "Borrower", order.borrower, source, { sourcePage: 1, verificationStatus: "matched_order" }),
      address: extracted("subject.address", "Property address", order.address, source, { sourcePage: 1, verificationStatus: "matched_order" }),
      city: extracted("subject.city", "City", order.city, source, { sourcePage: 1, verificationStatus: "matched_order" }),
      state: extracted("subject.state", "State", order.state, source, { sourcePage: 1, verificationStatus: "matched_order" }),
      zip: extracted("subject.zip", "ZIP", order.zip, source, { sourcePage: 1, verificationStatus: "matched_order" }),
      county: extracted("subject.county", "County", order.county, source, { sourcePage: 1, verificationStatus: "matched_order" })
    },
    property: {
      propertyType: extracted("property.type", "Property type", order.propertyType, source, { sourcePage: 2 }),
      occupancy: extracted("property.occupancy", "Occupancy", order.occupancy, source, { sourcePage: 2 })
    },
    site: {
      siteSizeAcres: extracted("site.size", "Site size", 0.42, source, { sourcePage: 2 }),
      statedSiteSizeAcres: extracted("site.statedSize", "Stated site size", isClean ? 0.42 : 0.46, source, { sourcePage: 3 })
    },
    improvements: {
      gla: extracted("improvements.gla", "GLA", 2184, source, { sourcePage: 2 }),
      sketchGla: extracted("improvements.sketchGla", "Sketch GLA", sketchGla, source, { sourcePage: 9 }),
      bedrooms: extracted("improvements.bedrooms", "Bedrooms", bedrooms, source, { sourcePage: 2 }),
      baths: extracted("improvements.baths", "Baths", baths, source, { sourcePage: 2 }),
      sketchBedrooms: extracted("improvements.sketchBedrooms", "Sketch bedrooms", sketchBedrooms, source, { sourcePage: 9 }),
      sketchBaths: extracted("improvements.sketchBaths", "Sketch baths", sketchBaths, source, { sourcePage: 9 }),
      conditionCommentary: extracted(
        "improvements.conditionCommentary",
        "Condition commentary",
        isFha ? "Utilities appeared on at inspection." : isVa ? "Roof repair observation noted for reviewer follow-up. Human review should confirm VA repair consistency." : "Condition, repairs, and observed physical characteristics are addressed.",
        source,
        { sourcePage: 3, confidence: isFha ? 0.55 : 0.88 }
      )
    },
    zoning: {
      zoningCode: extracted("zoning.code", "Zoning", "R-20", source, { sourcePage: 2 }),
      conformity: extracted("zoning.conformity", "Conformity", "Legal conforming", source, { sourcePage: 2 })
    },
    highestBestUse: {
      asImproved: extracted("hbu.improved", "HBU as improved", "Current residential use", source, { sourcePage: 4 }),
      asVacant: extracted("hbu.vacant", "HBU as vacant", "Residential development", source, { sourcePage: 4 })
    },
    neighborhood: {
      trend: extracted("neighborhood.trend", "Market trend", "Stable", source, { sourcePage: 3 })
    },
    market: {
      exposureTime: extracted("market.exposureTime", "Exposure time", "0-90 days", source, { sourcePage: 4 })
    },
    contract: {
      analyzed: extracted("contract.analyzed", "Contract analyzed", !isFha, source, { sourcePage: 2, verificationStatus: isFha ? "missing" : "manual_confirmed" }),
      price: extracted("contract.price", "Contract price", 565000, source, { sourcePage: 2 })
    },
    comparableSales,
    comparableListings: [comparable(source, "Listing 1", { salePrice: 575000, adjustedValue: 565000, netAdjustment: -10000, grossAdjustment: 18000, calculatedNetAdjustment: -10000, calculatedGrossAdjustment: 18000 })],
    adjustments: {
      adjustmentGridBalanced: extracted("adjustments.gridBalanced", "Adjustment grid balanced", isClean, source, { sourcePage: 5, confidence: isClean ? 0.88 : 0.62 })
    },
    costApproach: {
      siteValue: extracted("cost.siteValue", "Site value", 125000, source, { sourcePage: 6 })
    },
    incomeApproach: {
      rentComparableSupport: extracted("income.rentComparableSupport", "Rent comparable support", "Not applicable", source, { sourcePage: 7 })
    },
    reconciliation: {
      finalValue: extracted("reconciliation.finalValue", "Final value", finalValue, source, { sourcePage: 8 }),
      indicatedValue: extracted("reconciliation.indicatedValue", "Reconciliation indicated value", indicatedValue, source, { sourcePage: 8 }),
      commentary: extracted("reconciliation.commentary", "Reconciliation commentary", "Sales comparison approach given primary weight.", source, { sourcePage: 8 })
    },
    valueDates: {
      effectiveDate: extracted("dates.effective", "Effective date", effectiveDate, source, { sourcePage: 1 }),
      inspectionDate: extracted("dates.inspection", "Inspection date", inspectionDate, source, { sourcePage: 1 }),
      signatureDate: extracted("dates.signature", "Signature date", signatureDate, source, { sourcePage: 10 }),
      retrospectiveDate: retrospectiveDate ? extracted("dates.retrospective", "Retrospective date", retrospectiveDate, source, { sourcePage: 1 }) : undefined
    },
    appraiser: {
      name: extracted("appraiser.name", "Appraiser", order.appraiser, source, { sourcePage: 10 }),
      license: extracted("appraiser.license", "Appraiser license", "GA-CG12345", source, { sourcePage: 10 }),
      signed: extracted("appraiser.signed", "Appraiser signed", true, source, { sourcePage: 10, verificationStatus: "manual_confirmed" })
    },
    certifications: {
      signedCertification: extracted("certifications.signed", "Signed certification", true, source, { sourcePage: 10 }),
      limitingConditions: extracted("certifications.limitingConditions", "Limiting conditions", true, source, { sourcePage: 11 })
    },
    assumptions: extracted("assumptions.standard", "Assumptions", ["Standard assumptions and limiting conditions"], source, { sourcePage: 11 }),
    extraordinaryAssumptions: extracted("assumptions.extraordinary", "Extraordinary assumptions", isEstate ? ["Retrospective market data relied on for date of death"] : [], source, { sourcePage: 11 }),
    hypotheticalConditions: extracted("assumptions.hypothetical", "Hypothetical conditions", [], source, { sourcePage: 11 }),
    environmentalAddenda: [attachment(source, "addendum", "Environmental addendum", true)],
    photos: [attachment(source, "photo", "Subject photos", photosPresent)],
    sketch: [attachment(source, "sketch", "Sketch exhibit", true)],
    maps: [attachment(source, "map", "Location map", true)],
    addenda: [attachment(source, "addendum", "Narrative addendum", true)],
    attachments: [
      attachment(source, "photo", "Subject photos", photosPresent),
      attachment(source, "sketch", "Sketch exhibit", true),
      attachment(source, "map", "Location map", true),
      attachment(source, "xml", "XML export", sourceFiles.some((file) => file.kind === "legacy_xml" || file.kind === "uad_3_6_xml" || file.kind === "uad_3_6_package")),
      attachment(source, "certification", "Signed certification", true),
      attachment(source, "contract", "Purchase contract", !isFha)
    ],
    sections: sectionMap,
    orderInstructionResponses: extracted("instructions.responses", "Order instruction responses", isFha ? [] : ["Access notes addressed", "Client delivery package noted"], source, { sourcePage: 2, confidence: isFha ? 0.45 : 0.84 }),
    versionComparison: scenario === "revised"
      ? {
          previousVersionId: request.existingVersions?.[0]?.id ?? `${order.id}-previous-report`,
          resolvedFindingIds: [`${order.id}-calculation-warning`, `${order.id}-exhibit-warning`],
          unresolvedFindingIds: [],
          changedSections: ["Sales Comparison", "Reconciliation", "Exhibits"]
        }
      : undefined,
    parsedAt: demoCreatedAt
  };
}

export function ingestReportUpload(request: ReportIngestionRequest): ReportIngestionResult {
  const normalizedSourceFiles = request.sourceFiles.map((file) => ({ ...file, kind: file.kind ?? identifyReportFileKind(file.fileName, file.mimeType) }));
  const profile = selectReportProfile(request.order.productType, normalizedSourceFiles[0]?.fileName, normalizedSourceFiles[0]?.kind);
  const overlays = selectReviewOverlays({ order: request.order, profile, organization: request.organization });
  const uploadErrors = normalizedSourceFiles.flatMap((file) => {
    const sizeError = validateReportUploadSize(file);
    const malformed = /malformed|broken|corrupt/i.test(file.fileName) ? `${file.fileName} could not be parsed. Check that the PDF/XML is readable and upload a corrected file.` : "";
    return [sizeError, malformed].filter(Boolean);
  });

  if (!normalizedSourceFiles.length) {
    return { status: "failed", profile, overlays, errors: ["Upload at least one report PDF, XML, UAD 3.6 package, or supporting exhibit before running review."], warnings: [] };
  }

  if (uploadErrors.length) {
    return { status: "failed", profile, overlays, errors: uploadErrors, warnings: [] };
  }

  const existingVersions = request.existingVersions ?? [];
  const duplicateFile = normalizedSourceFiles.find((file) => detectDuplicateReportUpload(existingVersions, file));
  if (duplicateFile) {
    return {
      status: "duplicate",
      profile,
      overlays,
      errors: [],
      warnings: [`${duplicateFile.fileName} looks like a duplicate of an existing immutable report version. CAS did not create a new version.`]
    };
  }

  const warnings = normalizedSourceFiles.some((file) => file.kind === "other")
    ? ["One uploaded file type is not recognized yet. CAS preserved it but did not extract structured fields from it."]
    : [];
  const versionNumber = Math.max(0, ...existingVersions.map((version) => version.versionNumber)) + 1;
  const report = buildDemoNormalizedReport(request, profile, normalizedSourceFiles);
  const reportVersion: AppraisalReportVersion = {
    id: `${request.order.id}-report-v${versionNumber}`,
    organizationId: request.organization.id,
    orderId: request.order.id,
    versionNumber,
    profileId: profile.id,
    overlayIds: overlays.map((overlay) => overlay.id),
    sourceFiles: normalizedSourceFiles,
    storagePreserved: true,
    immutable: true,
    uploadedBy: request.user.name,
    uploadedAt: normalizedSourceFiles[0]?.uploadedAt ?? demoCreatedAt,
    createdAt: demoCreatedAt,
    status: "Extracted",
    extractionSummary: `Demo parser extracted report fields from ${normalizedSourceFiles.length} file${normalizedSourceFiles.length === 1 ? "" : "s"}.`,
    normalizedReport: report
  };
  const deterministicResult = runDeterministicReview({
    order: request.order,
    organization: request.organization,
    user: request.user,
    report,
    reportVersion,
    profile,
    overlays,
    previousVersion: existingVersions[0],
    createdAt: demoCreatedAt
  });
  const aiResult = resolveAiReviewProvider(request.aiSettings).analyze({
    order: request.order,
    report,
    reportVersion,
    profile,
    overlays,
    settings: request.aiSettings
  });
  const allFindings = [...deterministicResult.findings, ...aiResult.findings];
  const reviewResult = {
    ...deterministicResult,
    runMode: request.runMode,
    aiProviderStatus: aiResult.status === "completed" ? "completed" as const : aiResult.status === "failed" || aiResult.status === "timeout" ? "unavailable" as const : aiResult.status,
    aiRun: aiResult.metadata
      ? {
          ...aiResult.metadata,
          reportVersionId: reportVersion.id,
          reviewPackIds: deterministicResult.rulePackSummary.map((pack) => pack.id),
          findingsAccepted: aiResult.findings.length,
          findingsRejected: aiResult.rejectedFindings ?? 0
        }
      : {
          providerId: request.aiSettings?.providerId ?? "disabled",
          modelId: request.aiSettings?.modelId ?? "none",
          promptTemplateVersion: request.aiSettings?.promptTemplateVersion ?? "cas-ai-review-pilot-disabled",
          status: aiResult.status,
          reportVersionId: reportVersion.id,
          reviewPackIds: deterministicResult.rulePackSummary.map((pack) => pack.id),
          categoriesRequested: request.aiSettings?.enabledCategories ?? [],
          findingsAccepted: aiResult.findings.length,
          findingsRejected: aiResult.rejectedFindings ?? 0,
          message: aiResult.message,
          startedAt: demoCreatedAt,
          completedAt: demoCreatedAt
        },
    findings: allFindings,
    summary: summarizeReviewFindings(allFindings),
    auditSummary: `${deterministicResult.auditSummary} ${aiResult.message}`
  };

  return {
    status: reviewResult.summary.openFindings ? "needs_review" : "ready",
    profile,
    overlays,
    reportVersion,
    reviewResult,
    errors: [],
    warnings
  };
}
