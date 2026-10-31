import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { ZoneType } from "@prisma/client";

const addZone = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const { ZoneName, ZoneType: zoneTypeInput, WarehouseID } = req.body;
    if (!ZoneName || !WarehouseID) {
      return res.status(400).json({ error: "ZoneName and WarehouseID are required." });
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

    const validZoneTypes = ["BULK", "HIGH_BAY", "COLD_CHAIN", "PICK_PACK"];
    const zoneType = zoneTypeInput && validZoneTypes.includes(zoneTypeInput)
      ? (zoneTypeInput as ZoneType)
      : ZoneType.BULK;

    const newZone = await prisma.zone.create({
      data: {
        ZoneName: String(ZoneName).trim(),
        ZoneType: zoneType,
        WarehouseID,
        companyId: tenantId,
      },
      include: {
        Warehouse: true,
        BinLocations: true,
      },
    });

    res.status(201).json(newZone);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const editZone = async (req: Request, res: Response) => {
  try {
    const ZoneID = req.body.ZoneID || req.params?.ZoneID;
    if (!ZoneID) {
      return res.status(400).json({ error: "ZoneID is required." });
    }

    const tenantId = getTenantId(req, true);
    const existing = await prisma.zone.findFirst({
      where: {
        ZoneID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Zone not found or unauthorized." });
    }

    const updateData: any = {};
    if (req.body.ZoneName !== undefined) {
      updateData.ZoneName = String(req.body.ZoneName).trim();
    }
    if (req.body.ZoneType !== undefined) {
      const validZoneTypes = ["BULK", "HIGH_BAY", "COLD_CHAIN", "PICK_PACK"];
      if (!validZoneTypes.includes(req.body.ZoneType)) {
        return res.status(400).json({ error: "Invalid ZoneType. Must be BULK, HIGH_BAY, COLD_CHAIN, or PICK_PACK." });
      }
      updateData.ZoneType = req.body.ZoneType as ZoneType;
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

    const updatedZone = await prisma.zone.update({
      where: { ZoneID },
      data: updateData,
      include: {
        Warehouse: true,
        BinLocations: true,
      },
    });

    res.status(200).json(updatedZone);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getAllZones = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const zones = await prisma.zone.findMany({
      where: { companyId: tenantId },
      include: {
        Warehouse: true,
        BinLocations: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(zones);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getZonesByWarehouse = async (req: Request, res: Response) => {
  try {
    const WarehouseID = req.params.WarehouseID || (req.query.warehouseId as string);
    if (!WarehouseID) {
      return res.status(400).json({ error: "WarehouseID is required." });
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const zones = await prisma.zone.findMany({
      where: {
        WarehouseID,
        companyId: tenantId,
      },
      include: {
        Warehouse: true,
        BinLocations: true,
      },
      orderBy: { ZoneName: "asc" },
    });

    res.status(200).json(zones);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const deleteZone = async (req: Request<{ ZoneID: string }>, res: Response) => {
  try {
    const ZoneID = req.params.ZoneID;
    if (!ZoneID) {
      return res.status(400).json({ error: "ZoneID is required." });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.zone.findFirst({
      where: {
        ZoneID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Zone not found or unauthorized." });
    }

    // Cascade or guard if bin locations exist
    const binCount = await prisma.binLocation.count({
      where: { ZoneID },
    });
    if (binCount > 0) {
      return res.status(400).json({
        error: `Cannot delete zone. There are ${binCount} bin location(s) associated with this zone.`,
      });
    }

    const deletedZone = await prisma.zone.delete({
      where: { ZoneID },
    });

    res.status(200).json(deletedZone);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

export default {
  addZone,
  editZone,
  getAllZones,
  getZonesByWarehouse,
  deleteZone,
};
