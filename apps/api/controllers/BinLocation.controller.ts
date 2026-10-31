import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";

const addBinLocation = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const {
      BinCode,
      Aisle,
      Rack,
      Shelf,
      Bin,
      MaxWeightKg,
      MaxVolumeCbm,
      ZoneID,
      WarehouseID,
    } = req.body;

    if (!BinCode || !Aisle || !Rack || !Shelf || !Bin || !ZoneID || !WarehouseID) {
      return res.status(400).json({
        error: "BinCode, Aisle, Rack, Shelf, Bin, ZoneID, and WarehouseID are required.",
      });
    }

    // Verify warehouse belongs to caller company
    const warehouse = await prisma.warehouse.findFirst({
      where: {
        WarehouseID,
        companyId: tenantId,
      },
    });
    if (!warehouse) {
      return res.status(400).json({ error: "Invalid WarehouseID: Warehouse not found in caller company." });
    }

    // Verify zone belongs to caller company and warehouse
    const zone = await prisma.zone.findFirst({
      where: {
        ZoneID,
        WarehouseID,
        companyId: tenantId,
      },
    });
    if (!zone) {
      return res.status(400).json({
        error: "Invalid ZoneID: Zone not found or does not belong to the specified warehouse.",
      });
    }

    const newBin = await prisma.binLocation.create({
      data: {
        BinCode: String(BinCode).trim().toUpperCase(),
        Aisle: String(Aisle).trim(),
        Rack: String(Rack).trim(),
        Shelf: String(Shelf).trim(),
        Bin: String(Bin).trim(),
        MaxWeightKg: MaxWeightKg !== undefined && MaxWeightKg !== null ? parseFloat(MaxWeightKg) : null,
        MaxVolumeCbm: MaxVolumeCbm !== undefined && MaxVolumeCbm !== null ? parseFloat(MaxVolumeCbm) : null,
        ZoneID,
        WarehouseID,
        companyId: tenantId,
      },
      include: {
        Zone: true,
        Warehouse: true,
      },
    });

    res.status(201).json(newBin);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const editBinLocation = async (req: Request, res: Response) => {
  try {
    const BinID = req.body.BinID || req.params?.BinID;
    if (!BinID) {
      return res.status(400).json({ error: "BinID is required." });
    }

    const tenantId = getTenantId(req, true);
    const existing = await prisma.binLocation.findFirst({
      where: {
        BinID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Bin location not found or unauthorized." });
    }

    const updateData: any = {};
    if (req.body.BinCode !== undefined) {
      updateData.BinCode = String(req.body.BinCode).trim().toUpperCase();
    }
    if (req.body.Aisle !== undefined) updateData.Aisle = String(req.body.Aisle).trim();
    if (req.body.Rack !== undefined) updateData.Rack = String(req.body.Rack).trim();
    if (req.body.Shelf !== undefined) updateData.Shelf = String(req.body.Shelf).trim();
    if (req.body.Bin !== undefined) updateData.Bin = String(req.body.Bin).trim();
    if (req.body.MaxWeightKg !== undefined) {
      updateData.MaxWeightKg = req.body.MaxWeightKg !== null ? parseFloat(req.body.MaxWeightKg) : null;
    }
    if (req.body.MaxVolumeCbm !== undefined) {
      updateData.MaxVolumeCbm = req.body.MaxVolumeCbm !== null ? parseFloat(req.body.MaxVolumeCbm) : null;
    }

    const targetWarehouseId = req.body.WarehouseID || existing.WarehouseID;

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

    if (req.body.ZoneID !== undefined) {
      const zone = await prisma.zone.findFirst({
        where: {
          ZoneID: req.body.ZoneID,
          WarehouseID: targetWarehouseId,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!zone) {
        return res.status(400).json({
          error: "Invalid ZoneID: Zone not found or does not belong to the warehouse.",
        });
      }
      updateData.ZoneID = req.body.ZoneID;
    }

    const updatedBin = await prisma.binLocation.update({
      where: { BinID },
      data: updateData,
      include: {
        Zone: true,
        Warehouse: true,
      },
    });

    res.status(200).json(updatedBin);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getAllBinLocations = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const bins = await prisma.binLocation.findMany({
      where: { companyId: tenantId },
      include: {
        Zone: true,
        Warehouse: true,
        _count: {
          select: { Inventory: true },
        },
      },
      orderBy: { BinCode: "asc" },
    });

    res.status(200).json(bins);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getBinsByWarehouse = async (req: Request, res: Response) => {
  try {
    const WarehouseID = req.params.WarehouseID || (req.query.warehouseId as string);
    if (!WarehouseID) {
      return res.status(400).json({ error: "WarehouseID is required." });
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const bins = await prisma.binLocation.findMany({
      where: {
        WarehouseID,
        companyId: tenantId,
      },
      include: {
        Zone: true,
        Warehouse: true,
      },
      orderBy: { BinCode: "asc" },
    });

    res.status(200).json(bins);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const deleteBinLocation = async (
  req: Request<{ BinID: string }>,
  res: Response
) => {
  try {
    const BinID = req.params.BinID;
    if (!BinID) {
      return res.status(400).json({ error: "BinID is required." });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.binLocation.findFirst({
      where: {
        BinID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Bin location not found or unauthorized." });
    }

    // Guard if inventory items are stored in this bin
    const inventoryCount = await prisma.inventory.count({
      where: { BinID },
    });
    if (inventoryCount > 0) {
      return res.status(400).json({
        error: `Cannot delete bin. There are ${inventoryCount} inventory record(s) currently stored in this bin.`,
      });
    }

    const deletedBin = await prisma.binLocation.delete({
      where: { BinID },
    });

    res.status(200).json(deletedBin);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

export default {
  addBinLocation,
  editBinLocation,
  getAllBinLocations,
  getBinsByWarehouse,
  deleteBinLocation,
};
