import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addPayment = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      PaymentAmount: parseFloat(req.body.PaymentAmount) || 0,
      ...(tenantId && { companyId: tenantId }),
    };

    const newPayment = await prisma.payment.create({
      data,
      include: {
        Order: true,
        Dilevery: true,
        company: true,
      },
    });

    res.status(200).json(newPayment);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editPayment = async (req: Request, res: Response) => {
  try {
    const { PaymentID, ...updateData } = req.body;
    if (updateData.PaymentAmount !== undefined) {
      updateData.PaymentAmount = parseFloat(updateData.PaymentAmount) || 0;
    }

    const updatedPayment = await prisma.payment.update({
      where: {
        PaymentID: PaymentID,
      },
      data: updateData,
      include: {
        Order: true,
        Dilevery: true,
        company: true,
      },
    });

    res.status(200).json(updatedPayment);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllPayments = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const Payments = await prisma.payment.findMany({
      where: tenantId ? { companyId: tenantId } : {},
      include: {
        Order: true,
        Dilevery: true,
        company: true,
      },
    });

    res.status(200).json(Payments);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getPayment = async (
  req: Request<{ PaymentID: string }>,
  res: Response
) => {
  try {
    const Payment = await prisma.payment.findMany({
      where: { PaymentID: req.params.PaymentID },
      include: {
        Order: true,
        Dilevery: true,
        company: true,
      },
    });

    res.status(200).json(Payment);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deletePayment = async (
  req: Request<{ PaymentID: string }>,
  res: Response
) => {
  try {
    const Payment = await prisma.payment.delete({
      where: {
        PaymentID: req.params.PaymentID,
      },
    });

    res.status(200).json(Payment);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addPayment,
  editPayment,
  getAllPayments,
  getPayment,
  deletePayment,
};
