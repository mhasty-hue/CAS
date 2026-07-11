import type { AccountingEntry, AppraiserProfile, Order, PayrollSnapshot } from "@/types/domain";

export const organizationDefaultSplit = 50;

export function calculatePayrollSnapshot({
  grossFee,
  techFee,
  otherNonCommissionableFees = 0,
  defaultAppraiserSplit,
  orderSplitOverride,
  fixedPayoutOverride,
  organizationSplit = organizationDefaultSplit,
  manualAdjustmentReason,
  approvedBy,
  approvedDate,
  locked = false
}: {
  grossFee: number;
  techFee: number;
  otherNonCommissionableFees?: number;
  defaultAppraiserSplit?: number;
  orderSplitOverride?: number;
  fixedPayoutOverride?: number;
  organizationSplit?: number;
  manualAdjustmentReason?: string;
  approvedBy?: string;
  approvedDate?: string;
  locked?: boolean;
}): PayrollSnapshot {
  const commissionableBase = Math.max(0, grossFee - techFee - otherNonCommissionableFees);
  const activeSplit = orderSplitOverride ?? defaultAppraiserSplit ?? organizationSplit;
  const calculatedPayout = activeSplit !== undefined ? Math.round(commissionableBase * (activeSplit / 100)) : undefined;
  const finalPayout = fixedPayoutOverride ?? calculatedPayout;
  const calculationSource = fixedPayoutOverride !== undefined
    ? "Fixed order payout"
    : orderSplitOverride !== undefined
      ? "Order split override"
      : defaultAppraiserSplit !== undefined
        ? "Appraiser default split"
        : organizationSplit !== undefined
          ? "Organization default split"
          : "Requires review";

  return {
    grossFee,
    techFee,
    otherNonCommissionableFees,
    commissionableBase,
    defaultAppraiserSplit,
    orderSplitOverride,
    fixedPayoutOverride,
    calculatedPayout,
    finalPayout,
    calculationSource,
    manualAdjustmentReason,
    approvedBy,
    approvedDate,
    locked
  };
}

export function applyPayrollSnapshot(entry: AccountingEntry, appraisers: AppraiserProfile[], order?: Order): AccountingEntry {
  if (entry.locked || entry.payrollSnapshot?.locked || entry.status === "Paid") return entry;
  const appraiser = appraisers.find((item) => item.name === entry.appraiser);
  const snapshot = calculatePayrollSnapshot({
    grossFee: entry.fee,
    techFee: entry.techFee,
    otherNonCommissionableFees: entry.otherNonCommissionableFees ?? order?.otherNonCommissionableFees ?? 0,
    defaultAppraiserSplit: entry.defaultAppraiserSplit ?? appraiser?.defaultCommissionSplit,
    orderSplitOverride: entry.orderSplitOverride ?? order?.commissionSplitOverride,
    fixedPayoutOverride: entry.fixedPayoutOverride ?? order?.fixedAppraiserPayoutOverride,
    manualAdjustmentReason: entry.manualAdjustmentReason,
    approvedBy: entry.approvedBy,
    approvedDate: entry.approvedDate
  });

  return {
    ...entry,
    otherNonCommissionableFees: snapshot.otherNonCommissionableFees,
    commissionSplit: snapshot.orderSplitOverride ?? snapshot.defaultAppraiserSplit ?? organizationDefaultSplit,
    defaultAppraiserSplit: snapshot.defaultAppraiserSplit,
    orderSplitOverride: snapshot.orderSplitOverride,
    fixedPayoutOverride: snapshot.fixedPayoutOverride,
    commissionableBase: snapshot.commissionableBase,
    calculatedPayout: snapshot.calculatedPayout,
    finalPayout: snapshot.finalPayout,
    calculationSource: snapshot.calculationSource,
    appraiserSplit: snapshot.finalPayout ?? 0,
    companyRevenue: Math.max(0, entry.fee - entry.techFee - snapshot.otherNonCommissionableFees - (snapshot.finalPayout ?? 0)),
    payrollSnapshot: snapshot
  };
}

export function explainPayroll(entry: AccountingEntry) {
  const base = entry.commissionableBase ?? Math.max(0, entry.fee - entry.techFee - (entry.otherNonCommissionableFees ?? 0));
  const source = entry.calculationSource ?? "Requires review";
  return `${source}: ${base.toLocaleString("en-US", { style: "currency", currency: "USD" })} commissionable base -> ${(entry.finalPayout ?? entry.appraiserSplit).toLocaleString("en-US", { style: "currency", currency: "USD" })} final payout`;
}
