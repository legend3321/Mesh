import { Request, Response } from "express";
import { prisma } from "../index";

const addDelivery = async (req: Request, res: Response) => {
  try {
    const newDelivery = await prisma.delivery.create({
      data: req.body,
    });

    res.status(200).json(newDelivery);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editDelivery = async (req: Request, res: Response) => {
  try {
    const { DeliveryID, ...updateData } = req.body;
    const updatedDelivery = await prisma.delivery.update({
      where: {
        DeliveryID: DeliveryID,
      },
      data: updateData,
    });

    res.status(200).json(updatedDelivery);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllDeliverys = async (req: Request, res: Response) => {
  try {
    const Deliverys = await prisma.delivery.findMany();

    res.status(200).json(Deliverys);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getDelivery = async (
  req: Request<{ DeliveryID: string }>,
  res: Response
) => {
  try {
    const Delivery = await prisma.delivery.findMany({
      where: { DeliveryID: req.params.DeliveryID },
    });

    res.status(200).json(Delivery);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteDelivery = async (
  req: Request<{ DeliveryID: string }>,
  res: Response
) => {
  try {
    const Delivery = await prisma.delivery.delete({
      where: {
        DeliveryID: req.params.DeliveryID,
      },
    });

    res.status(200).json(Delivery);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addDelivery,
  editDelivery,
  getAllDeliverys,
  getDelivery,
  deleteDelivery,
};
