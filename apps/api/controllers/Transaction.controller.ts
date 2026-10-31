import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";

const addTransaction = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const data: any = {
      TransactionDetail: req.body.TransactionDetail ? String(req.body.TransactionDetail) : "",
      UserID: req.body.UserID,
      companyId: tenantId,
    };

    const newTransaction = await prisma.transaction.create({
      data,
      include: {
        TransactionOwner: true,
        company: true,
      },
    });

    res.status(200).json(newTransaction);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Transactions = await prisma.transaction.findMany({
      where: { companyId: tenantId },
      include: {
        TransactionOwner: true,
        company: true,
      },
    });

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
    const tenantId = getTenantId(req);
    const Transaction = await prisma.transaction.findFirst({
      where: {
        TransactionID: req.params.TransactionID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        TransactionOwner: true,
        company: true,
      },
    });

    if (!Transaction) {
      return res.status(404).json({ error: "Transaction not found or unauthorized" });
    }

    res.status(200).json(Transaction);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addTransaction,
  getAllTransactions,
  getTransaction,
};
