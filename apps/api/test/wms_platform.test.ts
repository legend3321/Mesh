import { prisma } from "../db";
import ZoneController from "../controllers/Zone.controller";
import BinLocationController from "../controllers/BinLocation.controller";
import BatchController from "../controllers/Batch.controller";
import RMAController from "../controllers/RMA.controller";

function mockRes() {
  const res: any = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runWmsTests() {
  console.log("==================================================================");
  console.log("       WMS PLATFORM & FEFO / RMA LOGISTICS TEST SUITE             ");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}${detail ? ` -> ${detail}` : ""}`);
      failed++;
    }
  }

  // Setup test company, warehouse, product, customer
  let testCompany = await prisma.company.findFirst();
  if (!testCompany) {
    testCompany = await prisma.company.create({
      data: {
        companyName: "WMS Test Logistics Corp",
        companyCode: `WMS-${Date.now().toString(36).toUpperCase()}`,
      },
    });
  }
  const companyId = testCompany.companyId;

  let testLocation = await prisma.location.findFirst({ where: { companyId } });
  if (!testLocation) {
    testLocation = await prisma.location.create({
      data: {
        LocationName: "WMS Hub 1",
        LocationAddress: "100 Logistics Way",
        companyId,
      },
    });
  }

  let testWarehouse = await prisma.warehouse.findFirst({ where: { companyId } });
  if (!testWarehouse) {
    testWarehouse = await prisma.warehouse.create({
      data: {
        WarehouseName: "Central Fulfillment Center",
        isRefrigerated: true,
        LocationID: testLocation.LocationID,
        companyId,
      },
    });
  }
  const warehouseId = testWarehouse.WarehouseID;

  let testProduct = await prisma.product.findFirst({ where: { companyId } });
  if (!testProduct) {
    testProduct = await prisma.product.create({
      data: {
        ProductCode: `SKU-WMS-${Date.now()}`,
        BarCode: `BAR-${Date.now()}`,
        ProductName: "Precision Sensor Probe",
        ProductDescription: "High-accuracy IoT environmental probe",
        ProductCategory: "Electronics",
        CostPrice: 25.0,
        SellPrice: 50.0,
        MaxretailPrice: 60.0,
        companyId,
      },
    });
  }
  const productId = testProduct.ProductID;

  let testCustomer = await prisma.customer.findFirst({ where: { companyId } });
  if (!testCustomer) {
    testCustomer = await prisma.customer.create({
      data: {
        CustomerName: "Acme Industrial Client",
        CustomerAddress: "500 Enterprise Ave",
        companyId,
      },
    });
  }
  const customerId = testCustomer.CustomerID;

  const existingUser = await prisma.user.findFirst();
  const validUserId = existingUser ? existingUser.userId : "507f1f77bcf86cd799439011";

  const mockUser = {
    userId: validUserId,
    companyId,
    userRole: "MANAGER",
  };

  const createReq = (body: any = {}, params: any = {}, query: any = {}) => ({
    body,
    params,
    query,
    headers: { "x-company-id": companyId },
    user: mockUser,
  } as any);

  let createdZoneId = "";
  let createdBinId = "";
  let batchEarlyId = "";
  let batchLateId = "";
  let batchExpiredId = "";
  let createdRmaId = "";

  try {
    // -------------------------------------------------------------
    // TEST 1: Zone Controller CRUD
    // -------------------------------------------------------------
    console.log("\n[1] Testing Zone Controller...");
    {
      const req = createReq({
        ZoneName: "Cold Chain Zone A",
        ZoneType: "COLD_CHAIN",
        WarehouseID: warehouseId,
      });
      const res = mockRes();
      await ZoneController.addZone(req, res);

      assert(res.statusCode === 201, "ZoneController.addZone returns 201");
      assert(res.body?.ZoneName === "Cold Chain Zone A", "ZoneName preserved");
      assert(res.body?.ZoneType === "COLD_CHAIN", "ZoneType enum COLD_CHAIN stored");
      createdZoneId = res.body?.ZoneID;
    }

    {
      const req = createReq({ ZoneID: createdZoneId, ZoneName: "Cold Chain Zone Alpha" });
      const res = mockRes();
      await ZoneController.editZone(req, res);
      assert(res.statusCode === 200 && res.body?.ZoneName === "Cold Chain Zone Alpha", "ZoneController.editZone updates zone name");
    }

    {
      const req = createReq({}, { WarehouseID: warehouseId });
      const res = mockRes();
      await ZoneController.getZonesByWarehouse(req, res);
      assert(res.statusCode === 200 && Array.isArray(res.body) && res.body.length > 0, "ZoneController.getZonesByWarehouse lists warehouse zones");
    }

    // -------------------------------------------------------------
    // TEST 2: BinLocation Controller CRUD
    // -------------------------------------------------------------
    console.log("\n[2] Testing BinLocation Controller...");
    {
      const req = createReq({
        BinCode: "A-01-02-B",
        Aisle: "A",
        Rack: "01",
        Shelf: "02",
        Bin: "B",
        MaxWeightKg: 500,
        MaxVolumeCbm: 2.5,
        ZoneID: createdZoneId,
        WarehouseID: warehouseId,
      });
      const res = mockRes();
      await BinLocationController.addBinLocation(req, res);

      assert(res.statusCode === 201, "BinLocationController.addBinLocation returns 201");
      assert(res.body?.BinCode === "A-01-02-B", "BinCode correctly indexed");
      assert(res.body?.ZoneID === createdZoneId, "Zone relation linked");
      createdBinId = res.body?.BinID;
    }

    {
      const req = createReq({}, { WarehouseID: warehouseId });
      const res = mockRes();
      await BinLocationController.getBinsByWarehouse(req, res);
      assert(res.statusCode === 200 && res.body.some((b: any) => b.BinID === createdBinId), "BinLocationController.getBinsByWarehouse finds created bin");
    }

    // -------------------------------------------------------------
    // TEST 3: Batch Management & Expiry Tracking
    // -------------------------------------------------------------
    console.log("\n[3] Testing Batch Controller...");
    const now = new Date();
    const pastDate = new Date(now.getTime() - 30 * 24 * 3600 * 1000); // 30 days ago
    const earlyDate = new Date(now.getTime() + 15 * 24 * 3600 * 1000); // 15 days in future
    const lateDate = new Date(now.getTime() + 90 * 24 * 3600 * 1000); // 90 days in future

    // Batch 1: Expired Batch
    {
      const req = createReq({
        BatchNumber: `LOT-EXP-${Date.now()}`,
        ProductID: productId,
        ManufacturingDate: new Date(pastDate.getTime() - 60 * 24 * 3600 * 1000),
        ExpiryDate: pastDate,
        SupplierLotNumber: "SUPP-LOT-EXPIRED",
        QualityStatus: "RELEASED",
      });
      const res = mockRes();
      await BatchController.addBatch(req, res);
      assert(res.statusCode === 201, "BatchController.addBatch creates expired batch");
      batchExpiredId = res.body?.BatchID;
    }

    // Batch 2: Early Expiry (should be picked first under FEFO)
    {
      const req = createReq({
        BatchNumber: `LOT-EARLY-${Date.now()}`,
        ProductID: productId,
        ManufacturingDate: new Date(),
        ExpiryDate: earlyDate,
        SupplierLotNumber: "SUPP-LOT-EARLY",
        QualityStatus: "RELEASED",
      });
      const res = mockRes();
      await BatchController.addBatch(req, res);
      assert(res.statusCode === 201, "BatchController.addBatch creates early-expiring batch");
      batchEarlyId = res.body?.BatchID;
    }

    // Batch 3: Late Expiry (should be picked second under FEFO)
    {
      const req = createReq({
        BatchNumber: `LOT-LATE-${Date.now()}`,
        ProductID: productId,
        ManufacturingDate: new Date(),
        ExpiryDate: lateDate,
        SupplierLotNumber: "SUPP-LOT-LATE",
        QualityStatus: "RELEASED",
      });
      const res = mockRes();
      await BatchController.addBatch(req, res);
      assert(res.statusCode === 201, "BatchController.addBatch creates late-expiring batch");
      batchLateId = res.body?.BatchID;
    }

    // Seed inventory stock for batches
    const invExpired = await prisma.inventory.create({
      data: {
        InventoryAvailable: 10,
        MinStockLevel: 0,
        MaxStockLevel: 100,
        ReorderPoint: 5,
        ProductID: productId,
        WarehouseID: warehouseId,
        BinID: createdBinId,
        BatchID: batchExpiredId,
        companyId,
      },
    });

    const invEarly = await prisma.inventory.create({
      data: {
        InventoryAvailable: 25,
        MinStockLevel: 0,
        MaxStockLevel: 100,
        ReorderPoint: 5,
        ProductID: productId,
        WarehouseID: warehouseId,
        BinID: createdBinId,
        BatchID: batchEarlyId,
        companyId,
      },
    });

    const invLate = await prisma.inventory.create({
      data: {
        InventoryAvailable: 50,
        MinStockLevel: 0,
        MaxStockLevel: 100,
        ReorderPoint: 5,
        ProductID: productId,
        WarehouseID: warehouseId,
        BinID: createdBinId,
        BatchID: batchLateId,
        companyId,
      },
    });

    // -------------------------------------------------------------
    // TEST 4: Algorithmic FEFO Picking Suggestion Engine
    // -------------------------------------------------------------
    console.log("\n[4] Testing Algorithmic FEFO Picking...");
    {
      // Request 35 units: Should pick 25 from early batch, 10 from late batch, and warn on expired batch!
      const req = createReq({
        productId,
        requestedQuantity: 35,
        warehouseId,
      });
      const res = mockRes();
      await BatchController.getFefoPickingPlan(req, res);

      assert(res.statusCode === 200, "FEFO endpoint returns 200");
      assert(res.body?.requestedQuantity === 35, "Requested quantity matched");
      assert(res.body?.totalAllocatedQuantity === 35, "Total allocated quantity is 35");
      assert(res.body?.remainingUnfulfilledQuantity === 0, "No unfulfilled remainder");
      assert(res.body?.fullyAllocated === true, "fullyAllocated is true");

      // Verify FEFO order: first allocation must be early expiring batch
      const alloc1 = res.body?.allocations?.[0];
      const alloc2 = res.body?.allocations?.[1];

      assert(alloc1?.batchId === batchEarlyId, "FEFO Priority 1: Allocates earliest expiring batch first");
      assert(alloc1?.allocatedQuantity === 25, "FEFO Priority 1: Takes all 25 units available in early batch");
      assert(alloc1?.binCode === "A-01-02-B", "FEFO Priority 1: Includes BinLocation code for picker navigation");

      assert(alloc2?.batchId === batchLateId, "FEFO Priority 2: Allocates remaining 10 units from later batch");
      assert(alloc2?.allocatedQuantity === 10, "FEFO Priority 2: Takes exactly 10 units from late batch");

      // Verify critical warning for expired batch
      const hasExpiredWarning = res.body?.warnings?.some((w: string) => w.includes("CRITICAL WARNING") && w.includes("expired on"));
      assert(hasExpiredWarning === true, "FEFO Engine emits CRITICAL WARNING for active expired stock in warehouse");
      assert(res.body?.expiredStockFound?.length > 0, "FEFO Engine catalogs expired stock details");
    }

    // -------------------------------------------------------------
    // TEST 5: RMA Controller & Reverse Logistics Intake State Machine
    // -------------------------------------------------------------
    console.log("\n[5] Testing RMA Controller & Intake State Machine...");
    {
      const req = createReq({
        CustomerID: customerId,
        Reason: "Customer reported defective sensor calibration",
        Status: "REQUESTED",
        RMADetails: [
          {
            ProductID: productId,
            QuantityReturned: 5,
            Disposition: null,
            CreditAmount: 0,
            WarehouseID: warehouseId,
          },
        ],
      });
      const res = mockRes();
      await RMAController.addRMA(req, res);

      assert(res.statusCode === 201, "RMAController.addRMA creates return authorization");
      assert(res.body?.Status === "REQUESTED", "Initial RMA status is REQUESTED");
      assert(res.body?.RMADetails?.length === 1, "RMADetail record created");
      createdRmaId = res.body?.RMAID;
    }

    {
      const req = createReq({}, { RMAID: createdRmaId });
      const res = mockRes();
      await RMAController.getSingleRMA(req, res);
      assert(res.statusCode === 200 && res.body?.RMAID === createdRmaId, "RMAController.getSingleRMA retrieves RMA");
    }

    // TEST 6: Process Return Intake (RESTOCK + QUARANTINE + Credit calculation)
    console.log("\n[6] Testing Return Intake Engine (/api/rma/process-intake)...");
    const stockBefore = await prisma.inventory.findFirst({
      where: { ProductID: productId, WarehouseID: warehouseId, BinID: createdBinId, companyId },
    });
    const initialQty = stockBefore?.InventoryAvailable || 0;

    {
      const req = createReq({
        rmaId: createdRmaId,
        status: "SETTLED",
        intakeNotes: "Inspected at Central Fulfillment intake dock. 3 units restored to stock, 2 quarantined.",
        items: [
          {
            productId,
            quantity: 3,
            disposition: "RESTOCK",
            warehouseId,
            binId: createdBinId,
            creditAmount: 75.0, // $25 * 3
          },
          {
            productId,
            quantity: 2,
            disposition: "QUARANTINE",
            warehouseId,
            binId: createdBinId,
            creditAmount: 50.0, // $25 * 2
          },
        ],
      });
      const res = mockRes();
      await RMAController.processRMAIntake(req, res);

      assert(res.statusCode === 200, "processRMAIntake returns HTTP 200");
      assert(res.body?.success === true, "Intake returns success: true");
      assert(res.body?.restockedItemsCount === 3, "Recorded 3 restocked items");
      assert(res.body?.quarantinedItemsCount === 2, "Recorded 2 quarantined items");
      assert(res.body?.totalCreditIssued === 125.0, "Computed total credit issued: $125.00");
      assert(res.body?.rma?.Status === "SETTLED", "RMA state machine advanced to SETTLED");

      // Verify physical inventory increment for RESTOCK
      const stockAfter = await prisma.inventory.findFirst({
        where: { ProductID: productId, WarehouseID: warehouseId, BinID: createdBinId, companyId },
      });
      assert(
        (stockAfter?.InventoryAvailable || 0) === initialQty + 3,
        `Inventory stock incremented by 3 (from ${initialQty} to ${stockAfter?.InventoryAvailable})`
      );

      // Verify audit transaction log was created
      const auditLog = await prisma.transaction.findFirst({
        where: {
          companyId,
          TransactionDetail: { contains: "RMA Return Intake processed" },
        },
        orderBy: { TransactionID: "desc" },
      });
      assert(!!auditLog, "Audit transaction logged with credit details and disposition counts");
    }

    // Cleanup test records
    await prisma.inventory.deleteMany({ where: { InventoryID: { in: [invExpired.InventoryID, invEarly.InventoryID, invLate.InventoryID] } } });
    await prisma.rMADetail.deleteMany({ where: { RMAID: createdRmaId } });
    await prisma.rMA.delete({ where: { RMAID: createdRmaId } });
    await prisma.batch.deleteMany({ where: { BatchID: { in: [batchEarlyId, batchLateId, batchExpiredId] } } });
    await prisma.binLocation.delete({ where: { BinID: createdBinId } });
    await prisma.zone.delete({ where: { ZoneID: createdZoneId } });

  } catch (error) {
    console.error("Test execution encountered an error:", error);
    failed++;
  }

  console.log("\n==================================================================");
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runWmsTests()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
