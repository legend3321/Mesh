import { PrismaClient } from "@prisma/client";
import MatchingEngineService from "../services/MatchingEngine.service";
import InvoiceController from "../controllers/Invoice.controller";
import GoodsReceiptController from "../controllers/GoodsReceipt.controller";
import ApprovalController from "../controllers/Approval.controller";
import OrderController from "../controllers/Order.controller";
import PaymentController from "../controllers/Payment.controller";

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

async function runTestSuite() {
  console.log("================================================================================");
  console.log("   THREE-WAY MATCHING ENGINE & MAKER-CHECKER GOVERNANCE VERIFICATION SUITE       ");
  console.log("================================================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (details) console.error("         Details:", details);
      failed++;
    }
  }

  try {
    // 1. Setup Test Tenant, Users, Provider, and Products
    let company = await prisma.company.findFirst();
    if (!company) {
      company = await prisma.company.create({
        data: {
          companyName: "Governance Test Corp",
          companyCode: `GOV-${Date.now()}`,
        },
      });
    }
    const tenantId = company.companyId;

    // Maker User (EMPLOYEE role)
    const makerEmail = `maker-${Date.now()}@mesh.test`;
    const makerUser = await prisma.user.create({
      data: {
        userEmail: makerEmail,
        userName: "Requisition Maker",
        userPassword: "Password123!",
        userRole: "EMPLOYEE",
        companyId: tenantId,
      },
    });

    // Checker User (ADMIN role)
    const checkerEmail = `checker-${Date.now()}@mesh.test`;
    const checkerUser = await prisma.user.create({
      data: {
        userEmail: checkerEmail,
        userName: "Financial Checker",
        userPassword: "Password123!",
        userRole: "ADMIN",
        companyId: tenantId,
      },
    });

    // Third party unauthorized user (EMPLOYEE role)
    const employeeEmail = `employee-${Date.now()}@mesh.test`;
    const employeeUser = await prisma.user.create({
      data: {
        userEmail: employeeEmail,
        userName: "Warehouse Associate",
        userPassword: "Password123!",
        userRole: "EMPLOYEE",
        companyId: tenantId,
      },
    });

    let provider = await prisma.provider.findFirst({ where: { companyId: tenantId } });
    if (!provider) {
      provider = await prisma.provider.create({
        data: {
          ProviderName: "Global Industrial Logistics",
          ProviderAddress: "742 Evergreen Terrace",
          companyId: tenantId,
        },
      });
    }

    const testProduct = await prisma.product.create({
      data: {
        ProductCode: `SKU-MATCH-${Date.now()}`,
        BarCode: `BC-${Date.now()}`,
        ProductName: "Precision Sensor Module",
        ProductDescription: "High-spec industrial sensor",
        ProductCategory: "Electronics",
        CostPrice: 50.0,
        SellPrice: 85.0,
        MaxretailPrice: 99.0,
        companyId: tenantId,
      },
    });

    console.log("\n--- SECTION 1: THREE-WAY MATCHING ENGINE CORE TOLERANCE TESTS ---");

    // Helper to create test PO with OrderDetail
    async function createPO(qty: number, unitPrice: number) {
      const order = await prisma.order.create({
        data: {
          OrderDate: new Date(),
          ProviderID: provider!.ProviderID,
          companyId: tenantId,
          TotalAmount: qty * unitPrice,
          OrderStatus: "INITIATED",
          Orderdetail: {
            create: {
              OrderQuantity: qty,
              UnitPrice: unitPrice,
              LineTotal: qty * unitPrice,
              ExpectedDate: new Date(),
              ProductIDs: [testProduct.ProductID],
            },
          },
        },
        include: { Orderdetail: true },
      });
      return order;
    }

    // Helper to create GoodsReceipt
    async function createGR(orderId: string, receivedQty: number, damagedQty: number = 0, disposition: string = "ACCEPTED") {
      return await prisma.goodsReceipt.create({
        data: {
          OrderID: orderId,
          ReceivedDate: new Date(),
          InspectionStatus: damagedQty > 0 ? "PARTIALLY_PASSED" : "PASSED",
          companyId: tenantId,
          items: {
            create: {
              ProductID: testProduct.ProductID,
              QuantityOrdered: 100,
              QuantityReceived: receivedQty,
              QuantityDamaged: damagedQty,
              Disposition: disposition,
            },
          },
        },
      });
    }

    // Helper to create VendorInvoice
    async function createVI(orderId: string, billedQty: number, billedPrice: number) {
      return await prisma.vendorInvoice.create({
        data: {
          InvoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          OrderID: orderId,
          ProviderID: provider!.ProviderID,
          InvoiceDate: new Date(),
          Subtotal: billedQty * billedPrice,
          Tax: 0,
          TotalAmount: billedQty * billedPrice,
          companyId: tenantId,
          items: {
            create: {
              ProductID: testProduct.ProductID,
              QuantityBilled: billedQty,
              UnitPrice: billedPrice,
              LineTotal: billedQty * billedPrice,
            },
          },
        },
      });
    }

    // Test 1.1: Exact Match -> MATCH_CLEARED
    {
      const po = await createPO(100, 50.0);
      await createGR(po.OrderID, 100, 0, "ACCEPTED");
      const vi = await createVI(po.OrderID, 100, 50.0);

      const result = await MatchingEngineService.matchInvoice(vi.InvoiceID, tenantId);
      assert(
        result.matched === true && result.overallStatus === "MATCH_CLEARED",
        "1.1 Exact 3-Way Match clears with MATCH_CLEARED",
        result
      );
    }

    // Test 1.2: Quantity Tolerance <= 1.0% Passing (Billed 101 vs Received 100 = 1.0% variance)
    {
      const po = await createPO(100, 50.0);
      await createGR(po.OrderID, 100, 0, "ACCEPTED");
      const vi = await createVI(po.OrderID, 101, 50.0);

      const result = await MatchingEngineService.matchInvoice(vi.InvoiceID, tenantId);
      assert(
        result.matched === true && result.overallStatus === "MATCH_CLEARED",
        "1.2 Quantity tolerance <= 1% passes (101 billed vs 100 received)",
        result
      );
    }

    // Test 1.3: Quantity Tolerance > 1.0% Failing (Billed 102 vs Received 100 = 2.0% variance)
    {
      const po = await createPO(100, 50.0);
      await createGR(po.OrderID, 100, 0, "ACCEPTED");
      const vi = await createVI(po.OrderID, 102, 50.0);

      const result = await MatchingEngineService.matchInvoice(vi.InvoiceID, tenantId);
      assert(
        result.matched === false && result.overallStatus === "MATCH_VARIANCE_HOLD",
        "1.3 Quantity variance > 1% triggers MATCH_VARIANCE_HOLD (102 billed vs 100 received)",
        result
      );
    }

    // Test 1.4: Unit Price Tolerance <= $0.01 Passing (PO $50.00 vs Billed $50.01)
    {
      const po = await createPO(100, 50.0);
      await createGR(po.OrderID, 100, 0, "ACCEPTED");
      const vi = await createVI(po.OrderID, 100, 50.01);

      const result = await MatchingEngineService.matchInvoice(vi.InvoiceID, tenantId);
      assert(
        result.matched === true && result.overallStatus === "MATCH_CLEARED",
        "1.4 Price matching within $0.01 passes ($50.01 vs $50.00)",
        result
      );
    }

    // Test 1.5: Unit Price Variance > $0.01 Failing (PO $50.00 vs Billed $50.05)
    {
      const po = await createPO(100, 50.0);
      await createGR(po.OrderID, 100, 0, "ACCEPTED");
      const vi = await createVI(po.OrderID, 100, 50.05);

      const result = await MatchingEngineService.matchInvoice(vi.InvoiceID, tenantId);
      assert(
        result.matched === false && result.overallStatus === "MATCH_VARIANCE_HOLD",
        "1.5 Price deviation > $0.01 triggers MATCH_VARIANCE_HOLD ($50.05 vs $50.00)",
        result
      );
    }

    // Test 1.6: Damaged Goods Accounting (100 received - 10 damaged = 90 accepted net; billed 100 -> variance 11.1%)
    {
      const po = await createPO(100, 50.0);
      await createGR(po.OrderID, 100, 10, "ACCEPTED");
      const vi = await createVI(po.OrderID, 100, 50.0);

      const result = await MatchingEngineService.matchInvoice(vi.InvoiceID, tenantId);
      assert(
        result.matched === false &&
        result.overallStatus === "MATCH_VARIANCE_HOLD" &&
        result.lineResults[0].quantityReceived === 90,
        "1.6 Damaged goods deducted from accepted physical receipt (net 90 vs 100 billed)",
        result
      );
    }

    console.log("\n--- SECTION 2: INVOICE & GOODS RECEIPT CONTROLLERS & ROUTES ---");

    // Test 2.1: POST /api/goodsReceipt/add
    let createdGRId: string = "";
    {
      const po = await createPO(50, 45.0);
      const req = createMockRequest(makerUser, {
        OrderID: po.OrderID,
        ReceivedDate: new Date(),
        InspectionStatus: "PASSED",
        items: [
          {
            ProductID: testProduct.ProductID,
            QuantityOrdered: 50,
            QuantityReceived: 50,
            QuantityDamaged: 0,
            Disposition: "ACCEPTED",
          },
        ],
      });
      const res = createMockResponse();
      await GoodsReceiptController.addGoodsReceipt(req as any, res as any);

      assert(
        res.statusCode === 200 && res.data.GoodsReceiptID && res.data.items?.length === 1,
        "2.1 GoodsReceiptController.addGoodsReceipt persists receipt with items",
        res.data
      );
      createdGRId = res.data.GoodsReceiptID;
    }

    // Test 2.2: GET /api/goodsReceipt/getAll
    {
      const req = createMockRequest(makerUser);
      const res = createMockResponse();
      await GoodsReceiptController.getAllGoodsReceipts(req as any, res as any);

      assert(
        res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0,
        "2.2 GoodsReceiptController.getAllGoodsReceipts retrieves records scoped to tenant",
        res.data.length
      );
    }

    // Test 2.3: GET /api/goodsReceipt/:GoodsReceiptID
    {
      const req = createMockRequest(makerUser, {}, { GoodsReceiptID: createdGRId });
      const res = createMockResponse();
      await GoodsReceiptController.getGoodsReceipt(req as any, res as any);

      assert(
        res.statusCode === 200 && res.data.GoodsReceiptID === createdGRId,
        "2.3 GoodsReceiptController.getGoodsReceipt retrieves single receipt",
        res.data
      );
    }

    // Test 2.4: POST /api/invoice/add with automated initial 3-way match
    let createdInvoiceId: string = "";
    {
      const po = await createPO(40, 50.0);
      await createGR(po.OrderID, 40, 0, "ACCEPTED");

      const req = createMockRequest(makerUser, {
        InvoiceNumber: `INV-AUTO-${Date.now()}`,
        OrderID: po.OrderID,
        ProviderID: provider!.ProviderID,
        InvoiceDate: new Date(),
        items: [
          {
            ProductID: testProduct.ProductID,
            QuantityBilled: 40,
            UnitPrice: 50.0,
            LineTotal: 2000.0,
          },
        ],
        runMatch: true,
      });
      const res = createMockResponse();
      await InvoiceController.addInvoice(req as any, res as any);

      assert(
        res.statusCode === 200 &&
        res.data.InvoiceID &&
        res.data.MatchStatus === "MATCH_CLEARED" &&
        res.data.matchResult?.matched === true,
        "2.4 InvoiceController.addInvoice creates invoice and automatically clears 3-way match",
        res.data
      );
      createdInvoiceId = res.data.InvoiceID;
    }

    // Test 2.5: GET /api/invoice/getAll
    {
      const req = createMockRequest(makerUser);
      const res = createMockResponse();
      await InvoiceController.getAllInvoices(req as any, res as any);

      assert(
        res.statusCode === 200 && Array.isArray(res.data) && res.data.length > 0,
        "2.5 InvoiceController.getAllInvoices retrieves all invoices scoped to tenant",
        res.data.length
      );
    }

    // Test 2.6: GET /api/invoice/:InvoiceID
    {
      const req = createMockRequest(makerUser, {}, { InvoiceID: createdInvoiceId });
      const res = createMockResponse();
      await InvoiceController.getInvoice(req as any, res as any);

      assert(
        res.statusCode === 200 && res.data.InvoiceID === createdInvoiceId,
        "2.6 InvoiceController.getInvoice retrieves single invoice with line items",
        res.data
      );
    }

    // Test 2.7: POST /api/invoice/match/:InvoiceID
    {
      const req = createMockRequest(makerUser, {}, { InvoiceID: createdInvoiceId });
      const res = createMockResponse();
      await InvoiceController.matchInvoice(req as any, res as any);

      assert(
        res.statusCode === 200 && res.data.overallStatus === "MATCH_CLEARED" && res.data.matched === true,
        "2.7 InvoiceController.matchInvoice triggers 3-way match successfully",
        res.data
      );
    }

    console.log("\n--- SECTION 3: SPEND THRESHOLD TRIGGERS ($10,000) ---");

    // Test 3.1: Order with total >= $10,000 routes to PENDING_APPROVAL and creates ApprovalQueue
    let highSpendOrderId = "";
    {
      const req = createMockRequest(makerUser, {
        ProviderID: provider!.ProviderID,
        items: [
          {
            ProductID: testProduct.ProductID,
            OrderQuantity: 250, // 250 * $50 = $12,500 >= $10,000
            UnitPrice: 50.0,
            TaxRate: 0,
          },
        ],
      });
      const res = createMockResponse();
      await OrderController.addOrder(req as any, res as any);

      highSpendOrderId = res.data.OrderID;
      const approvalRecord = await prisma.approvalQueue.findFirst({
        where: {
          EntityType: "ORDER",
          EntityID: highSpendOrderId,
        },
      });

      assert(
        res.statusCode === 200 &&
        res.data.OrderStatus === "PENDING_APPROVAL" &&
        res.data.CreatedBy === makerUser.userId &&
        approvalRecord !== null &&
        approvalRecord.RequestedAmount === 12500 &&
        approvalRecord.RequestedBy === makerUser.userId &&
        approvalRecord.Status === "PENDING",
        "3.1 Order >= $10,000 triggers PENDING_APPROVAL and registers in ApprovalQueue",
        { orderStatus: res.data.OrderStatus, approvalRecord }
      );
    }

    // Test 3.2: Order with total < $10,000 does NOT route to ApprovalQueue
    {
      const req = createMockRequest(makerUser, {
        ProviderID: provider!.ProviderID,
        items: [
          {
            ProductID: testProduct.ProductID,
            OrderQuantity: 100, // 100 * $50 = $5,000 < $10,000
            UnitPrice: 50.0,
            TaxRate: 0,
          },
        ],
      });
      const res = createMockResponse();
      await OrderController.addOrder(req as any, res as any);

      const approvalRecord = await prisma.approvalQueue.findFirst({
        where: {
          EntityType: "ORDER",
          EntityID: res.data.OrderID,
        },
      });

      assert(
        res.statusCode === 200 &&
        res.data.OrderStatus === "INITIATED" &&
        approvalRecord === null,
        "3.2 Order < $10,000 remains INITIATED without ApprovalQueue creation",
        res.data.OrderStatus
      );
    }

    // Test 3.3: Payment with amount >= $10,000 routes to PENDING_APPROVAL and creates ApprovalQueue
    let highSpendPaymentId = "";
    {
      const req = createMockRequest(makerUser, {
        PaymentAmount: 15000,
        PaymentMode: "ONLINE",
        PaymentDescription: "Capital Equipment Installment",
      });
      const res = createMockResponse();
      await PaymentController.addPayment(req as any, res as any);

      highSpendPaymentId = res.data.PaymentID;
      const approvalRecord = await prisma.approvalQueue.findFirst({
        where: {
          EntityType: "PAYMENT",
          EntityID: highSpendPaymentId,
        },
      });

      assert(
        res.statusCode === 200 &&
        res.data.PaymentStatus === "PENDING_APPROVAL" &&
        res.data.CreatedBy === makerUser.userId &&
        approvalRecord !== null &&
        approvalRecord.RequestedAmount === 15000 &&
        approvalRecord.RequestedBy === makerUser.userId &&
        approvalRecord.Status === "PENDING",
        "3.3 Payment >= $10,000 triggers PENDING_APPROVAL and registers in ApprovalQueue",
        { paymentStatus: res.data.PaymentStatus, approvalRecord }
      );
    }

    // Test 3.4: Payment with amount < $10,000 does NOT route to ApprovalQueue
    {
      const req = createMockRequest(makerUser, {
        PaymentAmount: 2500,
        PaymentMode: "ONLINE",
        PaymentDescription: "Standard supply replenishment",
      });
      const res = createMockResponse();
      await PaymentController.addPayment(req as any, res as any);

      const approvalRecord = await prisma.approvalQueue.findFirst({
        where: {
          EntityType: "PAYMENT",
          EntityID: res.data.PaymentID,
        },
      });

      assert(
        res.statusCode === 200 &&
        res.data.PaymentStatus === "INITIATED" &&
        approvalRecord === null,
        "3.4 Payment < $10,000 remains INITIATED without ApprovalQueue creation",
        res.data.PaymentStatus
      );
    }

    console.log("\n--- SECTION 4: MAKER-CHECKER DUAL CONTROL & SEGREGATION OF DUTIES ---");

    // Retrieve the ApprovalQueue item for highSpendOrderId
    const orderApproval = await prisma.approvalQueue.findFirst({
      where: { EntityType: "ORDER", EntityID: highSpendOrderId },
    });
    if (!orderApproval) {
      throw new Error("Missing approval queue record for order test");
    }

    // Test 4.1: Segregation of Duties (SoD) Enforcement: Requester CANNOT self-approve
    {
      const req = createMockRequest(makerUser, { notes: "Attempting self-approval" }, { id: orderApproval.ApprovalID });
      const res = createMockResponse();
      await ApprovalController.approveRequisition(req as any, res as any);

      assert(
        res.statusCode === 403 && res.data.error.includes("Segregation of Duties Violation"),
        "4.1 SoD Block: Requester cannot self-approve (HTTP 403 Forbidden)",
        res.data
      );
    }

    // Test 4.2: Unauthorized role (EMPLOYEE) cannot approve
    {
      const req = createMockRequest(employeeUser, { notes: "Peer review" }, { id: orderApproval.ApprovalID });
      const res = createMockResponse();
      await ApprovalController.approveRequisition(req as any, res as any);

      assert(
        res.statusCode === 403 && res.data.error.includes("Only users with ADMIN or SUPERADMIN role"),
        "4.2 Role Block: Non-admin cannot approve requisitions (HTTP 403 Forbidden)",
        res.data
      );
    }

    // Test 4.3: Authorized Checker (ADMIN != maker) approves requisition
    {
      const req = createMockRequest(checkerUser, { notes: "Dual control check verified: Budget allocated" }, { id: orderApproval.ApprovalID });
      const res = createMockResponse();
      await ApprovalController.approveRequisition(req as any, res as any);

      const refreshedOrder = await prisma.order.findUnique({ where: { OrderID: highSpendOrderId } });
      const refreshedApproval = await prisma.approvalQueue.findUnique({ where: { ApprovalID: orderApproval.ApprovalID } });

      assert(
        res.statusCode === 200 &&
        refreshedApproval?.Status === "APPROVED" &&
        refreshedApproval?.ApprovedBy === checkerUser.userId &&
        refreshedOrder?.OrderStatus === "COMPLETED",
        "4.3 Dual-Control Approval succeeds: ApprovalQueue APPROVED & Order transitioned to COMPLETED",
        { approval: refreshedApproval, order: refreshedOrder }
      );
    }

    // Test 4.4: Payment Rejection by Authorized Checker
    const paymentApproval = await prisma.approvalQueue.findFirst({
      where: { EntityType: "PAYMENT", EntityID: highSpendPaymentId },
    });
    if (!paymentApproval) {
      throw new Error("Missing approval queue record for payment test");
    }

    // Self-rejection SoD check
    {
      const req = createMockRequest(makerUser, { notes: "Maker canceling request" }, { id: paymentApproval.ApprovalID });
      const res = createMockResponse();
      await ApprovalController.rejectRequisition(req as any, res as any);

      assert(
        res.statusCode === 403 && res.data.error.includes("Segregation of Duties Violation"),
        "4.4 SoD Block: Requester cannot reject their own requisition (HTTP 403 Forbidden)",
        res.data
      );
    }

    // Authorized Checker rejects Payment
    {
      const req = createMockRequest(checkerUser, { notes: "Disbursement rejected: Supporting documentation missing" }, { id: paymentApproval.ApprovalID });
      const res = createMockResponse();
      await ApprovalController.rejectRequisition(req as any, res as any);

      const refreshedPayment = await prisma.payment.findUnique({ where: { PaymentID: highSpendPaymentId } });
      const refreshedApproval = await prisma.approvalQueue.findUnique({ where: { ApprovalID: paymentApproval.ApprovalID } });

      assert(
        res.statusCode === 200 &&
        refreshedApproval?.Status === "REJECTED" &&
        refreshedApproval?.ApprovedBy === checkerUser.userId &&
        refreshedPayment?.PaymentStatus === "CANCELLED",
        "4.5 Dual-Control Rejection succeeds: ApprovalQueue REJECTED & Payment transitioned to CANCELLED",
        { approval: refreshedApproval, payment: refreshedPayment }
      );
    }

    // Test 4.6: GET /api/approval/queue includes maker and checker metadata
    {
      const req = createMockRequest(checkerUser);
      const res = createMockResponse();
      await ApprovalController.getApprovalQueue(req as any, res as any);

      const record = res.data.find((r: any) => r.ApprovalID === orderApproval.ApprovalID);
      assert(
        res.statusCode === 200 &&
        Array.isArray(res.data) &&
        record &&
        record.maker?.userName === "Requisition Maker" &&
        record.checker?.userName === "Financial Checker",
        "4.6 Approval queue returns enriched records with maker & checker identities",
        record
      );
    }

    // Clean up temporary test data if appropriate
    console.log("\n================================================================================");
    console.log(`TEST SUMMARY: ${passed} Passed, ${failed} Failed out of ${passed + failed} Tests.`);
    console.log("================================================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("FATAL Exception during test suite run:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTestSuite();
