import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { DemandForecasterWorker } from "../services/DemandForecasterWorker.service";

class TransactionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

interface DeliveryItemInput {
  ProductID: string;
  DeliveryQuantity: number;
  ExpectedDate?: Date;
  ActualDate?: Date | null;
}

const addDelivery = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    if (req.body.CustomerID) {
      const customer = await prisma.customer.findFirst({
        where: { CustomerID: req.body.CustomerID, companyId: tenantId },
      });
      if (!customer) {
        return res.status(400).json({ error: "Invalid CustomerID: Customer not found in caller company." });
      }
    }

    const WarehouseID = req.body.WarehouseID || null;
    if (WarehouseID) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { WarehouseID, companyId: tenantId },
      });
      if (!warehouse) {
        return res.status(400).json({ error: "Invalid WarehouseID: Warehouse not found in caller company." });
      }
    }

    // Extract any specified delivery details or products
    const items: DeliveryItemInput[] = [];

    if (req.body.ProductID) {
      const qty = parseInt(req.body.DeliveryQuantity || req.body.quantity, 10) || 1;
      items.push({
        ProductID: req.body.ProductID,
        DeliveryQuantity: qty,
        ExpectedDate: req.body.ExpectedDate ? new Date(req.body.ExpectedDate) : new Date(),
        ActualDate: req.body.ActualDate ? new Date(req.body.ActualDate) : null,
      });
    }

    const rawItems = req.body.details || req.body.items || req.body.DeliveryDetails || req.body.DeliveryDetail;
    if (Array.isArray(rawItems)) {
      for (const raw of rawItems) {
        if (raw && raw.ProductID) {
          items.push({
            ProductID: raw.ProductID,
            DeliveryQuantity: parseInt(raw.DeliveryQuantity || raw.quantity, 10) || 1,
            ExpectedDate: raw.ExpectedDate ? new Date(raw.ExpectedDate) : new Date(),
            ActualDate: raw.ActualDate ? new Date(raw.ActualDate) : null,
          });
        }
      }
    }

    // If products/items are specified:
    if (items.length > 0) {
      if (!WarehouseID) {
        return res.status(400).json({
          error: "WarehouseID is required when allocating inventory stock for delivery dispatches.",
        });
      }

      // Decrement InventoryAvailable within a prisma.$transaction
      const newDelivery = await prisma.$transaction(async (tx) => {
        // Validate stock availability and decrement
        for (const item of items) {
          const inv = await tx.inventory.findFirst({
            where: {
              ProductID: item.ProductID,
              WarehouseID,
              companyId: tenantId,
            },
          });

          if (!inv || inv.InventoryAvailable < item.DeliveryQuantity) {
            const available = inv ? inv.InventoryAvailable : 0;
            throw new TransactionError(
              `Insufficient stock in warehouse for product ${item.ProductID}. Available: ${available}, Requested: ${item.DeliveryQuantity}`,
              400
            );
          }

          await tx.inventory.update({
            where: { InventoryID: inv.InventoryID },
            data: {
              InventoryAvailable: {
                decrement: item.DeliveryQuantity,
              },
            },
          });
        }

        const delivery = await tx.delivery.create({
          data: {
            SalesDate: req.body.SalesDate ? new Date(req.body.SalesDate) : new Date(),
            CustomerID: req.body.CustomerID,
            WarehouseID,
            companyId: tenantId,
          },
        });

        for (const item of items) {
          await tx.deliveryDetail.create({
            data: {
              DeliveryID: delivery.DeliveryID,
              ProductID: item.ProductID,
              DeliveryQuantity: item.DeliveryQuantity,
              ExpectedDate: item.ExpectedDate || new Date(),
              ActualDate: item.ActualDate || null,
            },
          });
        }

        return await tx.delivery.findUnique({
          where: { DeliveryID: delivery.DeliveryID },
          include: {
            Customer: true,
            Warehouse: true,
            DeliveryDetail: {
              include: { Product: true },
            },
            company: true,
          },
        });
      });

      DemandForecasterWorker.invalidateCache(tenantId);
      return res.status(200).json(newDelivery);
    }

    // No products specified: standard creation
    const data: any = {
      SalesDate: req.body.SalesDate ? new Date(req.body.SalesDate) : new Date(),
      CustomerID: req.body.CustomerID,
      WarehouseID: WarehouseID || null,
      companyId: tenantId,
    };

    const newDelivery = await prisma.delivery.create({
      data,
      include: {
        Customer: true,
        Warehouse: true,
        DeliveryDetail: {
          include: { Product: true },
        },
        company: true,
      },
    });

    DemandForecasterWorker.invalidateCache(tenantId);
    res.status(200).json(newDelivery);
  } catch (exception: any) {
    if (exception instanceof TransactionError) {
      return res.status(exception.statusCode).json({ error: exception.message });
    }
    res.status(500).json({ error: exception?.message || exception });
  }
};

const editDelivery = async (req: Request, res: Response) => {
  try {
    const DeliveryID = req.body.DeliveryID || req.params?.DeliveryID;
    if (!DeliveryID) {
      return res.status(400).json({ error: "DeliveryID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.delivery.findFirst({
      where: {
        DeliveryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Delivery not found or unauthorized" });
    }

    const updateData: any = {};
    if (req.body.SalesDate !== undefined) {
      updateData.SalesDate = new Date(req.body.SalesDate);
    }
    if (req.body.CustomerID !== undefined) {
      const customer = await prisma.customer.findFirst({
        where: { CustomerID: req.body.CustomerID, ...(tenantId ? { companyId: tenantId } : {}) },
      });
      if (!customer) {
        return res.status(400).json({ error: "Invalid CustomerID: Customer not found or unauthorized." });
      }
      updateData.CustomerID = req.body.CustomerID;
    }
    if (req.body.WarehouseID !== undefined) {
      if (req.body.WarehouseID) {
        const warehouse = await prisma.warehouse.findFirst({
          where: { WarehouseID: req.body.WarehouseID, ...(tenantId ? { companyId: tenantId } : {}) },
        });
        if (!warehouse) {
          return res.status(400).json({ error: "Invalid WarehouseID: Warehouse not found or unauthorized." });
        }
      }
      updateData.WarehouseID = req.body.WarehouseID || null;
    }
    delete updateData.companyId;

    const updatedDelivery = await prisma.delivery.update({
      where: {
        DeliveryID: DeliveryID,
      },
      data: updateData,
      include: {
        Customer: true,
        Warehouse: true,
        DeliveryDetail: {
          include: { Product: true },
        },
        company: true,
      },
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
      include: {
        Customer: true,
        Warehouse: true,
        DeliveryDetail: {
          include: { Product: true },
        },
        company: true,
      },
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
    const tenantId = getTenantId(req);
    const Delivery = await prisma.delivery.findFirst({
      where: {
        DeliveryID: req.params.DeliveryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        Customer: true,
        Warehouse: true,
        DeliveryDetail: {
          include: { Product: true },
        },
        company: true,
      },
    });

    if (!Delivery) {
      return res.status(404).json({ error: "Delivery not found or unauthorized" });
    }

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
    const DeliveryID = req.params.DeliveryID;
    if (!DeliveryID) {
      return res.status(400).json({ error: "DeliveryID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.delivery.findFirst({
      where: {
        DeliveryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Delivery not found or unauthorized" });
    }

    const Delivery = await prisma.delivery.delete({
      where: {
        DeliveryID,
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
