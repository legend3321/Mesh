import { Request, Response } from "express";
import { prisma } from "../index";

const addWarehouse = async (req: Request, res: Response) => {
  try {
    const newWarehouse = await prisma.warehouse.create({
      data: req.body,
    });

    res.status(200).json(newWarehouse);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editWarehouse = async (req: Request, res: Response) => {
  try {
    const { WarehouseID, ...updateData } = req.body;
    const updatedWarehouse = await prisma.warehouse.update({
      where: {
        WarehouseID: WarehouseID,
      },
      data: updateData,
    });

    res.status(200).json(updatedWarehouse);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllWarehouses = async (req: Request, res: Response) => {
  try {
    const Warehouses = await prisma.warehouse.findMany();

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
    const Warehouse = await prisma.warehouse.findMany({
      where: { WarehouseID: req.params.WarehouseID },
    });

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
    const Warehouse = await prisma.warehouse.delete({
      where: {
        WarehouseID: req.params.WarehouseID,
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
