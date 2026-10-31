import {
  MatchStatus,
  ThreeWayMatchResult,
  ThreeWayMatchLineResult,
  ApprovalStatus,
} from "@mesh/types";

export interface POComparisonItem {
  productId: string;
  productCode?: string;
  productName?: string;
  quantityOrdered: number;
  unitPrice: number;
}

export interface GRComparisonItem {
  productId: string;
  quantityReceived: number;
  quantityDamaged?: number;
  inspectionStatus?: string;
  disposition?: string;
}

export interface InvoiceComparisonItem {
  productId: string;
  quantityBilled: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ThreeWayMatchInput {
  orderId: string;
  orderNumber?: string;
  invoiceId: string;
  invoiceNumber: string;
  goodsReceiptId?: string;
  poItems: POComparisonItem[];
  grItems: GRComparisonItem[];
  invoiceItems: InvoiceComparisonItem[];
  tolerancePercentage?: number; // default: 0% tolerance for price and qty
}

export interface MakerCheckerInput {
  approvalId: string;
  entityType: "INVOICE" | "ORDER" | "PAYMENT" | "TRANSFER";
  entityId: string;
  requestedAmount: number;
  createdBy: string;
  approvedBy: string;
  approvalNotes?: string;
}

export interface MakerCheckerOutcome {
  allowed: boolean;
  approvalId: string;
  status: ApprovalStatus;
  violatesSegregationOfDuties: boolean;
  approvedBy?: string;
  error?: string;
  auditTrail: string;
}

export interface InvoiceSettlementReconciliationInput {
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  payments: Array<{
    paymentId: string;
    amount: number;
    status: string;
  }>;
}

export interface SettlementReconciliationResult {
  invoiceId: string;
  invoiceNumber: string;
  invoiceTotal: number;
  totalPaid: number;
  outstandingBalance: number;
  isFullySettled: boolean;
  status: "SETTLED" | "PARTIALLY_SETTLED" | "UNPAID" | "OVERPAID";
  discrepancyAmount: number;
}

export class MatchingService {
  /**
   * Enterprise 3-Way Matching Engine:
   * Compares Purchase Order (PO), Goods Receipt (GR), and Vendor Invoice (VI).
   * Determines MATCH_CLEARED vs MATCH_VARIANCE_HOLD.
   */
  public static executeThreeWayMatch(input: ThreeWayMatchInput): ThreeWayMatchResult {
    const {
      orderId,
      invoiceId,
      poItems,
      grItems,
      invoiceItems,
      tolerancePercentage = 0,
    } = input;

    const lineResults: ThreeWayMatchLineResult[] = [];
    let hasVariance = false;
    let totalPriceVariance = 0;
    let totalQuantityVariance = 0;

    // Index PO and GR by productId
    const poMap = new Map<string, POComparisonItem>();
    poItems.forEach((p) => poMap.set(p.productId, p));

    const grMap = new Map<string, GRComparisonItem>();
    grItems.forEach((g) => grMap.set(g.productId, g));

    for (const invItem of invoiceItems) {
      const poItem = poMap.get(invItem.productId);
      const grItem = grMap.get(invItem.productId);
      const discrepancies: string[] = [];

      const qtyOrdered = poItem ? poItem.quantityOrdered : 0;
      const unitPriceOrdered = poItem ? poItem.unitPrice : 0;
      const qtyReceived = grItem ? grItem.quantityReceived - (grItem.quantityDamaged || 0) : 0;
      const qtyBilled = invItem.quantityBilled;
      const unitPriceBilled = invItem.unitPrice;

      // 1. Quantity Check: Billed quantity must not exceed undamaged received quantity
      const qtyTolerance = qtyReceived * (tolerancePercentage / 100);
      const qtyDiff = qtyBilled - qtyReceived;
      const quantityMatched = qtyDiff <= qtyTolerance && qtyDiff >= -qtyTolerance;

      if (!quantityMatched) {
        hasVariance = true;
        totalQuantityVariance += Math.abs(qtyDiff);
        if (qtyBilled > qtyReceived) {
          discrepancies.push(
            `QUANTITY_OVERBILLED: Invoiced quantity (${qtyBilled}) exceeds verified received quantity (${qtyReceived}) by ${qtyDiff}`
          );
        } else {
          discrepancies.push(
            `QUANTITY_UNDERBILLED: Invoiced quantity (${qtyBilled}) is less than received quantity (${qtyReceived})`
          );
        }
      }

      // 2. Price Check: Invoiced unit price must not exceed PO contractual price
      const priceTolerance = unitPriceOrdered * (tolerancePercentage / 100);
      const priceDiff = unitPriceBilled - unitPriceOrdered;
      const priceMatched = Math.abs(priceDiff) <= (priceTolerance + 0.001);

      if (!priceMatched) {
        hasVariance = true;
        totalPriceVariance += Math.abs(priceDiff * qtyBilled);
        discrepancies.push(
          `PRICE_MISMATCH: Invoiced unit price ($${unitPriceBilled.toFixed(2)}) deviates from contractual PO price ($${unitPriceOrdered.toFixed(2)}) by $${priceDiff.toFixed(2)}`
        );
      }

      // Check for damaged items flagged during inspection
      if (grItem && (grItem.quantityDamaged || 0) > 0) {
        discrepancies.push(
          `DAMAGED_GOODS_ALERT: ${grItem.quantityDamaged} unit(s) were flagged as damaged upon receiving inspection`
        );
      }

      lineResults.push({
        productId: invItem.productId,
        productName: poItem?.productName,
        productCode: poItem?.productCode,
        quantityOrdered: qtyOrdered,
        quantityReceived: qtyReceived,
        quantityBilled: qtyBilled,
        unitPriceOrdered,
        unitPriceBilled,
        lineTotalBilled: invItem.lineTotal,
        quantityMatched,
        priceMatched,
        discrepancies,
      });
    }

    // Check if any PO items were completely omitted from receipt or invoice
    for (const poItem of poItems) {
      if (!invoiceItems.some((i) => i.productId === poItem.productId)) {
        hasVariance = true;
        discrepanciesPush: lineResults.push({
          productId: poItem.productId,
          productName: poItem.productName,
          productCode: poItem.productCode,
          quantityOrdered: poItem.quantityOrdered,
          quantityReceived: grMap.get(poItem.productId)?.quantityReceived || 0,
          quantityBilled: 0,
          unitPriceOrdered: poItem.unitPrice,
          unitPriceBilled: 0,
          lineTotalBilled: 0,
          quantityMatched: false,
          priceMatched: false,
          discrepancies: ["UNBILLED_PO_ITEM: PO line item was not billed on invoice"],
        });
      }
    }

    const overallStatus: MatchStatus = hasVariance ? "MATCH_VARIANCE_HOLD" : "MATCH_CLEARED";
    const totalVariance = Math.round((totalPriceVariance + totalQuantityVariance) * 100) / 100;

    return {
      invoiceId,
      orderId,
      overallStatus,
      matched: !hasVariance,
      totalVariance,
      priceVariance: Math.round(totalPriceVariance * 100) / 100,
      quantityVariance: totalQuantityVariance,
      lineResults,
      requiresApproval: hasVariance,
      notes: hasVariance
        ? `Variance hold triggered: Detected ${totalQuantityVariance} quantity discrepancies and $${totalPriceVariance.toFixed(2)} price deviations. Requires secondary financial review.`
        : "Automated 3-way match cleared: PO, Goods Receipt, and Invoice are perfectly reconciled within tolerance.",
    };
  }

