import { Request, Response } from "express";
import { prisma } from "../index";

const addOrderDetail = async (req: Request, res: Response) => {
  try {
    const newOrderDetail = await prisma.orderdetail.create({
      data: req.body,
    });

    res.status(200).json(newOrderDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editOrderDetail = async (req: Request, res: Response) => {
  try {
    const { OrderDetailID, ...updateData } = req.body;

    const updatedOrderDetail = await prisma.orderdetail.update({
      where: {
        OrderDetailID: OrderDetailID,
      },
      data: updateData,
    });

    res.status(200).json(updatedOrderDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllOrderDetails = async (req: Request, res: Response) => {
  try {
    const OrderDetails = await prisma.orderdetail.findMany();

    res.status(200).json(OrderDetails);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getOrderDetail = async (
  req: Request<{ OrderDetailID: string }>,
  res: Response
) => {
  try {
    const OrderDetail = await prisma.orderdetail.findMany({
      where: { OrderDetailID: req.params.OrderDetailID },
    });

    res.status(200).json(OrderDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteOrderDetail = async (
  req: Request<{ OrderDetailID: string }>,
  res: Response
) => {
  try {
    const OrderDetail = await prisma.orderdetail.delete({
      where: {
        OrderDetailID: req.params.OrderDetailID,
      },
    });

    res.status(200).json(OrderDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addOrderDetail,
  editOrderDetail,
  getAllOrderDetails,
  getOrderDetail,
  deleteOrderDetail,
};
