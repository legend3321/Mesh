import { Request, Response } from "express";
import { prisma } from "../index";

const addPayment = async (req: Request, res: Response) => {
  try {
    const newPayment = await prisma.payment.create({
      data: req.body,
    });

    res.status(200).json(newPayment);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editPayment = async (req: Request, res: Response) => {
  try {
    const { PaymentID, ...updateData } = req.body;

    const updatedPayment = await prisma.payment.update({
      where: {
        PaymentID: PaymentID,
      },
      data: updateData,
    });

    res.status(200).json(updatedPayment);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllPayments = async (req: Request, res: Response) => {
  try {
    const Payments = await prisma.payment.findMany();

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
