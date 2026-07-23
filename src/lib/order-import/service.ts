import type {
  Order,
  OrderImportDuplicateCandidate,
  OrderImportField,
  OrderImportFieldKey,
  OrderImportSourceType,
  OrderImportTemplate,
  OrderIntakePrefill
} from "@/types/domain";

export type ImportedText = {
  text: string;
  provider: "demo" | "external";
  pages?: number;
};

export type CsvParseResult = {
  headers: string[];
  rows: string[][];
  errors: string[];
};

export interface PdfTextExtractor {
  extract(file: File): Promise<ImportedText>;
}

export interface CsvParser {
  parse(file: File): Promise<CsvParseResult>;
}

export interface FieldDetector {
  detect(input: ImportedText | CsvParseResult, sourceType: OrderImportSourceType, template?: OrderImportTemplate): OrderImportField[];
}

export interface FieldMapper {
  map(fields: OrderImportField[], template?: OrderImportTemplate): OrderImportField[];
}

export interface ConfidenceScorer {
  score(fields: OrderImportField[]): number;
}

export interface DuplicateDetector {
  detect(fields: OrderImportField[], orders: Order[]): OrderImportDuplicateCandidate[];
}

export interface ImportValidator {
  validate(fields: OrderImportField[]): { warnings: string[]; errors: string[] };
}

export interface OrderImportProvider {
  analyze(file: File, orders: Order[], templates?: OrderImportTemplate[]): Promise<OrderIntakePrefill>;
}

export const orderImportFieldDefinitions: Array<{ key: OrderImportFieldKey; label: string; required?: boolean; aliases: string[] }> = [
  { key: "client", label: "Client or lender name", required: true, aliases: ["client", "lender", "lender_name", "client_name"] },
  { key: "borrower", label: "Borrower name", required: true, aliases: ["borrower", "borrower_name", "applicant", "primary_borrower"] },
  { key: "co_borrower", label: "Co-borrower name", aliases: ["co_borrower", "coborrower", "co_applicant"] },
  { key: "property_address", label: "Property address", required: true, aliases: ["property_address", "subject_address", "address", "street_address"] },
  { key: "city", label: "City", aliases: ["city", "property_city"] },
  { key: "state", label: "State", aliases: ["state", "property_state"] },
  { key: "zip", label: "ZIP code", aliases: ["zip", "zipcode", "postal_code", "property_zip"] },
  { key: "county", label: "County", aliases: ["county", "property_county"] },
  { key: "loan_number", label: "Loan number", aliases: ["loan_number", "loan_no", "loan", "loan_id"] },
  { key: "loan_officer", label: "Loan officer", aliases: ["loan_officer", "lo", "loan_officer_name"] },
  { key: "processor", label: "Processor", aliases: ["processor", "processor_name", "loan_processor"] },
  { key: "product_type", label: "Appraisal product", required: true, aliases: ["product", "product_type", "report_type", "appraisal_product", "form_type"] },
  { key: "loan_type", label: "Loan type", aliases: ["loan_type", "loan_program", "program"] },
  { key: "loan_purpose", label: "Loan purpose", aliases: ["loan_purpose", "purpose", "transaction_type"] },
  { key: "occupancy", label: "Occupancy", aliases: ["occupancy", "occupancy_type"] },
  { key: "property_type", label: "Property type", aliases: ["property_type", "subject_property_type"] },
  { key: "estimated_value", label: "Estimated value", aliases: ["estimated_value", "estimate_value", "value_estimate"] },
  { key: "purchase_price", label: "Purchase price", aliases: ["purchase_price", "sales_price", "contract_price"] },
  { key: "due_date", label: "Due date", required: true, aliases: ["due_date", "duedate", "requested_due_date"] },
  { key: "requested_turn_time", label: "Requested turn time", aliases: ["turn_time", "requested_turn_time", "turnaround"] },
  { key: "fee", label: "Fee", aliases: ["fee", "appraisal_fee", "gross_fee"] },
  { key: "tech_fee", label: "Tech fee", aliases: ["tech_fee", "technology_fee"] },
  { key: "contact_name", label: "Contact names", aliases: ["contact", "contact_name", "access_contact", "inspection_contact"] },
  { key: "phone", label: "Contact phone numbers", aliases: ["phone", "contact_phone", "borrower_phone"] },
  { key: "contact_email", label: "Contact email addresses", aliases: ["email", "contact_email", "borrower_email"] },
  { key: "access_info", label: "Access instructions", aliases: ["access", "access_info", "access_instructions"] },
  { key: "special_instructions", label: "Special instructions", aliases: ["special_instructions", "instructions", "notes"] },
  { key: "amc_file_number", label: "AMC or lender file number", aliases: ["file_number", "amc_file_number", "lender_file_number", "order_number"] },
  { key: "lender_contact", label: "Lender contact", aliases: ["lender_contact", "order_contact"] },
  { key: "priority", label: "Priority", aliases: ["priority", "rush"] },
  { key: "notes", label: "Internal notes", aliases: ["internal_notes", "comments"] }
];

