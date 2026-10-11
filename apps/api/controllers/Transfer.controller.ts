import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addTransfer = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      TransferQuantity: parseInt(req.body.TransferQuantity, 10) || 0,
      SentDate: req.body.SentDate ? new Date(req.body.SentDate) : new Date(),
      RecievedDate: req.body.RecievedDate ? new Date(req.body.RecievedDate) : null,
      ...(tenantId && { companyId: tenantId }),
    };

    const newTransfer = await prisma.transfer.create({
      data,
      include: {
        Product: true,
        OutWarehouse: true,
        InWarehouse: true,
        company: true,
      },
    });

    res.status(200).json(newTransfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editTransfer = async (req: Request, res: Response) => {
  try {
    const { TransferID, ...updateData } = req.body;
    if (updateData.TransferQuantity !== undefined) {
      updateData.TransferQuantity = parseInt(updateData.TransferQuantity, 10) || 0;
    }
    if (updateData.SentDate) {
      updateData.SentDate = new Date(updateData.SentDate);
    }
    if (updateData.RecievedDate) {
      updateData.RecievedDate = new Date(updateData.RecievedDate);
    }

    const updatedTransfer = await prisma.transfer.update({
      where: {
        TransferID: TransferID,
      },
      data: updateData,
      include: {
        Product: true,
        OutWarehouse: true,
        InWarehouse: true,
        company: true,
      },
    });

    res.status(200).json(updatedTransfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllTransfers = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const Transfers = await prisma.transfer.findMany({
      where: tenantId ? { companyId: tenantId } : {},
      include: {
        Product: true,
        OutWarehouse: true,
        InWarehouse: true,
        company: true,
      },
    });

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
      include: {
        Product: true,
        OutWarehouse: true,
        InWarehouse: true,
        company: true,
      },
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
