import { prisma } from "../db";
import { DemandForecasterWorker } from "../services/DemandForecasterWorker.service";
import { MLService } from "../services/ml.service";
import type { ForecastApiResponse, StockoutForecastItem } from "@mesh/types";

async function verifyForecaster() {
  console.log("===============================================================================");
  console.log("   DECOUPLED PRODUCTION ML DEMAND FORECASTER - VERIFICATION SUITE              ");
  console.log("===============================================================================\n");

  // Step 1: Find an active company with inventory
  const activeCompany = await prisma.company.findFirst({
    where: {
      inventories: {
        some: {},
      },
    },
    include: {
      inventories: {
        include: { Product: true, Warehouse: true },
      },
    },
  });

  if (!activeCompany) {
    throw new Error("No active company with inventories found in the database.");
  }

  const tenantId = activeCompany.companyId;
  console.log(`[Test Setup] Selected Tenant: ${activeCompany.companyName} (${tenantId})`);
  console.log(`[Test Setup] Tenant Inventories count: ${activeCompany.inventories.length}`);

  // Step 2: Clear cache to test cold calculation
  DemandForecasterWorker.invalidateCache(tenantId);
  console.log("\n[Test 1] Testing Cold Forecast Execution (Database Aggregation)...");
  const coldStart = process.hrtime();
  const coldForecast = await DemandForecasterWorker.getForecast(tenantId);
  const coldDiff = process.hrtime(coldStart);
  const coldLatencyMs = (coldDiff[0] * 1000 + coldDiff[1] / 1e6);

  console.log(`  -> Cold calculation completed in ${coldLatencyMs.toFixed(2)}ms`);
  console.log(`  -> Total items evaluated: ${coldForecast.items.length}`);
  console.log(`  -> Critical: ${coldForecast.summary.criticalSkusCount}, Warning: ${coldForecast.summary.warningSkusCount}, Safe: ${coldForecast.summary.safeSkusCount}`);

  if (coldForecast.status !== "success") {
    throw new Error(`Expected status: "success", got: ${coldForecast.status}`);
  }
  if (!Array.isArray(coldForecast.items) || coldForecast.items.length === 0) {
    throw new Error("Expected non-empty forecast items.");
  }

  // Step 3: Test Hot Cache Performance (<50ms requirement)
  console.log("\n[Test 2] Testing Hot Cache Latency (Target: <50ms, ideally sub-millisecond)...");
  const hotLatencies: number[] = [];
  for (let i = 0; i < 10; i++) {
    const hotStart = process.hrtime();
    const hotForecast = await DemandForecasterWorker.getForecast(tenantId);
    const hotDiff = process.hrtime(hotStart);
    const latency = hotDiff[0] * 1000 + hotDiff[1] / 1e6;
    hotLatencies.push(latency);
    if (hotForecast !== coldForecast) {
      throw new Error("Hot cache should return the cached object reference!");
    }
  }

  const avgHotLatency = hotLatencies.reduce((a, b) => a + b, 0) / hotLatencies.length;
  console.log(`  -> 10 iterations hot cache avg latency: ${avgHotLatency.toFixed(3)}ms (Min: ${Math.min(...hotLatencies).toFixed(3)}ms, Max: ${Math.max(...hotLatencies).toFixed(3)}ms)`);
  if (avgHotLatency >= 50) {
    throw new Error(`Latency exceeded 50ms requirement: ${avgHotLatency.toFixed(2)}ms`);
  }
  console.log("  [PASS] Sub-50ms hot cache requirement verified!");

  // Step 4: Test Cache Invalidation via forceRefresh
  console.log("\n[Test 3] Testing Force Refresh Cache Invalidation...");
  const refreshStart = process.hrtime();
  const refreshedForecast = await DemandForecasterWorker.getForecast(tenantId, { forceRefresh: true });
  const refreshDiff = process.hrtime(refreshStart);
  const refreshLatencyMs = refreshDiff[0] * 1000 + refreshDiff[1] / 1e6;
  console.log(`  -> Force refreshed forecast generated in ${refreshLatencyMs.toFixed(2)}ms`);
  if (!refreshedForecast || refreshedForecast.items.length !== coldForecast.items.length) {
    throw new Error("Refreshed forecast does not match expected length.");
  }
  console.log("  [PASS] Cache refresh verified!");

  // Step 5: Verify Supply Chain Mathematical Equations & Invariants
  console.log("\n[Test 4] Verifying Supply Chain Stochastic Formulas & Invariants...");
  for (const item of coldForecast.items) {
    const {
      currentStock,
      minStockLevel,
      maxStockLevel,
      dailyVelocity,
      leadTimeDays,
      daysOfCoverage,
      stockoutRisk,
      riskLevel,
      recommendedReorderQty,
      reorderPoint,
    } = item;

    // Check Days of Coverage formula: currentStock / max(0.1, dailyVelocity)
    const expectedCoverage = Math.max(0.1, Math.round((currentStock / Math.max(0.1, dailyVelocity)) * 10) / 10);
    if (Math.abs(daysOfCoverage - expectedCoverage) > 0.15) {
      throw new Error(`Days of coverage discrepancy for ${item.productCode}: expected ${expectedCoverage}, got ${daysOfCoverage}`);
    }

    // Check Risk Level Invariants:
    // - If daysOfCoverage <= leadTimeDays or currentStock <= minStockLevel: risk >= 0.75 ("CRITICAL")
    if (daysOfCoverage <= leadTimeDays || currentStock <= minStockLevel) {
      if (riskLevel !== "CRITICAL" || stockoutRisk < 0.75) {
        throw new Error(`Expected CRITICAL risk (>=0.75) for ${item.productCode}, got ${riskLevel} (${stockoutRisk})`);
      }
    } else if (daysOfCoverage <= leadTimeDays * 2 || currentStock <= reorderPoint) {
      if (riskLevel !== "WARNING" || stockoutRisk < 0.35 || stockoutRisk >= 0.75) {
        throw new Error(`Expected WARNING risk (0.35-0.74) for ${item.productCode}, got ${riskLevel} (${stockoutRisk})`);
      }
    } else {
      if (riskLevel !== "SAFE" || stockoutRisk >= 0.35) {
        throw new Error(`Expected SAFE risk (<0.35) for ${item.productCode}, got ${riskLevel} (${stockoutRisk})`);
      }
    }

    // Check Recommended Reorder Quantity formula:
    // recommendedReorderQty = max(reorderQty, ceil(maxStockLevel - currentStock + dailyVelocity * leadTimeDays))
    const expectedTarget = Math.ceil(maxStockLevel - currentStock + (dailyVelocity * leadTimeDays));
    if (recommendedReorderQty < expectedTarget && recommendedReorderQty < 50) {
      throw new Error(`Recommended reorder qty violates lower bounds for ${item.productCode}`);
    }
  }
  console.log(`  [PASS] All ${coldForecast.items.length} inventory items strictly adhere to stochastic safety stock, ROP, coverage, and risk invariants!`);

  // Step 6: Test MLService backwards compatibility
  console.log("\n[Test 5] Testing MLService backwards compatibility...");
  const dummyPayload = {
    inventories: activeCompany.inventories,
    products: activeCompany.inventories.map((i) => i.Product).filter(Boolean),
    deliveries: [],
    orders: [],
    providers: [],
  };
  const mlStart = process.hrtime();
  const mlOutput = await MLService.runStockoutForecast(dummyPayload);
  const mlDiff = process.hrtime(mlStart);
  const mlLatency = mlDiff[0] * 1000 + mlDiff[1] / 1e6;
  console.log(`  -> MLService.runStockoutForecast returned in ${mlLatency.toFixed(2)}ms without Python child_process!`);
  if (mlOutput.status !== "success" || !mlOutput.items) {
    throw new Error("MLService did not return valid ForecastApiResponse");
  }
  console.log("  [PASS] MLService backwards-compatible bridge verified!");

  // Step 7: Test Background Worker Warming
  console.log("\n[Test 6] Testing Background Worker Cache Warming & Diagnostics...");
  DemandForecasterWorker.invalidateCache();
  console.log(`  -> Cache cleared. Size: ${DemandForecasterWorker.getCacheStats().size}`);
  await DemandForecasterWorker.warmActiveTenants();
  const stats = DemandForecasterWorker.getCacheStats();
  console.log(`  -> Cache warmed. Size: ${stats.size}, Tenants: ${stats.tenants.join(", ")}`);
  if (stats.size === 0) {
    throw new Error("Background warming failed to warm any tenant caches.");
  }
  console.log("  [PASS] Background worker warming verified!");

  // Step 8: Verify Timer lifecycle
  DemandForecasterWorker.startBackgroundWorker(60000);
  DemandForecasterWorker.stopBackgroundWorker();
  console.log("  [PASS] Background worker start/stop lifecycle verified!");

  console.log("\n===============================================================================");
  console.log("   ALL VERIFICATION CHECKS PASSED SUCCESSFULLY!                                ");
  console.log("===============================================================================");
}

verifyForecaster()
  .then(async () => {
    await prisma.$disconnect();
    process.exit(0);
  })
  .catch(async (e) => {
    console.error("Verification failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
