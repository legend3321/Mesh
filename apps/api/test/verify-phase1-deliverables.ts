import { prisma } from "../db";
import * as jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/jwt";
import TransferController from "../controllers/Transfer.controller";
import DeliveryController from "../controllers/Delivery.controller";
import TransactionController from "../controllers/Transaction.controller";
import TransactionRouter from "../routes/Transaction.routes";
import express from "express";
import http from "http";

async function runVerification() {
  console.log("=== PHASE 1 ENTERPRISE DELIVERABLES VERIFICATION ===");

  // Setup test tenant and context
  const testCompanyCode = `TEST_COMP_${Date.now()}`;
  const company = await prisma.company.create({
    data: {
      companyName: "Coupled Stock Logistics Inc",
      companyCode: testCompanyCode,
    },
  });
  const tenantId = company.companyId;

  // Setup test user
  const user = await prisma.user.create({
    data: {
      userName: "Lead Architect",
      userEmail: `architect_${Date.now()}@mesh.test`,
      userPassword: "hashedpassword123",
      userRole: "ADMIN",
      companyId: tenantId,
    },
  });

  // Setup location
  const location = await prisma.location.create({
    data: {
      LocationName: "Terminal Hub Alpha",
      LocationAddress: "100 Cargo Way",
      companyId: tenantId,
    },
  });

  // Setup source and dest warehouses
  const sourceWh = await prisma.warehouse.create({
    data: {
      WarehouseName: "Source Depot West",
      isRefrigerated: false,
      LocationID: location.LocationID,
      companyId: tenantId,
    },
  });

  const destWh = await prisma.warehouse.create({
    data: {
      WarehouseName: "Dest Depot East",
      isRefrigerated: false,
      LocationID: location.LocationID,
      companyId: tenantId,
    },
  });

  // Setup product
  const product = await prisma.product.create({
    data: {
      ProductName: "High-Grade Semiconductor Unit",
      ProductCode: `SEMI_${Date.now()}`,
      BarCode: `BAR_${Date.now()}`,
      ProductDescription: "Microchip batch",
      ProductCategory: "Electronics",
      CostPrice: 120,
      SellPrice: 200,
      MaxretailPrice: 250,
      companyId: tenantId,
    },
  });

  // Setup inventory in source warehouse: 100 units
  const sourceInventory = await prisma.inventory.create({
    data: {
      ProductID: product.ProductID,
      WarehouseID: sourceWh.WarehouseID,
      InventoryAvailable: 100,
      MinStockLevel: 10,
      MaxStockLevel: 500,
      ReorderPoint: 25,
      companyId: tenantId,
    },
  });

  // Setup Customer
  const customer = await prisma.customer.create({
    data: {
      CustomerName: "Acme Logistics Corp",
      CustomerAddress: "500 Trade Ave",
      companyId: tenantId,
    },
  });

  console.log(`[SETUP] Seeded Company (${tenantId}), Product (${product.ProductID}), Source WH (${sourceWh.WarehouseID}), Initial Stock: 100 units.`);

  function createMockReqRes(body: any, params: any = {}) {
    let statusCode = 200;
    let jsonResponse: any = null;

    const req: any = {
      body,
      params,
      headers: {
        "x-company-id": tenantId,
      },
      user: {
        user: {
          userId: user.userId,
          userRole: "ADMIN",
          companyId: tenantId,
        },
      },
      allowedCompanyIds: [tenantId],
    };

    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      },
    };

    return {
      req,
      res,
      getStatus: () => statusCode,
      getData: () => jsonResponse,
    };
  }

  // --------------------------------------------------------------------------
  // TASK 1: Coupled Stock Mechanics & Atomic Two-Phase Transfer Movements
  // --------------------------------------------------------------------------
  console.log("\n--- TASK 1: Coupled Stock Mechanics & Atomic Two-Phase Transfers ---");

  // TEST 1.1: Insufficient stock validation on addTransfer
  {
    const { req, res, getStatus, getData } = createMockReqRes({
      ProductID: product.ProductID,
      OutWarehouseID: sourceWh.WarehouseID,
      InWarehouseID: destWh.WarehouseID,
      TransferQuantity: 150, // exceeds 100
      companyId: tenantId,
    });

    await TransferController.addTransfer(req, res);
    const status = getStatus();
    const data = getData();

    console.log(`Test 1.1 - Overdraw Transfer (Available: 100, Requested: 150): Status = ${status}, Error = "${data?.error}"`);
    if (status !== 400 || !data?.error?.includes("Insufficient stock in source warehouse. Available: 100, Requested: 150")) {
      throw new Error(`Test 1.1 FAILED: Expected 400 with specific error, got ${status}: ${JSON.stringify(data)}`);
    }

    // Verify stock was not decremented
    const inv = await prisma.inventory.findUnique({ where: { InventoryID: sourceInventory.InventoryID } });
    if (inv?.InventoryAvailable !== 100) {
      throw new Error(`Test 1.1 FAILED: Stock should remain 100, but is ${inv?.InventoryAvailable}`);
    }
    console.log("✔ Test 1.1 PASSED: Overdraw rejected with HTTP 400, stock unchanged at 100 units.");
  }

  // TEST 1.2: Valid addTransfer decrements source inventory and sets IN_TRANSIT
  let createdTransferID: string;
  {
    const { req, res, getStatus, getData } = createMockReqRes({
      ProductID: product.ProductID,
      OutWarehouseID: sourceWh.WarehouseID,
      InWarehouseID: destWh.WarehouseID,
      TransferQuantity: 40,
      companyId: tenantId,
    });

    await TransferController.addTransfer(req, res);
    const status = getStatus();
    const data = getData();

    console.log(`Test 1.2 - Valid Dispatch Transfer (40 units): Status = ${status}, TransferID = ${data?.TransferID}, TransferStatus = ${data?.TransferStatus}`);
    if (status !== 200 || !data?.TransferID || data?.TransferStatus !== "IN_TRANSIT") {
      throw new Error(`Test 1.2 FAILED: Expected 200 and IN_TRANSIT, got ${status}: ${JSON.stringify(data)}`);
    }
    createdTransferID = data.TransferID;

    // Verify origin stock atomically decremented from 100 -> 60
    const inv = await prisma.inventory.findUnique({ where: { InventoryID: sourceInventory.InventoryID } });
    if (inv?.InventoryAvailable !== 60) {
      throw new Error(`Test 1.2 FAILED: Stock should be decremented to 60, but is ${inv?.InventoryAvailable}`);
    }
    console.log("✔ Test 1.2 PASSED: Origin inventory atomically decremented from 100 -> 60 units. Transfer status: IN_TRANSIT.");
  }

  // TEST 1.3: receiveTransfer atomically increments destination inventory and sets COMPLETED
  {
    const { req, res, getStatus, getData } = createMockReqRes(
      { TransferID: createdTransferID },
      { TransferID: createdTransferID }
    );

    await TransferController.receiveTransfer(req, res);
    const status = getStatus();
    const data = getData();

    console.log(`Test 1.3 - Goods Receipt Intake: Status = ${status}, TransferStatus = ${data?.TransferStatus}, RecievedDate = ${data?.RecievedDate}`);
    if (status !== 200 || data?.TransferStatus !== "COMPLETED" || !data?.RecievedDate) {
      throw new Error(`Test 1.3 FAILED: Expected 200, COMPLETED, and RecievedDate, got ${status}: ${JSON.stringify(data)}`);
    }

    // Verify destination warehouse inventory created/incremented to 40
    const destInv = await prisma.inventory.findFirst({
      where: {
        ProductID: product.ProductID,
        WarehouseID: destWh.WarehouseID,
        companyId: tenantId,
      },
    });
    if (!destInv || destInv.InventoryAvailable !== 40) {
      throw new Error(`Test 1.3 FAILED: Destination inventory should be 40, but is ${destInv?.InventoryAvailable}`);
    }
    console.log("✔ Test 1.3 PASSED: Destination inventory atomically created & incremented to 40 units. Transfer status: COMPLETED.");
  }

  // TEST 1.4: Double receipt prevention
  {
    const { req, res, getStatus, getData } = createMockReqRes(
      { TransferID: createdTransferID },
      { TransferID: createdTransferID }
    );

    await TransferController.receiveTransfer(req, res);
    const status = getStatus();
    const data = getData();

    console.log(`Test 1.4 - Double Receipt Attempt: Status = ${status}, Error = "${data?.error}"`);
    if (status !== 400 || !data?.error?.includes("already been received")) {
      throw new Error(`Test 1.4 FAILED: Expected 400 rejection for already received transfer, got ${status}: ${JSON.stringify(data)}`);
    }
    console.log("✔ Test 1.4 PASSED: Re-intake strictly prohibited with HTTP 400.");
  }

  // --------------------------------------------------------------------------
  // TASK 2: Delivery Warehouse Origin & Stock Allocation
  // --------------------------------------------------------------------------
  console.log("\n--- TASK 2: Delivery Warehouse Origin & Stock Allocation ---");

  // TEST 2.1: addDelivery with WarehouseID and stock decrement within transaction
  let createdDeliveryID: string;
  {
    const { req, res, getStatus, getData } = createMockReqRes({
      CustomerID: customer.CustomerID,
      WarehouseID: sourceWh.WarehouseID,
      ProductID: product.ProductID,
      DeliveryQuantity: 20, // should decrement source inventory from 60 to 40
      SalesDate: new Date().toISOString(),
      companyId: tenantId,
    });

    await DeliveryController.addDelivery(req, res);
    const status = getStatus();
    const data = getData();

    console.log(`Test 2.1 - Add Delivery with stock allocation: Status = ${status}, DeliveryID = ${data?.DeliveryID}, WarehouseID = ${data?.WarehouseID}`);
    if (status !== 200 || !data?.DeliveryID || data?.WarehouseID !== sourceWh.WarehouseID) {
      throw new Error(`Test 2.1 FAILED: Expected 200 and WarehouseID assigned, got ${status}: ${JSON.stringify(data)}`);
    }
    createdDeliveryID = data.DeliveryID;

    // Verify source inventory decremented from 60 -> 40
    const inv = await prisma.inventory.findUnique({ where: { InventoryID: sourceInventory.InventoryID } });
    if (inv?.InventoryAvailable !== 40) {
      throw new Error(`Test 2.1 FAILED: Stock should be decremented from 60 to 40, but is ${inv?.InventoryAvailable}`);
    }
    console.log("✔ Test 2.1 PASSED: Delivery created and inventory stock in source warehouse decremented from 60 -> 40 units.");
  }

  // TEST 2.2: getDelivery includes Warehouse relation
  {
    const { req, res, getStatus, getData } = createMockReqRes({}, { DeliveryID: createdDeliveryID });
    await DeliveryController.getDelivery(req, res);
    const status = getStatus();
    const data = getData();

    console.log(`Test 2.2 - getDelivery includes Warehouse: Status = ${status}, WarehouseName = ${data?.Warehouse?.WarehouseName}`);
    if (status !== 200 || !data?.Warehouse || data.Warehouse.WarehouseID !== sourceWh.WarehouseID) {
      throw new Error(`Test 2.2 FAILED: Expected Warehouse relation to be included, got ${status}: ${JSON.stringify(data)}`);
    }
    console.log(`✔ Test 2.2 PASSED: getDelivery returned fulfillment Warehouse (${data.Warehouse.WarehouseName}).`);
  }

  // --------------------------------------------------------------------------
  // TASK 3: Immutable Audit Trail (Transaction Ledger Hardening)
  // --------------------------------------------------------------------------
  console.log("\n--- TASK 3: Immutable Audit Trail Hardening ---");

  // TEST 3.1: TransactionController only has addTransaction, getAllTransactions, getTransaction
  const controllerMethods = Object.keys(TransactionController).sort();
  console.log(`Test 3.1 - TransactionController exported methods: [${controllerMethods.join(", ")}]`);
  if (controllerMethods.includes("editTransaction") || controllerMethods.includes("deleteTransaction")) {
    throw new Error(`Test 3.1 FAILED: editTransaction or deleteTransaction still exported in controller!`);
  }
  if (!controllerMethods.includes("addTransaction") || !controllerMethods.includes("getAllTransactions") || !controllerMethods.includes("getTransaction")) {
    throw new Error(`Test 3.1 FAILED: Missing required append-only controller methods!`);
  }
  console.log("✔ Test 3.1 PASSED: Controller strictly restricted to addTransaction, getAllTransactions, getTransaction.");

  // TEST 3.2: HTTP 405 Method Not Allowed on PATCH /edit and DELETE /delete/:id via Express router
  {
    const testApp = express();
    testApp.use(express.json());
    testApp.use("/api/transaction", TransactionRouter);

    const server = http.createServer(testApp);
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const serverPort = (server.address() as any).port;
    const testBaseUrl = `http://127.0.0.1:${serverPort}/api/transaction`;

    try {
      // Test PATCH /edit
      const patchRes = await fetch(`${testBaseUrl}/edit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ TransactionID: "fake123", TransactionDetail: "tampered" }),
      });
      const patchBody: any = await patchRes.json();
      console.log(`Test 3.2 - PATCH /edit response: ${patchRes.status} (${JSON.stringify(patchBody)})`);
      if (patchRes.status !== 405) {
        throw new Error(`Test 3.2 FAILED: Expected 405 Method Not Allowed on PATCH /edit, got ${patchRes.status}`);
      }

      // Test DELETE /delete/123
      const delRes = await fetch(`${testBaseUrl}/delete/fake123`, {
        method: "DELETE",
      });
      const delBody: any = await delRes.json();
      console.log(`Test 3.2 - DELETE /delete/:id response: ${delRes.status} (${JSON.stringify(delBody)})`);
      if (delRes.status !== 405) {
        throw new Error(`Test 3.2 FAILED: Expected 405 Method Not Allowed on DELETE /delete/:id, got ${delRes.status}`);
      }
      console.log("✔ Test 3.2 PASSED: PATCH /edit and DELETE /delete/:id both strictly return HTTP 405 Method Not Allowed.");
    } finally {
      server.close();
    }
  }

  // Cleanup test data
  console.log("\n[CLEANUP] Cleaning up test artifacts...");
  await prisma.deliveryDetail.deleteMany({ where: { DeliveryID: createdDeliveryID } });
  await prisma.delivery.deleteMany({ where: { companyId: tenantId } });
  await prisma.transfer.deleteMany({ where: { companyId: tenantId } });
  await prisma.inventory.deleteMany({ where: { companyId: tenantId } });
  await prisma.product.deleteMany({ where: { companyId: tenantId } });
  await prisma.customer.deleteMany({ where: { companyId: tenantId } });
  await prisma.warehouse.deleteMany({ where: { companyId: tenantId } });
  await prisma.location.deleteMany({ where: { companyId: tenantId } });
  await prisma.user.deleteMany({ where: { companyId: tenantId } });
  await prisma.company.deleteMany({ where: { companyId: tenantId } });

  console.log("\n>>> ALL PHASE 1 TRANSACTIONAL ARCHITECTURE TESTS PASSED CLEANLY! <<<");
}

runVerification()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("VERIFICATION FAILED:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