  /**
   * Maker-Checker Approval Workflow:
   * Enforces strict Segregation of Duties (SoD) — maker cannot approve their own creation.
   */
  public static evaluateMakerCheckerApproval(input: MakerCheckerInput): MakerCheckerOutcome {
    const {
      approvalId,
      entityType,
      entityId,
      requestedAmount,
      createdBy,
      approvedBy,
      approvalNotes,
    } = input;

    if (!createdBy || !approvedBy) {
      return {
        allowed: false,
        approvalId,
        status: "REJECTED",
        violatesSegregationOfDuties: false,
        error: "Both createdBy (maker) and approvedBy (checker) identity attributes must be provided",
        auditTrail: `[REJECTED] Incomplete identity context for ${entityType} #${entityId}.`,
      };
    }

    // Segregation of Duties Check: approvedBy !== createdBy
    if (createdBy.trim().toLowerCase() === approvedBy.trim().toLowerCase()) {
      return {
        allowed: false,
        approvalId,
        status: "REJECTED",
        violatesSegregationOfDuties: true,
        error: `Segregation of Duties Violation: Maker (${createdBy}) cannot approve their own ${entityType} request. A distinct authorized checker is required.`,
        auditTrail: `[SECURITY REJECTION] SoD Violation detected on ${entityType} #${entityId}. User ${createdBy} attempted self-approval of $${requestedAmount.toLocaleString()}.`,
      };
    }

    return {
      allowed: true,
      approvalId,
      status: "APPROVED",
      violatesSegregationOfDuties: false,
      approvedBy,
      auditTrail: `[APPROVED] ${entityType} #${entityId} ($${requestedAmount.toLocaleString()}) approved by secondary checker ${approvedBy}. Notes: ${approvalNotes || "Standard managerial clearance"}.`,
    };
  }

  /**
   * Invoice & Settlement Reconciliation:
   * Reconciles invoices against associated payment records.
   */
  public static reconcileSettlement(input: InvoiceSettlementReconciliationInput): SettlementReconciliationResult {
    const { invoiceId, invoiceNumber, invoiceTotal, payments } = input;

    const completedPayments = payments.filter((p) => p.status === "COMPLETED");
    const totalPaid = completedPayments.reduce((sum, p) => sum + p.amount, 0);
    const balance = Math.round((invoiceTotal - totalPaid) * 100) / 100;

    let status: "SETTLED" | "PARTIALLY_SETTLED" | "UNPAID" | "OVERPAID" = "UNPAID";
    if (totalPaid === 0) {
      status = "UNPAID";
    } else if (Math.abs(balance) < 0.01) {
      status = "SETTLED";
    } else if (balance > 0) {
      status = "PARTIALLY_SETTLED";
    } else {
      status = "OVERPAID";
    }

    return {
      invoiceId,
      invoiceNumber,
      invoiceTotal,
      totalPaid: Math.round(totalPaid * 100) / 100,
      outstandingBalance: Math.max(0, balance),
      isFullySettled: status === "SETTLED",
      status,
      discrepancyAmount: Math.abs(balance),
    };
  }
}
