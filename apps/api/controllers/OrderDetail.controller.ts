import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addOrderDetail = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    const { OrderID, OrderQuantity, ExpectedDate, ActualDate, ProductIDs } = req.body;

    if (!OrderID) {
      return res.status(400).json({ error: "OrderID is required" });
    }

    const parentOrder = await prisma.order.findFirst({
      where: {
        OrderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!parentOrder) {
      return res.status(404).json({ error: "Parent order not found or unauthorized" });
    }

    const resolvedProductIds = Array.isArray(ProductIDs)
      ? ProductIDs
      : ProductIDs
      ? [ProductIDs]
      : [];

    if (resolvedProductIds.length > 0) {
      const validProducts = await prisma.product.findMany({
        where: {
          ProductID: { in: resolvedProductIds },
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (validProducts.length !== resolvedProductIds.length) {
        return res.status(400).json({ error: "One or more ProductIDs not found or unauthorized" });
      }
    }

    const data: any = {
      OrderID,
      OrderQuantity: parseInt(OrderQuantity, 10) || 0,
      ExpectedDate: ExpectedDate ? new Date(ExpectedDate) : new Date(),
      ActualDate: ActualDate ? new Date(ActualDate) : null,
      ProductIDs: resolvedProductIds,
    };

    const newOrderDetail = await prisma.orderdetail.create({
      data,
      include: { Order: true, Products: true },
    });

    res.status(200).json(newOrderDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editOrderDetail = async (req: Request, res: Response) => {
  try {
    const OrderDetailID = req.body.OrderDetailID || req.params?.OrderDetailID;
    if (!OrderDetailID) {
      return res.status(400).json({ error: "OrderDetailID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.orderdetail.findFirst({
      where: {
        OrderDetailID,
        ...(tenantId ? { Order: { companyId: tenantId } } : {}),
      },
      include: { Order: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Order detail not found or unauthorized" });
    }

    const { OrderDetailID: _, OrderID, ...rawUpdate } = req.body;
    const updateData: any = {};
    if (rawUpdate.OrderQuantity !== undefined) {
      updateData.OrderQuantity = parseInt(rawUpdate.OrderQuantity, 10) || 0;
    }
    if (rawUpdate.ExpectedDate !== undefined) {
      updateData.ExpectedDate = new Date(rawUpdate.ExpectedDate);
    }
    if (rawUpdate.ActualDate !== undefined) {
      updateData.ActualDate = rawUpdate.ActualDate ? new Date(rawUpdate.ActualDate) : null;
    }
    if (rawUpdate.ProductIDs !== undefined) {
      const resolvedProductIds = Array.isArray(rawUpdate.ProductIDs)
        ? rawUpdate.ProductIDs
        : rawUpdate.ProductIDs
        ? [rawUpdate.ProductIDs]
        : [];
      if (resolvedProductIds.length > 0) {
        const validProducts = await prisma.product.findMany({
          where: {
            ProductID: { in: resolvedProductIds },
            ...(tenantId ? { companyId: tenantId } : {}),
          },
        });
        if (validProducts.length !== resolvedProductIds.length) {
          return res.status(400).json({ error: "One or more ProductIDs not found or unauthorized" });
        }
      }
      updateData.ProductIDs = resolvedProductIds;
    }

    if (OrderID && OrderID !== existing.OrderID) {
      const parentOrder = await prisma.order.findFirst({
        where: {
          OrderID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!parentOrder) {
        return res.status(400).json({ error: "Invalid OrderID: Parent order not found or unauthorized" });
      }
      updateData.OrderID = OrderID;
    }

    const updatedOrderDetail = await prisma.orderdetail.update({
      where: {
        OrderDetailID,
      },
      data: updateData,
      include: { Order: true, Products: true },
    });

    res.status(200).json(updatedOrderDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllOrderDetails = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const OrderDetails = await prisma.orderdetail.findMany({
      where: {
        ...(tenantId ? { Order: { companyId: tenantId } } : {}),
      },
      include: { Order: true, Products: true },
    });

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
    const tenantId = getTenantId(req);
    const orderDetail = await prisma.orderdetail.findFirst({
      where: {
        OrderDetailID: req.params.OrderDetailID,
        ...(tenantId ? { Order: { companyId: tenantId } } : {}),
      },
      include: { Order: true, Products: true },
    });

    if (!orderDetail) {
      return res.status(404).json({ error: "Order detail not found or unauthorized" });
    }

    res.status(200).json(orderDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteOrderDetail = async (
  req: Request<{ OrderDetailID: string }>,
  res: Response
) => {
  try {
    const OrderDetailID = req.params.OrderDetailID;
    if (!OrderDetailID) {
      return res.status(400).json({ error: "OrderDetailID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.orderdetail.findFirst({
      where: {
        OrderDetailID,
        ...(tenantId ? { Order: { companyId: tenantId } } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Order detail not found or unauthorized" });
    }

    const OrderDetail = await prisma.orderdetail.delete({
      where: {
        OrderDetailID,
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
