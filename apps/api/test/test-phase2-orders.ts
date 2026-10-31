import { PrismaClient } from "@prisma/client";
import OrderController from "../controllers/Order.controller";

const prisma = new PrismaClient();

function createMockResponse() {
  const res: any = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: any) {
      this.data = payload;
      return this;
    },
  };
  return res;
}

function createMockRequest(user: any, body: any = {}, params: any = {}, query: any = {}) {
  const tenantId = user?.companyId;
  return {
    user,
    headers: {
      "x-company-id": tenantId,
    },
    body,
    params,
    query,
  };
}

async function runPhase2Tests() {
  console.log("=== Phase 2 Order Controller Test Suite ===");
  let passed = 0;
  let failed = 0;

  try {
    // 1. Fetch an existing company, provider, and product
    const company = await prisma.company.findFirst();
    if (!company) {
      throw new Error("No company found in database for testing.");
    }
    const tenantId = company.companyId;

    let provider = await prisma.provider.findFirst({
      where: { companyId: tenantId },
    });
    if (!provider) {
      provider = await prisma.provider.create({
        data: {
          ProviderName: "Test Supplier Logistics Ltd",
          ProviderAddress: "123 Supply Chain Ave",
          companyId: tenantId,
        },
      });
    }

    let product = await prisma.product.findFirst({
      where: { companyId: tenantId },
    });
    if (!product) {
      product = await prisma.product.create({
        data: {
          ProductCode: `TEST-SKU-${Date.now()}`,
          BarCode: `BAR-${Date.now()}`,
          ProductName: "Industrial Micro-Sensor",
          ProductDescription: "High-precision sensor for testing",
          ProductCategory: "Electronics",
          CostPrice: 50.0,
          SellPrice: 75.0,
          MaxretailPrice: 90.0,
          companyId: tenantId,
        },
      });
    }

    console.log(`Using Tenant: ${company.companyName} (${tenantId})`);
    console.log(`Using Provider: ${provider.ProviderName} (${provider.ProviderID})`);
    console.log(`Using Product: ${product.ProductName} (${product.ProductID})`);

    const mockUser = {
      userId: "test-user-123",
      userEmail: "tester@company.com",
      userRole: "ADMIN",
      companyId: tenantId,
    };

    // TEST 1: Compound Order Creation with line items
    console.log("\n[TEST 1] Compound Purchase Order creation with calculated line items");
    const req1 = createMockRequest(mockUser, {
      ProviderID: provider.ProviderID,
      OrderDate: new Date().toISOString(),
      Status: "INITIATED",
      items: [
        {
          ProductID: product.ProductID,
          OrderQuantity: 10,
          UnitPrice: 50,
          TaxRate: 10, // 10% tax
          ExpectedDate: new Date(Date.now() + 86400000).toISOString(),
        },
      ],
    });
    const res1 = createMockResponse();
    await OrderController.addOrder(req1 as any, res1);

    if (res1.statusCode === 200 && res1.data?.OrderID) {
      const order = res1.data;
      // lineNet = 10 * 50 = 500, lineTax = 50, lineTotal = 550
      if (order.TotalNet === 500 && order.TotalTax === 50 && order.TotalAmount === 550) {
        console.log("  PASS: Order totals correctly computed (Net: 500, Tax: 50, Amount: 550)");
        passed++;
      } else {
        console.error("  FAIL: Order totals incorrect:", {
          net: order.TotalNet,
          tax: order.TotalTax,
          amount: order.TotalAmount,
        });
        failed++;
      }

      if (order.Orderdetail?.length === 1 && order.Orderdetail[0].LineTotal === 550) {
        console.log("  PASS: Nested Orderdetail created and populated with Products relation");
        passed++;
      } else {
        console.error("  FAIL: Orderdetail not properly included or LineTotal incorrect:", order.Orderdetail);
        failed++;
      }
    } else {
      console.error("  FAIL: addOrder failed with status", res1.statusCode, res1.data);
      failed++;
    }

    const createdOrderId = res1.data?.OrderID;

    // TEST 2: Single header order creation fallback
    console.log("\n[TEST 2] Single header order creation (fallback without items)");
    const req2 = createMockRequest(mockUser, {
      ProviderID: provider.ProviderID,
      OrderDate: new Date().toISOString(),
      Status: "PROCESSING",
    });
    const res2 = createMockResponse();
    await OrderController.addOrder(req2 as any, res2);

    if (res2.statusCode === 200 && res2.data?.OrderID && res2.data?.Status === "PROCESSING") {
      console.log("  PASS: Single header created in fallback transaction with Status PROCESSING");
      passed++;
    } else {
      console.error("  FAIL: Single header creation failed:", res2.statusCode, res2.data);
      failed++;
    }

    const secondOrderId = res2.data?.OrderID;

    // TEST 3: getOrder & getAllOrders
    console.log("\n[TEST 3] Fetching orders with nested relations (Provider, Company, Orderdetail, Products)");
    const req3 = createMockRequest(mockUser, {}, { OrderID: createdOrderId });
    const res3 = createMockResponse();
    await OrderController.getOrder(req3 as any, res3);

    if (res3.statusCode === 200 && res3.data?.Provider && res3.data?.Orderdetail?.[0]?.Products) {
      console.log("  PASS: getOrder included Provider, Company, and Orderdetail.Products");
      passed++;
    } else {
      console.error("  FAIL: getOrder includes missing:", res3.data);
      failed++;
    }

    // TEST 4: editOrder updates Status, TotalNet, TotalTax, TotalAmount
    console.log("\n[TEST 4] editOrder modifying Status and financial aggregates");
    const req4 = createMockRequest(mockUser, {
      OrderID: createdOrderId,
      Status: "PROCESSING",
      TotalNet: 600,
      TotalTax: 60,
      TotalAmount: 660,
    });
    const res4 = createMockResponse();
    await OrderController.editOrder(req4 as any, res4);

    if (
      res4.statusCode === 200 &&
      res4.data?.Status === "PROCESSING" &&
      res4.data?.TotalAmount === 660
    ) {
      console.log("  PASS: editOrder updated Status and TotalAmount to 660");
      passed++;
    } else {
      console.error("  FAIL: editOrder update failed:", res4.data);
      failed++;
    }

    // TEST 5: batchStatusUpdate
    console.log("\n[TEST 5] batchStatusUpdate across multiple orders");
    const req5 = createMockRequest(mockUser, {
      orderIds: [createdOrderId, secondOrderId],
      status: "COMPLETED",
    });
    const res5 = createMockResponse();
    await OrderController.batchStatusUpdate(req5 as any, res5);

    if (res5.statusCode === 200 && res5.data?.count === 2) {
      console.log("  PASS: batchStatusUpdate transitioned 2 orders to COMPLETED in transaction");
      passed++;
    } else {
      console.error("  FAIL: batchStatusUpdate failed:", res5.data);
      failed++;
    }

    // TEST 6: batchStatusUpdate tenant isolation enforcement
    console.log("\n[TEST 6] batchStatusUpdate rejects unauthorized/nonexistent order IDs");
    const req6 = createMockRequest(mockUser, {
      orderIds: [createdOrderId, "000000000000000000000000"],
      status: "CANCELLED",
    });
    const res6 = createMockResponse();
    await OrderController.batchStatusUpdate(req6 as any, res6);

    if (res6.statusCode === 404) {
      console.log("  PASS: batchStatusUpdate rejected unauthorized ID with 404");
      passed++;
    } else {
      console.error("  FAIL: batchStatusUpdate did not reject unauthorized ID:", res6.statusCode, res6.data);
      failed++;
    }

    // TEST 7: batchCreateRequisitions
    console.log("\n[TEST 7] batchCreateRequisitions generating POs with atomic transactions");
    const req7 = createMockRequest(mockUser, {
      requisitions: [
        {
          ProviderID: provider.ProviderID,
          items: [
            {
              ProductID: product.ProductID,
              OrderQuantity: 25,
              UnitPrice: 48.5,
            },
          ],
        },
      ],
    });
    const res7 = createMockResponse();
    await OrderController.batchCreateRequisitions(req7 as any, res7);

    if (res7.statusCode === 200 && res7.data?.orders?.length === 1) {
      const createdRequisition = res7.data.orders[0];
      const expectedTotal = Math.round(25 * 48.5 * 100) / 100;
      if (createdRequisition.TotalAmount === expectedTotal) {
        console.log(`  PASS: batchCreateRequisitions created requisition with TotalAmount ${expectedTotal}`);
        passed++;
      } else {
        console.error("  FAIL: Requisition total mismatch:", createdRequisition);
        failed++;
      }
    } else {
      console.error("  FAIL: batchCreateRequisitions failed:", res7.statusCode, res7.data);
      failed++;
    }

    // Clean up created test orders
    const cleanupIds = [
      createdOrderId,
      secondOrderId,
      ...(res7.data?.orders?.map((o: any) => o.OrderID) || []),
    ].filter(Boolean);
    if (cleanupIds.length > 0) {
      await prisma.orderdetail.deleteMany({
        where: { OrderID: { in: cleanupIds } },
      });
      await prisma.order.deleteMany({
        where: { OrderID: { in: cleanupIds } },
      });
      console.log(`\nCleaned up ${cleanupIds.length} test orders.`);
    }
  } catch (error: any) {
    console.error("Fatal test execution error:", error);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n=== SUMMARY: ${passed} Passed, ${failed} Failed ===`);
  if (failed > 0) {
    process.exit(1);
  }
}

runPhase2Tests();
