import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";
import { MLService } from "../services/ml.service";
import type { AutoPOResponse, AutoPOResultItem } from "@mesh/types";

const getStockoutForecast = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    if (!tenantId) {
      return res.status(200).json({
        generatedAt: new Date().toISOString(),
        items: [],
        summary: {
          totalItemsEvaluated: 0,
          criticalRiskCount: 0,
          moderateRiskCount: 0,
          healthyCount: 0,
          recommendedPurchaseOrdersCount: 0,
          estimatedReplenishmentCost: 0,
        },
      });
    }

    const [inventories, products, deliveries, orders, providers] = await Promise.all([
      prisma.inventory.findMany({
        where: { companyId: tenantId },
        include: {
          Warehouse: true,
          Product: true,
        },
      }),
      prisma.product.findMany({
        where: { companyId: tenantId },
      }),
      prisma.delivery.findMany({
        where: { companyId: tenantId },
        include: {
          DeliveryDetail: true,
        },
      }),
      prisma.order.findMany({
        where: { companyId: tenantId },
        include: {
          Orderdetail: true,
        },
      }),
      prisma.provider.findMany({
        where: { companyId: tenantId },
      }),
    ]);

    const mlOutput = await MLService.runStockoutForecast({
      inventories,
      products,
      deliveries,
      orders,
      providers,
    });

    return res.status(200).json(mlOutput);
  } catch (error: any) {
    console.error("Error generating stockout forecast:", error);
    return res.status(500).json({
      error: error.message || "Failed to execute ML stockout forecasting pipeline",
    });
  }
};

const executeAutoPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: "Only company members can execute purchase orders." });
    }

    const { inventoryIds, batch, riskThreshold = 0.6 } = req.body;

    // 1. Fetch live tenant dataset to compute accurate ML forecasts
    const [inventories, products, deliveries, orders, providers] = await Promise.all([
      prisma.inventory.findMany({
        where: { companyId: tenantId },
        include: {
          Warehouse: true,
          Product: true,
        },
      }),
      prisma.product.findMany({
        where: { companyId: tenantId },
      }),
      prisma.delivery.findMany({
        where: { companyId: tenantId },
        include: {
          DeliveryDetail: true,
        },
      }),
      prisma.order.findMany({
        where: { companyId: tenantId },
        include: {
          Orderdetail: true,
        },
      }),
      prisma.provider.findMany({
        where: { companyId: tenantId },
      }),
    ]);

    if (inventories.length === 0) {
      return res.status(400).json({ error: "No inventory items found to replenish." });
    }

    // 2. Run ML Engine to get verified stockout risks
    const mlOutput = await MLService.runStockoutForecast({
      inventories,
      products,
      deliveries,
      orders,
      providers,
    });

    // 3. Filter target items
    let targetItems = mlOutput.items;
    if (inventoryIds && Array.isArray(inventoryIds) && inventoryIds.length > 0) {
      targetItems = targetItems.filter((i) => inventoryIds.includes(i.inventoryId));
    } else {
      // Automatic batch replenishment: items at critical risk
      targetItems = targetItems.filter(
        (i) => i.riskLevel === "CRITICAL" || i.stockoutRisk >= riskThreshold
      );
    }

    if (targetItems.length === 0) {
      return res.status(200).json({
        success: true,
        message: "All inventory items are currently healthy. No purchase orders needed.",
        createdOrdersCount: 0,
        totalCapitalCommitted: 0,
        orders: [],
      } as AutoPOResponse);
    }

    // Determine an audit user
    let actorUserId = (req as any).user?.user?.userId || (req as any).user?.userId;
    if (!actorUserId) {
      const fallbackUser = await prisma.user.findFirst({
        where: tenantId ? { companyId: tenantId } : {},
      });
      actorUserId = fallbackUser?.userId;
    }

    const createdPOList: AutoPOResultItem[] = [];
    let totalExpenditure = 0;

    // 4. Create purchase orders transactionally
    for (const item of targetItems) {
      let providerId = item.preferredProviderId;
      let providerName = item.preferredProviderName;

      // Ensure valid provider
      if (!providerId) {
        if (providers.length > 0) {
          providerId = providers[0].ProviderID;
          providerName = providers[0].ProviderName;
        } else {
          const newProv = await prisma.provider.create({
            data: {
              ProviderName: "Global Certified Logistics Partner",
              ProviderAddress: "100 Supply Chain Boulevard",
              ...(tenantId && { companyId: tenantId }),
            },
          });
          providerId = newProv.ProviderID;
          providerName = newProv.ProviderName;
        }
      }

      const expectedDate = new Date(Date.now() + (item.leadTimeDays || 5) * 86400000);
      const replenishmentCost = Math.round(item.recommendedReorderQty * item.unitCost * 100) / 100;

      // Create Order
      const newOrder = await prisma.order.create({
        data: {
          OrderDate: new Date(),
          ProviderID: providerId,
          ...(tenantId && { companyId: tenantId }),
        },
      });

      // Create OrderDetail
      const newOrderDetail = await prisma.orderdetail.create({
        data: {
          OrderQuantity: item.recommendedReorderQty,
          ExpectedDate: expectedDate,
          ProductIDs: [item.productId],
          OrderID: newOrder.OrderID,
        },
      });

      // Create Payment for PO
      await prisma.payment.create({
        data: {
          PaymentAmount: replenishmentCost,
          PaymentStatus: "PROCESSING",
          PaymentMode: "ONLINE",
          PaymentDescription: `AI Automated PO for ${item.productCode} (${item.productName}) - Stockout Risk: ${Math.round(item.stockoutRisk * 100)}%`,
          OrderID: newOrder.OrderID,
          ...(tenantId && { companyId: tenantId }),
        },
      });

      // Log Audit Transaction
      if (actorUserId) {
        await prisma.transaction.create({
          data: {
            TransactionDetail: `[AI AUTO-PO] Automated PO #${newOrder.OrderID.slice(-6).toUpperCase()} generated via ML Forecaster (XGBoost Risk ${Math.round(item.stockoutRisk * 100)}%) for SKU ${item.productCode} (${item.recommendedReorderQty} units, $${replenishmentCost.toLocaleString()})`,
            UserID: actorUserId,
            ...(tenantId && { companyId: tenantId }),
          },
        });
      }

      totalExpenditure += replenishmentCost;

      createdPOList.push({
        orderId: newOrder.OrderID,
        orderDetailId: newOrderDetail.OrderDetailID,
        productId: item.productId,
        productCode: item.productCode,
        productName: item.productName,
        quantity: item.recommendedReorderQty,
        unitCost: item.unitCost,
        totalCost: replenishmentCost,
        providerId: providerId,
        providerName: providerName || "Primary Supplier",
        expectedDate: expectedDate.toISOString(),
        stockoutRiskPrior: item.stockoutRisk,
      });
    }

    const responseData: AutoPOResponse = {
      success: true,
      message: `Successfully executed AI auto-replenishment. Generated ${createdPOList.length} purchase order(s) committed across suppliers.`,
      createdOrdersCount: createdPOList.length,
      totalCapitalCommitted: Math.round(totalExpenditure * 100) / 100,
      orders: createdPOList,
    };

    return res.status(200).json(responseData);
  } catch (error: any) {
    console.error("Error executing automated purchase orders:", error);
    return res.status(500).json({
      error: error.message || "Failed to automate purchase orders",
    });
  }
};

export default {
  getStockoutForecast,
  executeAutoPurchaseOrders,
};
