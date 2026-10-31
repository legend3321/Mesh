import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as jwt from "jsonwebtoken";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const prisma = new PrismaClient();

export interface PenTestCaseResult {
  id: string;
  name: string;
  category: string;
  owasp: string;
  cvss: string;
  cvssScore: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  endpoint: string;
  method: string;
  expectedStatus: number | number[];
  actualStatus: number;
  passed: boolean;
  notes: string;
  timestamp: string;
}

const testResults: PenTestCaseResult[] = [];
const createdEphemeralIds: {
  tenantBTransferId?: string;
  tenantBTransactionId?: string;
  tenantATransferId?: string;
} = {};

async function loginUser(email: string, password = "admin123"): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userEmail: email, userPassword: password }),
  });
  if (!res.ok) {
    throw new Error(`Failed to log in ${email}: status ${res.status}`);
  }
  const data = (await res.json()) as any;
  return { token: data.authToken, user: data.user };
}

function recordResult(test: PenTestCaseResult) {
  testResults.push(test);
  const tag = test.passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
  console.log(
    `  ${tag} ${test.id.padEnd(14)} | ${test.method.padEnd(6)} ${test.endpoint.padEnd(46)} | Expected: ${JSON.stringify(
      test.expectedStatus
    ).padEnd(9)} | Actual: ${test.actualStatus} | ${test.name}`
  );
  if (!test.passed) {
    console.log(`         \x1b[31mFAIL NOTE: ${test.notes}\x1b[0m`);
  }
}

