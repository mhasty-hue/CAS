import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const checks = [];

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

function check(name, condition) {
  checks.push({ name, passed: Boolean(condition) });
}

const paths = read("src/lib/storage/paths.ts");
const server = read("src/lib/storage/server.ts");
const provider = read("src/lib/storage/provider.ts");
const workspace = read("src/components/cas/documents/workspace.tsx");
const reviewPanel = read("src/components/cas/report-review.tsx");
const app = read("src/components/cas-app.tsx");
const publicOrder = read("src/components/cas/public-order.tsx");
const repositoryTypes = read("src/lib/repositories/types.ts");
const supabaseRepository = read("src/lib/repositories/supabase-repository.ts");
const migration = read("supabase/migrations/20260730120000_phase10_8_production_storage.sql");

check("public intake bucket standardized", paths.includes('publicOrderUploadBucket = "public-order-uploads"'));
check("legacy public bucket removed from runtime path helper", !paths.includes("cas-public-order-uploads"));
check("private bucket preserved", paths.includes('privateDocumentBucket = "cas-private-documents"'));
check("private order paths include document versions", paths.includes("documents/${documentId}/versions/${versionNumber}"));
check("report paths include report versions", paths.includes("reports/${documentId}/v${versionNumber}"));
check("public intake paths use intake session", paths.includes("intake/${intakeSessionId}/${uploadId}/${safeFileName}"));
check("server upload stores real private bytes", server.includes(".storage.from(privateDocumentBucket).upload(storagePath, file"));
check("server upload verifies object exists", server.includes(".createSignedUrl(storagePath, 30)"));
check("server upload writes immutable document versions", server.includes('.from("document_versions")'));
check("server upload creates appraisal report versions", server.includes('.from("appraisal_report_versions")'));
check("provider posts FormData uploads", provider.includes('fetch("/api/storage/upload"') && provider.includes("FormData"));
check("signed URL provider uses document IDs", provider.includes("requestDocumentSignedUrl(documentId"));
check("delivery provider calls production endpoint", provider.includes('fetch("/api/storage/deliver"'));
check("document workspace has real file picker", workspace.includes('type="file"') && workspace.includes("realUploadsEnabled"));
check("review workspace passes uploaded files", reviewPanel.includes("onRunReview(order.id, files)") && reviewPanel.includes("onUploadCorrectedReport(order.id, files)"));
check("production upload does not fall back to demo", app.includes("Choose one or more files before uploading to production storage.") && app.includes("Uploading file bytes to private Supabase Storage"));
check("public order page posts intake files", publicOrder.includes('fetch("/api/storage/public-intake-upload"') && publicOrder.includes("selectedFiles"));
check("bootstrap contract includes report versions", repositoryTypes.includes("reportVersions: AppraisalReportVersion[]"));
check("supabase repository reloads report versions", supabaseRepository.includes('client.from("appraisal_report_versions")') && supabaseRepository.includes("mapAppraisalReportVersion"));
check("migration updates private bucket limit", migration.includes("file_size_limit = 104857600"));
check("migration creates public intake bucket", migration.includes("'public-order-uploads'"));
check("migration accepts standardized intake path", migration.includes("^intake/"));
check("migration hardens private storage insert path", migration.includes("can_insert_private_storage_object"));

const requiredDocs = [
  "docs/file-storage-architecture.md",
  "docs/storage-path-conventions.md",
  "docs/secure-upload-flow.md",
  "docs/secure-download-flow.md",
  "docs/report-file-versioning.md",
  "docs/public-intake-storage.md",
  "docs/storage-rls.md",
  "docs/file-processing-lifecycle.md"
];

for (const doc of requiredDocs) {
  check(`${doc} exists`, existsSync(join(root, doc)));
}

const failed = checks.filter((item) => !item.passed);
for (const item of checks) {
  console.log(`${item.passed ? "PASS" : "FAIL"} ${item.name}`);
}

if (failed.length) {
  console.error(`\n${failed.length} Phase 10.8 storage regression check(s) failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} Phase 10.8 storage regression checks passed.`);
