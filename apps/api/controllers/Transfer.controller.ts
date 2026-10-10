import { Request, Response } from "express";
import { prisma } from "../index";

const addTransfer = async (req: Request, res: Response) => {
  try {
    const newTransfer = await prisma.transfer.create({
      data: req.body,
    });

    res.status(200).json(newTransfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editTransfer = async (req: Request, res: Response) => {
  try {
    const { TransferID, ...updateData } = req.body;
    const updatedTransfer = await prisma.transfer.update({
      where: {
        TransferID: TransferID,
      },
      data: updateData,
    });

    res.status(200).json(updatedTransfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllTransfers = async (req: Request, res: Response) => {
  try {
    const Transfers = await prisma.transfer.findMany();

    res.status(200).json(Transfers);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getTransfer = async (
  req: Request<{ TransferID: string }>,
  res: Response
) => {
  try {
    const Transfer = await prisma.transfer.findMany({
      where: { TransferID: req.params.TransferID },
    });

    res.status(200).json(Transfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteTransfer = async (
  req: Request<{ TransferID: string }>,
  res: Response
) => {
  try {
    const Transfer = await prisma.transfer.delete({
      where: {
        TransferID: req.params.TransferID,
      },
    });

    res.status(200).json(Transfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addTransfer,
  editTransfer,
  getAllTransfers,
  getTransfer,
  deleteTransfer,
};
