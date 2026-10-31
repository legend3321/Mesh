import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";
import BatchController from "./Batch.controller";

const addInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({ error: "A valid companyId is required for this operation. Please specify a specific companyId." });
    }

    const { ProductID, WarehouseID, BinID, BatchID } = req.body;
    if (!ProductID || !WarehouseID) {
      return res.status(400).json({ error: "ProductID and WarehouseID are required." });
    }

    const product = await prisma.product.findFirst({
      where: {
        ProductID,
        companyId: tenantId,
      },
    });
    if (!product) {
      return res.status(400).json({ error: "Invalid ProductID: Product not found in caller company." });
    }

    const warehouse = await prisma.warehouse.findFirst({
      where: {
        WarehouseID,
        companyId: tenantId,
      },
    });
    if (!warehouse) {
      return res.status(400).json({ error: "Invalid WarehouseID: Warehouse not found in caller company." });
    }

    if (BinID) {
      const bin = await prisma.binLocation.findFirst({
        where: {
          BinID,
          WarehouseID,
          companyId: tenantId,
        },
      });
      if (!bin) {
        return res.status(400).json({ error: "Invalid BinID: Bin location not found in caller warehouse." });
      }
    }

    if (BatchID) {
      const batch = await prisma.batch.findFirst({
        where: {
          BatchID,
          ProductID,
          companyId: tenantId,
        },
      });
      if (!batch) {
        return res.status(400).json({ error: "Invalid BatchID: Batch not found or does not match Product." });
      }
    }

    const data: any = {
      InventoryAvailable: parseInt(req.body.InventoryAvailable, 10) || 0,
      MinStockLevel: parseInt(req.body.MinStockLevel, 10) || 0,
      MaxStockLevel: parseInt(req.body.MaxStockLevel, 10) || 0,
      ReorderPoint: parseInt(req.body.ReorderPoint, 10) || 0,
      ProductID,
      WarehouseID,
      BinID: BinID || null,
      BatchID: BatchID || null,
      companyId: tenantId,
    };

    const newInventory = await prisma.inventory.create({
      data,
      include: {
        Product: true,
        Warehouse: true,
        company: true,
        BinLocation: {
          include: { Zone: true },
        },
        Batch: true,
      },
    });

    res.status(200).json(newInventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editInventory = async (req: Request, res: Response) => {
  try {
    const InventoryID = req.body.InventoryID || req.params?.InventoryID;
    if (!InventoryID) {
      return res.status(400).json({ error: "InventoryID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.inventory.findFirst({
      where: {
        InventoryID: InventoryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Inventory item not found or unauthorized" });
    }

    const updateData: any = {};
    if (req.body.InventoryAvailable !== undefined) {
      updateData.InventoryAvailable = parseInt(req.body.InventoryAvailable, 10) || 0;
    }
    if (req.body.MinStockLevel !== undefined) {
      updateData.MinStockLevel = parseInt(req.body.MinStockLevel, 10) || 0;
    }
    if (req.body.MaxStockLevel !== undefined) {
      updateData.MaxStockLevel = parseInt(req.body.MaxStockLevel, 10) || 0;
    }
    if (req.body.ReorderPoint !== undefined) {
      updateData.ReorderPoint = parseInt(req.body.ReorderPoint, 10) || 0;
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
    if (req.body.WarehouseID !== undefined) {
      const warehouse = await prisma.warehouse.findFirst({
        where: {
          WarehouseID: req.body.WarehouseID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!warehouse) {
        return res.status(400).json({ error: "Invalid WarehouseID: Warehouse not found or unauthorized." });
      }
      updateData.WarehouseID = req.body.WarehouseID;
    }

    const targetWarehouseId = req.body.WarehouseID || existing.WarehouseID;
    const targetProductId = req.body.ProductID || existing.ProductID;

    if (req.body.BinID !== undefined) {
      if (req.body.BinID) {
        const bin = await prisma.binLocation.findFirst({
          where: {
            BinID: req.body.BinID,
            WarehouseID: targetWarehouseId,
            ...(tenantId ? { companyId: tenantId } : {}),
          },
        });
        if (!bin) {
          return res.status(400).json({ error: "Invalid BinID: Bin location not found or unauthorized." });
        }
      }
      updateData.BinID = req.body.BinID || null;
    }

    if (req.body.BatchID !== undefined) {
      if (req.body.BatchID) {
        const batch = await prisma.batch.findFirst({
          where: {
            BatchID: req.body.BatchID,
            ProductID: targetProductId,
            ...(tenantId ? { companyId: tenantId } : {}),
          },
        });
        if (!batch) {
          return res.status(400).json({ error: "Invalid BatchID: Batch not found or unauthorized." });
        }
      }
      updateData.BatchID = req.body.BatchID || null;
    }

    delete updateData.companyId;

    const updatedInventory = await prisma.inventory.update({
      where: {
        InventoryID: InventoryID,
      },
      data: updateData,
      include: {
        Product: true,
        Warehouse: true,
        company: true,
        BinLocation: {
          include: { Zone: true },
        },
        Batch: true,
      },
    });

    res.status(200).json(updatedInventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllInventorys = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Inventorys = await prisma.inventory.findMany({
      where: { companyId: tenantId },
      include: {
        Product: true,
        Warehouse: true,
        company: true,
        BinLocation: {
          include: { Zone: true },
        },
        Batch: true,
      },
    });

    res.status(200).json(Inventorys);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getInventory = async (
  req: Request<{ InventoryID: string }>,
  res: Response
) => {
  try {
    const tenantId = getTenantId(req);
    const inventory = await prisma.inventory.findFirst({
      where: {
        InventoryID: req.params.InventoryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        Product: true,
        Warehouse: true,
        company: true,
        BinLocation: {
          include: { Zone: true },
        },
        Batch: true,
      },
    });

    if (!inventory) {
      return res.status(404).json({ error: "Inventory item not found or unauthorized" });
    }

    res.status(200).json(inventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteInventory = async (
  req: Request<{ InventoryID: string }>,
  res: Response
) => {
  try {
    const InventoryID = req.params.InventoryID;
    if (!InventoryID) {
      return res.status(400).json({ error: "InventoryID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.inventory.findFirst({
      where: {
        InventoryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Inventory item not found or unauthorized" });
    }

    const Inventory = await prisma.inventory.delete({
      where: {
        InventoryID,
      },
    });

    res.status(200).json(Inventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addInventory,
  editInventory,
  getAllInventorys,
  getInventory,
  deleteInventory,
  fefoPicking: BatchController.getFefoPickingPlan,
};
