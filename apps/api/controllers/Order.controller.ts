import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { Status } from "@prisma/client";
const enrichOrdersWithProducts = async (orders: any) => {
  if (!orders) return orders;
  const isArray = Array.isArray(orders);
  const list = isArray ? orders : [orders];

  const missingProductIds: string[] = [];
  for (const ord of list) {
    if (ord && Array.isArray(ord.Orderdetail)) {
      for (const od of ord.Orderdetail) {
        if (!od.Products && Array.isArray(od.ProductIDs) && od.ProductIDs.length > 0) {
          missingProductIds.push(...od.ProductIDs);
        }
      }
    }
  }

  if (missingProductIds.length > 0) {
    const uniqueIds = Array.from(new Set(missingProductIds));
    const products = await prisma.product.findMany({
      where: { ProductID: { in: uniqueIds } },
    });
    const productMap = new Map(products.map((p) => [p.ProductID, p]));

    for (const ord of list) {
      if (ord && Array.isArray(ord.Orderdetail)) {
        for (const od of ord.Orderdetail) {
          if (!od.Products && Array.isArray(od.ProductIDs) && od.ProductIDs.length > 0) {
            od.Products = productMap.get(od.ProductIDs[0]) || null;
          }
          if (!od.ProductID && Array.isArray(od.ProductIDs) && od.ProductIDs.length > 0) {
            od.ProductID = od.ProductIDs[0];
          }
        }
      }
    }
  } else {
    for (const ord of list) {
      if (ord && Array.isArray(ord.Orderdetail)) {
        for (const od of ord.Orderdetail) {
          if (!od.ProductID && Array.isArray(od.ProductIDs) && od.ProductIDs.length > 0) {
            od.ProductID = od.ProductIDs[0];
          }
        }
      }
    }
  }

  return isArray ? list : list[0];
};

