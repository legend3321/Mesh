import { Request, Response } from "express";
import { prisma } from "../index";

const addDeliveryDetail = async (req: Request, res: Response) => {
  try {
    const newDeliveryDetail = await prisma.deliveryDetail.create({
      data: req.body,
    });

    res.status(200).json(newDeliveryDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editDeliveryDetail = async (req: Request, res: Response) => {
  try {
    const { DeliveryDetailID, ...updateData } = req.body;
    const updatedDeliveryDetail = await prisma.deliveryDetail.update({
      where: {
        DeliveryDetailID: DeliveryDetailID,
      },
      data: updateData,
    });

    res.status(200).json(updatedDeliveryDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllDeliveryDetails = async (req: Request, res: Response) => {
  try {
    const DeliveryDetails = await prisma.deliveryDetail.findMany();

    res.status(200).json(DeliveryDetails);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getDeliveryDetail = async (
  req: Request<{ DeliveryDetailID: string }>,
  res: Response
) => {
  try {
    const DeliveryDetail = await prisma.deliveryDetail.findMany({
      where: { DeliveryDetailID: req.params.DeliveryDetailID },
    });

    res.status(200).json(DeliveryDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteDeliveryDetail = async (
  req: Request<{ DeliveryDetailID: string }>,
  res: Response
) => {
  try {
    const DeliveryDetail = await prisma.deliveryDetail.delete({
      where: {
        DeliveryDetailID: req.params.DeliveryDetailID,
      },
    });

    res.status(200).json(DeliveryDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addDeliveryDetail,
  editDeliveryDetail,
  getAllDeliveryDetails,
  getDeliveryDetail,
  deleteDeliveryDetail,
};
