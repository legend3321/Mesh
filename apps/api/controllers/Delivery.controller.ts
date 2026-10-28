import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addDelivery = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      SalesDate: req.body.SalesDate ? new Date(req.body.SalesDate) : new Date(),
      ...(tenantId && { companyId: tenantId }),
    };

    const newDelivery = await prisma.delivery.create({
      data,
      include: { Customer: true, company: true },
    });

    res.status(200).json(newDelivery);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editDelivery = async (req: Request, res: Response) => {
  try {
    const { DeliveryID, ...updateData } = req.body;
    if (updateData.SalesDate) {
      updateData.SalesDate = new Date(updateData.SalesDate);
    }
    const updatedDelivery = await prisma.delivery.update({
      where: {
        DeliveryID: DeliveryID,
      },
      data: updateData,
      include: { Customer: true, company: true },
    });

    res.status(200).json(updatedDelivery);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllDeliverys = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Deliverys = await prisma.delivery.findMany({
      where: { companyId: tenantId },
      include: { Customer: true, company: true },
    });

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
      include: { Customer: true, company: true },
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
