import type { IntegrationSetting, Order } from "@/types/domain";

export type LosLoanSummary = {
  externalLoanId: string;
  loanNumber: string;
  borrower: string;
  coBorrower?: string;
  subjectAddress: string;
  loanOfficer: string;
  processor: string;
  lenderClient: string;
  loanPurpose: string;
  loanType: string;
  occupancy: string;
  estimatedValue?: number;
  purchasePrice?: number;
  closingDate?: string;
  productType: string;
  contactInformation: string;
  specialInstructions: string;
  documents: Array<{ externalDocumentId: string; name: string; type: string }>;
};

export interface LosProviderAdapter {
  key: IntegrationSetting["provider"];
  label: string;
  testConnection(setting: IntegrationSetting): Promise<{ ok: boolean; message: string }>;
  getLoan(externalLoanId: string): Promise<LosLoanSummary>;
  searchLoans(query: string): Promise<LosLoanSummary[]>;
  createAppraisalOrderFromLoan(loan: LosLoanSummary): Partial<Order>;
  getBorrowerData(externalLoanId: string): Promise<Pick<LosLoanSummary, "borrower" | "coBorrower" | "contactInformation">>;
  getPropertyData(externalLoanId: string): Promise<Pick<LosLoanSummary, "subjectAddress" | "occupancy" | "estimatedValue" | "purchasePrice">>;
  getLoanOfficerData(externalLoanId: string): Promise<Pick<LosLoanSummary, "loanOfficer" | "processor" | "lenderClient">>;
  getLoanProductData(externalLoanId: string): Promise<Pick<LosLoanSummary, "loanPurpose" | "loanType" | "productType">>;
  getDocuments(externalLoanId: string): Promise<LosLoanSummary["documents"]>;
  uploadDocument(externalLoanId: string, documentName: string): Promise<{ ok: boolean; externalDocumentId: string }>;
  updateAppraisalStatus(externalLoanId: string, status: Order["status"]): Promise<{ ok: boolean; status: Order["status"] }>;
  deliverCompletedReport(externalLoanId: string, reportName: string): Promise<{ ok: boolean; deliveredAt: string }>;
  sendVendorMessage(externalLoanId: string, body: string): Promise<{ ok: boolean; messageId: string }>;
  receiveVendorMessage(externalLoanId: string): Promise<Array<{ id: string; body: string; receivedAt: string }>>;
}

const mockLoan: LosLoanSummary = {
  externalLoanId: "lqb-908177",
  loanNumber: "HP-2026-4418",
  borrower: "Avery Mitchell",
  coBorrower: "Riley Mitchell",
  subjectAddress: "1840 Magnolia Trace, Marietta, GA 30064",
  loanOfficer: "Claire Moon",
  processor: "Sam Ortiz",
  lenderClient: "HarborPoint Lending",
  loanPurpose: "Refinance",
  loanType: "Conventional",
  occupancy: "Primary residence",
  estimatedValue: 685000,
  productType: "1004 URAR",
  contactInformation: "Avery Mitchell, (404) 555-0128",
  specialInstructions: "Borrower prefers inspections after 10 AM.",
  documents: [
    { externalDocumentId: "doc-contract-1", name: "Purchase contract.pdf", type: "Purchase Contract" },
    { externalDocumentId: "doc-disclosures-1", name: "Loan disclosures.pdf", type: "Loan Package" }
  ]
};

export const mockLendingQbAdapter: LosProviderAdapter = {
  key: "lendingqb_meridianlink",
  label: "LendingQB / MeridianLink Mortgage",
  async testConnection(setting) {
    return {
      ok: setting.status !== "Error",
      message: "Mock connection ready. Production credentials are not configured in demo mode."
    };
  },
  async getLoan() {
    return mockLoan;
  },
  async searchLoans(query) {
    return [mockLoan].filter((loan) => [loan.loanNumber, loan.borrower, loan.subjectAddress].join(" ").toLowerCase().includes(query.toLowerCase()));
  },
  createAppraisalOrderFromLoan(loan) {
    const [address, city = "Marietta", stateZip = "GA 30064"] = loan.subjectAddress.split(", ");
    const [state = "GA", zip = "30064"] = stateZip.split(" ");
    return {
      fileNumber: loan.loanNumber,
      borrower: loan.borrower,
      address,
      city,
      state,
      zip,
      client: loan.lenderClient,
      lenderContact: loan.loanOfficer,
      loanType: loan.loanType,
      occupancy: loan.occupancy,
      productType: loan.productType,
      accessInfo: loan.specialInstructions
    };
  },
  async getBorrowerData() {
    return { borrower: mockLoan.borrower, coBorrower: mockLoan.coBorrower, contactInformation: mockLoan.contactInformation };
  },
  async getPropertyData() {
    return {
      subjectAddress: mockLoan.subjectAddress,
      occupancy: mockLoan.occupancy,
      estimatedValue: mockLoan.estimatedValue,
      purchasePrice: mockLoan.purchasePrice
    };
  },
  async getLoanOfficerData() {
    return { loanOfficer: mockLoan.loanOfficer, processor: mockLoan.processor, lenderClient: mockLoan.lenderClient };
  },
  async getLoanProductData() {
    return { loanPurpose: mockLoan.loanPurpose, loanType: mockLoan.loanType, productType: mockLoan.productType };
  },
  async getDocuments() {
    return mockLoan.documents;
  },
  async uploadDocument(_externalLoanId, documentName) {
    return { ok: true, externalDocumentId: `uploaded-${documentName.toLowerCase().replaceAll(" ", "-")}` };
  },
  async updateAppraisalStatus(_externalLoanId, status) {
    return { ok: true, status };
  },
  async deliverCompletedReport() {
    return { ok: true, deliveredAt: new Date().toISOString() };
  },
  async sendVendorMessage() {
    return { ok: true, messageId: `msg-${Date.now()}` };
  },
  async receiveVendorMessage() {
    return [{ id: "msg-demo-1", body: "Mock vendor communication from LOS adapter.", receivedAt: new Date().toISOString() }];
  }
};

export const losProviderRegistry: Record<IntegrationSetting["provider"], LosProviderAdapter | null> = {
  lendingqb_meridianlink: mockLendingQbAdapter,
  encompass: null,
  byte: null,
  calyx: null,
  empower: null,
  other: null
};
