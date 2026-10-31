import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { handleError } from "../middleware/Error.middleware";

/**
 * Create a new Goods Receipt for an Order with inspection & disposition tracking.
 * POST /api/goodsReceipt/add
 */
const addGoodsReceipt = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const {
      OrderID,
      WarehouseID,
      ReceivedDate,
      InspectionStatus,
      ReceivedBy,
      items,
    } = req.body;

    if (!OrderID) {
      return res.status(400).json({ error: "OrderID is required." });
    }

    // Validate that OrderID exists within tenant
    const order = await prisma.order.findFirst({
      where: { OrderID, companyId: tenantId },
    });
    if (!order) {
      return res.status(400).json({ error: "Invalid OrderID: Order not found in caller company." });
    }

    // Validate WarehouseID if provided
    if (WarehouseID) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { WarehouseID, companyId: tenantId },
      });
      if (!warehouse) {
        return res.status(400).json({ error: "Invalid WarehouseID: Warehouse not found in caller company." });
      }
    }

    const user = (req as any).user?.user || (req as any).user;
    const resolvedReceivedBy = ReceivedBy || user?.userName || user?.userId || "WAREHOUSE_OPERATOR";

    const rawItems: any[] = Array.isArray(items) ? items : [];

    // Verify all ProductIDs exist within tenant if items provided
    if (rawItems.length > 0) {
      const productIds = rawItems.map((i) => i.ProductID).filter(Boolean);
      const validProducts = await prisma.product.findMany({
        where: {
          ProductID: { in: productIds },
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });

      if (validProducts.length !== productIds.length) {
        return res.status(400).json({
          error: "One or more ProductIDs in items are invalid or unauthorized.",
        });
      }
    }

    const newReceipt = await prisma.goodsReceipt.create({
      data: {
        OrderID,
        WarehouseID: WarehouseID || null,
        ReceivedDate: ReceivedDate ? new Date(ReceivedDate) : new Date(),
        InspectionStatus: InspectionStatus || "PASSED",
        ReceivedBy: resolvedReceivedBy,
        companyId: tenantId,
        items:
          rawItems.length > 0
            ? {
                create: rawItems.map((it: any) => ({
                  ProductID: it.ProductID,
                  QuantityOrdered: parseInt(it.QuantityOrdered, 10) || 0,
                  QuantityReceived: parseInt(it.QuantityReceived, 10) || 0,
                  QuantityDamaged: parseInt(it.QuantityDamaged, 10) || 0,
                  Disposition: it.Disposition || "ACCEPTED",
                })),
              }
            : undefined,
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        Order: true,
        Warehouse: true,
      },
    });

    return res.status(200).json(newReceipt);
  } catch (error) {
    return handleError(res, error, "Failed to create goods receipt.");
  }
};

/**
 * Get all Goods Receipts scoped to tenant.
 * GET /api/goodsReceipt/getAll
 */
const getAllGoodsReceipts = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const receipts = await prisma.goodsReceipt.findMany({
      where: {
        companyId: tenantId,
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        Order: true,
        Warehouse: true,
        company: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(receipts);
  } catch (error) {
    return handleError(res, error, "Failed to retrieve goods receipts.");
  }
};

/**
 * Get single Goods Receipt by ID with line items.
 * GET /api/goodsReceipt/:GoodsReceiptID
 */
const getGoodsReceipt = async (req: Request, res: Response) => {
  try {
    const GoodsReceiptID = req.params.GoodsReceiptID;
    if (!GoodsReceiptID) {
      return res.status(400).json({ error: "GoodsReceiptID is required." });
    }

    const tenantId = getTenantId(req);
    const receipt = await prisma.goodsReceipt.findFirst({
      where: {
        GoodsReceiptID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        Order: true,
        Warehouse: true,
        company: true,
      },
    });

    if (!receipt) {
      return res.status(404).json({ error: "Goods receipt not found or unauthorized." });
    }

    return res.status(200).json(receipt);
  } catch (error) {
    return handleError(res, error, "Failed to retrieve goods receipt.");
  }
};

export default {
  addGoodsReceipt,
  getAllGoodsReceipts,
  getGoodsReceipt,
};
