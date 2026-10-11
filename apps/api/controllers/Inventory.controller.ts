import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addInventory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      ...(tenantId && { companyId: tenantId }),
    };

    const newInventory = await prisma.inventory.create({
      data,
      include: {
        Product: true,
        Warehouse: true,
        company: true,
      },
    });

    res.status(200).json(newInventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editInventory = async (req: Request, res: Response) => {
  try {
    const { InventoryID, ...updateData } = req.body;
    const updatedInventory = await prisma.inventory.update({
      where: {
        InventoryID: InventoryID,
      },
      data: updateData,
      include: {
        Product: true,
        Warehouse: true,
        company: true,
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
    const Inventorys = await prisma.inventory.findMany({
      where: tenantId ? { companyId: tenantId } : {},
      include: {
        Product: true,
        Warehouse: true,
        company: true,
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
    const Inventory = await prisma.inventory.findMany({
      where: { InventoryID: req.params.InventoryID },
      include: {
        Product: true,
        Warehouse: true,
        company: true,
      },
    });

    res.status(200).json(Inventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteInventory = async (
  req: Request<{ InventoryID: string }>,
  res: Response
) => {
  try {
    const Inventory = await prisma.inventory.delete({
      where: {
        InventoryID: req.params.InventoryID,
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
};
