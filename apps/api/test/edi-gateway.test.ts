import {
  EdiGatewayService,
  EdiOrderInput,
  EdiDeliveryInput,
  EdiInvoiceInput,
} from "../services/EdiGateway.service";

async function runEdiGatewayTestSuite() {
  console.log("==================================================================");
  console.log("   EDI GATEWAY SERVICE COMPREHENSIVE VERIFICATION TEST SUITE     ");
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

  // ---------------------------------------------------------------------------
  // TEST 1: ANSI X12 850 Generation & Inbound Parsing
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 1: ANSI X12 850 (Purchase Order) ---");

  const sampleOrder: EdiOrderInput = {
    OrderID: "ORD-98765",
    OrderDate: new Date("2026-10-28T10:00:00Z"),
    ProviderID: "PROV-GLOBAL-01",
    Provider: {
      ProviderID: "PROV-GLOBAL-01",
      ProviderName: "Global Component Fabricators Inc",
      ProviderAddress: "500 Industrial Parkway, Chicago, IL 60601, US",
    },
    company: {
      companyId: "COMP-MESH-CORP",
      companyName: "Mesh Supply Chain Logistics",
      companyCode: "MESH-CORP",
    },
    Orderdetail: [
      {
        OrderDetailID: "OD-101",
        OrderQuantity: 100,
        ExpectedDate: new Date("2026-11-15T00:00:00Z"),
        Products: {
          ProductID: "P-101",
          ProductCode: "SKU-BEARING-HD",
          ProductName: "High-Load Sealed Bearing",
          ProductDescription: "Sealed ceramic bearing 40mm",
          CostPrice: 15.5,
          BarCode: "012345678901",
        },
      },
      {
        OrderDetailID: "OD-102",
        OrderQuantity: 50,
        ExpectedDate: new Date("2026-11-15T00:00:00Z"),
        Products: {
          ProductID: "P-102",
          ProductCode: "SKU-SEAL-NITRILE",
          ProductName: "Nitrile Rotary Shaft Seal",
          ProductDescription: "Dual lip rotary shaft seal",
          CostPrice: 6.25,
          BarCode: "012345678902",
        },
      },
    ],
  };

  const x12_850 = EdiGatewayService.generateX12_850(sampleOrder, {
    controlNumber: 100000005,
    senderId: "MESHBUYER",
    receiverId: "GLOBALFAB",
  });

  assert(x12_850.includes("ST*850*0001"), "X12 850 contains ST*850 segment");
  assert(x12_850.includes("BEG*00*SA*ORD-98765"), "X12 850 contains valid BEG segment with OrderID");
  assert(x12_850.includes("N1*BY*Mesh Supply Chain Logistics"), "X12 850 contains Buyer N1 segment");
  assert(x12_850.includes("N1*SE*Global Component Fabricators Inc"), "X12 850 contains Seller N1 segment");
  assert(x12_850.includes("PO1*1*100*EA*15.50"), "X12 850 contains PO1 line item 1");
  assert(x12_850.includes("PO1*2*50*EA*6.25"), "X12 850 contains PO1 line item 2");
  assert(x12_850.includes("CTT*2*150"), "X12 850 contains CTT totals segment (2 lines, 150 units)");

  const parse850Result = EdiGatewayService.parseX12_850(x12_850);
  assert(parse850Result.validation.isValid, "Parsed X12 850 is valid with 0 errors");
  assert(parse850Result.data.poNumber === "ORD-98765", "Parsed 850 has correct PO number");
  assert(parse850Result.data.lineItems.length === 2, "Parsed 850 has 2 line items");
  assert(parse850Result.data.totals.totalQuantity === 150, "Parsed 850 has totalQuantity 150");
  assert(
    parse850Result.data.totals.totalAmount === 100 * 15.5 + 50 * 6.25,
    "Parsed 850 total amount matches calculated sum ($1,862.50)"
  );
  assert(
    parse850Result.data.meshOrderPayload.ProviderID === "PROV-GLOBAL-01",
    "Mesh Order payload has correct ProviderID"
  );

  // ---------------------------------------------------------------------------
  // TEST 2: ANSI X12 856 (Advance Ship Notice) Generation & Inbound Parsing
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: ANSI X12 856 (Advance Ship Notice) ---");

  const sampleDelivery: EdiDeliveryInput = {
    DeliveryID: "DELIV-44321",
    SalesDate: new Date("2026-10-28T14:00:00Z"),
    CustomerID: "CUST-NORTH-LOGISTICS",
    Customer: {
      CustomerID: "CUST-NORTH-LOGISTICS",
      CustomerName: "Northstar Logistics Hub",
      CustomerAddress: "100 Distribution Way, Dallas, TX 75201, US",
    },
    WarehouseID: "WH-CENTRAL-01",
    Warehouse: {
      WarehouseID: "WH-CENTRAL-01",
      WarehouseName: "Central Fulfillment Depot",
      Location: {
        LocationName: "Depot North",
        LocationAddress: "77 Freight Way, Chicago, IL 60607, US",
      },
    },
    company: {
      companyId: "COMP-MESH",
      companyName: "Mesh Supply Chain Corp",
      companyCode: "MESH-01",
    },
    DeliveryDetail: [
      {
        DeliveryDetailID: "DD-201",
        DeliveryQuantity: 80,
        ExpectedDate: new Date("2026-11-02T12:00:00Z"),
        Product: {
          ProductID: "P-101",
          ProductCode: "SKU-BEARING-HD",
          ProductName: "High-Load Sealed Bearing",
          BarCode: "012345678901",
        },
      },
    ],
  };

  const x12_856 = EdiGatewayService.generateX12_856(sampleDelivery, {
    controlNumber: 200000005,
    senderId: "MESHWHSE",
    receiverId: "NORTHSTAR",
  });

  assert(x12_856.includes("ST*856*0001"), "X12 856 contains ST*856 segment");
  assert(x12_856.includes("BSN*00*DELIV-44321"), "X12 856 contains valid BSN segment with DeliveryID");
  assert(x12_856.includes("HL*1**S"), "X12 856 contains Shipment Level HL segment");
  assert(x12_856.includes("HL*2*1*O"), "X12 856 contains Order Level HL segment");
  assert(x12_856.includes("HL*3*2*I"), "X12 856 contains Item Level HL segment");
  assert(x12_856.includes("TD5*B*02*UPSN"), "X12 856 contains Carrier TD5 segment");
  assert(x12_856.includes("N1*SF*Central Fulfillment Depot"), "X12 856 contains Ship From N1 segment");
  assert(x12_856.includes("N1*ST*Northstar Logistics Hub"), "X12 856 contains Ship To N1 segment");
  assert(x12_856.includes("SN1*1*80*EA"), "X12 856 contains SN1 shipped quantity 80");
  assert(x12_856.includes("CTT*1*80"), "X12 856 contains CTT totals segment");

  const parse856Result = EdiGatewayService.parseX12_856(x12_856);
  assert(parse856Result.validation.isValid, "Parsed X12 856 is valid with 0 errors");
  assert(parse856Result.data.shipmentId === "DELIV-44321", "Parsed 856 has correct shipment ID");
  assert(parse856Result.data.lineItems[0].shippedQuantity === 80, "Parsed 856 has correct shipped quantity");
  assert(
    parse856Result.data.meshDeliveryPayload.DeliveryID === "DELIV-44321",
    "Mesh Delivery payload has correct DeliveryID"
  );

  // ---------------------------------------------------------------------------
  // TEST 3: ANSI X12 810 (Commercial Invoice) Generation & Inbound Parsing
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: ANSI X12 810 (Commercial Invoice) ---");

  const sampleInvoice: EdiInvoiceInput = {
    PaymentID: "PMT-77665",
    invoiceNumber: "INV-2026-9901",
    invoiceDate: new Date("2026-10-28T16:00:00Z"),
    PaymentAmount: 1862.5,
    OrderID: "ORD-98765",
    Order: sampleOrder,
    company: {
      companyName: "Mesh Supply Chain Global",
      companyCode: "MESH-CORP",
    },
    items: [
      {
        lineNumber: 1,
        quantity: 100,
        unitPrice: 15.5,
        productCode: "SKU-BEARING-HD",
        productName: "High-Load Sealed Bearing",
      },
      {
        lineNumber: 2,
        quantity: 50,
        unitPrice: 6.25,
        productCode: "SKU-SEAL-NITRILE",
        productName: "Nitrile Rotary Shaft Seal",
      },
    ],
  };

  const x12_810 = EdiGatewayService.generateX12_810(sampleInvoice, {
    controlNumber: 300000005,
    senderId: "GLOBALFAB",
    receiverId: "MESHBUYER",
  });

  assert(x12_810.includes("ST*810*0001"), "X12 810 contains ST*810 segment");
  assert(x12_810.includes("BIG*"), "X12 810 contains BIG segment");
  assert(x12_810.includes("INV-2026-9901"), "X12 810 contains invoice number");
  assert(x12_810.includes("ORD-98765"), "X12 810 contains associated PO number");
  assert(x12_810.includes("ITD*01*3*2"), "X12 810 contains payment terms segment");
  assert(x12_810.includes("IT1*1*100*EA*15.50"), "X12 810 contains line item 1");
  assert(x12_810.includes("IT1*2*50*EA*6.25"), "X12 810 contains line item 2");
  assert(x12_810.includes("TDS*186250"), "X12 810 contains TDS total in cents ($1,862.50 -> 186250)");

  const parse810Result = EdiGatewayService.parseX12_810(x12_810);
  assert(parse810Result.validation.isValid, "Parsed X12 810 is valid with 0 errors");
  assert(parse810Result.data.invoiceNumber === "INV-2026-9901", "Parsed 810 has correct invoice number");
  assert(parse810Result.data.poNumber === "ORD-98765", "Parsed 810 has correct PO number");
  assert(parse810Result.data.totals.totalsMatch, "Parsed 810 TDS matches sum of line items");
  assert(parse810Result.data.totals.totalAmount === 1862.5, "Parsed 810 total amount is $1,862.50");

  // ---------------------------------------------------------------------------
  // TEST 4: UN/EDIFACT (ORDERS, DESADV, INVOIC) Generation & Parsing
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: UN/EDIFACT (ORDERS, DESADV, INVOIC) ---");

  const edifactOrders = EdiGatewayService.generateEdifactOrders(sampleOrder, {
    controlNumber: "000000101",
    senderId: "MESHBUYER",
    receiverId: "GLOBALFAB",
  });

  assert(edifactOrders.includes("UNB+UNOC:3+MESHBUYER:ZZ+GLOBALFAB:ZZ"), "EDIFACT ORDERS contains UNB header");
  assert(edifactOrders.includes("UNH+0001+ORDERS:D:96A"), "EDIFACT ORDERS contains UNH message header");
  assert(edifactOrders.includes("BGM+220+ORD-98765+9"), "EDIFACT ORDERS contains BGM with PO number");
  assert(edifactOrders.includes("LIN+1++SKU-BEARING-HD:IN"), "EDIFACT ORDERS contains LIN line item 1");
  assert(edifactOrders.includes("QTY+21:100:EA"), "EDIFACT ORDERS contains QTY ordered 100");
  assert(edifactOrders.includes("PRI+AAA:15.50:CT:NTP"), "EDIFACT ORDERS contains net price 15.50");
  assert(edifactOrders.includes("UNZ+1+000000101"), "EDIFACT ORDERS contains UNZ trailer");

  const parseEdifactResult = EdiGatewayService.parseEdifactOrders(edifactOrders);
  assert(parseEdifactResult.validation.isValid, "Parsed EDIFACT ORDERS is valid with 0 errors");
  assert(parseEdifactResult.data.poNumber === "ORD-98765", "Parsed EDIFACT ORDERS poNumber matches");
  assert(parseEdifactResult.data.lineItems.length === 2, "Parsed EDIFACT ORDERS has 2 line items");

  const edifactDesadv = EdiGatewayService.generateEdifactDesadv(sampleDelivery, {
    controlNumber: "000000201",
    senderId: "MESHWHSE",
    receiverId: "NORTHSTAR",
  });
  assert(edifactDesadv.includes("UNH+0001+DESADV:D:96A"), "EDIFACT DESADV contains DESADV message header");
  assert(edifactDesadv.includes("BGM+351+DELIV-44321+9"), "EDIFACT DESADV contains Despatch Advice BGM");

  const edifactInvoic = EdiGatewayService.generateEdifactInvoic(sampleInvoice, {
    controlNumber: "000000301",
    senderId: "GLOBALFAB",
    receiverId: "MESHBUYER",
  });
  assert(edifactInvoic.includes("UNH+0001+INVOIC:D:96A"), "EDIFACT INVOIC contains INVOIC message header");
  assert(edifactInvoic.includes("BGM+380+INV-2026-9901+9"), "EDIFACT INVOIC contains invoice BGM");
  assert(edifactInvoic.includes("MOA+77:1862.50"), "EDIFACT INVOIC contains MOA+77 total amount 1862.50");

  const parseInvoicResult = EdiGatewayService.parseEdifactInvoic(edifactInvoic);
  assert(parseInvoicResult.validation.isValid, "Parsed EDIFACT INVOIC is valid with 0 errors");
  assert(parseInvoicResult.data.invoiceNumber === "INV-2026-9901", "Parsed EDIFACT INVOIC number matches");
  assert(parseInvoicResult.data.totals.totalsMatch, "Parsed EDIFACT INVOIC totals match item sums");

  // ---------------------------------------------------------------------------
  // TEST 5: Universal Parser Auto-Detection & Routing
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 5: Universal Parser Auto-Detection ---");

  const auto850 = EdiGatewayService.parse(x12_850, "auto");
  assert(auto850.standard === "ANSI_X12", "Auto-detected standard: ANSI_X12");
  assert(auto850.documentType === "850", "Auto-detected documentType: 850");
  assert(auto850.validation.isValid, "Auto-parsed 850 is valid");

  const auto856 = EdiGatewayService.parse(x12_856, "auto");
  assert(auto856.standard === "ANSI_X12", "Auto-detected standard: ANSI_X12");
  assert(auto856.documentType === "856", "Auto-detected documentType: 856");

  const auto810 = EdiGatewayService.parse(x12_810, "auto");
  assert(auto810.standard === "ANSI_X12", "Auto-detected standard: ANSI_X12");
  assert(auto810.documentType === "810", "Auto-detected documentType: 810");

  const autoEdifact = EdiGatewayService.parse(edifactOrders, "auto");
  assert(autoEdifact.standard === "EDIFACT", "Auto-detected standard: EDIFACT");
  assert(autoEdifact.documentType === "850", "Auto-detected documentType: 850 (ORDERS)");

  // ---------------------------------------------------------------------------
  // TEST 6: Checksum & Control Number Integrity Validation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 6: Checksum, Segment Count & Validation Errors ---");

  // Corrupt segment count in SE01
  const corruptedSegmentCount = x12_850.replace(/SE\*(\d+)\*0001/, "SE*999*0001");
  const parsedCorruptSeg = EdiGatewayService.parseX12_850(corruptedSegmentCount);
  assert(
    !parsedCorruptSeg.validation.isValid,
    "Correctly detected corrupted SE01 segment count",
    `Errors: ${parsedCorruptSeg.validation.errors.join("; ")}`
  );

  // Corrupt control number in IEA02
  const corruptedControlNum = x12_850.replace(/IEA\*1\*(\d+)/, "IEA*1*999999999");
  const parsedCorruptCtrl = EdiGatewayService.parseX12_850(corruptedControlNum);
  assert(
    !parsedCorruptCtrl.validation.isValid,
    "Correctly detected ISA13 != IEA02 control number mismatch",
    `Errors: ${parsedCorruptCtrl.validation.errors.join("; ")}`
  );

  // Corrupt TDS in 810 (invoice total variance)
  const corruptedTds = x12_810.replace(/TDS\*(\d+)/, "TDS*999999");
  const parsedCorruptTds = EdiGatewayService.parseX12_810(corruptedTds);
  assert(
    !parsedCorruptTds.validation.isValid,
    "Correctly detected TDS total mismatch against sum of line items",
    `Errors: ${parsedCorruptTds.validation.errors.join("; ")}`
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Sandbox Templates
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST SUITE 7: Sandbox Templates ---");

  const templates = EdiGatewayService.getTemplates();
  assert(!!templates["850"] && !!templates["856"] && !!templates["810"], "Templates contain 850, 856, and 810");
  assert(typeof templates["850"].ansiX12 === "string", "850 template has valid ansiX12 payload");
  assert(typeof templates["850"].edifact === "string", "850 template has valid edifact payload");
  assert(Array.isArray(templates["850"].schema.segments), "850 template includes segment dictionary");

  // Verify that sandbox templates pass their own parser with 0 errors!
  const tmpl850Parsed = EdiGatewayService.parse(templates["850"].ansiX12, "850");
  assert(tmpl850Parsed.validation.isValid, "Sandbox 850 template parses cleanly with 0 errors");

  const tmpl856Parsed = EdiGatewayService.parse(templates["856"].ansiX12, "856");
  assert(tmpl856Parsed.validation.isValid, "Sandbox 856 template parses cleanly with 0 errors");

  const tmpl810Parsed = EdiGatewayService.parse(templates["810"].ansiX12, "810");
  assert(tmpl810Parsed.validation.isValid, "Sandbox 810 template parses cleanly with 0 errors");

  console.log("\n==================================================================");
  console.log(`   TEST RESULTS: ${passed} PASSED, ${failed} FAILED                 `);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runEdiGatewayTestSuite().catch((err) => {
  console.error("Test Suite Execution Error:", err);
  process.exit(1);
});
