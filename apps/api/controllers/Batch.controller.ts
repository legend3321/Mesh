import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { FefoPickingAllocation, FefoPickingResponse } from "@mesh/types";

const addBatch = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const {
      BatchNumber,
      ProductID,
      ManufacturingDate,
      ExpiryDate,
      SupplierLotNumber,
      QualityStatus,
    } = req.body;

    if (!BatchNumber || !ProductID || !ManufacturingDate || !ExpiryDate) {
      return res.status(400).json({
        error: "BatchNumber, ProductID, ManufacturingDate, and ExpiryDate are required.",
      });
    }

    // Verify product belongs to caller company
    const product = await prisma.product.findFirst({
      where: {
        ProductID,
        companyId: tenantId,
      },
    });
    if (!product) {
      return res.status(400).json({ error: "Invalid ProductID: Product not found in caller company." });
    }

    const mfgDate = new Date(ManufacturingDate);
    const expDate = new Date(ExpiryDate);
    if (isNaN(mfgDate.getTime()) || isNaN(expDate.getTime())) {
      return res.status(400).json({ error: "Invalid date format for ManufacturingDate or ExpiryDate." });
    }

    if (expDate <= mfgDate) {
      return res.status(400).json({ error: "ExpiryDate must be strictly after ManufacturingDate." });
    }

    const newBatch = await prisma.batch.create({
      data: {
        BatchNumber: String(BatchNumber).trim().toUpperCase(),
        ProductID,
        ManufacturingDate: mfgDate,
        ExpiryDate: expDate,
        SupplierLotNumber: SupplierLotNumber ? String(SupplierLotNumber).trim() : null,
        QualityStatus: QualityStatus ? String(QualityStatus).trim().toUpperCase() : "RELEASED",
        companyId: tenantId,
      },
      include: {
        Product: true,
        Inventory: true,
      },
    });

    res.status(201).json(newBatch);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const editBatch = async (req: Request, res: Response) => {
  try {
    const BatchID = req.body.BatchID || req.params?.BatchID;
    if (!BatchID) {
      return res.status(400).json({ error: "BatchID is required." });
    }

    const tenantId = getTenantId(req, true);
    const existing = await prisma.batch.findFirst({
      where: {
        BatchID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Batch not found or unauthorized." });
    }

    const updateData: any = {};
    if (req.body.BatchNumber !== undefined) {
      updateData.BatchNumber = String(req.body.BatchNumber).trim().toUpperCase();
    }
    if (req.body.SupplierLotNumber !== undefined) {
      updateData.SupplierLotNumber = req.body.SupplierLotNumber ? String(req.body.SupplierLotNumber).trim() : null;
    }
    if (req.body.QualityStatus !== undefined) {
      updateData.QualityStatus = String(req.body.QualityStatus).trim().toUpperCase();
    }

    let mfgDate = existing.ManufacturingDate;
    let expDate = existing.ExpiryDate;

    if (req.body.ManufacturingDate !== undefined) {
      mfgDate = new Date(req.body.ManufacturingDate);
      if (isNaN(mfgDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format for ManufacturingDate." });
      }
      updateData.ManufacturingDate = mfgDate;
    }

    if (req.body.ExpiryDate !== undefined) {
      expDate = new Date(req.body.ExpiryDate);
      if (isNaN(expDate.getTime())) {
        return res.status(400).json({ error: "Invalid date format for ExpiryDate." });
      }
      updateData.ExpiryDate = expDate;
    }

    if (expDate <= mfgDate) {
      return res.status(400).json({ error: "ExpiryDate must be strictly after ManufacturingDate." });
    }

    if (req.body.ProductID !== undefined) {
      const product = await prisma.product.findFirst({
        where: {
          ProductID: req.body.ProductID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!product) {
        return res.status(400).json({ error: "Invalid ProductID: Product not found or unauthorized." });
      }
      updateData.ProductID = req.body.ProductID;
    }

    const updatedBatch = await prisma.batch.update({
      where: { BatchID },
      data: updateData,
      include: {
        Product: true,
        Inventory: true,
      },
    });

    res.status(200).json(updatedBatch);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getAllBatches = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const batches = await prisma.batch.findMany({
      where: { companyId: tenantId },
      include: {
        Product: true,
        Inventory: {
          include: {
            Warehouse: true,
            BinLocation: {
              include: { Zone: true },
            },
          },
        },
      },
      orderBy: { ExpiryDate: "asc" },
    });

    res.status(200).json(batches);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getBatchesByProduct = async (req: Request, res: Response) => {
  try {
    const ProductID = req.params.ProductID || (req.query.productId as string);
    if (!ProductID) {
      return res.status(400).json({ error: "ProductID is required." });
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const batches = await prisma.batch.findMany({
      where: {
        ProductID,
        companyId: tenantId,
      },
      include: {
        Product: true,
        Inventory: {
          include: {
            Warehouse: true,
            BinLocation: true,
          },
        },
      },
      orderBy: { ExpiryDate: "asc" },
    });

    res.status(200).json(batches);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const deleteBatch = async (req: Request<{ BatchID: string }>, res: Response) => {
  try {
    const BatchID = req.params.BatchID;
    if (!BatchID) {
      return res.status(400).json({ error: "BatchID is required." });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.batch.findFirst({
      where: {
        BatchID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Batch not found or unauthorized." });
    }

    // Check if any inventory holds this batch
    const inventoryCount = await prisma.inventory.count({
      where: { BatchID },
    });
    if (inventoryCount > 0) {
      return res.status(400).json({
        error: `Cannot delete batch. There are ${inventoryCount} inventory record(s) linked to this batch.`,
      });
    }

    const deletedBatch = await prisma.batch.delete({
      where: { BatchID },
    });

    res.status(200).json(deletedBatch);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

/**
 * FEFO (First Expired First Out) Picking Suggestion Algorithm
 * Evaluates active stock across batches and bin locations, sorting by earliest ExpiryDate.
 * Emits critical warnings if expired inventory exists.
 */
const getFefoPickingPlan = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(400).json({ error: "A valid company context is required." });
    }

    const productId = (req.body.productId || req.query.productId) as string;
    const requestedQtyInput = req.body.requestedQuantity ?? req.query.requestedQuantity;
    const requestedQuantity = parseInt(String(requestedQtyInput), 10);
    const warehouseId = (req.body.warehouseId || req.query.warehouseId) as string | undefined;

    if (!productId || isNaN(requestedQuantity) || requestedQuantity <= 0) {
      return res.status(400).json({
        error: "Valid productId and positive requestedQuantity are required for FEFO picking.",
      });
    }

    // Verify product exists in caller's company
    const product = await prisma.product.findFirst({
      where: {
        ProductID: productId,
        companyId: tenantId,
      },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found or unauthorized." });
    }

    const now = new Date();
    const warnings: string[] = [];
    const expiredStockFound: FefoPickingResponse["expiredStockFound"] = [];

    // Query all batches and inventories for this product
    const batches = await prisma.batch.findMany({
      where: {
        ProductID: productId,
        companyId: tenantId,
      },
      include: {
        Inventory: {
          where: {
            ...(warehouseId ? { WarehouseID: warehouseId } : {}),
            InventoryAvailable: { gt: 0 },
          },
          include: {
            Warehouse: true,
            BinLocation: {
              include: { Zone: true },
            },
          },
        },
      },
      orderBy: { ExpiryDate: "asc" },
    });

    // Check for expired batches and active stock in them
    for (const batch of batches) {
      const expDate = new Date(batch.ExpiryDate);
      if (expDate.getTime() < now.getTime()) {
        const totalExpiredInBatch = batch.Inventory.reduce(
          (sum, inv) => sum + inv.InventoryAvailable,
          0
        );
        if (totalExpiredInBatch > 0) {
          warnings.push(
            `CRITICAL WARNING: Batch ${batch.BatchNumber} (Lot: ${batch.SupplierLotNumber || "N/A"}) expired on ${expDate.toISOString().split("T")[0]} with ${totalExpiredInBatch} active unit(s) in stock! Stock is quarantined from picking.`
          );
          for (const inv of batch.Inventory) {
            expiredStockFound.push({
              batchId: batch.BatchID,
              batchNumber: batch.BatchNumber,
              expiryDate: batch.ExpiryDate,
              quantity: inv.InventoryAvailable,
              warehouseId: inv.WarehouseID,
              binCode: inv.BinLocation?.BinCode || "UNASSIGNED",
            });
          }
        }
      }
    }

    // Valid batches: ExpiryDate >= now, QualityStatus == RELEASED
    const validBatches = batches.filter((b) => {
      const expDate = new Date(b.ExpiryDate);
      const isNotExpired = expDate.getTime() >= now.getTime();
      const isReleased = b.QualityStatus.toUpperCase() === "RELEASED";
      if (!isReleased && b.Inventory.some((inv) => inv.InventoryAvailable > 0)) {
        warnings.push(
          `NOTICE: Batch ${b.BatchNumber} skipped due to QualityStatus '${b.QualityStatus}'.`
        );
      }
      return isNotExpired && isReleased;
    });

    const allocations: FefoPickingAllocation[] = [];
    let remainingToAllocate = requestedQuantity;

    for (const batch of validBatches) {
      if (remainingToAllocate <= 0) break;

      for (const inv of batch.Inventory) {
        if (remainingToAllocate <= 0) break;
        if (inv.InventoryAvailable <= 0) continue;

        const pickQty = Math.min(inv.InventoryAvailable, remainingToAllocate);

        allocations.push({
          batchId: batch.BatchID,
          batchNumber: batch.BatchNumber,
          expiryDate: batch.ExpiryDate,
          manufacturingDate: batch.ManufacturingDate,
          inventoryId: inv.InventoryID,
          warehouseId: inv.WarehouseID,
          warehouseName: inv.Warehouse?.WarehouseName || "Warehouse",
          binId: inv.BinID,
          binCode: inv.BinLocation?.BinCode || "UNASSIGNED",
          aisle: inv.BinLocation?.Aisle || null,
          rack: inv.BinLocation?.Rack || null,
          shelf: inv.BinLocation?.Shelf || null,
          bin: inv.BinLocation?.Bin || null,
          zoneName: inv.BinLocation?.Zone?.ZoneName || null,
          allocatedQuantity: pickQty,
          availableStockInBatch: inv.InventoryAvailable,
        });

        remainingToAllocate -= pickQty;
      }
    }

    // Check if unbatched inventory exists to fulfill remaining requested amount
    if (remainingToAllocate > 0) {
      const unbatchedInventories = await prisma.inventory.findMany({
        where: {
          ProductID: productId,
          companyId: tenantId,
          BatchID: null,
          InventoryAvailable: { gt: 0 },
          ...(warehouseId ? { WarehouseID: warehouseId } : {}),
        },
        include: {
          Warehouse: true,
          BinLocation: { include: { Zone: true } },
        },
      });

      for (const inv of unbatchedInventories) {
        if (remainingToAllocate <= 0) break;
        const pickQty = Math.min(inv.InventoryAvailable, remainingToAllocate);

        allocations.push({
          batchId: "UNBATCHED",
          batchNumber: "UNASSIGNED-BATCH",
          expiryDate: new Date(Date.now() + 365 * 24 * 3600 * 1000),
          manufacturingDate: new Date(),
          inventoryId: inv.InventoryID,
          warehouseId: inv.WarehouseID,
          warehouseName: inv.Warehouse?.WarehouseName || "Warehouse",
          binId: inv.BinID,
          binCode: inv.BinLocation?.BinCode || "UNASSIGNED",
          aisle: inv.BinLocation?.Aisle || null,
          rack: inv.BinLocation?.Rack || null,
          shelf: inv.BinLocation?.Shelf || null,
          bin: inv.BinLocation?.Bin || null,
          zoneName: inv.BinLocation?.Zone?.ZoneName || null,
          allocatedQuantity: pickQty,
          availableStockInBatch: inv.InventoryAvailable,
        });

        remainingToAllocate -= pickQty;
        warnings.push(
          `NOTICE: ${pickQty} unit(s) allocated from unbatched inventory (ID: ${inv.InventoryID}). Assign batch/lot tracking.`
        );
      }
    }

    const totalAllocated = requestedQuantity - remainingToAllocate;
    if (remainingToAllocate > 0) {
      warnings.push(
        `SHORTAGE WARNING: Requested ${requestedQuantity} units, but only ${totalAllocated} units could be allocated across active, unexpired batches. Remaining unfulfilled: ${remainingToAllocate}.`
      );
    }

    const responsePayload: FefoPickingResponse = {
      productId,
      productName: product.ProductName,
      productCode: product.ProductCode,
      requestedQuantity,
      totalAllocatedQuantity: totalAllocated,
      remainingUnfulfilledQuantity: remainingToAllocate,
      fullyAllocated: remainingToAllocate === 0,
      allocations,
      warnings,
      expiredStockFound: expiredStockFound.length > 0 ? expiredStockFound : undefined,
    };

    res.status(200).json(responsePayload);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

export default {
  addBatch,
  editBatch,
  getAllBatches,
  getBatchesByProduct,
  deleteBatch,
  getFefoPickingPlan,
};
