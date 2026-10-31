import { PrismaClient } from "@prisma/client";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const prisma = new PrismaClient();

interface TestCaseResult {
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
}

const results: TestCaseResult[] = [];

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

function recordResult(test: TestCaseResult) {
  results.push(test);
  const tag = test.passed ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
  console.log(
    `  ${tag} ${test.id.padEnd(10)} | ${test.method.padEnd(6)} ${test.endpoint.padEnd(38)} | Expected: ${JSON.stringify(test.expectedStatus).padEnd(8)} | Actual: ${test.actualStatus} | ${test.name}`
  );
  if (!test.passed) {
    console.log(`         \x1b[33mNote: ${test.notes}\x1b[0m`);
  }
}

async function runPenetrationSuite() {
  console.log("\n================================================================================");
  console.log(" MESH ENTERPRISE APSEC & MULTI-TENANCY AUTOMATED PENETRATION TEST SUITE");
  console.log(" Target:", API_BASE_URL);
  console.log(" Timestamp:", new Date().toISOString());
  console.log("================================================================================\n");

  // Step 0: Ensure Target Tenant Data Matrix exists
  console.log("\x1b[36m[*] STEP 0: Discovering & Preparing Multi-Tenant Test Matrix...\x1b[0m");

  const tenantACompanyId = "6ae0c6b8d292a872f937453d"; // Apex Pacific Freight Corp
  const tenantBCompanyId = "6ae0c6b8d292a872f9374540"; // Nordic Pulse Consumer Tech

  const { token: tokenA, user: userA } = await loginUser("admin@mesh.com");
  const { token: tokenB, user: userB } = await loginUser("elena.rostova@mesh.com");
  const { token: tokenEmp, user: userEmp } = await loginUser("d.kim@mesh.com");

  console.log(`  - Tenant A Authenticated: ${userA.userEmail} (Company: ${userA.company.companyName})`);
  console.log(`  - Tenant B Authenticated: ${userB.userEmail} (Company: ${userB.company.companyName})`);
  console.log(`  - Tenant A Employee Authenticated: ${userEmp.userEmail} (Role: ${userEmp.userRole})\n`);

  // Query Tenant B entities to target
  const [productB, orderB, warehouseB, deliveryB, paymentB, orderDetailB, deliveryDetailB, transactionA] = await Promise.all([
    prisma.product.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.order.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.warehouse.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.delivery.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.payment.findFirst({ where: { companyId: tenantBCompanyId } }),
    prisma.orderdetail.findFirst({ where: { Order: { companyId: tenantBCompanyId } } }),
    prisma.deliveryDetail.findFirst({ where: { Delivery: { companyId: tenantBCompanyId } } }),
    prisma.transaction.findFirst({ where: { companyId: tenantACompanyId } }),
  ]);

  const [warehouseA, productA] = await Promise.all([
    prisma.warehouse.findFirst({ where: { companyId: tenantACompanyId } }),
    prisma.product.findFirst({ where: { companyId: tenantACompanyId } }),
  ]);

  if (!productB || !orderB || !warehouseB || !deliveryB || !paymentB) {
    throw new Error("Missing required Tenant B test fixtures in database.");
  }
  if (!warehouseA || !productA) {
    throw new Error("Missing required Tenant A test fixtures in database.");
  }

  // ============================================================================
  // SUITE 1: BOLA / IDOR ATTACK SIMULATION (OWASP API1:2023)
  // ============================================================================
  console.log("\x1b[35m--- SUITE 1: BOLA / IDOR Cross-Tenant Read & Mutation Attacks (OWASP API1:2023) ---\x1b[0m");

  // 1.1 GET /api/product/get/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/product/get/${productB.ProductID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-01",
      name: "BOLA Read Product (Tenant A accessing Tenant B Product)",
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
      notes: "Strict multi-tenant filter must mask existence of foreign tenant product",
    });
  }

  // 1.2 GET /api/order/get/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/order/get/${orderB.OrderID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-02",
      name: "BOLA Read Order (Tenant A accessing Tenant B Order)",
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
      notes: "Must prevent foreign order visibility",
    });
  }

  // 1.3 GET /api/warehouse/get/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/warehouse/get/${warehouseB.WarehouseID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-03",
      name: "BOLA Read Warehouse (Tenant A accessing Tenant B Warehouse)",
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
      notes: "Warehouse facilities must remain strictly isolated",
    });
  }

  // 1.4 GET /api/delivery/get/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/delivery/get/${deliveryB.DeliveryID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-04",
      name: "BOLA Read Delivery (Tenant A accessing Tenant B Delivery)",
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
      notes: "Delivery manifests must be isolated",
    });
  }

  // 1.5 GET /api/payment/get/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/payment/get/${paymentB.PaymentID}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-05",
      name: "BOLA Read Payment (Tenant A accessing Tenant B Payment)",
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
      notes: "Financial transaction details must remain confidential",
    });
  }

  // 1.6 Child Collection Isolation: /api/orderDetail/getAll
  {
    const res = await fetch(`${API_BASE_URL}/api/orderDetail/getAll`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = (await res.json()) as any[];
    const hasForeign = data.some((item) => item.Order?.companyId !== tenantACompanyId);
    const leakedTenantBItem = data.some((item) => item.OrderDetailID === orderDetailB?.OrderDetailID);
    const pass = res.status === 200 && !hasForeign && !leakedTenantBItem;

    recordResult({
      id: "SEC-BOLA-06",
      name: "Collection Filtering (OrderDetail strictly scoped to Tenant A)",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/orderDetail/getAll",
      method: "GET",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: pass,
      notes: `Returned ${data.length} records; foreign count: ${hasForeign ? "LEAK DETECTED" : "0"}`,
    });
  }

  // 1.7 Child Collection Isolation: /api/deliveryDetail/getAll
  {
    const res = await fetch(`${API_BASE_URL}/api/deliveryDetail/getAll`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const data = (await res.json()) as any[];
    const hasForeign = data.some((item) => item.Delivery?.companyId !== tenantACompanyId);
    const leakedTenantBItem = data.some((item) => item.DeliveryDetailID === deliveryDetailB?.DeliveryDetailID);
    const pass = res.status === 200 && !hasForeign && !leakedTenantBItem;

    recordResult({
      id: "SEC-BOLA-07",
      name: "Collection Filtering (DeliveryDetail strictly scoped to Tenant A)",
      category: "BOLA / IDOR",
      owasp: "API1:2023 - Broken Object Level Authorization",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/deliveryDetail/getAll",
      method: "GET",
      expectedStatus: 200,
      actualStatus: res.status,
      passed: pass,
      notes: `Returned ${data.length} records; foreign count: ${hasForeign ? "LEAK DETECTED" : "0"}`,
    });
  }

  // 1.8 Mutation Cross-Tenant: PATCH /api/product/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/product/edit`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ProductID: productB.ProductID,
        ProductName: "Attacker Malicious Defaced Product",
      }),
    });
    recordResult({
      id: "SEC-BOLA-08",
      name: "Cross-Tenant Tamper (PATCH Tenant B Product)",
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
      notes: "Must prevent cross-tenant product modification",
    });
  }

  // 1.9 Deletion Cross-Tenant: DELETE /api/product/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/product/delete/${productB.ProductID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-09",
      name: "Cross-Tenant Deletion (DELETE Tenant B Product)",
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
      notes: "Must prevent cross-tenant destructive operations",
    });
  }

  // 1.10 Mutation Cross-Tenant: PATCH /api/order/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/order/edit`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        OrderID: orderB.OrderID,
      }),
    });
    recordResult({
      id: "SEC-BOLA-10",
      name: "Cross-Tenant Tamper (PATCH Tenant B Order)",
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
      notes: "Must prevent foreign order manipulation",
    });
  }

  // 1.11 Deletion Cross-Tenant: DELETE /api/order/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/order/delete/${orderB.OrderID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-11",
      name: "Cross-Tenant Deletion (DELETE Tenant B Order)",
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
      notes: "Must prevent foreign order deletion",
    });
  }

  // 1.12 Mutation Cross-Tenant: PATCH /api/warehouse/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/warehouse/edit`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        WarehouseID: warehouseB.WarehouseID,
        WarehouseName: "Hijacked Facility",
      }),
    });
    recordResult({
      id: "SEC-BOLA-12",
      name: "Cross-Tenant Tamper (PATCH Tenant B Warehouse)",
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
      notes: "Must prevent foreign warehouse modifications",
    });
  }

  // 1.13 Deletion Cross-Tenant: DELETE /api/warehouse/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/warehouse/delete/${warehouseB.WarehouseID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-13",
      name: "Cross-Tenant Deletion (DELETE Tenant B Warehouse)",
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
      notes: "Must prevent foreign warehouse deletion",
    });
  }

  // 1.14 Mutation Cross-Tenant: PATCH /api/delivery/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/delivery/edit`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        DeliveryID: deliveryB.DeliveryID,
      }),
    });
    recordResult({
      id: "SEC-BOLA-14",
      name: "Cross-Tenant Tamper (PATCH Tenant B Delivery)",
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
      notes: "Must prevent foreign delivery modification",
    });
  }

  // 1.15 Deletion Cross-Tenant: DELETE /api/delivery/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/delivery/delete/${deliveryB.DeliveryID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-15",
      name: "Cross-Tenant Deletion (DELETE Tenant B Delivery)",
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
      notes: "Must prevent foreign delivery deletion",
    });
  }

  // 1.16 Mutation Cross-Tenant: PATCH /api/payment/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/payment/edit`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        PaymentID: paymentB.PaymentID,
        PaymentAmount: 0.01,
      }),
    });
    recordResult({
      id: "SEC-BOLA-16",
      name: "Cross-Tenant Tamper (PATCH Tenant B Payment)",
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
      notes: "Must prevent financial payment tampering",
    });
  }

  // 1.17 Deletion Cross-Tenant: DELETE /api/payment/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/payment/delete/${paymentB.PaymentID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    recordResult({
      id: "SEC-BOLA-17",
      name: "Cross-Tenant Deletion (DELETE Tenant B Payment)",
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
      notes: "Must prevent foreign payment record deletion",
    });
  }

  // ============================================================================
  // SUITE 2: CROSS-TENANT INVENTORY THEFT ATTACK SIMULATION
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 2: Cross-Tenant Inventory Theft Attack Simulation ---\x1b[0m");

  // 2.1 Cross-Tenant Inventory Siphoning: OutWarehouseID is Tenant B
  {
    const res = await fetch(`${API_BASE_URL}/api/transfer/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
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
      name: "Inventory Theft: Unauthorized OutWarehouseID (Tenant B Source)",
      category: "Cross-Tenant Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/transfer/add",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Rejected with message: "${body?.error}"`,
    });
  }

  // 2.2 Cross-Tenant Inventory Dumping: InWarehouseID is Tenant B
  {
    const res = await fetch(`${API_BASE_URL}/api/transfer/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
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
      name: "Inventory Injection: Unauthorized InWarehouseID (Tenant B Destination)",
      category: "Cross-Tenant Theft",
      owasp: "API1:2023 / Business Logic Abuse",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:H",
      cvssScore: 8.1,
      severity: "HIGH",
      endpoint: "/api/transfer/add",
      method: "POST",
      expectedStatus: 400,
      actualStatus: res.status,
      passed: pass,
      notes: `Rejected with message: "${body?.error}"`,
    });
  }

  // ============================================================================
  // SUITE 3: PRIVILEGE ESCALATION ATTACK SIMULATION (OWASP API2/API5)
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 3: Privilege Escalation & Auth Attack Simulation (OWASP API2/API5) ---\x1b[0m");

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
      name: "Authentication Policy: Register with short password (<8 characters)",
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
    });
  }

  // 3.6 Privilege Escalation: EMPLOYEE attempting PATCH /api/auth/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/auth/edit`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenEmp}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: userEmp.userId,
        userRole: "SUPERADMIN",
      }),
    });
    recordResult({
      id: "SEC-AUTH-06",
      name: "Vertical Role Escalation: EMPLOYEE attempting PATCH /api/auth/edit",
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
    });
  }

  // ============================================================================
  // SUITE 4: AUDIT IMMUTABILITY VERIFICATION (SOX SECTION 404 COMPLIANCE)
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 4: Audit Immutability & SOX Compliance Verification ---\x1b[0m");

  // Create an authentic test transaction to target
  let targetTx: any = transactionA;
  if (!targetTx) {
    const addRes = await fetch(`${API_BASE_URL}/api/transaction/add`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        TransactionDetail: "Enterprise SOX compliance verification baseline entry",
        UserID: userA.userId,
      }),
    });
    targetTx = (await addRes.json()) as any;
  }
  if (!targetTx || !targetTx.TransactionID) {
    throw new Error("Unable to obtain or initialize a test transaction.");
  }

  // 4.1 Immutability: Block PATCH /api/transaction/edit
  {
    const res = await fetch(`${API_BASE_URL}/api/transaction/edit`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        TransactionID: targetTx.TransactionID,
        TransactionDetail: "Fraudulent tampered financial transaction detail",
      }),
    });
    const pass = res.status === 405 || res.status === 404;
    recordResult({
      id: "SEC-AUDIT-01",
      name: "SOX Immutability: Attempt PATCH /api/transaction/edit",
      category: "Audit Immutability",
      owasp: "Regulatory Compliance / Audit Trail Integrity",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:H/A:N",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: "/api/transaction/edit",
      method: "PATCH",
      expectedStatus: [404, 405],
      actualStatus: res.status,
      passed: pass,
      notes: "Transaction logs must be immutable (405 Method Not Allowed / 404)",
    });
  }

  // 4.2 Immutability: Block DELETE /api/transaction/delete/:id
  {
    const res = await fetch(`${API_BASE_URL}/api/transaction/delete/${targetTx.TransactionID}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const pass = res.status === 405 || res.status === 404;
    recordResult({
      id: "SEC-AUDIT-02",
      name: "SOX Immutability: Attempt DELETE /api/transaction/delete/:id",
      category: "Audit Immutability",
      owasp: "Regulatory Compliance / Audit Trail Integrity",
      cvss: "CVSS:3.1/AV:N/AC:L/PR:L/UI:N/S:U/C:N/I:N/A:H",
      cvssScore: 6.5,
      severity: "HIGH",
      endpoint: `/api/transaction/delete/${targetTx.TransactionID}`,
      method: "DELETE",
      expectedStatus: [404, 405],
      actualStatus: res.status,
      passed: pass,
      notes: "Audit log deletion must be blocked to prevent evidence destruction",
    });
  }

  // ============================================================================
  // SUITE 5: SECURITY HEADERS & CORS DEFENSES
  // ============================================================================
  console.log("\n\x1b[35m--- SUITE 5: Security Headers & CORS Attack Simulation ---\x1b[0m");

  // 5.1 Helmet Security Headers
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
      name: "HSTS Header: Strict-Transport-Security enforced",
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
      notes: `Strict-Transport-Security: "${hsts}"`,
    });

    recordResult({
      id: "SEC-HDR-02",
      name: "MIME Protection: X-Content-Type-Options: nosniff",
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
    });
  }

  // 5.2 CORS Rejection of Rogue Origin
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
      name: "CORS Protection: Rogue Origin Rejection (evil-attacker.com)",
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
      notes: `Access-Control-Allow-Origin returned: ${acao || "NONE (Blocked)"}`,
    });
  }

  // 5.3 CORS Allowance of Whitelisted Origin
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
      name: "CORS Protection: Authorized Whitelist Origin (localhost:3000)",
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
      notes: `Access-Control-Allow-Origin: "${acao}", Credentials: "${acc}"`,
    });
  }

  // ============================================================================
  // SUMMARY REPORT
  // ============================================================================
  console.log("\n================================================================================");
  console.log(" PENETRATION TEST EXECUTION SUMMARY");
  console.log("================================================================================");

  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`Total Attack Scenarios Simulated : ${total}`);
  console.log(`Total Attacks Successfully Blocked: \x1b[32m${passed}\x1b[0m`);
  console.log(`Vulnerabilities Detected         : ${failed === 0 ? "\x1b[32m0\x1b[0m" : `\x1b[31m${failed}\x1b[0m`}`);
  console.log(`Verification Security Score      : \x1b[32m${((passed / total) * 100).toFixed(1)}%\x1b[0m`);
  console.log("================================================================================\n");

  await prisma.$disconnect();

  if (failed > 0) {
    process.exit(1);
  }
}

runPenetrationSuite().catch(async (err) => {
  console.error("Test Suite Execution Failure:", err);
  await prisma.$disconnect();
  process.exit(1);
});
