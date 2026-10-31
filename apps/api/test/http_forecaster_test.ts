import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../db";
import { getJwtSecret } from "../config/jwt";
import forecastRouter from "../routes/Forecast.routes";
import { DemandForecasterWorker } from "../services/DemandForecasterWorker.service";

async function testHttpEndpoints() {
  console.log("\n===============================================================================");
  console.log("   HTTP API ENDPOINT INTEGRATION TEST FOR FORECAST CONTROLLER                  ");
  console.log("===============================================================================\n");

  // Setup app
  const app = express();
  app.use(express.json());
  app.use("/api/forecast", forecastRouter);

  // Authenticate as admin user
  const adminUser = await prisma.user.findFirst({
    where: { userEmail: "admin@mesh.com" },
  });
  if (!adminUser || !adminUser.companyId) {
    throw new Error("Admin user not found in DB.");
  }

  const { userPassword, userRefreshToken, ...userPayload } = adminUser;
  const token = jwt.sign({ user: userPayload }, getJwtSecret(), { expiresIn: "1h" });

  const server = app.listen(0);
  const address = server.address() as any;
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}/api/forecast`;

  try {
    // Test 1: GET /api/forecast/stockout-risk
    console.log("[HTTP Test 1] GET /api/forecast/stockout-risk");
    const res1 = await fetch(`${baseUrl}/stockout-risk`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-company-id": adminUser.companyId,
      },
    });

    if (res1.status !== 200) {
      throw new Error(`Expected 200, got ${res1.status}: ${await res1.text()}`);
    }

    const resTimeHeader = res1.headers.get("x-response-time-ms");
    const forecastEngineHeader = res1.headers.get("x-forecast-engine");
    const body1 = await res1.json();

    console.log(`  -> Status: ${res1.status}`);
    console.log(`  -> X-Response-Time-Ms: ${resTimeHeader}`);
    console.log(`  -> X-Forecast-Engine: ${forecastEngineHeader}`);
    console.log(`  -> Response status field: ${body1.status}`);
    console.log(`  -> Items count: ${body1.items?.length}`);
    console.log(`  -> Summary totalSkusEvaluated: ${body1.summary?.totalSkusEvaluated}`);

    if (body1.status !== "success" || !Array.isArray(body1.items) || !body1.summary) {
      throw new Error("Response body does not strictly match ForecastApiResponse format!");
    }
    console.log("  [PASS] GET /api/forecast/stockout-risk verified!");

    // Test 2: GET /api/forecast/stockout-risk?refresh=true
    console.log("\n[HTTP Test 2] GET /api/forecast/stockout-risk?refresh=true");
    const res2 = await fetch(`${baseUrl}/stockout-risk?refresh=true`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "x-company-id": adminUser.companyId,
      },
    });

    if (res2.status !== 200) {
      throw new Error(`Expected 200, got ${res2.status}`);
    }
    const body2 = await res2.json();
    console.log(`  -> Refreshed items count: ${body2.items?.length}`);
    console.log(`  -> X-Response-Time-Ms: ${res2.headers.get("x-response-time-ms")}`);
    console.log("  [PASS] Force refresh verified!");

    // Test 3: POST /api/forecast/auto-po (dry check or test with specific inventoryId)
    console.log("\n[HTTP Test 3] POST /api/forecast/auto-po");
    const testItem = body1.items.find((i: any) => i.riskLevel === "CRITICAL") || body1.items[0];
    if (testItem) {
      const res3 = await fetch(`${baseUrl}/auto-po`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "x-company-id": adminUser.companyId,
        },
        body: JSON.stringify({
          inventoryIds: [testItem.inventoryId],
        }),
      });

      if (res3.status !== 200) {
        throw new Error(`Expected 200 for auto-po, got ${res3.status}: ${await res3.text()}`);
      }
      const body3 = await res3.json();
      console.log(`  -> Auto-PO success: ${body3.success}`);
      console.log(`  -> Orders created: ${body3.createdOrdersCount}`);
      console.log(`  -> Capital committed: $${body3.totalCapitalCommitted}`);
      if (body3.orders && body3.orders.length > 0) {
        console.log(`  -> Order ID: ${body3.orders[0].orderId}`);
        console.log(`  -> Order Detail ID: ${body3.orders[0].orderDetailId}`);
      }
      console.log("  [PASS] POST /api/forecast/auto-po verified!");
    }

  } finally {
    server.close();
  }

  console.log("\n===============================================================================");
  console.log("   ALL HTTP ENDPOINT INTEGRATION TESTS PASSED!                                 ");
  console.log("===============================================================================\n");
}

testHttpEndpoints()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("HTTP verification error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