const addOrder = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const { ProviderID, OrderDate, Status: inputStatus, OrderStatus: inputOrderStatus, items } = req.body;

    if (!ProviderID) {
      return res.status(400).json({ error: "ProviderID is required." });
    }

    const provider = await prisma.provider.findFirst({
      where: {
        ProviderID,
        companyId: tenantId,
      },
    });
    if (!provider) {
      return res.status(400).json({ error: "Invalid ProviderID: Provider not found in caller company." });
    }

    const user = (req as any).user?.user || (req as any).user;
    const actorUserId = user?.userId || (req as any).user?.userId || user?.userEmail || "SYSTEM_USER";

    const defaultStatus = (inputStatus || inputOrderStatus || "INITIATED") as Status;
    const orderDateValue = OrderDate ? new Date(OrderDate) : new Date();

    // If compound document with line items, execute inside a single atomic prisma.$transaction
    if (Array.isArray(items) && items.length > 0) {
      // Validate all ProductIDs exist and belong to caller's companyId
      const productIds = items.map((item: any) => item.ProductID).filter(Boolean);
      if (productIds.length !== items.length) {
        return res.status(400).json({ error: "All items must specify a valid ProductID." });
      }

      const products = await prisma.product.findMany({
        where: {
          ProductID: { in: productIds },
          companyId: tenantId,
        },
      });

      const productMap = new Map(products.map((p) => [p.ProductID, p]));
      for (const item of items) {
        if (!productMap.has(item.ProductID)) {
          return res.status(400).json({
            error: `Invalid ProductID: ${item.ProductID} not found or unauthorized for company.`,
          });
        }
      }

      // Compute item pricing and totals
      let totalNet = 0;
      let totalTax = 0;
      let totalAmount = 0;

      const preparedItems = items.map((item: any) => {
        const product = productMap.get(item.ProductID)!;
        const qty = Number(item.OrderQuantity) || 0;
        const unitPrice =
          item.UnitPrice !== undefined && item.UnitPrice !== null
            ? Number(item.UnitPrice)
            : (product.CostPrice ?? 0);
        const taxRate =
          item.TaxRate !== undefined && item.TaxRate !== null ? Number(item.TaxRate) : 0;
        const lineNet = qty * unitPrice;
        const lineTax = lineNet * (taxRate / 100);
        const lineTotal = lineNet + lineTax;

        totalNet += lineNet;
        totalTax += lineTax;
        totalAmount += lineTotal;

        return {
          ProductID: item.ProductID,
          OrderQuantity: qty,
          UnitPrice: unitPrice,
          TaxRate: taxRate,
          LineTotal: Math.round(lineTotal * 100) / 100,
          ExpectedDate: item.ExpectedDate ? new Date(item.ExpectedDate) : new Date(),
        };
      });

      const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
      const requiresApproval = roundedTotalAmount >= 10000;
      const statusValue = (requiresApproval ? "PENDING_APPROVAL" : defaultStatus) as Status;

      // Execute atomic transaction
      const createdOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            OrderDate: orderDateValue,
            Status: statusValue,
            OrderStatus: statusValue,
            TotalNet: Math.round(totalNet * 100) / 100,
            TotalTax: Math.round(totalTax * 100) / 100,
            TotalAmount: roundedTotalAmount,
            ProviderID,
            companyId: tenantId,
            CreatedBy: actorUserId,
          },
        });

        for (const item of preparedItems) {
          await tx.orderdetail.create({
            data: {
              OrderID: order.OrderID,
              OrderQuantity: item.OrderQuantity,
              UnitPrice: item.UnitPrice,
              TaxRate: item.TaxRate,
              LineTotal: item.LineTotal,
              ExpectedDate: item.ExpectedDate,
              ProductIDs: [item.ProductID],
            },
          });
        }

        // Automatic Maker-Checker Approval routing for orders >= $10,000
        if (requiresApproval) {
          await tx.approvalQueue.create({
            data: {
              EntityType: "ORDER",
              EntityID: order.OrderID,
              RequestedAmount: roundedTotalAmount,
              RequestedBy: actorUserId,
              Status: "PENDING",
              ApprovalNotes: `Spend threshold triggered: Order total ($${roundedTotalAmount.toLocaleString()}) >= $10,000 requires Dual-Control Maker-Checker approval.`,
              companyId: tenantId,
            },
          });
        }

        return await tx.order.findUnique({
          where: { OrderID: order.OrderID },
          include: {
            Provider: true,
            company: true,
            Orderdetail: {
              include: { Products: true },
            },
          },
        });
      });

      const enriched = await enrichOrdersWithProducts(createdOrder);
      return res.status(200).json(enriched);
    }

    // Fallback: standard single header creation with transaction
    const totalNetInput = req.body.TotalNet !== undefined ? Number(req.body.TotalNet) : undefined;
    const totalTaxInput = req.body.TotalTax !== undefined ? Number(req.body.TotalTax) : undefined;
    const totalAmountInput =
      req.body.TotalAmount !== undefined
        ? Number(req.body.TotalAmount)
        : totalNetInput !== undefined
        ? totalNetInput + (totalTaxInput || 0)
        : 0;

    const requiresApproval = totalAmountInput >= 10000;
    const statusValue = (requiresApproval ? "PENDING_APPROVAL" : defaultStatus) as Status;

    const newOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          OrderDate: orderDateValue,
          ProviderID,
          companyId: tenantId,
          Status: statusValue,
          OrderStatus: statusValue,
          TotalNet: totalNetInput,
          TotalTax: totalTaxInput,
          TotalAmount: totalAmountInput > 0 ? totalAmountInput : undefined,
          CreatedBy: actorUserId,
        },
        include: {
          Provider: true,
          company: true,
          Orderdetail: {
            include: { Products: true },
          },
        },
      });

      // Automatic Maker-Checker Approval routing for orders >= $10,000
      if (requiresApproval) {
        await tx.approvalQueue.create({
          data: {
            EntityType: "ORDER",
            EntityID: order.OrderID,
            RequestedAmount: totalAmountInput,
            RequestedBy: actorUserId,
            Status: "PENDING",
            ApprovalNotes: `Spend threshold triggered: Order total ($${totalAmountInput.toLocaleString()}) >= $10,000 requires Dual-Control Maker-Checker approval.`,
            companyId: tenantId,
          },
        });
      }

      return order;
    });

    const enriched = await enrichOrdersWithProducts(newOrder);
    res.status(200).json(enriched);
  } catch (exception: any) {
    res.status(500).json({ error: exception.message || exception });
  }
};

