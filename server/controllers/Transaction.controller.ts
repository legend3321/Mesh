import { Request, Response } from "express";
import { prisma } from "../index";

const addTransaction = async (req: Request, res: Response) => {
  try {
    const newTransaction = await prisma.transaction.create({
      data: req.body,
    });

    res.status(200).json(newTransaction);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editTransaction = async (req: Request, res: Response) => {
  try {
    const { TransactionID, ...updateData } = req.body;
    const updatedTransaction = await prisma.transaction.update({
      where: {
        TransactionID: TransactionID,
      },
      data: updateData,
    });

    res.status(200).json(updatedTransaction);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const Transactions = await prisma.transaction.findMany();

    res.status(200).json(Transactions);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getTransaction = async (
  req: Request<{ TransactionID: string }>,
  res: Response
) => {
  try {
    const Transaction = await prisma.transaction.findMany({
      where: { TransactionID: req.params.TransactionID },
    });

    res.status(200).json(Transaction);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteTransaction = async (
  req: Request<{ TransactionID: string }>,
  res: Response
) => {
  try {
    const Transaction = await prisma.transaction.delete({
      where: {
        TransactionID: req.params.TransactionID,
      },
    });

    res.status(200).json(Transaction);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addTransaction,
  editTransaction,
  getAllTransactions,
  getTransaction,
  deleteTransaction,
};
