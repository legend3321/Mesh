import {
  BinLocation,
  Batch,
  RMADisposition,
  FefoPickingRequest,
  FefoPickingResponse,
  FefoPickingAllocation,
  RmaIntakeRequest,
  RmaIntakeResponse,
} from "@mesh/types";

export interface WmsBinCandidate {
  binId: string;
  binCode: string;
  aisle: string;
  rack: string;
  shelf: string;
  bin: string;
  zoneType: "BULK" | "HIGH_BAY" | "COLD_CHAIN" | "PICK_PACK";
  maxWeightKg: number;
  maxVolumeCbm: number;
  currentWeightKg: number;
  currentVolumeCbm: number;
  warehouseId: string;
  isRefrigeratedWarehouse?: boolean;
}

export interface BinPlacementRequest {
  productId: string;
  productCode: string;
  quantity: number;
  unitWeightKg: number;
  unitVolumeCbm: number;
  requiresRefrigeration: boolean;
  warehouseId: string;
}

export interface BinPlacementResult {
  success: boolean;
  binCode?: string;
  binId?: string;
  zoneType?: string;
  allocatedQuantity: number;
  remainingWeightCapacityKg?: number;
  remainingVolumeCapacityCbm?: number;
  error?: string;
  notes?: string;
}

export class WmsService {
  /**
   * WMS Dynamic Bin Allocation:
   * Selects an optimal bin satisfying capacity (weight, volume) and zone/temperature constraints.
   */
  public static allocateBinPlacement(
    request: BinPlacementRequest,
    availableBins: WmsBinCandidate[]
  ): BinPlacementResult {
    const totalWeightNeeded = request.quantity * request.unitWeightKg;
    const totalVolumeNeeded = request.quantity * request.unitVolumeCbm;

    // Filter bins belonging to the target warehouse
    const warehouseBins = availableBins.filter(
      (b) => b.warehouseId === request.warehouseId
    );

    if (warehouseBins.length === 0) {
      return {
        success: false,
        allocatedQuantity: 0,
        error: `No bin infrastructure configured for warehouse ${request.warehouseId}`,
      };
    }

    // Filter by refrigeration/zone compatibility
    const compatibleBins = warehouseBins.filter((b) => {
      if (request.requiresRefrigeration) {
        return b.zoneType === "COLD_CHAIN" || b.isRefrigeratedWarehouse === true;
      }
      return true;
    });

    if (compatibleBins.length === 0) {
      return {
        success: false,
        allocatedQuantity: 0,
        error: `Cold chain requirement violation: No refrigerated or COLD_CHAIN bins available in target warehouse`,
      };
    }

    // Filter by capacity (weight and volume)
    const candidates = compatibleBins.filter((b) => {
      const freeWeight = b.maxWeightKg - b.currentWeightKg;
      const freeVolume = b.maxVolumeCbm - b.currentVolumeCbm;
      return freeWeight >= totalWeightNeeded && freeVolume >= totalVolumeNeeded;
    });

    if (candidates.length === 0) {
      return {
        success: false,
        allocatedQuantity: 0,
        error: `Capacity overflow: Requested ${request.quantity} units (${totalWeightNeeded}kg, ${totalVolumeNeeded}m³) exceed all available candidate bin capacities`,
      };
    }

    // Select optimal bin (best-fit: bin with lowest remaining capacity that still fits to maximize consolidation)
    candidates.sort((a, b) => {
      const remainingVolA = a.maxVolumeCbm - a.currentVolumeCbm - totalVolumeNeeded;
      const remainingVolB = b.maxVolumeCbm - b.currentVolumeCbm - totalVolumeNeeded;
      return remainingVolA - remainingVolB;
    });

    const chosen = candidates[0];
    const newWeight = Math.round((chosen.currentWeightKg + totalWeightNeeded) * 100) / 100;
    const newVolume = Math.round((chosen.currentVolumeCbm + totalVolumeNeeded) * 100) / 100;

    return {
      success: true,
      binId: chosen.binId,
      binCode: chosen.binCode,
      zoneType: chosen.zoneType,
      allocatedQuantity: request.quantity,
      remainingWeightCapacityKg: Math.round((chosen.maxWeightKg - newWeight) * 100) / 100,
      remainingVolumeCapacityCbm: Math.round((chosen.maxVolumeCbm - newVolume) * 100) / 100,
      notes: `Optimal bin ${chosen.binCode} (${chosen.zoneType}) allocated for ${request.quantity} units of SKU ${request.productCode}.`,
    };
  }

