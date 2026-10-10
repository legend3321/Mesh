import { Request, Response } from "express";
import { prisma } from "../index";

const addInventory = async (req: Request, res: Response) => {
  try {
    const newInventory = await prisma.inventory.create({
      data: req.body,
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
    });

    res.status(200).json(updatedInventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllInventorys = async (req: Request, res: Response) => {
  try {
    const Inventorys = await prisma.inventory.findMany();

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