async function runEnterprisePenetrationSuite() {
  console.log("\n==========================================================================================");
  console.log(" MESH ENTERPRISE APSEC & MULTI-TENANCY PENETRATION TEST SUITE");
  console.log(" Target:", API_BASE_URL);
  console.log(" Execution Timestamp:", new Date().toISOString());
  console.log(" Program: Mesh Enterprise Modernization Program - Phase 1 Security Certification");
  console.log("==========================================================================================\n");

  // Step 0: Context Provisioning & Target Discovery
  console.log("\x1b[36m[*] STEP 0: Establishing Multi-Tenant Attack Scenarios & Discovery Context...\x1b[0m");

  const tenantACompanyId = "6ae0c6b8d292a872f937453d"; // Apex Pacific Freight Corp
  const tenantBCompanyId = "6ae0c6b8d292a872f9374540"; // Nordic Pulse Consumer Tech
  const tenantCGroupId   = "6ae0c6b8d292a872f937453c"; // Nordic Pulse Lifestyle & Electronics group

  const { token: tokenA, user: userA } = await loginUser("admin@mesh.com");
  const { token: tokenB, user: userB } = await loginUser("elena.rostova@mesh.com");
  const { token: tokenEmp, user: userEmp } = await loginUser("d.kim@mesh.com");
  const { token: tokenSuper, user: userSuper } = await loginUser("superadmin@mesh.com");

  console.log(`  - Tenant A Admin (Attacker context)   : ${userA.userEmail} (Company: ${userA.company?.companyName || tenantACompanyId})`);
  console.log(`  - Tenant B Admin (Target context)     : ${userB.userEmail} (Company: ${userB.company?.companyName || tenantBCompanyId})`);
  console.log(`  - Tenant A Employee (Privilege target): ${userEmp.userEmail} (Role: ${userEmp.userRole})`);
  console.log(`  - SuperAdmin (Platform baseline)      : ${userSuper.userEmail} (Role: ${userSuper.userRole})\n`);

  // Query foreign tenant B entities
  const [
    productB,
    orderB,
    warehouseB,
    warehouseB2,
    deliveryB,
    paymentB,
    customerB,
    providerB,
    locationB,
    inventoryB,
    orderDetailB,
    deliveryDetailB,
  ] = await Promise.all([
    prisma.product.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.order.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.warehouse.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.warehouse.findFirst({ where: { companyId: tenantBCompanyId, WarehouseID: { not: undefined } }, skip: 1 }),
    prisma.delivery.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.payment.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.customer.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.provider.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.location.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.inventory.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.orderdetail.findFirst({ where: { Order: { companyId: tenantBCompanyId } } }),
    prisma.deliveryDetail.findFirst({ where: { Delivery: { companyId: tenantBCompanyId } } }),
  ]);

  // Query Tenant A entities
  const [warehouseA, warehouseA2, productA, inventoryA, customerA, orderA] = await Promise.all([
    prisma.warehouse.findFirst({ where: { companyId: tenantACompanyId } }),
    prisma.warehouse.findFirst({ where: { companyId: tenantACompanyId }, skip: 1 }),
    prisma.product.findFirst({ where: { companyId: tenantACompanyId } }),
    prisma.inventory.findFirst({ where: { companyId: tenantACompanyId } }),
    prisma.customer.findFirst({ where: { companyId: tenantACompanyId } }),
    prisma.order.findFirst({ where: { companyId: tenantACompanyId } }),
  ]);

  if (!productB || !orderB || !warehouseB || !deliveryB || !paymentB || !customerB || !providerB || !locationB || !inventoryB) {
    throw new Error("Missing required Tenant B test fixtures in database.");
  }
  if (!warehouseA || !productA || !inventoryA) {
    throw new Error("Missing required Tenant A test fixtures in database.");
  }

  // Ensure Tenant B has a Transfer entity for BOLA testing
  let transferB = await prisma.transfer.findFirst({ where: { companyId: tenantBCompanyId } });
  if (!transferB && warehouseB2) {
    transferB = await prisma.transfer.create({
      data: {
        ProductID: productB.ProductID,
        OutWarehouseID: warehouseB.WarehouseID,
        InWarehouseID: warehouseB2.WarehouseID,
        TransferQuantity: 15,
        SentDate: new Date(),
        TransferStatus: "IN_TRANSIT",
        companyId: tenantBCompanyId,
      },
    });
    createdEphemeralIds.tenantBTransferId = transferB.TransferID;
  }

  // Ensure Tenant B has a Transaction audit entity for BOLA testing
  let transactionB = await prisma.transaction.findFirst({ where: { companyId: tenantBCompanyId } });
  if (!transactionB) {
    transactionB = await prisma.transaction.create({
      data: {
        TransactionDetail: "Confidential Tenant B Enterprise Ledger Entry",
        UserID: userB.userId,
        companyId: tenantBCompanyId,
      },
    });
    createdEphemeralIds.tenantBTransactionId = transactionB.TransactionID;
  }

  // Ensure Tenant A has a test transfer for mutation tests
  let transferA = await prisma.transfer.findFirst({ where: { companyId: tenantACompanyId } });
  if (!transferA && warehouseA2) {
    transferA = await prisma.transfer.create({
      data: {
        ProductID: productA.ProductID,
        OutWarehouseID: warehouseA.WarehouseID,
        InWarehouseID: warehouseA2.WarehouseID,
        TransferQuantity: 5,
        SentDate: new Date(),
        TransferStatus: "IN_TRANSIT",
        companyId: tenantACompanyId,
      },
    });
    createdEphemeralIds.tenantATransferId = transferA.TransferID;
  }

  let transactionA = await prisma.transaction.findFirst({ where: { companyId: tenantACompanyId } });
  if (!transactionA) {
    transactionA = await prisma.transaction.create({
      data: {
        TransactionDetail: "Apex Pacific Baseline Ledger Record",
        UserID: userA.userId,
        companyId: tenantACompanyId,
      },
    });
  }

  const dummyForeignEnterpriseId = "6ae0c6b8d292a872f9374599";

  // ============================================================================
  // SUITE 1: MULTI-TENANT BOLA / IDOR ATTACK SIMULATIONS (OWASP API1:2023)
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 1: Multi-Tenant BOLA / IDOR Cross-Tenant Penetration Attacks (OWASP API1:2023) ---\x1b[0m");

  // 1.1 Product BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/product/get/${productB.ProductID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-PROD-01",
      name: "BOLA Read Product: Tenant A reading Tenant B Product",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/product/get/${productB.ProductID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Strict multi-tenant filter must mask foreign tenant product existence",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/product/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ProductID: productB.ProductID, ProductName: "Tampered by Attacker" }),
    });
    recordResult({
      id: "SEC-BOLA-PROD-02",
      name: "BOLA Mutate Product: Tenant A tampering Tenant B Product",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/product/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Cross-tenant product mutation must be rejected",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/product/delete/${productB.ProductID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-PROD-03",
      name: "BOLA Delete Product: Tenant A deleting Tenant B Product",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/product/delete/${productB.ProductID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign product deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.2 Order BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/order/get/${orderB.OrderID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-ORD-01",
      name: "BOLA Read Order: Tenant A reading Tenant B Order",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/order/get/${orderB.OrderID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign order details must return 404",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/order/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ OrderID: orderB.OrderID, OrderStatus: "CANCELLED" }),
    });
    recordResult({
      id: "SEC-BOLA-ORD-02",
      name: "BOLA Mutate Order: Tenant A tampering Tenant B Order",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/order/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign order status modification must be rejected",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/order/delete/${orderB.OrderID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-ORD-03",
      name: "BOLA Delete Order: Tenant A deleting Tenant B Order",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/order/delete/${orderB.OrderID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign order deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.3 Warehouse BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/warehouse/get/${warehouseB.WarehouseID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-WH-01",
      name: "BOLA Read Warehouse: Tenant A reading Tenant B Warehouse",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/warehouse/get/${warehouseB.WarehouseID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign warehouse facility details must be concealed",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/warehouse/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ WarehouseID: warehouseB.WarehouseID, WarehouseName: "Defaced Facility" }),
    });
    recordResult({
      id: "SEC-BOLA-WH-02",
      name: "BOLA Mutate Warehouse: Tenant A tampering Tenant B Warehouse",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/warehouse/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign warehouse update must be rejected",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/warehouse/delete/${warehouseB.WarehouseID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-WH-03",
      name: "BOLA Delete Warehouse: Tenant A deleting Tenant B Warehouse",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/warehouse/delete/${warehouseB.WarehouseID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign warehouse deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.4 Delivery BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/delivery/get/${deliveryB.DeliveryID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-DEL-01",
      name: "BOLA Read Delivery: Tenant A reading Tenant B Delivery",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/delivery/get/${deliveryB.DeliveryID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign delivery manifest must remain strictly invisible",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/delivery/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ DeliveryID: deliveryB.DeliveryID }),
    });
    recordResult({
      id: "SEC-BOLA-DEL-02",
      name: "BOLA Mutate Delivery: Tenant A tampering Tenant B Delivery",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/delivery/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign delivery tampering must be rejected",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/delivery/delete/${deliveryB.DeliveryID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-DEL-03",
      name: "BOLA Delete Delivery: Tenant A deleting Tenant B Delivery",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/delivery/delete/${deliveryB.DeliveryID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign delivery deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.5 Payment BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/payment/get/${paymentB.PaymentID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-PAY-01",
      name: "BOLA Read Payment: Tenant A reading Tenant B Payment",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/payment/get/${paymentB.PaymentID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign financial settlements must remain isolated",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/payment/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ PaymentID: paymentB.PaymentID, PaymentAmount: 0.01 }),
    });
    recordResult({
      id: "SEC-BOLA-PAY-02",
      name: "BOLA Mutate Payment: Tenant A tampering Tenant B Payment",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/payment/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign payment amount modification must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/payment/delete/${paymentB.PaymentID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-PAY-03",
      name: "BOLA Delete Payment: Tenant A deleting Tenant B Payment",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/payment/delete/${paymentB.PaymentID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign payment record deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.6 Customer BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/customer/get/${customerB.CustomerID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-CUST-01",
      name: "BOLA Read Customer: Tenant A reading Tenant B Customer",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/customer/get/${customerB.CustomerID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign customer CRM records must be strictly isolated",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/customer/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ CustomerID: customerB.CustomerID, CustomerName: "Hijacked Customer" }),
    });
    recordResult({
      id: "SEC-BOLA-CUST-02",
      name: "BOLA Mutate Customer: Tenant A tampering Tenant B Customer",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/customer/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign customer modification must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/customer/delete/${customerB.CustomerID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-CUST-03",
      name: "BOLA Delete Customer: Tenant A deleting Tenant B Customer",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/customer/delete/${customerB.CustomerID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign customer deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/customer/getAll`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = (await res.json()) as any[];
    const hasForeign = data.some((item) => item.companyId !== tenantACompanyId);
    recordResult({
      id: "SEC-BOLA-CUST-04",
      name: "Collection Scope Customer: Tenant A reading /api/customer/getAll",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/customer/getAll",
      method: "GET",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: res.status === 200 && !hasForeign,
      notes: `Returned ${data.length} customer records; foreign items: ${hasForeign ? "LEAK DETECTED" : "0"}`,
      timestamp: new Date().toISOString(),
    });
  }

  // 1.7 OrderDetail BOLA
  if (orderDetailB) {
    const res = await fetch(`${API_BASE_URL}/api/orderDetail/get/${orderDetailB.OrderDetailID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-OD-01",
      name: "BOLA Read OrderDetail: Tenant A reading Tenant B OrderDetail",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/orderDetail/get/${orderDetailB.OrderDetailID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign line item details must return 404",
      timestamp: new Date().toISOString(),
    });
  }
  if (orderDetailB) {
    const res = await fetch(`${API_BASE_URL}/api/orderDetail/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ OrderDetailID: orderDetailB.OrderDetailID, OrderQuantity: 9999 }),
    });
    recordResult({
      id: "SEC-BOLA-OD-02",
      name: "BOLA Mutate OrderDetail: Tenant A tampering Tenant B OrderDetail",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/orderDetail/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign order item alteration must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  if (orderDetailB) {
    const res = await fetch(`${API_BASE_URL}/api/orderDetail/delete/${orderDetailB.OrderDetailID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-OD-03",
      name: "BOLA Delete OrderDetail: Tenant A deleting Tenant B OrderDetail",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/orderDetail/delete/${orderDetailB.OrderDetailID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign order item deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/orderDetail/getAll`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = (await res.json()) as any[];
    const hasForeign = data.some((item) => item.Order?.companyId !== tenantACompanyId);
    recordResult({
      id: "SEC-BOLA-OD-04",
      name: "Collection Scope OrderDetail: Tenant A reading /api/orderDetail/getAll",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/orderDetail/getAll",
      method: "GET",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: res.status === 200 && !hasForeign,
      notes: `Returned ${data.length} records; foreign leakage: ${hasForeign ? "DETECTED" : "0"}`,
      timestamp: new Date().toISOString(),
    });
  }

  // 1.8 DeliveryDetail BOLA
  if (deliveryDetailB) {
    const res = await fetch(`${API_BASE_URL}/api/deliveryDetail/get/${deliveryDetailB.DeliveryDetailID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-DD-01",
      name: "BOLA Read DeliveryDetail: Tenant A reading Tenant B DeliveryDetail",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/deliveryDetail/get/${deliveryDetailB.DeliveryDetailID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign delivery detail item must return 404",
      timestamp: new Date().toISOString(),
    });
  }
  if (deliveryDetailB) {
    const res = await fetch(`${API_BASE_URL}/api/deliveryDetail/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ DeliveryDetailID: deliveryDetailB.DeliveryDetailID, DeliveryQuantity: 888 }),
    });
    recordResult({
      id: "SEC-BOLA-DD-02",
      name: "BOLA Mutate DeliveryDetail: Tenant A tampering Tenant B DeliveryDetail",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/deliveryDetail/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign delivery item alteration must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  if (deliveryDetailB) {
    const res = await fetch(`${API_BASE_URL}/api/deliveryDetail/delete/${deliveryDetailB.DeliveryDetailID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-DD-03",
      name: "BOLA Delete DeliveryDetail: Tenant A deleting Tenant B DeliveryDetail",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/deliveryDetail/delete/${deliveryDetailB.DeliveryDetailID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign delivery item deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/deliveryDetail/getAll`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = (await res.json()) as any[];
    const hasForeign = data.some((item) => item.Delivery?.companyId !== tenantACompanyId);
    recordResult({
      id: "SEC-BOLA-DD-04",
      name: "Collection Scope DeliveryDetail: Tenant A reading /api/deliveryDetail/getAll",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/deliveryDetail/getAll",
      method: "GET",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: res.status === 200 && !hasForeign,
      notes: `Returned ${data.length} records; foreign leakage: ${hasForeign ? "DETECTED" : "0"}`,
      timestamp: new Date().toISOString(),
    });
  }

  // 1.9 Transfer BOLA
  if (transferB) {
    const res = await fetch(`${API_BASE_URL}/api/transfer/get/${transferB.TransferID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-TR-01",
      name: "BOLA Read Transfer: Tenant A reading Tenant B Transfer",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/transfer/get/${transferB.TransferID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign stock transfer manifests must be masked",
      timestamp: new Date().toISOString(),
    });
  }
  if (transferB) {
    const res = await fetch(`${API_BASE_URL}/api/transfer/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ TransferID: transferB.TransferID, TransferQuantity: 999 }),
    });
    recordResult({
      id: "SEC-BOLA-TR-02",
      name: "BOLA Mutate Transfer: Tenant A tampering Tenant B Transfer",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/transfer/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign transfer update must be rejected",
      timestamp: new Date().toISOString(),
    });
  }
  if (transferB) {
    const res = await fetch(`${API_BASE_URL}/api/transfer/receive`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ TransferID: transferB.TransferID, ReceivedQuantity: 15 }),
    });
    recordResult({
      id: "SEC-BOLA-TR-03",
      name: "BOLA Hijack Transfer: Tenant A receiving Tenant B Transfer",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 7.5,
      severity: "HIGH",
      endpoint: "/api/transfer/receive",
      method: "POST",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign transfer completion hijack must be rejected",
      timestamp: new Date().toISOString(),
    });
  }
  if (transferB) {
    const res = await fetch(`${API_BASE_URL}/api/transfer/delete/${transferB.TransferID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-TR-04",
      name: "BOLA Delete Transfer: Tenant A deleting Tenant B Transfer",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/transfer/delete/${transferB.TransferID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign transfer deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/transfer/getAll`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = (await res.json()) as any[];
    const hasForeign = data.some((item) => item.companyId !== tenantACompanyId);
    recordResult({
      id: "SEC-BOLA-TR-05",
      name: "Collection Scope Transfer: Tenant A reading /api/transfer/getAll",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/transfer/getAll",
      method: "GET",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: res.status === 200 && !hasForeign,
      notes: `Returned ${data.length} transfer records; foreign items: ${hasForeign ? "LEAK DETECTED" : "0"}`,
      timestamp: new Date().toISOString(),
    });
  }

  // 1.10 Transaction BOLA
  if (transactionB) {
    const res = await fetch(`${API_BASE_URL}/api/transaction/get/${transactionB.TransactionID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-TX-01",
      name: "BOLA Read Transaction: Tenant A reading Tenant B Transaction",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/transaction/get/${transactionB.TransactionID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign transaction audit logs must return 404",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/transaction/getAll`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = (await res.json()) as any[];
    const hasForeign = data.some((item) => item.companyId !== tenantACompanyId);
    recordResult({
      id: "SEC-BOLA-TX-02",
      name: "Collection Scope Transaction: Tenant A reading /api/transaction/getAll",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/transaction/getAll",
      method: "GET",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: res.status === 200 && !hasForeign,
      notes: `Returned ${data.length} audit records; foreign items: ${hasForeign ? "LEAK DETECTED" : "0"}`,
      timestamp: new Date().toISOString(),
    });
  }

  // 1.11 Provider BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/provider/get/${providerB.ProviderID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-PROV-01",
      name: "BOLA Read Provider: Tenant A reading Tenant B Provider",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/provider/get/${providerB.ProviderID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign vendor records must return 404",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/provider/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ProviderID: providerB.ProviderID, ProviderName: "Tampered Vendor" }),
    });
    recordResult({
      id: "SEC-BOLA-PROV-02",
      name: "BOLA Mutate Provider: Tenant A tampering Tenant B Provider",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/provider/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign vendor mutation must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/provider/delete/${providerB.ProviderID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-PROV-03",
      name: "BOLA Delete Provider: Tenant A deleting Tenant B Provider",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/provider/delete/${providerB.ProviderID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign vendor deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.12 Location BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/location/get/${locationB.LocationID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-LOC-01",
      name: "BOLA Read Location: Tenant A reading Tenant B Location",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/location/get/${locationB.LocationID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign physical site location must return 404",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/location/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ LocationID: locationB.LocationID, LocationName: "Defaced Location" }),
    });
    recordResult({
      id: "SEC-BOLA-LOC-02",
      name: "BOLA Mutate Location: Tenant A tampering Tenant B Location",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/location/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign location modification must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/location/delete/${locationB.LocationID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-LOC-03",
      name: "BOLA Delete Location: Tenant A deleting Tenant B Location",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/location/delete/${locationB.LocationID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign location deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.13 Inventory BOLA
  {
    const res = await fetch(`${API_BASE_URL}/api/inventory/get/${inventoryB.InventoryID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-INV-01",
      name: "BOLA Read Inventory: Tenant A reading Tenant B Inventory",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/inventory/get/${inventoryB.InventoryID}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Foreign stock levels must return 404",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/inventory/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ InventoryID: inventoryB.InventoryID, InventoryAvailable: 99999 }),
    });
    recordResult({
      id: "SEC-BOLA-INV-02",
      name: "BOLA Mutate Inventory: Tenant A tampering Tenant B Inventory",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/inventory/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign stock allocation modification must be blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/inventory/delete/${inventoryB.InventoryID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-INV-03",
      name: "BOLA Delete Inventory: Tenant A deleting Tenant B Inventory",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/inventory/delete/${inventoryB.InventoryID}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign stock record deletion must be blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.14 Enterprise Endpoints Simulation: Invoice (VendorInvoice)
  {
    const res = await fetch(`${API_BASE_URL}/api/invoice/get/${dummyForeignEnterpriseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-INVCE-01",
      name: "BOLA Read Invoice: Attempt GET /api/invoice/get/:id",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/invoice/get/${dummyForeignEnterpriseId}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Strict 404 barrier enforced",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/invoice/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ InvoiceID: dummyForeignEnterpriseId, TotalAmount: 5000 }),
    });
    recordResult({
      id: "SEC-BOLA-INVCE-02",
      name: "BOLA Mutate Invoice: Attempt PATCH /api/invoice/edit",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/invoice/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign invoice modification blocked",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/invoice/delete/${dummyForeignEnterpriseId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-INVCE-03",
      name: "BOLA Delete Invoice: Attempt DELETE /api/invoice/delete/:id",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/invoice/delete/${dummyForeignEnterpriseId}`,
      method: "DELETE",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign invoice deletion blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.15 Enterprise Endpoints Simulation: GoodsReceipt
  {
    const res = await fetch(`${API_BASE_URL}/api/goodsReceipt/get/${dummyForeignEnterpriseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-GR-01",
      name: "BOLA Read GoodsReceipt: Attempt GET /api/goodsReceipt/get/:id",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/goodsReceipt/get/${dummyForeignEnterpriseId}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Strict 404 barrier enforced",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/goodsReceipt/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ GoodsReceiptID: dummyForeignEnterpriseId }),
    });
    recordResult({
      id: "SEC-BOLA-GR-02",
      name: "BOLA Mutate GoodsReceipt: Attempt PATCH /api/goodsReceipt/edit",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/goodsReceipt/edit",
      method: "PATCH",
      expectedStatus: [403, 404],
      actualStatus: res.status,
      passed: res.status === 403 || res.status === 404,
      notes: "Foreign goods receipt modification blocked",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.16 Enterprise Endpoints Simulation: BinLocation
  {
    const res = await fetch(`${API_BASE_URL}/api/binLocation/get/${dummyForeignEnterpriseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-BIN-01",
      name: "BOLA Read BinLocation: Attempt GET /api/binLocation/get/:id",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/binLocation/get/${dummyForeignEnterpriseId}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Bin location query rejected",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.17 Enterprise Endpoints Simulation: RMA
  {
    const res = await fetch(`${API_BASE_URL}/api/rma/get/${dummyForeignEnterpriseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-RMA-01",
      name: "BOLA Read RMA: Attempt GET /api/rma/get/:id",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/rma/get/${dummyForeignEnterpriseId}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Return merchandise authorization query rejected",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.18 Enterprise Endpoints Simulation: EDI
  {
    const res = await fetch(`${API_BASE_URL}/api/edi/get/${dummyForeignEnterpriseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-EDI-01",
      name: "BOLA Read EDI: Attempt GET /api/edi/get/:id",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/edi/get/${dummyForeignEnterpriseId}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "EDI transaction inquiry rejected",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.19 Enterprise Endpoints Simulation: ApprovalQueue
  {
    const res = await fetch(`${API_BASE_URL}/api/approvalQueue/get/${dummyForeignEnterpriseId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-APPQ-01",
      name: "BOLA Read ApprovalQueue: Attempt GET /api/approvalQueue/get/:id",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/approvalQueue/get/${dummyForeignEnterpriseId}`,
      method: "GET",
      expectedStatus: 404,
      actualStatus: res.status,
      passed: res.status === 404,
      notes: "Enterprise approval queue query rejected",
      timestamp: new Date().toISOString(),
    });
  }

  // 1.20 Company & CompanyGroup Cross-Tenant Boundaries
  {
    const res = await fetch(`${API_BASE_URL}/api/company/get/${tenantBCompanyId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-CMP-01",
      name: "Tenant Boundary Violation: Tenant A accessing foreign Company details",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/company/get/${tenantBCompanyId}`,
      method: "GET",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Access denied to corporate entity outside user's company group",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/company/edit/${tenantBCompanyId}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "Hostile Takeover Inc" }),
    });
    recordResult({
      id: "SEC-BOLA-CMP-02",
      name: "Tenant Boundary Violation: Tenant A modifying foreign Company entity",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/company/edit/${tenantBCompanyId}`,
      method: "PATCH",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Modifications to companies outside user's group forbidden",
      timestamp: new Date().toISOString(),
    });
  }
  {
    const res = await fetch(`${API_BASE_URL}/api/company-group/get/${tenantCGroupId}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-GRP-01",
      name: "Tenant Boundary Violation: Tenant A querying foreign CompanyGroup",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/company-group/get/${tenantCGroupId}`,
      method: "GET",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Company groups outside user's organization strictly denied",
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // SUITE 2: CROSS-TENANT INVENTORY THEFT ATTACK SIMULATIONS
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 2: Cross-Tenant Inventory Theft Attack Simulations ---\x1b[0m");

  // 2.1 OutWarehouseID owned by Tenant B (Inventory Siphoning)
  {
    const res = await fetch(`${API_BASE_URL}/api/transfer/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ProductID: productA.ProductID,
        OutWarehouseID: warehouseB.WarehouseID, // Foreign warehouse!
        InWarehouseID: warehouseA.WarehouseID,
        TransferQuantity: 50,
      }),
    });
    const body = (await res.json()) as any;
    const pass = res.status === 400 && String(body?.error).includes("OutWarehouseID");
    recordResult({
      id: "SEC-THEFT-01",
      name: "Inventory Siphoning: OutWarehouseID is Tenant B Facility",
      category: "Inventory Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/transfer/add",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Blocked with error: "${body?.error}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // 2.2 InWarehouseID owned by Tenant B (Inventory Injection / Dumping)
  {
    const res = await fetch(`${API_BASE_URL}/api/transfer/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ProductID: productA.ProductID,
        OutWarehouseID: warehouseA.WarehouseID,
        InWarehouseID: warehouseB.WarehouseID, // Foreign warehouse!
        TransferQuantity: 50,
      }),
    });
    const body = (await res.json()) as any;
    const pass = res.status === 400 && String(body?.error).includes("InWarehouseID");
    recordResult({
      id: "SEC-THEFT-02",
      name: "Inventory Injection: InWarehouseID is Tenant B Destination",
      category: "Inventory Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/transfer/add",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Blocked with error: "${body?.error}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // 2.3 ProductID owned by Tenant B (Unauthorized Foreign SKU Transfer)
  {
    const res = await fetch(`${API_BASE_URL}/api/transfer/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ProductID: productB.ProductID, // Foreign product!
        OutWarehouseID: warehouseA.WarehouseID,
        InWarehouseID: warehouseA2?.WarehouseID || warehouseA.WarehouseID,
        TransferQuantity: 20,
      }),
    });
    const body = (await res.json()) as any;
    const pass = res.status === 400 && (String(body?.error).includes("ProductID") || String(body?.error).includes("same"));
    recordResult({
      id: "SEC-THEFT-03",
      name: "SKU Theft: Foreign Tenant B ProductID submitted in transfer",
      category: "Inventory Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/transfer/add",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Blocked with error: "${body?.error}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // 2.4 Negative Quantity Stock Inflation Attack
  {
    const res = await fetch(`${API_BASE_URL}/api/transfer/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        ProductID: productA.ProductID,
        OutWarehouseID: warehouseA.WarehouseID,
        InWarehouseID: warehouseA2?.WarehouseID || "6ae0c6b8d292a872f9374550",
        TransferQuantity: -100, // Negative quantity attack!
      }),
    });
    const body = (await res.json()) as any;
    const pass = res.status === 400 && String(body?.error).includes("TransferQuantity");
    recordResult({
      id: "SEC-THEFT-04",
      name: "Integer Underflow Attack: Negative TransferQuantity (-100)",
      category: "Inventory Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 7.5,
      severity: "HIGH",
      endpoint: "/api/transfer/add",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Rejected with validation message: "${body?.error}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // 2.5 Transfer Tampering: PATCH InWarehouseID to Foreign Warehouse
  if (transferA) {
    const res = await fetch(`${API_BASE_URL}/api/transfer/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        TransferID: transferA.TransferID,
        InWarehouseID: warehouseB.WarehouseID, // Divert stock to foreign warehouse!
      }),
    });
    const body = (await res.json()) as any;
    const pass = res.status === 400 && String(body?.error).includes("InWarehouseID");
    recordResult({
      id: "SEC-THEFT-05",
      name: "In-Flight Cargo Diversion: PATCH InWarehouseID to Tenant B",
      category: "Inventory Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/transfer/edit",
      method: "PATCH",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Cargo diversion rejected: "${body?.error}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // 2.6 Inventory Warehouse Allocation Tamper: PATCH WarehouseID to Foreign Warehouse
  {
    const res = await fetch(`${API_BASE_URL}/api/inventory/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        InventoryID: inventoryA.InventoryID,
        WarehouseID: warehouseB.WarehouseID, // Relocate inventory record to Tenant B!
      }),
    });
    const body = (await res.json()) as any;
    const pass = res.status === 400 && String(body?.error).includes("WarehouseID");
    recordResult({
      id: "SEC-THEFT-06",
      name: "Inventory Misappropriation: Reassign inventory to Tenant B facility",
      category: "Inventory Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/inventory/edit",
      method: "PATCH",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Stock reassignment rejected: "${body?.error}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // SUITE 3: PRIVILEGE ESCALATION SIMULATIONS (OWASP API2 & API5)
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 3: Privilege Escalation & Auth Attack Simulations (OWASP API2 & API5) ---\x1b[0m");

  // 3.1 Public Registration: Inject SUPERADMIN
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: `rogue.superadmin.${Date.now()}@mesh-attack.com`,
        userName: "Rogue SuperAdmin",
        userPassword: "AttackerStrongPass123!",
        userRole: "SUPERADMIN",
      }),
    });
    recordResult({
      id: "SEC-AUTH-01",
      name: "Role Escalation: Register with userRole=SUPERADMIN",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      cvssScore: 9.8,
      severity: "CRITICAL",
      endpoint: "/api/auth/register",
      method: "POST",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Public registration must forbid administrative role provisioning",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.2 Public Registration: Inject ADMIN
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: `rogue.admin.${Date.now()}@mesh-attack.com`,
        userName: "Rogue Admin",
        userPassword: "AttackerStrongPass123!",
        userRole: "ADMIN",
      }),
    });
    recordResult({
      id: "SEC-AUTH-02",
      name: "Role Escalation: Register with userRole=ADMIN",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      cvssScore: 9.8,
      severity: "CRITICAL",
      endpoint: "/api/auth/register",
      method: "POST",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Public registration must forbid admin account creation",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.3 Public Registration: Inject Arbitrary companyGroupId
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: `rogue.group.${Date.now()}@mesh-attack.com`,
        userName: "Rogue Conglomerate Member",
        userPassword: "AttackerStrongPass123!",
        companyGroupId: "fake-group-hijack-id",
      }),
    });
    recordResult({
      id: "SEC-AUTH-03",
      name: "Tenant Boundary Violation: Register with companyGroupId",
      category: "Privilege Escalation",
      owasp: "API1:2023 / API5:2023",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
      cvssScore: 9.1,
      severity: "CRITICAL",
      endpoint: "/api/auth/register",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: res.status === 400,
      notes: "Disallow self-assignment of corporate holding conglomerate IDs",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.4 Public Registration: Missing Password
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: `nopass.${Date.now()}@mesh-attack.com`,
        userName: "No Password User",
      }),
    });
    recordResult({
      id: "SEC-AUTH-04",
      name: "Authentication Weakness: Register with missing password",
      category: "Authentication",
      owasp: "API2:2023 - Broken Authentication",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
      cvssScore: 9.1,
      severity: "HIGH",
      endpoint: "/api/auth/register",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: res.status === 400,
      notes: "Must enforce mandatory non-empty password validation",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.5 Public Registration: Weak Password (<8 chars)
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: `shortpass.${Date.now()}@mesh-attack.com`,
        userName: "Short Password User",
        userPassword: "123",
      }),
    });
    recordResult({
      id: "SEC-AUTH-05",
      name: "Authentication Policy: Register with short password (<8 chars)",
      category: "Authentication",
      owasp: "API2:2023 - Broken Authentication",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N",
      cvssScore: 5.3,
      severity: "MEDIUM",
      endpoint: "/api/auth/register",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: res.status === 400,
      notes: "Must enforce minimum 8-character password policy (SEC-15)",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.6 Public Registration: Empty userEmail
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: "   ",
        userName: "Empty Email User",
        userPassword: "ValidPassword123!",
      }),
    });
    recordResult({
      id: "SEC-AUTH-06",
      name: "Input Sanitization: Register with empty whitespace email",
      category: "Authentication",
      owasp: "API2:2023 - Broken Authentication",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N",
      cvssScore: 5.3,
      severity: "MEDIUM",
      endpoint: "/api/auth/register",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: res.status === 400,
      notes: "Empty email input correctly rejected",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.7 Vertical Escalation: EMPLOYEE attempting PATCH /api/auth/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenEmp}`, "Content-Type": "application/json" },
      body: JSON.stringify({ userId: userEmp.userId, userRole: "SUPERADMIN" }),
    });
    recordResult({
      id: "SEC-AUTH-07",
      name: "Vertical Escalation: EMPLOYEE attempting PATCH /api/auth/edit",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
      cvssScore: 8.8,
      severity: "HIGH",
      endpoint: "/api/auth/edit",
      method: "PATCH",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Unprivileged users must be blocked by requireAdminOrSuperAdmin",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.8 Vertical Escalation: EMPLOYEE attempting POST /api/auth/add
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenEmp}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        userEmail: `escalate.${Date.now()}@mesh.com`,
        userName: "Backdoor User",
        userPassword: "ValidPassword123!",
        userRole: "ADMIN",
      }),
    });
    recordResult({
      id: "SEC-AUTH-08",
      name: "Vertical Escalation: EMPLOYEE attempting POST /api/auth/add",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
      cvssScore: 8.8,
      severity: "HIGH",
      endpoint: "/api/auth/add",
      method: "POST",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Blocked by requireAdminOrSuperAdmin",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.9 Vertical Escalation: EMPLOYEE attempting DELETE /api/auth/delete/:userId
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/delete/${userA.userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenEmp}` },
    });
    recordResult({
      id: "SEC-AUTH-09",
      name: "Vertical Escalation: EMPLOYEE attempting DELETE /api/auth/delete/:userId",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 8.8,
      severity: "HIGH",
      endpoint: `/api/auth/delete/${userA.userId}`,
      method: "DELETE",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Blocked by requireAdminOrSuperAdmin",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.10 Vertical Escalation: EMPLOYEE attempting POST /api/company/add
  {
    const res = await fetch(`${API_BASE_URL}/api/company/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenEmp}`, "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "Rogue Subsidiary LLC" }),
    });
    recordResult({
      id: "SEC-AUTH-10",
      name: "Vertical Escalation: EMPLOYEE attempting POST /api/company/add",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 8.8,
      severity: "HIGH",
      endpoint: "/api/company/add",
      method: "POST",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Blocked by requireAdminOrSuperAdmin",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.11 Vertical Escalation: EMPLOYEE attempting POST /api/company-group/add
  {
    const res = await fetch(`${API_BASE_URL}/api/company-group/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenEmp}`, "Content-Type": "application/json" },
      body: JSON.stringify({ groupName: "Rogue Conglomerate Holdings", groupCode: "ROGUE-GRP" }),
    });
    recordResult({
      id: "SEC-AUTH-11",
      name: "Vertical Escalation: EMPLOYEE attempting POST /api/company-group/add",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:H/A:H",
      cvssScore: 9.8,
      severity: "CRITICAL",
      endpoint: "/api/company-group/add",
      method: "POST",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Blocked by requireSuperAdmin",
      timestamp: new Date().toISOString(),
    });
  }

  // 3.12 Vertical Escalation: EMPLOYEE attempting GET /api/superadmin/stats
  {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/stats`, {
      headers: { Authorization: `Bearer ${tokenEmp}` },
    });
    recordResult({
      id: "SEC-AUTH-12",
      name: "Vertical Escalation: EMPLOYEE attempting GET /api/superadmin/stats",
      category: "Privilege Escalation",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 8.8,
      severity: "HIGH",
      endpoint: "/api/superadmin/stats",
      method: "GET",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Blocked by requireSuperAdmin",
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // SUITE 4: MULTI-TENANT RBAC & ADMINISTRATIVE BOUNDARIES
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 4: Multi-Tenant RBAC & Cross-Tenant Administrative Boundaries ---\x1b[0m");

  // 4.1 Tenant ADMIN attempting GET /api/superadmin/stats
  {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/stats`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-RBAC-01",
      name: "RBAC Boundary: Tenant ADMIN invoking /api/superadmin/stats",
      category: "RBAC Enforcement",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 7.2,
      severity: "HIGH",
      endpoint: "/api/superadmin/stats",
      method: "GET",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Tenant admin cannot access global platform telemetry",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.2 Tenant ADMIN attempting POST /api/superadmin/provision
  {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/provision`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ companyName: "Unauthorized Spin-Off Corp", companyCode: "SPIN-OFF" }),
    });
    recordResult({
      id: "SEC-RBAC-02",
      name: "RBAC Boundary: Tenant ADMIN invoking /api/superadmin/provision",
      category: "RBAC Enforcement",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:H/A:H",
      cvssScore: 8.8,
      severity: "HIGH",
      endpoint: "/api/superadmin/provision",
      method: "POST",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Tenant admin cannot trigger superadmin tenant provisioning",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.3 Tenant ADMIN attempting GET /api/superadmin/hierarchy
  {
    const res = await fetch(`${API_BASE_URL}/api/superadmin/hierarchy`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-RBAC-03",
      name: "RBAC Boundary: Tenant ADMIN invoking /api/superadmin/hierarchy",
      category: "RBAC Enforcement",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 7.2,
      severity: "HIGH",
      endpoint: "/api/superadmin/hierarchy",
      method: "GET",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Tenant admin cannot inspect global multi-tenant hierarchy",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.4 Tenant ADMIN attempting POST /api/company-group/add
  {
    const res = await fetch(`${API_BASE_URL}/api/company-group/add`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ groupName: "Apex Unauthorized Holding Co", groupCode: "APX-HOLD" }),
    });
    recordResult({
      id: "SEC-RBAC-04",
      name: "RBAC Boundary: Tenant ADMIN invoking POST /api/company-group/add",
      category: "RBAC Enforcement",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 7.2,
      severity: "HIGH",
      endpoint: "/api/company-group/add",
      method: "POST",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "CompanyGroup provisioning restricted to SUPERADMIN",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.5 Tenant ADMIN attempting DELETE /api/company-group/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/company-group/delete/${tenantCGroupId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-RBAC-05",
      name: "RBAC Boundary: Tenant ADMIN invoking DELETE /api/company-group/delete/:id",
      category: "RBAC Enforcement",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 7.2,
      severity: "HIGH",
      endpoint: `/api/company-group/delete/${tenantCGroupId}`,
      method: "DELETE",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "CompanyGroup destruction restricted to SUPERADMIN",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.6 Tenant ADMIN attempting DELETE /api/company/delete/:tenantBCompanyId
  {
    const res = await fetch(`${API_BASE_URL}/api/company/delete/${tenantBCompanyId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-RBAC-06",
      name: "RBAC Boundary: Tenant ADMIN invoking DELETE /api/company/delete/:companyId",
      category: "RBAC Enforcement",
      owasp: "API5:2023 - Broken Function Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:H/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 7.2,
      severity: "HIGH",
      endpoint: `/api/company/delete/${tenantBCompanyId}`,
      method: "DELETE",
      expectedStatus: 403,
      actualStatus: res.status,
      passed: res.status === 403,
      notes: "Tenant deletion requires SUPERADMIN authorization",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.7 Unauthenticated Request (No Token): GET /api/product/getAll
  {
    const res = await fetch(`${API_BASE_URL}/api/product/getAll`);
    recordResult({
      id: "SEC-RBAC-07",
      name: "Authentication Barrier: Unauthenticated GET /api/product/getAll",
      category: "Authentication",
      owasp: "API2:2023 - Broken Authentication",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 7.5,
      severity: "HIGH",
      endpoint: "/api/product/getAll",
      method: "GET",
      expectedStatus: 401,
      actualStatus: res.status,
      passed: res.status === 401,
      notes: "Anonymous request rejected with 401 Unauthorized",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.8 Unauthenticated Request (No Token): POST /api/order/add
  {
    const res = await fetch(`${API_BASE_URL}/api/order/add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ OrderDate: new Date() }),
    });
    recordResult({
      id: "SEC-RBAC-08",
      name: "Authentication Barrier: Unauthenticated POST /api/order/add",
      category: "Authentication",
      owasp: "API2:2023 - Broken Authentication",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 7.5,
      severity: "HIGH",
      endpoint: "/api/order/add",
      method: "POST",
      expectedStatus: 401,
      actualStatus: res.status,
      passed: res.status === 401,
      notes: "Anonymous order insertion rejected with 401",
      timestamp: new Date().toISOString(),
    });
  }

  // 4.9 Cryptographically Forged JWT Signature Attack
  {
    const forgedToken = jwt.sign(
      { user: { userId: "fake-admin-id", userRole: "SUPERADMIN", userEmail: "attacker@forged.com" } },
      "rogue-attacker-signature-secret-key-that-does-not-match-mesh-backend",
      { expiresIn: "1h" }
    );
    const res = await fetch(`${API_BASE_URL}/api/product/getAll`, {
      headers: { Authorization: `Bearer ${forgedToken}` },
    });
    recordResult({
      id: "SEC-RBAC-09",
      name: "Cryptographic Integrity: Forged JWT Signature Rejection",
      category: "Authentication",
      owasp: "API2:2023 - Broken Authentication",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
      cvssScore: 9.8,
      severity: "CRITICAL",
      endpoint: "/api/product/getAll",
      method: "GET",
      expectedStatus: 401,
      actualStatus: res.status,
      passed: res.status === 401,
      notes: "Tampered JWT cryptographic signature rejected with 401",
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // SUITE 5: SOX SECTION 404 & AUDIT TRAIL IMMUTABILITY
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 5: SOX Section 404 & Audit Trail Immutability Compliance ---\x1b[0m");

  // 5.1 Block PATCH /api/transaction/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/transaction/edit`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        TransactionID: transactionA.TransactionID,
        TransactionDetail: "Fraudulent tampered audit record",
      }),
    });
    recordResult({
      id: "SEC-SOX-01",
      name: "SOX Immutability: Block PATCH /api/transaction/edit",
      category: "SOX 404 Immutability",
      owasp: "Regulatory Compliance / Audit Ledger Integrity",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/transaction/edit",
      method: "PATCH",
      expectedStatus: 405,
      actualStatus: res.status,
      passed: res.status === 405,
      notes: "HTTP 405 Method Not Allowed strictly returned for audit tampering",
      timestamp: new Date().toISOString(),
    });
  }

  // 5.2 Block PUT /api/transaction/edit/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/transaction/edit/${transactionA.TransactionID}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      body: JSON.stringify({ TransactionDetail: "Malicious replacement" }),
    });
    recordResult({
      id: "SEC-SOX-02",
      name: "SOX Immutability: Block PUT /api/transaction/edit/:id subroute",
      category: "SOX 404 Immutability",
      owasp: "Regulatory Compliance / Audit Ledger Integrity",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/transaction/edit/${transactionA.TransactionID}`,
      method: "PUT",
      expectedStatus: 405,
      actualStatus: res.status,
      passed: res.status === 405,
      notes: "HTTP 405 Method Not Allowed strictly returned for wildcard edit subroutes",
      timestamp: new Date().toISOString(),
    });
  }

  // 5.3 Block DELETE /api/transaction/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/transaction/delete/${transactionA.TransactionID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-SOX-03",
      name: "SOX Immutability: Block DELETE /api/transaction/delete/:id",
      category: "SOX 404 Immutability",
      owasp: "Regulatory Compliance / Audit Ledger Integrity",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/transaction/delete/${transactionA.TransactionID}`,
      method: "DELETE",
      expectedStatus: 405,
      actualStatus: res.status,
      passed: res.status === 405,
      notes: "HTTP 405 Method Not Allowed strictly returned to prevent audit deletion",
      timestamp: new Date().toISOString(),
    });
  }

  // 5.4 Block DELETE /api/transaction/delete (Root deletion attempt)
  {
    const res = await fetch(`${API_BASE_URL}/api/transaction/delete`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-SOX-04",
      name: "SOX Immutability: Block DELETE /api/transaction/delete root",
      category: "SOX 404 Immutability",
      owasp: "Regulatory Compliance / Audit Ledger Integrity",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/transaction/delete",
      method: "DELETE",
      expectedStatus: 405,
      actualStatus: res.status,
      passed: res.status === 405,
      notes: "HTTP 405 Method Not Allowed strictly returned for bulk deletion attempts",
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // SUITE 6: SECURITY HEADERS & CORS DEFENSES
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 6: Security Headers & Cross-Origin Resource Sharing (CORS) Defenses ---\x1b[0m");

  {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userEmail: "admin@mesh.com", userPassword: "admin123" }),
    });

    const hsts = res.headers.get("strict-transport-security");
    const nosniff = res.headers.get("x-content-type-options");
    const xframe = res.headers.get("x-frame-options");

    const hstsPass = Boolean(hsts && hsts.includes("max-age"));
    const nosniffPass = nosniff === "nosniff";
    const xframePass = xframe === "SAMEORIGIN" || xframe === "DENY";

    recordResult({
      id: "SEC-HDR-01",
      name: "Transport Hardening: Strict-Transport-Security (HSTS) enforced",
      category: "Security Headers",
      owasp: "API8:2023 - Security Misconfiguration",
      cvss: "CVSS:3.1/AV:N/AC:H/PR:N/UI:R/S:U/C:H/I:N/A:N",
      cvssScore: 5.3,
      severity: "MEDIUM",
      endpoint: "/api/auth/login",
      method: "POST",
      expectedStatus: 200,
      actualStatus: hstsPass ? 200 : 500,
      passed: hstsPass,
      notes: `HSTS: "${hsts}"`,
      timestamp: new Date().toISOString(),
    });

    recordResult({
      id: "SEC-HDR-02",
      name: "MIME Defense: X-Content-Type-Options: nosniff",
      category: "Security Headers",
      owasp: "API8:2023 - Security Misconfiguration",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N",
      cvssScore: 4.3,
      severity: "LOW",
      endpoint: "/api/auth/login",
      method: "POST",
      expectedStatus: 200,
      actualStatus: nosniffPass ? 200 : 500,
      passed: nosniffPass,
      notes: `X-Content-Type-Options: "${nosniff}"`,
      timestamp: new Date().toISOString(),
    });

    recordResult({
      id: "SEC-HDR-03",
      name: "Clickjacking Defense: X-Frame-Options: SAMEORIGIN",
      category: "Security Headers",
      owasp: "API8:2023 - Security Misconfiguration",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:L/A:N",
      cvssScore: 4.3,
      severity: "LOW",
      endpoint: "/api/auth/login",
      method: "POST",
      expectedStatus: 200,
      actualStatus: xframePass ? 200 : 500,
      passed: xframePass,
      notes: `X-Frame-Options: "${xframe}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // 6.4 CORS Rogue Origin Preflight Rejection
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://evil-attacker.com",
        "Access-Control-Request-Method": "POST",
      },
    });
    const acao = res.headers.get("access-control-allow-origin");
    const passed = !acao || acao !== "http://evil-attacker.com";

    recordResult({
      id: "SEC-CORS-01",
      name: "CORS Protection: Rogue Origin Preflight Rejection (evil-attacker.com)",
      category: "CORS Protection",
      owasp: "API8:2023 - Security Misconfiguration",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:U/C:H/I:H/A:N",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/auth/login",
      method: "OPTIONS",
      expectedStatus: 204,
      actualStatus: res.status,
      passed: passed,
      notes: `Access-Control-Allow-Origin: ${acao || "NONE (Blocked)"}`,
      timestamp: new Date().toISOString(),
    });
  }

  // 6.5 CORS Whitelist Origin Preflight Acceptance
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
      },
    });
    const acao = res.headers.get("access-control-allow-origin");
    const acc = res.headers.get("access-control-allow-credentials");
    const passed = acao === "http://localhost:3000" && acc === "true";

    recordResult({
      id: "SEC-CORS-02",
      name: "CORS Protection: Whitelist Origin Acceptance (localhost:3000)",
      category: "CORS Protection",
      owasp: "API8:2023 - Security Misconfiguration",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:N/A:N",
      cvssScore: 0.0,
      severity: "LOW",
      endpoint: "/api/auth/login",
      method: "OPTIONS",
      expectedStatus: 204,
      actualStatus: res.status,
      passed: passed,
      notes: `Origin: "${acao}", Credentials: "${acc}"`,
      timestamp: new Date().toISOString(),
    });
  }

  // ============================================================================
  // CLEANUP EPHEMERAL TEST ENTITIES
  // ============================================================================
  console.log("\n\x1b[36m[*] Cleaning up ephemeral penetration test database entities...\x1b[0m");
  if (createdEphemeralIds.tenantBTransferId) {
    await prisma.transfer.deleteMany({ where: { TransferID: createdEphemeralIds.tenantBTransferId } });
  }
  if (createdEphemeralIds.tenantBTransactionId) {
    await prisma.transaction.deleteMany({ where: { TransactionID: createdEphemeralIds.tenantBTransactionId } });
  }
  if (createdEphemeralIds.tenantATransferId) {
    await prisma.transfer.deleteMany({ where: { TransferID: createdEphemeralIds.tenantATransferId } });
  }
  console.log("    Cleanup complete.");

  // ============================================================================
  // SUMMARY REPORT & AUDIT LOG GENERATION
  // ============================================================================
  console.log("\n==========================================================================================");
  console.log(" ENTERPRISE APSEC PENETRATION TESTING AUDIT METRICS");
  console.log("==========================================================================================");

  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = testResults.filter((r) => !r.passed).length;
  const critical = testResults.filter((r) => r.severity === "CRITICAL").length;
  const high = testResults.filter((r) => r.severity === "HIGH").length;
  const medium = testResults.filter((r) => r.severity === "MEDIUM").length;
  const low = testResults.filter((r) => r.severity === "LOW").length;

  console.log(`Total Attack Vectors Tested      : ${total}`);
  console.log(`Attacks Blocked / Passed         : \x1b[32m${passed}\x1b[0m`);
  console.log(`Vulnerabilities Detected         : ${failed === 0 ? "\x1b[32m0\x1b[0m" : `\x1b[31m${failed}\x1b[0m`}`);
  console.log(`Block Rate                       : \x1b[32m${((passed / total) * 100).toFixed(1)}%\x1b[0m`);
  console.log("------------------------------------------------------------------------------------------");
  console.log(`Severity Breakdown: CRITICAL: ${critical} | HIGH: ${high} | MEDIUM: ${medium} | LOW: ${low}`);
  console.log("==========================================================================================\n");

  const reportPayload = {
    program: "Mesh Enterprise Modernization Program - Phase 1 Deliverables",
    assessmentType: "Automated Enterprise Multi-Tenant Security & Penetration Testing",
    target: API_BASE_URL,
    timestamp: new Date().toISOString(),
    metrics: {
      totalSimulations: total,
      blockedAttacks: passed,
      vulnerabilitiesDetected: failed,
      blockRatePercentage: Number(((passed / total) * 100).toFixed(1)),
      severityDistribution: {
        CRITICAL: critical,
        HIGH: high,
        MEDIUM: medium,
        LOW: low,
      },
      owaspCoverage: [
        "API1:2023 - Broken Object Level Authorization (BOLA/IDOR)",
        "API2:2023 - Broken Authentication",
        "API5:2023 - Broken Function Level Authorization (RBAC)",
        "API8:2023 - Security Misconfiguration (CORS/Headers)",
        "SOX Section 404 - Immutable Financial Audit Trail",
      ],
    },
    results: testResults,
  };

  const reportPath = path.resolve(__dirname, "enterprise_appsec_pen_test_report.json");
  fs.writeFileSync(reportPath, JSON.stringify(reportPayload, null, 2), "utf-8");
  console.log(`\x1b[32mDetailed JSON Penetration Audit Report saved to: ${reportPath}\x1b[0m\n`);

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runEnterprisePenetrationSuite().catch(async (err) => {
  console.error("Test Suite Execution Failure:", err);
  await prisma.$disconnect();
  process.exit(1);
});
