import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addOrder = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      OrderDate: req.body.OrderDate ? new Date(req.body.OrderDate) : new Date(),
      ...(tenantId && { companyId: tenantId }),
    };

    const newOrder = await prisma.order.create({
      data,
      include: { Provider: true, company: true },
    });

    res.status(200).json(newOrder);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editOrder = async (req: Request, res: Response) => {
  try {
    const { OrderID, ...updateData } = req.body;
    if (updateData.OrderDate) {
      updateData.OrderDate = new Date(updateData.OrderDate);
    }
    const updatedOrder = await prisma.order.update({
      where: {
        OrderID: OrderID,
      },
      data: updateData,
      include: { Provider: true, company: true },
    });

    res.status(200).json(updatedOrder);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllOrders = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Orders = await prisma.order.findMany({
      where: { companyId: tenantId },
      include: { Provider: true, company: true },
    });

    res.status(200).json(Orders);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getOrder = async (req: Request<{ OrderID: string }>, res: Response) => {
  try {
    const Order = await prisma.order.findMany({
      where: { OrderID: req.params.OrderID },
      include: { Provider: true, company: true },
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
