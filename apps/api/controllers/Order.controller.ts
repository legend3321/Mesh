import { Request, Response } from "express";
import { prisma } from "../index";

const addOrder = async (req: Request, res: Response) => {
  try {
    const newOrder = await prisma.order.create({
      data: req.body,
    });

    res.status(200).json(newOrder);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editOrder = async (req: Request, res: Response) => {
  try {
    const { OrderID, ...updateData } = req.body;
    const updatedOrder = await prisma.order.update({
      where: {
        OrderID: OrderID,
      },
      data: updateData,
    });

    res.status(200).json(updatedOrder);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllOrders = async (req: Request, res: Response) => {
  try {
    const Orders = await prisma.order.findMany();

    res.status(200).json(Orders);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getOrder = async (req: Request<{ OrderID: string }>, res: Response) => {
  try {
    const Order = await prisma.order.findMany({
      where: { OrderID: req.params.OrderID },
    });

    res.status(200).json(Order);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteOrder = async (
  req: Request<{ OrderID: string }>,
  res: Response
) => {
  try {
    const Order = await prisma.order.delete({
      where: {
        OrderID: req.params.OrderID,
      },
    });

    res.status(200).json(Order);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addOrder,
  editOrder,
  getAllOrders,
  getOrder,
  deleteOrder,
};
