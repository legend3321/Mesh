import { prisma } from "../db";
import {
  MatchStatus,
  ThreeWayMatchResult,
  ThreeWayMatchLineResult,
} from "@mesh/types";

export class MatchingEngineService {
  /**
   * Automated Three-Way Matching Engine:
   * Compares Purchase Order (PO), Goods Receipt (GR), and Vendor Invoice (VI).
   * Enforces <= 1.0% quantity tolerance and unit price matching within $0.01.
   *
   * @param invoiceId - ID of the VendorInvoice to reconcile
   * @param tenantId  - Tenant companyId scoping (optional)
   * @returns ThreeWayMatchResult
   */
  public static async matchInvoice(
    invoiceId: string,
    tenantId?: string
  ): Promise<ThreeWayMatchResult> {
    const invoice = await prisma.vendorInvoice.findFirst({
      where: {
        InvoiceID: invoiceId,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        Order: {
          include: {
            Orderdetail: {
              include: {
                Products: true,
              },
            },
          },
        },
        Provider: true,
      },
    });

    if (!invoice) {
      throw new Error(`VendorInvoice with ID '${invoiceId}' not found or unauthorized.`);
    }

    // Edge Case: No linked Purchase Order
    if (!invoice.OrderID) {
      const notes = `Variance Hold: Invoice #${invoice.InvoiceNumber} has no associated Purchase Order (OrderID is null). Cannot execute 3-way match.`;
      const overallStatus: MatchStatus = "MATCH_VARIANCE_HOLD";

      await prisma.vendorInvoice.update({
        where: { InvoiceID: invoice.InvoiceID },
        data: {
          MatchStatus: overallStatus,
          MatchNotes: notes,
        },
      });

      return {
        invoiceId: invoice.InvoiceID,
        orderId: null,
        overallStatus,
        matched: false,
        totalVariance: invoice.TotalAmount || 0,
        priceVariance: 0,
        quantityVariance: 0,
        lineResults: [],
        requiresApproval: true,
        notes,
      };
    }

    // Retrieve all GoodsReceipt records (with items) for the linked OrderID
    const goodsReceipts = await prisma.goodsReceipt.findMany({
      where: {
        OrderID: invoice.OrderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
      },
    });

    const lineResults: ThreeWayMatchLineResult[] = [];
    let totalPriceVariance = 0;
    let totalQuantityVariance = 0;
    let totalDollarVariance = 0;
    let allLinesPass = invoice.items.length > 0;

    if (invoice.items.length === 0) {
      allLinesPass = false;
    }

    // Flatten all GoodsReceipt items for lookup
    const allReceiptItems = goodsReceipts.flatMap((gr) => gr.items);

    // Evaluate each Invoice Line Item
    for (const invItem of invoice.items) {
      const productId = invItem.ProductID;
      const product = invItem.Product;
      const quantityBilled = invItem.QuantityBilled;
      const unitPriceBilled = invItem.UnitPrice;
      const lineTotalBilled = invItem.LineTotal;

      // 1. Identify committed PO quantity & unit price from Orderdetail (or fallback to Product CostPrice)
      const matchingOrderDetails = (invoice.Order?.Orderdetail || []).filter(
        (od) =>
          od.ProductIDs.includes(productId) ||
          od.Products?.ProductID === productId
      );

      const poQuantity = matchingOrderDetails.reduce(
        (sum, od) => sum + (od.OrderQuantity || 0),
        0
      );

      let poUnitPrice = 0;
      if (
        matchingOrderDetails.length > 0 &&
        matchingOrderDetails[0].UnitPrice !== null &&
        matchingOrderDetails[0].UnitPrice !== undefined &&
        matchingOrderDetails[0].UnitPrice > 0
      ) {
        poUnitPrice = matchingOrderDetails[0].UnitPrice;
      } else if (product?.CostPrice) {
        poUnitPrice = product.CostPrice;
      } else {
        poUnitPrice = unitPriceBilled; // Fallback if no PO price specified
      }

      // 2. Identify physical received quantity from GoodsReceipt items (accounting for QuantityDamaged / Disposition)
      const matchingReceiptItems = allReceiptItems.filter(
        (ri) => ri.ProductID === productId
      );

      let physicalReceivedQty = 0;
      let totalDamagedQty = 0;

      for (const ri of matchingReceiptItems) {
        const isRejectedDisposition =
          ri.Disposition === "REJECTED" ||
          ri.Disposition === "QUARANTINED" ||
          ri.Disposition === "RETURNED";

        const damaged = ri.QuantityDamaged || 0;
        totalDamagedQty += damaged;

        if (!isRejectedDisposition) {
          // Undamaged, accepted received quantity
          physicalReceivedQty += Math.max(0, ri.QuantityReceived - damaged);
        }
      }

      // 3. Tolerance Checks
      // Quantity tolerance threshold: <= 1.0% (0.01)
      // Math.abs(QuantityBilled - QuantityReceived) / Math.max(QuantityReceived, 1) <= 0.01
      const qtyDiff = Math.abs(quantityBilled - physicalReceivedQty);
      const qtyDenominator = Math.max(physicalReceivedQty, 1);
      const qtyToleranceRatio = qtyDiff / qtyDenominator;
      const quantityMatched = qtyToleranceRatio <= 0.0100001;

      // Price tolerance: UnitPrice billed must match PO unit price (within $0.01)
      const priceDiff = Math.abs(unitPriceBilled - poUnitPrice);
      const priceMatched = priceDiff <= 0.0100001;

      // Discrepancy reporting
      const discrepancies: string[] = [];

      if (!quantityMatched) {
        allLinesPass = false;
        const variancePct = (qtyToleranceRatio * 100).toFixed(2);
        discrepancies.push(
          `Quantity discrepancy: Billed ${quantityBilled} vs Physical Received ${physicalReceivedQty} (${variancePct}% variance exceeds <= 1.0% tolerance)`
        );
      }

      if (!priceMatched) {
        allLinesPass = false;
        discrepancies.push(
          `Unit price discrepancy: Billed $${unitPriceBilled.toFixed(2)} vs PO price $${poUnitPrice.toFixed(2)} (Difference $${priceDiff.toFixed(2)} exceeds $0.01)`
        );
      }

      if (matchingReceiptItems.length === 0) {
        discrepancies.push("Physical goods receipt missing: No GoodsReceipt record logged for this product");
      } else if (totalDamagedQty > 0) {
        discrepancies.push(`Receiving alert: ${totalDamagedQty} damaged unit(s) were flagged and excluded from clearing`);
      }

      // Track variances
      const lineQtyVariance = Math.abs(quantityBilled - physicalReceivedQty);
      const linePriceVariance = Math.abs(unitPriceBilled - poUnitPrice) * quantityBilled;
      const lineTotalExpected = physicalReceivedQty * poUnitPrice;
      const lineDollarVariance = Math.abs(lineTotalBilled - lineTotalExpected);

      totalQuantityVariance += lineQtyVariance;
      totalPriceVariance += linePriceVariance;
      totalDollarVariance += lineDollarVariance;

      lineResults.push({
        productId,
        productName: product?.ProductName,
        productCode: product?.ProductCode,
        quantityOrdered: poQuantity,
        quantityReceived: physicalReceivedQty,
        quantityBilled,
        unitPriceOrdered: poUnitPrice,
        unitPriceBilled,
        lineTotalBilled,
        quantityMatched,
        priceMatched,
        discrepancies,
      });
    }

    // 4. Overall Decision
    const overallStatus: MatchStatus = allLinesPass ? "MATCH_CLEARED" : "MATCH_VARIANCE_HOLD";

    let matchNotes: string;
    if (invoice.items.length === 0) {
      matchNotes = "Variance Hold: Invoice contains no line items to perform 3-way matching.";
    } else if (allLinesPass) {
      matchNotes = `3-Way Match CLEARED: All ${lineResults.length} item line(s) reconciled against PO #${invoice.OrderID.slice(-6).toUpperCase()} and Goods Receipts within 1% quantity and $0.01 price tolerances.`;
    } else {
      const failedSummaries = lineResults
        .filter((l) => l.discrepancies.length > 0)
        .map((l) => `[${l.productCode || l.productId}]: ${l.discrepancies.join("; ")}`)
        .join(" | ");
      matchNotes = `3-Way Match VARIANCE HOLD: ${failedSummaries}`;
    }

    // 5. Update database record for VendorInvoice
    await prisma.vendorInvoice.update({
      where: { InvoiceID: invoice.InvoiceID },
      data: {
        MatchStatus: overallStatus,
        MatchNotes: matchNotes,
      },
    });

    return {
      invoiceId: invoice.InvoiceID,
      orderId: invoice.OrderID,
      overallStatus,
      matched: allLinesPass,
      totalVariance: Math.round(totalDollarVariance * 100) / 100,
      priceVariance: Math.round(totalPriceVariance * 100) / 100,
      quantityVariance: totalQuantityVariance,
      lineResults,
      requiresApproval: !allLinesPass,
      notes: matchNotes,
    };
  }
}

export default MatchingEngineService;
