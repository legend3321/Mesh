import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addDeliveryDetail = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    const { DeliveryID, ProductID, DeliveryQuantity, ExpectedDate, ActualDate } = req.body;

    if (!DeliveryID) {
      return res.status(400).json({ error: "DeliveryID is required" });
    }
    if (!ProductID) {
      return res.status(400).json({ error: "ProductID is required" });
    }

    const parentDelivery = await prisma.delivery.findFirst({
      where: {
        DeliveryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!parentDelivery) {
      return res.status(404).json({ error: "Parent delivery not found or unauthorized" });
    }

    const product = await prisma.product.findFirst({
      where: {
        ProductID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found or unauthorized" });
    }

    const data: any = {
      DeliveryID,
      ProductID,
      DeliveryQuantity: parseInt(DeliveryQuantity, 10) || 0,
      ExpectedDate: ExpectedDate ? new Date(ExpectedDate) : new Date(),
      ActualDate: ActualDate ? new Date(ActualDate) : null,
    };

    const newDeliveryDetail = await prisma.deliveryDetail.create({
      data,
      include: { Delivery: true, Product: true },
    });

    res.status(200).json(newDeliveryDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editDeliveryDetail = async (req: Request, res: Response) => {
  try {
    const DeliveryDetailID = req.body.DeliveryDetailID || req.params?.DeliveryDetailID;
    if (!DeliveryDetailID) {
      return res.status(400).json({ error: "DeliveryDetailID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.deliveryDetail.findFirst({
      where: {
        DeliveryDetailID,
        ...(tenantId ? { Delivery: { companyId: tenantId } } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Delivery detail not found or unauthorized" });
    }

    const { DeliveryDetailID: _, DeliveryID, ...rawUpdate } = req.body;
    const updateData: any = {};
    if (rawUpdate.DeliveryQuantity !== undefined) {
      updateData.DeliveryQuantity = parseInt(rawUpdate.DeliveryQuantity, 10) || 0;
    }
    if (rawUpdate.ExpectedDate !== undefined) {
      updateData.ExpectedDate = new Date(rawUpdate.ExpectedDate);
    }
    if (rawUpdate.ActualDate !== undefined) {
      updateData.ActualDate = rawUpdate.ActualDate ? new Date(rawUpdate.ActualDate) : null;
    }
    if (rawUpdate.ProductID !== undefined) {
      const product = await prisma.product.findFirst({
        where: {
          ProductID: rawUpdate.ProductID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!product) {
        return res.status(400).json({ error: "Invalid ProductID: Product not found or unauthorized" });
      }
      updateData.ProductID = rawUpdate.ProductID;
    }

    if (DeliveryID && DeliveryID !== existing.DeliveryID) {
      const parentDelivery = await prisma.delivery.findFirst({
        where: {
          DeliveryID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!parentDelivery) {
        return res.status(400).json({ error: "Invalid DeliveryID: Parent delivery not found or unauthorized" });
      }
      updateData.DeliveryID = DeliveryID;
    }

    const updatedDeliveryDetail = await prisma.deliveryDetail.update({
      where: {
        DeliveryDetailID,
      },
      data: updateData,
      include: { Delivery: true, Product: true },
    });

    res.status(200).json(updatedDeliveryDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllDeliveryDetails = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const DeliveryDetails = await prisma.deliveryDetail.findMany({
      where: {
        ...(tenantId ? { Delivery: { companyId: tenantId } } : {}),
      },
      include: { Delivery: true, Product: true },
    });

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
    const tenantId = getTenantId(req);
    const deliveryDetail = await prisma.deliveryDetail.findFirst({
      where: {
        DeliveryDetailID: req.params.DeliveryDetailID,
        ...(tenantId ? { Delivery: { companyId: tenantId } } : {}),
      },
      include: { Delivery: true, Product: true },
    });

    if (!deliveryDetail) {
      return res.status(404).json({ error: "Delivery detail not found or unauthorized" });
    }

    res.status(200).json(deliveryDetail);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteDeliveryDetail = async (
  req: Request<{ DeliveryDetailID: string }>,
  res: Response
) => {
  try {
    const DeliveryDetailID = req.params.DeliveryDetailID;
    if (!DeliveryDetailID) {
      return res.status(400).json({ error: "DeliveryDetailID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.deliveryDetail.findFirst({
      where: {
        DeliveryDetailID,
        ...(tenantId ? { Delivery: { companyId: tenantId } } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Delivery detail not found or unauthorized" });
    }

    const DeliveryDetail = await prisma.deliveryDetail.delete({
      where: {
        DeliveryDetailID,
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