const editOrder = async (req: Request, res: Response) => {
  try {
    const OrderID = req.body.OrderID || req.params?.OrderID;
    if (!OrderID) {
      return res.status(400).json({ error: "OrderID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.order.findFirst({
      where: {
        OrderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    const updateData: any = {};
    if (req.body.OrderDate !== undefined) {
      updateData.OrderDate = new Date(req.body.OrderDate);
    }
    if (req.body.ProviderID !== undefined) {
      const provider = await prisma.provider.findFirst({
        where: {
          ProviderID: req.body.ProviderID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!provider) {
        return res.status(400).json({ error: "Invalid ProviderID: Provider not found or unauthorized." });
      }
      updateData.ProviderID = req.body.ProviderID;
    }
    if (req.body.Status !== undefined || req.body.OrderStatus !== undefined) {
      const newStatus = (req.body.Status || req.body.OrderStatus) as Status;
      updateData.Status = newStatus;
      updateData.OrderStatus = newStatus;
    }
    if (req.body.TotalNet !== undefined) {
      updateData.TotalNet = Number(req.body.TotalNet);
    }
    if (req.body.TotalTax !== undefined) {
      updateData.TotalTax = Number(req.body.TotalTax);
    }
    if (req.body.TotalAmount !== undefined) {
      updateData.TotalAmount = Number(req.body.TotalAmount);
    }

    delete updateData.companyId;

    const updatedOrder = await prisma.order.update({
      where: {
        OrderID,
      },
      data: updateData,
      include: {
        Provider: true,
        company: true,
        Orderdetail: {
          include: { Products: true },
        },
      },
    });

    const enriched = await enrichOrdersWithProducts(updatedOrder);
    res.status(200).json(enriched);
  } catch (exception: any) {
    res.status(500).json({ error: exception.message || exception });
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
      include: {
        Provider: true,
        company: true,
        Orderdetail: {
          include: { Products: true },
        },
      },
      orderBy: { OrderDate: "desc" },
    });

    const enriched = await enrichOrdersWithProducts(Orders);
    res.status(200).json(enriched);
  } catch (exception: any) {
    res.status(500).json({ error: exception.message || exception });
  }
};

const getOrder = async (req: Request<{ OrderID: string }>, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const Order = await prisma.order.findFirst({
      where: {
        OrderID: req.params.OrderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        Provider: true,
        company: true,
        Orderdetail: {
          include: { Products: true },
        },
      },
    });

    if (!Order) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    const enriched = await enrichOrdersWithProducts(Order);
    res.status(200).json(enriched);
  } catch (exception: any) {
    res.status(500).json({ error: exception.message || exception });
  }
};

const deleteOrder = async (req: Request<{ OrderID: string }>, res: Response) => {
  try {
    const OrderID = req.params.OrderID;
    if (!OrderID) {
      return res.status(400).json({ error: "OrderID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.order.findFirst({
      where: {
        OrderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Order not found or unauthorized" });
    }

    // Atomic cascading delete of linked order details and order header
    const deletedOrder = await prisma.$transaction(async (tx) => {
      await tx.orderdetail.deleteMany({
        where: { OrderID },
      });
      return await tx.order.delete({
        where: { OrderID },
      });
    });

    res.status(200).json(deletedOrder);
  } catch (exception: any) {
    res.status(500).json({ error: exception.message || exception });
  }
};

// Batch status transition for multiple purchase orders
const batchStatusUpdate = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({ error: "A valid companyId is required for this operation." });
    }

    const { orderIds, status } = req.body as { orderIds: string[]; status: Status };
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: "orderIds array is required and must not be empty." });
    }

    const validStatuses: Status[] = ["INITIATED", "PROCESSING", "COMPLETED", "CANCELLED", "PENDING_APPROVAL"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status: ${status}. Valid values: ${validStatuses.join(", ")}` });
    }

    // Validate tenant ownership for all orderIds
    const existingOrders = await prisma.order.findMany({
      where: {
        OrderID: { in: orderIds },
        companyId: tenantId,
      },
      select: { OrderID: true },
    });

    if (existingOrders.length !== orderIds.length) {
      const foundSet = new Set(existingOrders.map((o) => o.OrderID));
      const missingIds = orderIds.filter((id) => !foundSet.has(id));
      return res.status(404).json({
        error: `One or more orders not found or unauthorized for company: ${missingIds.join(", ")}`,
      });
    }

    // Update in atomic transaction
    const updatedOrders = await prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: {
          OrderID: { in: orderIds },
          companyId: tenantId,
        },
        data: {
          Status: status,
          OrderStatus: status,
        },
      });

      return await tx.order.findMany({
        where: {
          OrderID: { in: orderIds },
          companyId: tenantId,
        },
        include: {
          Provider: true,
          company: true,
          Orderdetail: {
            include: { Products: true },
          },
        },
      });
    });

    const enrichedOrders = await enrichOrdersWithProducts(updatedOrders);
    res.status(200).json({
      message: `Successfully transitioned ${enrichedOrders.length} orders to ${status}`,
      count: enrichedOrders.length,
      status,
      orders: enrichedOrders,
    });
  } catch (exception: any) {
    res.status(500).json({ error: exception.message || exception });
  }
};

// Batch requisition generation (e.g. from low stock items or procurement plans)
const batchCreateRequisitions = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({ error: "A valid companyId is required for this operation." });
    }

    const { requisitions } = req.body as {
      requisitions: Array<{
        ProviderID: string;
        items: Array<{
          ProductID: string;
          OrderQuantity: number;
          UnitPrice?: number;
          TaxRate?: number;
          ExpectedDate?: string;
        }>;
      }>;
    };

    if (!Array.isArray(requisitions) || requisitions.length === 0) {
      return res.status(400).json({ error: "requisitions array is required and must not be empty." });
    }

    // Validate providers upfront
    const providerIds = Array.from(new Set(requisitions.map((r) => r.ProviderID).filter(Boolean)));
    const validProviders = await prisma.provider.findMany({
      where: {
        ProviderID: { in: providerIds },
        companyId: tenantId,
      },
      select: { ProviderID: true },
    });
    const validProviderSet = new Set(validProviders.map((p) => p.ProviderID));
    for (const reqItem of requisitions) {
      if (!validProviderSet.has(reqItem.ProviderID)) {
        return res.status(400).json({
          error: `Invalid ProviderID: ${reqItem.ProviderID} not found in caller company.`,
        });
      }
    }

    // Validate products upfront
    const allProductIds = Array.from(
      new Set(
        requisitions.flatMap((r) => (Array.isArray(r.items) ? r.items.map((i) => i.ProductID) : []))
      )
    );
    const validProducts = await prisma.product.findMany({
      where: {
        ProductID: { in: allProductIds },
        companyId: tenantId,
      },
    });
    const productMap = new Map(validProducts.map((p) => [p.ProductID, p]));

    for (const reqItem of requisitions) {
      if (!Array.isArray(reqItem.items) || reqItem.items.length === 0) {
        return res.status(400).json({
          error: `Each requisition must contain a non-empty items array (ProviderID: ${reqItem.ProviderID}).`,
        });
      }
      for (const item of reqItem.items) {
        if (!productMap.has(item.ProductID)) {
          return res.status(400).json({
            error: `Invalid ProductID: ${item.ProductID} not found or unauthorized for company.`,
          });
        }
      }
    }

    // Atomic creation inside transaction
    const createdOrders = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const reqItem of requisitions) {
        let totalNet = 0;
        let totalTax = 0;
        let totalAmount = 0;

        const preparedLines = [];
        for (const item of reqItem.items) {
          const product = productMap.get(item.ProductID)!;
          const qty = Number(item.OrderQuantity) || 1;
          const unitPrice =
            item.UnitPrice !== undefined && item.UnitPrice !== null
              ? Number(item.UnitPrice)
              : Number(product.CostPrice) || 0;
          const taxRate =
            item.TaxRate !== undefined && item.TaxRate !== null ? Number(item.TaxRate) : 0;
          const lineNet = qty * unitPrice;
          const lineTax = lineNet * (taxRate / 100);
          const lineTotal = lineNet + lineTax;

          totalNet += lineNet;
          totalTax += lineTax;
          totalAmount += lineTotal;

          preparedLines.push({
            ProductID: item.ProductID,
            OrderQuantity: qty,
            UnitPrice: unitPrice,
            TaxRate: taxRate,
            LineTotal: Math.round(lineTotal * 100) / 100,
            ExpectedDate: item.ExpectedDate
              ? new Date(item.ExpectedDate)
              : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // default 7 days lead time
          });
        }

        const order = await tx.order.create({
          data: {
            OrderDate: new Date(),
            ProviderID: reqItem.ProviderID,
            companyId: tenantId,
            Status: "INITIATED",
            OrderStatus: "INITIATED",
            TotalNet: Math.round(totalNet * 100) / 100,
            TotalTax: Math.round(totalTax * 100) / 100,
            TotalAmount: Math.round(totalAmount * 100) / 100,
            CreatedBy: (req as any).user?.userEmail || (req as any).user?.userId || undefined,
          },
        });

        for (const line of preparedLines) {
          await tx.orderdetail.create({
            data: {
              OrderID: order.OrderID,
              OrderQuantity: line.OrderQuantity,
              UnitPrice: line.UnitPrice,
              TaxRate: line.TaxRate,
              LineTotal: line.LineTotal,
              ExpectedDate: line.ExpectedDate,
              ProductIDs: [line.ProductID],
            },
          });
        }

        const fullOrder = await tx.order.findUnique({
          where: { OrderID: order.OrderID },
          include: {
            Provider: true,
            company: true,
            Orderdetail: {
              include: { Products: true },
            },
          },
        });

        if (fullOrder) {
          results.push(fullOrder);
        }
      }

      return results;
    });

    const enrichedOrders = await enrichOrdersWithProducts(createdOrders);
    res.status(200).json({
      message: `Created ${enrichedOrders.length} purchase requisitions successfully.`,
      count: enrichedOrders.length,
      orders: enrichedOrders,
    });
  } catch (exception: any) {
    res.status(500).json({ error: exception.message || exception });
  }
};

export default {
  addOrder,
  editOrder,
  getAllOrders,
  getOrder,
  deleteOrder,
  batchStatusUpdate,
  batchCreateRequisitions,
};
