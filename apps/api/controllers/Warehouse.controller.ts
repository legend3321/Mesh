import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addWarehouse = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    if (req.body.LocationID) {
      const location = await prisma.location.findFirst({
        where: {
          LocationID: req.body.LocationID,
          companyId: tenantId,
        },
      });
      if (!location) {
        return res.status(400).json({ error: "Invalid LocationID: Location not found in caller company." });
      }
    }

    const data: any = {
      WarehouseName: req.body.WarehouseName ? String(req.body.WarehouseName) : "",
      isRefrigerated: Boolean(req.body.isRefrigerated),
      LocationID: req.body.LocationID,
      companyId: tenantId,
    };

    const newWarehouse = await prisma.warehouse.create({
      data,
      include: {
        Location: true,
        company: true,
        zones: true,
        binLocations: true,
      },
    });

    res.status(200).json(newWarehouse);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editWarehouse = async (req: Request, res: Response) => {
  try {
    const WarehouseID = req.body.WarehouseID || req.params?.WarehouseID;
    if (!WarehouseID) {
      return res.status(400).json({ error: "WarehouseID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.warehouse.findFirst({
      where: {
        WarehouseID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Warehouse not found or unauthorized" });
    }

    const updateData: any = {};
    if (req.body.WarehouseName !== undefined) updateData.WarehouseName = String(req.body.WarehouseName);
    if (req.body.isRefrigerated !== undefined) updateData.isRefrigerated = Boolean(req.body.isRefrigerated);
    if (req.body.LocationID !== undefined) {
      const location = await prisma.location.findFirst({
        where: {
          LocationID: req.body.LocationID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!location) {
        return res.status(400).json({ error: "Invalid LocationID: Location not found or unauthorized." });
      }
      updateData.LocationID = req.body.LocationID;
    }
    delete updateData.companyId;

    const updatedWarehouse = await prisma.warehouse.update({
      where: {
        WarehouseID: WarehouseID,
      },
      data: updateData,
      include: {
        Location: true,
        company: true,
        zones: true,
        binLocations: true,
      },
    });

    res.status(200).json(updatedWarehouse);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllWarehouses = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Warehouses = await prisma.warehouse.findMany({
      where: { companyId: tenantId },
      include: {
        Location: true,
        company: true,
        zones: true,
        binLocations: true,
      },
    });

    res.status(200).json(Warehouses);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getWarehouse = async (
  req: Request<{ WarehouseID: string }>,
  res: Response
) => {
  try {
    const tenantId = getTenantId(req);
    const Warehouse = await prisma.warehouse.findFirst({
      where: {
        WarehouseID: req.params.WarehouseID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        Location: true,
        company: true,
        zones: true,
        binLocations: true,
      },
    });

    if (!Warehouse) {
      return res.status(404).json({ error: "Warehouse not found or unauthorized" });
    }

    res.status(200).json(Warehouse);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteWarehouse = async (
  req: Request<{ WarehouseID: string }>,
  res: Response
) => {
  try {
    const WarehouseID = req.params.WarehouseID;
    if (!WarehouseID) {
      return res.status(400).json({ error: "WarehouseID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.warehouse.findFirst({
      where: {
        WarehouseID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Warehouse not found or unauthorized" });
    }

    const Warehouse = await prisma.warehouse.delete({
      where: {
        WarehouseID,
      },
    });

    res.status(200).json(Warehouse);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addWarehouse,
  editWarehouse,
  getAllWarehouses,
  getWarehouse,
  deleteWarehouse,
};