  /**
   * FEFO (First-Expired, First-Out) Batch Allocation:
   * Prioritizes inventory lots by earliest expiry date.
   * Quarantines expired lots and prevents perishable obsolescence.
   */
  public static allocateFefoPicking(
    request: FefoPickingRequest,
    product: { ProductID: string; ProductName: string; ProductCode: string },
    batches: Array<{
      BatchID: string;
      BatchNumber: string;
      ProductID: string;
      ManufacturingDate: string | Date;
      ExpiryDate: string | Date;
      QualityStatus: string;
      InventoryAvailable: number;
      WarehouseID: string;
      WarehouseName?: string;
      BinCode?: string | null;
      Aisle?: string | null;
      Rack?: string | null;
      Shelf?: string | null;
      Bin?: string | null;
      ZoneName?: string | null;
    }>,
    asOfDate: Date = new Date()
  ): FefoPickingResponse {
    const relevantBatches = batches.filter(
      (b) =>
        b.ProductID === request.productId &&
        (!request.warehouseId || b.WarehouseID === request.warehouseId)
    );

    const allocations: FefoPickingAllocation[] = [];
    const expiredStockFound: Array<{
      batchId: string;
      batchNumber: string;
      expiryDate: string | Date;
      quantity: number;
      warehouseId: string;
      binCode?: string | null;
    }> = [];
    const warnings: string[] = [];

    // Separate expired/quarantined batches from active batches
    const activeCandidates: typeof relevantBatches = [];
    for (const b of relevantBatches) {
      const expiry = new Date(b.ExpiryDate);
      if (expiry <= asOfDate || b.QualityStatus === "EXPIRED" || b.QualityStatus === "QUARANTINED") {
        expiredStockFound.push({
          batchId: b.BatchID,
          batchNumber: b.BatchNumber,
          expiryDate: b.ExpiryDate,
          quantity: b.InventoryAvailable,
          warehouseId: b.WarehouseID,
          binCode: b.BinCode,
        });
        warnings.push(
          `FEFO Quarantine Warning: Batch ${b.BatchNumber} (Stock: ${b.InventoryAvailable}) expired on ${expiry.toISOString().split("T")[0]} - skipped from picking wave.`
        );
      } else {
        activeCandidates.push(b);
      }
    }

    // Sort strictly in FEFO order: earliest expiry date first
    activeCandidates.sort((a, b) => new Date(a.ExpiryDate).getTime() - new Date(b.ExpiryDate).getTime());

    let remainingNeeded = request.requestedQuantity;

    for (const b of activeCandidates) {
      if (remainingNeeded <= 0) break;
      if (b.InventoryAvailable <= 0) continue;

      const take = Math.min(b.InventoryAvailable, remainingNeeded);
      allocations.push({
        batchId: b.BatchID,
        batchNumber: b.BatchNumber,
        expiryDate: b.ExpiryDate,
        manufacturingDate: b.ManufacturingDate,
        inventoryId: `inv_${b.BatchID}`,
        warehouseId: b.WarehouseID,
        warehouseName: b.WarehouseName || "Primary Depot",
        binId: `bin_${b.BinCode}`,
        binCode: b.BinCode || "A01-R01-S01-B01",
        aisle: b.Aisle || "A01",
        rack: b.Rack || "R01",
        shelf: b.Shelf || "S01",
        bin: b.Bin || "B01",
        zoneName: b.ZoneName || "PICK_PACK",
        allocatedQuantity: take,
        availableStockInBatch: b.InventoryAvailable,
      });

      remainingNeeded -= take;
    }

    const totalAllocated = request.requestedQuantity - remainingNeeded;
    const fullyAllocated = remainingNeeded === 0;

    if (!fullyAllocated) {
      warnings.push(
        `Partial Allocation: Requested ${request.requestedQuantity} units, but only ${totalAllocated} units of non-expired stock available across active lots.`
      );
    }

    return {
      productId: product.ProductID,
      productName: product.ProductName,
      productCode: product.ProductCode,
      requestedQuantity: request.requestedQuantity,
      totalAllocatedQuantity: totalAllocated,
      remainingUnfulfilledQuantity: remainingNeeded,
      fullyAllocated,
      allocations,
      warnings,
      expiredStockFound: expiredStockFound.length > 0 ? expiredStockFound : undefined,
    };
  }