const fieldByAlias = new Map(
  orderImportFieldDefinitions.flatMap((definition) => definition.aliases.map((alias) => [normalizeHeader(alias), definition] as const))
);

function normalizeHeader(header: string) {
  return header.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === "\"") {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function sourceTypeFor(file: File): OrderImportSourceType {
  const name = file.name.toLowerCase();
  if (name.endsWith(".csv")) return "CSV";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "Spreadsheet";
  return "PDF";
}

function fieldId(key: string, index: number) {
  return `${key}-${index}`;
}

function statusFor(confidence: number, required?: boolean) {
  if (confidence < 0.58) return "low_confidence" as const;
  if (required && confidence < 0.72) return "low_confidence" as const;
  return "mapped" as const;
}

function makeField(key: OrderImportFieldKey, value: string, confidence: number, index: number, sourceLabel?: string): OrderImportField {
  const definition = orderImportFieldDefinitions.find((item) => item.key === key);
  return {
    id: fieldId(key, index),
    key,
    mappedTo: key,
    label: definition?.label ?? key,
    value,
    confidence,
    sourceLabel,
    sourceValue: value,
    required: definition?.required,
    status: statusFor(confidence, definition?.required),
    decision: confidence >= 0.58 ? "accept" : "correct"
  };
}

class DemoPdfTextExtractor implements PdfTextExtractor {
  async extract(file: File): Promise<ImportedText> {
    return {
      provider: "demo",
      pages: 3,
      text: `Demo extraction for ${file.name}`
    };
  }
}

class BrowserCsvParser implements CsvParser {
  async parse(file: File): Promise<CsvParseResult> {
    const text = await file.text();
    const rows = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (!rows.length) return { headers: [], rows: [], errors: ["The uploaded CSV appears to be empty."] };
    const headers = parseCsvLine(rows[0]);
    const parsedRows = rows.slice(1).map(parseCsvLine);
    return {
      headers,
      rows: parsedRows,
      errors: parsedRows.length ? [] : ["The CSV has headers but no order row to import."]
    };
  }
}

class DemoFieldDetector implements FieldDetector {
  detect(input: ImportedText | CsvParseResult, sourceType: OrderImportSourceType, template?: OrderImportTemplate): OrderImportField[] {
    if ("headers" in input) {
      const firstRow = input.rows[0] ?? [];
      return input.headers.flatMap((header, index) => {
        const mappedKey = template?.columns.find((column) => normalizeHeader(column.sourceLabel) === normalizeHeader(header))?.targetKey;
        const definition = mappedKey
          ? orderImportFieldDefinitions.find((item) => item.key === mappedKey)
          : fieldByAlias.get(normalizeHeader(header));
        const value = firstRow[index]?.trim();
        if (!definition || !value) return [];
        return [makeField(definition.key, value, mappedKey ? 0.91 : 0.84, index, header)];
      });
    }

    const demoFields: Array<[OrderImportFieldKey, string, number, string]> = [
      ["client", "HarborPoint Lending", 0.88, "Lender"],
      ["borrower", "Morgan Ellis", 0.83, "Borrower"],
      ["co_borrower", "Taylor Ellis", 0.72, "Co-borrower"],
      ["property_address", "2218 Briarwood Crossing", 0.86, "Subject property"],
      ["city", "Marietta", 0.8, "City"],
      ["state", "GA", 0.76, "State"],
      ["zip", "30064", 0.74, "ZIP"],
      ["county", "Cobb", 0.69, "County"],
      ["loan_number", "HP-778041", 0.77, "Loan number"],
      ["loan_officer", "Mallory Chen", 0.7, "Loan officer"],
      ["processor", "Jon Reyes", 0.64, "Processor"],
      ["product_type", "1004 URAR", 0.86, "Appraisal product"],
      ["loan_type", "Conventional", 0.8, "Loan type"],
      ["loan_purpose", "Purchase", 0.78, "Purpose"],
      ["occupancy", "Primary residence", 0.72, "Occupancy"],
      ["property_type", "Single family", 0.78, "Property type"],
      ["estimated_value", "725000", 0.61, "Estimated value"],
      ["purchase_price", "715000", 0.68, "Purchase price"],
      ["due_date", "2026-07-11", 0.74, "Due date"],
      ["requested_turn_time", "5 business days", 0.66, "Requested turn time"],
      ["fee", "650", 0.71, "Fee"],
      ["tech_fee", "35", 0.62, "Technology fee"],
      ["contact_name", "Morgan Ellis / Listing Agent Sara Kim", 0.72, "Inspection contact"],
      ["phone", "(404) 555-0178", 0.7, "Contact phone"],
      ["contact_email", "morgan.ellis@example.com", 0.67, "Contact email"],
      ["access_info", "Call borrower 24 hours before arrival. Lockbox on side door.", 0.78, "Access notes"],
      ["special_instructions", "Purchase contract and lender conditions are attached.", 0.72, "Special instructions"],
      ["amc_file_number", "HP-APP-260778", 0.69, "Client file number"]
    ];

    return demoFields.map(([key, value, confidence, sourceLabel], index) => makeField(key, value, confidence, index, sourceLabel));
  }
}

class DefaultFieldMapper implements FieldMapper {
  map(fields: OrderImportField[], template?: OrderImportTemplate): OrderImportField[] {
    if (!template) return fields;
    return fields.map((field) => {
      const mapped = field.sourceLabel
        ? template.columns.find((column) => normalizeHeader(column.sourceLabel) === normalizeHeader(field.sourceLabel ?? ""))
        : undefined;
      return mapped ? { ...field, mappedTo: mapped.targetKey, key: mapped.targetKey, templateName: template.name } : field;
    });
  }
}

class AverageConfidenceScorer implements ConfidenceScorer {
  score(fields: OrderImportField[]) {
    if (!fields.length) return 0;
    return fields.reduce((total, field) => total + field.confidence, 0) / fields.length;
  }
}

function fieldValue(fields: OrderImportField[], key: string) {
  return fields.find((field) => field.key === key || field.mappedTo === key)?.value.trim().toLowerCase() ?? "";
}

class DemoDuplicateDetector implements DuplicateDetector {
  detect(fields: OrderImportField[], orders: Order[]) {
    const borrower = fieldValue(fields, "borrower");
    const address = fieldValue(fields, "property_address");
    const importedFileNumber = fieldValue(fields, "amc_file_number") || fieldValue(fields, "loan_number");
    return orders.flatMap((order) => {
      const reasons: string[] = [];
      let confidence = 0;
      if (importedFileNumber && order.fileNumber.toLowerCase() === importedFileNumber) {
        reasons.push("file number");
        confidence += 0.45;
      }
      if (borrower && order.borrower.toLowerCase() === borrower) {
        reasons.push("borrower");
        confidence += 0.25;
      }
      if (address && order.address.toLowerCase() === address) {
        reasons.push("property address");
        confidence += 0.35;
      }
      if (confidence < 0.35) return [];
      return [{
        orderId: order.id,
        fileNumber: order.fileNumber,
        borrower: order.borrower,
        address: `${order.address}, ${order.city}`,
        matchReason: reasons.join(" and "),
        confidence: Math.min(confidence, 0.98)
      }];
    }).sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
}

class DefaultImportValidator implements ImportValidator {
  validate(fields: OrderImportField[]) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const requiredMissing = orderImportFieldDefinitions.filter((definition) => definition.required && !fields.some((field) => field.key === definition.key && field.value));
    if (requiredMissing.length) {
      warnings.push(`Missing required fields: ${requiredMissing.map((field) => field.label).join(", ")}.`);
    }
    const lowConfidence = fields.filter((field) => (field.status ?? "mapped") === "low_confidence");
    if (lowConfidence.length) {
      warnings.push(`${lowConfidence.length} values need review before applying.`);
    }
    if (!fields.length) {
      errors.push("CAS could not find recognizable order fields in this file.");
    }
    return { warnings, errors };
  }
}

export class DemoOrderImportProvider implements OrderImportProvider {
  constructor(
    private pdfExtractor: PdfTextExtractor = new DemoPdfTextExtractor(),
    private csvParser: CsvParser = new BrowserCsvParser(),
    private fieldDetector: FieldDetector = new DemoFieldDetector(),
    private fieldMapper: FieldMapper = new DefaultFieldMapper(),
    private confidenceScorer: ConfidenceScorer = new AverageConfidenceScorer(),
    private duplicateDetector: DuplicateDetector = new DemoDuplicateDetector(),
    private validator: ImportValidator = new DefaultImportValidator()
  ) {}

  async analyze(file: File, orders: Order[], templates: OrderImportTemplate[] = []): Promise<OrderIntakePrefill> {
    const sourceType = sourceTypeFor(file);
    const template = templates.find((item) => item.sourceType === sourceType);
    const parsed = sourceType === "CSV" ? await this.csvParser.parse(file) : await this.pdfExtractor.extract(file);
    const fields = this.fieldMapper.map(this.fieldDetector.detect(parsed, sourceType, template), template);
    const validation = this.validator.validate(fields);
    const duplicates = this.duplicateDetector.detect(fields, orders);
    const parseErrors = "errors" in parsed ? parsed.errors : [];
    const warnings = [
      ...validation.warnings,
      ...(sourceType === "Spreadsheet" ? ["Spreadsheet imports use demo extraction until workbook parsing is connected."] : []),
      ...(sourceType === "PDF" ? ["PDF extraction is running in demo mode. Review low-confidence values before applying."] : [])
    ];

    return {
      sourceName: file.name,
      sourceType,
      confidence: this.confidenceScorer.score(fields),
      provider: sourceType === "CSV" ? "csv" : sourceType === "Spreadsheet" ? "spreadsheet" : "pdf",
      originalFile: {
        name: file.name,
        type: file.type || sourceType,
        size: file.size,
        preserved: true,
        receivedAt: new Date().toISOString()
      },
      fields,
      warnings,
      errors: [...parseErrors, ...validation.errors],
      duplicates,
      mappingHistory: [],
      templateName: template?.name,
      appliedAt: new Date().toISOString()
    };
  }
}

export const demoOrderImportProvider = new DemoOrderImportProvider();
