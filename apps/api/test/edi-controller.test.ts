import { Request, Response } from "express";
import { parseEdi, generateEdi } from "../controllers/Edi.controller";
import { EdiGatewayService } from "../services/EdiGateway.service";

// Mock helper for Express res
function createMockRes() {
  const res: any = {};
  res.statusCode = 200;
  res.body = null;
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data: any) => {
    res.body = data;
    return res;
  };
  return res;
}

async function runControllerTests() {
  console.log("==================================================================");
  console.log("        EDI CONTROLLER INTEGRATION VERIFICATION TESTS             ");
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

  // TEST 1: EdiGatewayService.getTemplates
  {
    const templates = EdiGatewayService.getTemplates();
    assert(!!templates?.["850"], "getTemplates includes 850 schema and payloads");
    assert(!!templates?.["856"], "getTemplates includes 856 schema and payloads");
    assert(!!templates?.["810"], "getTemplates includes 810 schema and payloads");
  }

  // TEST 2: POST /api/edi/parse with valid 850 payload
  {
    const templates = EdiGatewayService.getTemplates();
    const valid850Payload = templates["850"].ansiX12;

    const req: any = {
      body: {
        rawEdi: valid850Payload,
        type: "850",
      },
    };
    const res = createMockRes();
    await parseEdi(req, res);

    assert(res.statusCode === 200, "parseEdi returns HTTP 200 for valid 850");
    assert(res.body?.success === true, "parseEdi returns success: true");
    assert(res.body?.documentType === "850", "parseEdi correctly tags documentType as 850");
    assert(res.body?.validation?.isValid === true, "parseEdi returns isValid: true with 0 errors");
    assert(res.body?.validation?.segmentCount > 0, "parseEdi returns valid segmentCount");
    assert(res.body?.parsedData?.poNumber === "ORD-SANDBOX-850", "parseEdi extracts correct poNumber");
  }

  // TEST 3: POST /api/edi/parse with missing payload (error check)
  {
    const req: any = { body: {} };
    const res = createMockRes();
    await parseEdi(req, res);

    assert(res.statusCode === 400, "parseEdi returns HTTP 400 when rawEdi is missing");
    assert(res.body?.success === false, "parseEdi returns success: false");
    assert(res.body?.error.includes("rawEdi"), "parseEdi error mentions rawEdi");
  }

  // TEST 4: POST /api/edi/generate with missing params (error check)
  {
    const req: any = { params: {} };
    const res = createMockRes();
    await generateEdi(req, res);

    assert(res.statusCode === 400, "generateEdi returns HTTP 400 when type or id is missing");
  }

  // TEST 5: POST /api/edi/generate with invalid type
  {
    const req: any = {
      params: { type: "invalid-type", id: "123" },
      query: {},
      body: {},
    };
    const res = createMockRes();
    await generateEdi(req, res);

    assert(res.statusCode === 400, "generateEdi returns HTTP 400 for unsupported document type");
    assert(res.body?.error.includes("Unsupported"), "generateEdi error message explains supported types");
  }

  console.log("\n==================================================================");
  console.log(`   CONTROLLER TEST RESULTS: ${passed} PASSED, ${failed} FAILED     `);
  console.log("==================================================================");

  if (failed > 0) process.exit(1);
}

runControllerTests().catch((err) => {
  console.error("Controller Test Failure:", err);
  process.exit(1);
});