  /**
   * RMA Reverse Logistics Intake:
   * Processes returns, determines disposition (RESTOCK vs QUARANTINE vs SCRAP),
   * updates stock if undamaged, or diverts to quarantine if defective.
   */
  public static processRmaIntake(input: {
    rmaNumber: string;
    customerId: string;
    orderId?: string;
    items: Array<{
      productId: string;
      quantity: number;
      condition: "UNOPENED" | "OPENED_INTACT" | "DEFECTIVE" | "DAMAGED";
      unitCost: number;
      warehouseId: string;
      binId?: string;
    }>;
  }): {
    rmaNumber: string;
    status: "PROCESSED";
    totalCreditIssued: number;
    restockedItemsCount: number;
    quarantinedItemsCount: number;
    scrappedItemsCount: number;
    receipts: Array<{
      productId: string;
      quantity: number;
      condition: string;
      disposition: RMADisposition;
      inventoryRestocked: boolean;
      creditIssued: number;
      notes: string;
    }>;
  } {
    let totalCredit = 0;
    let restockedCount = 0;
    let quarantinedCount = 0;
    let scrappedCount = 0;

    const receipts = input.items.map((item) => {
      let disposition: RMADisposition;
      let inventoryRestocked = false;
      let creditIssued = 0;
      let notes = "";

      switch (item.condition) {
        case "UNOPENED":
          disposition = "RESTOCK";
          inventoryRestocked = true;
          creditIssued = item.quantity * item.unitCost;
          restockedCount += item.quantity;
          notes = "Full credit issued. Factory seal intact; returned to active inventory.";
          break;

        case "OPENED_INTACT":
          disposition = "RESTOCK";
          inventoryRestocked = true;
          // 15% restocking fee
          creditIssued = item.quantity * item.unitCost * 0.85;
          restockedCount += item.quantity;
          notes = "Restocked after inspection. Standard 15% restocking deduction applied.";
          break;

        case "DEFECTIVE":
          disposition = "QUARANTINE";
          inventoryRestocked = false;
          creditIssued = item.quantity * item.unitCost; // Full refund to customer, but item segregated
          quarantinedCount += item.quantity;
          notes = "Item routed to Quarantine Bay for manufacturer RMA vendor return. Not placed in sellable stock.";
          break;

        case "DAMAGED":
        default:
          disposition = "SCRAP";
          inventoryRestocked = false;
          creditIssued = 0;
          scrappedCount += item.quantity;
          notes = "Customer-induced damage. Scrapped without credit in write-off ledger.";
          break;
      }

      totalCredit += creditIssued;

      return {
        productId: item.productId,
        quantity: item.quantity,
        condition: item.condition,
        disposition,
        inventoryRestocked,
        creditIssued: Math.round(creditIssued * 100) / 100,
        notes,
      };
    });

    return {
      rmaNumber: input.rmaNumber,
      status: "PROCESSED",
      totalCreditIssued: Math.round(totalCredit * 100) / 100,
      restockedItemsCount: restockedCount,
      quarantinedItemsCount: quarantinedCount,
      scrappedItemsCount: scrappedCount,
      receipts,
    };
  }
}
