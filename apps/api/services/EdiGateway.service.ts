/**
 * EdiGateway.service.ts
 *
 * Comprehensive EDI (Electronic Data Interchange) Gateway Service for Mesh Supply Chain Platform.
 * Supports:
 *  - ANSI X12: 850 (Purchase Order), 856 (Advance Ship Notice / ASN), 810 (Commercial Invoice)
 *  - UN/EDIFACT: ORDERS (Purchase Order), DESADV (Despatch Advice), INVOIC (Commercial Invoice)
 *
 * Implements:
 *  - Outbound generators with standard control envelopes (ISA/GS/ST/SE/GE/IEA and UNB/UNH/UNT/UNZ)
 *  - Inbound parsers extracting structured JSON ready for Mesh Order / Delivery / Payment operations
 *  - Strict checksum & segment count validation, control number consistency checking, and audit reporting
 *  - Sandbox sample templates & schema definitions
 */

export type EdiStandard = "ANSI_X12" | "EDIFACT";
export type EdiDocumentType = "850" | "856" | "810";

export interface EdiValidationResult {
  isValid: boolean;
  segmentCount: number;
  errors: string[];
}

export interface EdiEnvelopeOptions {
  senderId?: string;
  receiverId?: string;
  senderQualifier?: string;
  receiverQualifier?: string;
  controlNumber?: number | string;
  isTest?: boolean;
}

export interface EdiOrderInput {
  OrderID: string;
  OrderDate: Date | string;
  ProviderID?: string;
  Provider?: {
    ProviderID?: string;
    ProviderName?: string;
    ProviderAddress?: string;
  } | null;
  companyId?: string | null;
  company?: {
    companyId?: string;
    companyName?: string;
    companyCode?: string;
    companyDomain?: string | null;
  } | null;
  Orderdetail?: Array<{
    OrderDetailID?: string;
    OrderQuantity: number;
    ExpectedDate?: Date | string;
    ActualDate?: Date | string | null;
    ProductIDs?: string[];
    Products?: {
      ProductID?: string;
      ProductCode?: string;
      ProductName?: string;
      ProductDescription?: string;
      ProductCategory?: string;
      CostPrice?: number;
      SellPrice?: number;
      BarCode?: string;
    } | null;
  }>;
}

export interface EdiDeliveryInput {
  DeliveryID: string;
  SalesDate: Date | string;
  CustomerID?: string;
  Customer?: {
    CustomerID?: string;
    CustomerName?: string;
    CustomerAddress?: string;
  } | null;
  WarehouseID?: string | null;
  Warehouse?: {
    WarehouseID?: string;
    WarehouseName?: string;
    Location?: {
      LocationName?: string;
      LocationAddress?: string;
    } | null;
  } | null;
  companyId?: string | null;
  company?: {
    companyId?: string;
    companyName?: string;
    companyCode?: string;
  } | null;
  DeliveryDetail?: Array<{
    DeliveryDetailID?: string;
    DeliveryQuantity: number;
    ExpectedDate?: Date | string;
    ActualDate?: Date | string | null;
    ProductID?: string;
    Product?: {
      ProductID?: string;
      ProductCode?: string;
      ProductName?: string;
      ProductDescription?: string;
      CostPrice?: number;
      SellPrice?: number;
      BarCode?: string;
    } | null;
  }>;
}

export interface EdiInvoiceInput {
  PaymentID?: string;
  invoiceNumber?: string;
  invoiceDate?: Date | string;
  PaymentAmount?: number;
  PaymentStatus?: string;
  PaymentMode?: string | null;
  PaymentDescription?: string | null;
  OrderID?: string | null;
  DeliveryID?: string | null;
  Order?: EdiOrderInput | null;
  Delivery?: EdiDeliveryInput | null;
  companyId?: string | null;
  company?: {
    companyId?: string;
    companyName?: string;
    companyCode?: string;
  } | null;
  items?: Array<{
    lineNumber?: number;
    quantity: number;
    unitPrice: number;
    productCode: string;
    productName?: string;
    description?: string;
    barCode?: string;
  }>;
}

export interface Edi850ParsedData {
  interchangeHeader: {
    senderId: string;
    receiverId: string;
    controlNumber: string;
    date: string;
    time: string;
  };
  groupHeader: {
    sender: string;
    receiver: string;
    controlNumber: string;
    date: string;
    time: string;
  };
  poNumber: string;
  poDate: string;
  poType: string;
  purposeCode: string;
  referenceNumber?: string;
  requestedDeliveryDate?: string;
  buyer: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  seller: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  lineItems: Array<{
    lineNumber: number;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    productCode: string;
    barcode?: string;
    description?: string;
    subtotal: number;
  }>;
  totals: {
    totalLines: number;
    totalQuantity: number;
    totalAmount: number;
  };
  controlNumbers: {
    isaControlNumber: string;
    gsControlNumber: string;
    stControlNumber: string;
  };
  meshOrderPayload: {
    OrderDate: string;
    ProviderID: string;
    providerName: string;
    buyerName: string;
    poNumber: string;
    items: Array<{
      ProductCode: string;
      ProductName: string;
      OrderQuantity: number;
      UnitPrice: number;
      Subtotal: number;
      ExpectedDate?: string | null;
    }>;
    totalAmount: number;
  };
}

export interface Edi856ParsedData {
  interchangeHeader: {
    senderId: string;
    receiverId: string;
    controlNumber: string;
    date: string;
    time: string;
  };
  groupHeader: {
    sender: string;
    receiver: string;
    controlNumber: string;
    date: string;
    time: string;
  };
  shipmentId: string;
  shipmentDate: string;
  shipmentTime?: string;
  estimatedDeliveryDate?: string;
  carrier: {
    carrierCode?: string;
    carrierName?: string;
    transitMethod?: string;
    trackingNumber?: string;
    billOfLading?: string;
  };
  shipFrom: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  shipTo: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  orders: Array<{
    poNumber: string;
    items: Array<{
      lineNumber: number;
      productCode: string;
      barcode?: string;
      shippedQuantity: number;
      unitOfMeasure: string;
      description?: string;
    }>;
  }>;
  lineItems: Array<{
    lineNumber: number;
    productCode: string;
    barcode?: string;
    shippedQuantity: number;
    unitOfMeasure: string;
    description?: string;
  }>;
  totals: {
    totalLines: number;
    totalShippedQuantity: number;
  };
  controlNumbers: {
    isaControlNumber: string;
    gsControlNumber: string;
    stControlNumber: string;
  };
  meshDeliveryPayload: {
    DeliveryID: string;
    SalesDate: string;
    ExpectedDate?: string;
    carrier: any;
    Customer: any;
    Warehouse: any;
    items: Array<{
      ProductCode: string;
      ProductName: string;
      DeliveryQuantity: number;
    }>;
  };
}

export interface Edi810ParsedData {
  interchangeHeader: {
    senderId: string;
    receiverId: string;
    controlNumber: string;
    date: string;
    time: string;
  };
  groupHeader: {
    sender: string;
    receiver: string;
    controlNumber: string;
    date: string;
    time: string;
  };
  invoiceNumber: string;
  invoiceDate: string;
  poNumber: string;
  poDate?: string;
  remitTo: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  billTo: {
    name: string;
    code?: string;
    address?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  paymentTerms?: {
    termsCode?: string;
    discountPercent?: number;
    discountDays?: number;
    netDays?: number;
  };
  lineItems: Array<{
    lineNumber: number;
    quantity: number;
    unitOfMeasure: string;
    unitPrice: number;
    productCode: string;
    barcode?: string;
    description?: string;
    subtotal: number;
  }>;
  totals: {
    totalAmount: number;
    calculatedFromItems: number;
    totalsMatch: boolean;
    totalLines: number;
    totalQuantity: number;
  };
  controlNumbers: {
    isaControlNumber: string;
    gsControlNumber: string;
    stControlNumber: string;
  };
  meshPaymentPayload: {
    PaymentAmount: number;
    PaymentStatus: string;
    PaymentDescription: string;
    OrderID?: string;
    invoiceNumber: string;
    invoiceDate: string;
    vendor: any;
    customer: any;
    items: any[];
    totalsMatch: boolean;
  };
}

export interface EdiParseResponse {
  success: boolean;
  standard: EdiStandard;
  documentType: EdiDocumentType;
  parsedData: Edi850ParsedData | Edi856ParsedData | Edi810ParsedData | any;
  validation: EdiValidationResult;
}

export class EdiGatewayService {
  // Delimiter Constants
  public static readonly X12_SEGMENT_DELIMITER = "~";
  public static readonly X12_ELEMENT_DELIMITER = "*";
  public static readonly X12_SUBELEMENT_DELIMITER = ":";

  public static readonly EDIFACT_SEGMENT_DELIMITER = "'";
  public static readonly EDIFACT_ELEMENT_DELIMITER = "+";
  public static readonly EDIFACT_COMPONENT_DELIMITER = ":";
  public static readonly EDIFACT_RELEASE_CHAR = "?";

  // ---------------------------------------------------------------------------
  // FORMATTING & STRING HELPERS
  // ---------------------------------------------------------------------------

  public static padRight(str: string | undefined | null, length: number, char = " "): string {
    const s = str ? String(str) : "";
    if (s.length >= length) return s.slice(0, length);
    return s + char.repeat(length - s.length);
  }

  public static padLeft(str: string | number | undefined | null, length: number, char = "0"): string {
    const s = str !== undefined && str !== null ? String(str) : "";
    if (s.length >= length) return s.slice(-length);
    return char.repeat(length - s.length) + s;
  }

  public static formatDateYYMMDD(d: Date | string | number = new Date()): string {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "261028";
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yy}${mm}${dd}`;
  }

  public static formatDateCCYYMMDD(d: Date | string | number = new Date()): string {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "20261028";
    const ccyy = String(date.getFullYear()).padStart(4, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${ccyy}${mm}${dd}`;
  }

  public static formatTimeHHMM(d: Date | string | number = new Date()): string {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "1200";
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}${mm}`;
  }

  public static formatTimeHHMMSS(d: Date | string | number = new Date()): string {
    const date = new Date(d);
    if (isNaN(date.getTime())) return "120000";
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    const ss = String(date.getSeconds()).padStart(2, "0");
    return `${hh}${mm}${ss}`;
  }

  public static parseAddressString(address?: string | null): {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } {
    if (!address || typeof address !== "string" || !address.trim()) {
      return {
        street: "100 Innovation Way",
        city: "San Francisco",
        state: "CA",
        postalCode: "94105",
        country: "US",
      };
    }

    const parts = address.split(",").map((p) => p.trim());
    if (parts.length >= 4) {
      const street = parts[0];
      const city = parts[1];
      const stateZip = parts[2].split(/\s+/).filter(Boolean);
      const state = stateZip[0] || "CA";
      const postalCode = stateZip[1] || "94105";
      const country = parts[3] || "US";
      return { street, city, state, postalCode, country };
    } else if (parts.length === 3) {
      const street = parts[0];
      const city = parts[1];
      const stateZip = parts[2].split(/\s+/).filter(Boolean);
      const state = stateZip[0] || "CA";
      const postalCode = stateZip[1] || "94105";
      return { street, city, state, postalCode, country: "US" };
    } else if (parts.length === 2) {
      return { street: parts[0], city: parts[1], state: "CA", postalCode: "94105", country: "US" };
    }
    return { street: address, city: "San Francisco", state: "CA", postalCode: "94105", country: "US" };
  }

  public static countSegments(ediText: string, terminator = "~"): number {
    if (!ediText) return 0;
    if (terminator === "~") {
      return this.splitX12Segments(ediText).length;
    }
    return this.splitEdifactSegments(ediText).length;
  }

  // ---------------------------------------------------------------------------
  // SEGMENT SPLITTERS & TOKENIZERS
  // ---------------------------------------------------------------------------

  public static splitX12Segments(raw: string): string[] {
    if (!raw) return [];
    let delimiter = "~";
    if (!raw.includes("~") && raw.includes("\n")) {
      delimiter = "\n";
    }
    return raw
      .split(delimiter)
      .map((s) => s.replace(/[\r\n]+/g, "").trim())
      .filter((s) => s.length > 0);
  }

  public static splitX12Elements(segment: string): string[] {
    return segment.split(this.X12_ELEMENT_DELIMITER);
  }

  public static splitEdifactSegments(raw: string): string[] {
    if (!raw) return [];
    const segments: string[] = [];
    let current = "";
    for (let i = 0; i < raw.length; i++) {
      const char = raw[i];
      if (char === "'" && (i === 0 || raw[i - 1] !== "?")) {
        const trimmed = current.replace(/[\r\n]+/g, "").trim();
        if (trimmed.length > 0) {
          segments.push(trimmed);
        }
        current = "";
      } else {
        current += char;
      }
    }
    const lastTrimmed = current.replace(/[\r\n]+/g, "").trim();
    if (lastTrimmed.length > 0) {
      segments.push(lastTrimmed);
    }
    return segments;
  }

  public static splitEdifactElements(segment: string): string[] {
    const elements: string[] = [];
    let current = "";
    for (let i = 0; i < segment.length; i++) {
      const char = segment[i];
      if (char === "+" && (i === 0 || segment[i - 1] !== "?")) {
        elements.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    elements.push(current);
    return elements;
  }

  public static splitEdifactComponents(composite: string): string[] {
    const components: string[] = [];
    let current = "";
    for (let i = 0; i < composite.length; i++) {
      const char = composite[i];
      if (char === ":" && (i === 0 || composite[i - 1] !== "?")) {
        components.push(current);
        current = "";
      } else {
        current += char;
      }
    }
    components.push(current);
    return components;
  }

  // ---------------------------------------------------------------------------
  // OUTBOUND GENERATOR: ANSI X12 850 (Purchase Order)
  // ---------------------------------------------------------------------------

  public static generateX12_850(order: EdiOrderInput, options: EdiEnvelopeOptions = {}): string {
    const now = new Date();
    const senderId = this.padRight(options.senderId || order.company?.companyCode || "MESHBUYER", 15);
    const receiverId = this.padRight(
      options.receiverId || order.Provider?.ProviderID || order.ProviderID || "MESHSUPPLIER",
      15
    );
    const isaDate = this.formatDateYYMMDD(now);
    const isaTime = this.formatTimeHHMM(now);
    const ccyyDate = this.formatDateCCYYMMDD(order.OrderDate || now);

    const controlNum = options.controlNumber ? Number(options.controlNumber) : 100000001;
    const isaCtrl = this.padLeft(controlNum, 9);
    const gsCtrl = String(controlNum).slice(-6);
    const stCtrl = "0001";
    const usageIndicator = options.isTest ? "T" : "P";

    const segments: string[] = [];

    // Interchange Control Header (ISA - 106 chars standard structure)
    segments.push(
      `ISA*00*          *00*          *ZZ*${senderId}*ZZ*${receiverId}*${isaDate}*${isaTime}*U*00401*${isaCtrl}*0*${usageIndicator}*:~`
    );

    // Functional Group Header (GS)
    segments.push(
      `GS*PO*${senderId.trim()}*${receiverId.trim()}*${ccyyDate}*${isaTime}*${gsCtrl}*X*004010~`
    );

    // Transaction Set Header (ST)
    const stIndex = segments.length;
    segments.push(`ST*850*${stCtrl}~`);

    // Beginning Segment for Purchase Order (BEG)
    // BEG01: Purpose ('00' = Original), BEG02: Type ('SA' = Stand-alone), BEG03: PO Number, BEG05: Date
    const poNum = order.OrderID;
    segments.push(`BEG*00*SA*${poNum}**${ccyyDate}~`);

    // Reference Identification (REF)
    if (order.ProviderID || order.Provider?.ProviderID) {
      segments.push(`REF*IA*${order.Provider?.ProviderID || order.ProviderID}~`);
    }

    // Buyer Information (N1*BY)
    const buyerName = order.company?.companyName || "Mesh Supply Chain Corp";
    const buyerCode = order.company?.companyCode || order.companyId || "BUYER-01";
    segments.push(`N1*BY*${buyerName}*92*${buyerCode}~`);
    segments.push(`N3*100 Market St Suite 500~`);
    segments.push(`N4*San Francisco*CA*94105*US~`);

    // Seller Information (N1*SE)
    const sellerName = order.Provider?.ProviderName || "Global Industrial Supply";
    const sellerCode = order.Provider?.ProviderID || order.ProviderID || "SUPP-01";
    const sellerAddr = this.parseAddressString(order.Provider?.ProviderAddress);
    segments.push(`N1*SE*${sellerName}*92*${sellerCode}~`);
    segments.push(`N3*${sellerAddr.street}~`);
    segments.push(`N4*${sellerAddr.city}*${sellerAddr.state}*${sellerAddr.postalCode}*${sellerAddr.country}~`);

    // Line Items (PO1 Loops)
    const details = order.Orderdetail && order.Orderdetail.length > 0 ? order.Orderdetail : [];
    let totalQty = 0;
    let lineIndex = 0;

    if (details.length === 0) {
      // Fallback single line item if order was initialized without details
      lineIndex = 1;
      const qty = 1;
      const price = 50.0;
      totalQty += qty;
      segments.push(`PO1*${lineIndex}*${qty}*EA*${price.toFixed(2)}**VN*SKU-GENERIC*UP*000000000000~`);
      segments.push(`PID*F****General Supply Catalog Item~`);
    } else {
      for (const item of details) {
        lineIndex++;
        const qty = item.OrderQuantity || 1;
        totalQty += qty;
        const unitPrice = item.Products?.CostPrice ?? item.Products?.SellPrice ?? 15.0;
        const sku = item.Products?.ProductCode || `SKU-${lineIndex}`;
        const upc = item.Products?.BarCode || `000000${lineIndex}`;
        const desc = item.Products?.ProductName || item.Products?.ProductDescription || `Product ${sku}`;

        segments.push(`PO1*${lineIndex}*${qty}*EA*${Number(unitPrice).toFixed(2)}**VN*${sku}*UP*${upc}~`);
        segments.push(`PID*F****${desc.replace(/[\*~]/g, " ")}~`);

        if (item.ExpectedDate) {
          segments.push(`DTM*002*${this.formatDateCCYYMMDD(item.ExpectedDate)}~`);
        }
      }
    }

    // Transaction Totals (CTT)
    segments.push(`CTT*${lineIndex}*${totalQty}~`);

    // Transaction Set Trailer (SE)
    // SE01: Segment count from ST through SE inclusive
    const seCount = segments.length - stIndex + 1;
    segments.push(`SE*${seCount}*${stCtrl}~`);

    // Functional Group Trailer (GE)
    segments.push(`GE*1*${gsCtrl}~`);

    // Interchange Control Trailer (IEA)
    segments.push(`IEA*1*${isaCtrl}~`);

    return segments.join("\n");
  }

  // ---------------------------------------------------------------------------
  // INBOUND PARSER: ANSI X12 850 (Purchase Order)
  // ---------------------------------------------------------------------------

  public static parseX12_850(rawEdi: string): { data: Edi850ParsedData; validation: EdiValidationResult } {
    const rawSegments = this.splitX12Segments(rawEdi);
    const errors: string[] = [];

    if (rawSegments.length === 0) {
      return {
        data: {} as any,
        validation: { isValid: false, segmentCount: 0, errors: ["Empty EDI content"] },
      };
    }

    // Parse Segments
    let isa: string[] = [];
    let gs: string[] = [];
    let st: string[] = [];
    let beg: string[] = [];
    let se: string[] = [];
    let ge: string[] = [];
    let iea: string[] = [];
    let ctt: string[] = [];
    const references: Array<{ qualifier: string; id: string }> = [];
    let requestedDeliveryDate: string | undefined;

    let buyer: any = { name: "Unknown Buyer" };
    let seller: any = { name: "Unknown Seller" };
    const lineItems: any[] = [];

    let currentEntityRole = "";
    let currentLineItem: any = null;
    let stIndex = -1;
    let seIndex = -1;

    for (let i = 0; i < rawSegments.length; i++) {
      const segText = rawSegments[i];
      const elements = this.splitX12Elements(segText);
      const tag = elements[0].toUpperCase();

      switch (tag) {
        case "ISA":
          isa = elements;
          break;
        case "GS":
          gs = elements;
          break;
        case "ST":
          st = elements;
          stIndex = i;
          break;
        case "BEG":
          beg = elements;
          break;
        case "REF":
          references.push({ qualifier: elements[1] || "", id: elements[2] || "" });
          break;
        case "DTM":
          if (elements[1] === "002" || !requestedDeliveryDate) {
            requestedDeliveryDate = elements[2];
          }
          break;
        case "N1": {
          const role = elements[1];
          currentEntityRole = role;
          const entity = {
            name: elements[2] || "",
            code: elements[4] || "",
          };
          if (role === "BY") buyer = { ...buyer, ...entity };
          if (role === "SE") seller = { ...seller, ...entity };
          break;
        }
        case "N3": {
          const addr = elements[1] || "";
          if (currentEntityRole === "BY") buyer.address = addr;
          if (currentEntityRole === "SE") seller.address = addr;
          break;
        }
        case "N4": {
          const city = elements[1] || "";
          const state = elements[2] || "";
          const postalCode = elements[3] || "";
          const country = elements[4] || "US";
          if (currentEntityRole === "BY") Object.assign(buyer, { city, state, postalCode, country });
          if (currentEntityRole === "SE") Object.assign(seller, { city, state, postalCode, country });
          break;
        }
        case "PO1": {
          if (currentLineItem) {
            lineItems.push(currentLineItem);
          }
          const lineNum = parseInt(elements[1], 10) || lineItems.length + 1;
          const qty = parseFloat(elements[2]) || 0;
          const uom = elements[3] || "EA";
          const unitPrice = parseFloat(elements[4]) || 0;

          let productCode = "";
          let barcode = "";
          // Extract product qualifiers from PO106 onwards
          for (let p = 5; p < elements.length; p += 2) {
            const qual = elements[p];
            const val = elements[p + 1];
            if (!val) continue;
            if (["VN", "BP", "SK", "IN", "MG"].includes(qual) && !productCode) {
              productCode = val;
            } else if (["UP", "EN", "UA"].includes(qual) && !barcode) {
              barcode = val;
            }
          }
          if (!productCode && elements[7]) productCode = elements[7];
          if (!productCode) productCode = `PROD-${lineNum}`;

          currentLineItem = {
            lineNumber: lineNum,
            quantity: qty,
            unitOfMeasure: uom,
            unitPrice,
            productCode,
            barcode,
            subtotal: parseFloat((qty * unitPrice).toFixed(2)),
          };
          break;
        }
        case "PID":
          if (currentLineItem) {
            currentLineItem.description = elements[5] || elements[4] || "";
          }
          break;
        case "CTT":
          ctt = elements;
          break;
        case "SE":
          se = elements;
          seIndex = i;
          if (currentLineItem) {
            lineItems.push(currentLineItem);
            currentLineItem = null;
          }
          break;
        case "GE":
          ge = elements;
          break;
        case "IEA":
          iea = elements;
          break;
      }
    }

    if (currentLineItem) {
      lineItems.push(currentLineItem);
    }

    // VALIDATION CHECKS
    if (!isa.length) errors.push("Missing ISA interchange header segment");
    if (!iea.length) errors.push("Missing IEA interchange trailer segment");
    if (isa.length && iea.length && isa[13] !== iea[2]) {
      errors.push(`ISA control number mismatch: ISA13 (${isa[13]}) != IEA02 (${iea[2]})`);
    }

    if (!gs.length) errors.push("Missing GS functional group header segment");
    if (!ge.length) errors.push("Missing GE functional group trailer segment");
    if (gs.length && ge.length && gs[6] !== ge[2]) {
      errors.push(`GS control number mismatch: GS06 (${gs[6]}) != GE02 (${ge[2]})`);
    }

    if (!st.length) errors.push("Missing ST transaction set header segment");
    if (!se.length) errors.push("Missing SE transaction set trailer segment");
    if (st.length && se.length && st[2] !== se[2]) {
      errors.push(`ST control number mismatch: ST02 (${st[2]}) != SE02 (${se[2]})`);
    }

    if (stIndex !== -1 && seIndex !== -1 && se.length) {
      const declaredSegCount = parseInt(se[1], 10);
      const actualSegCount = seIndex - stIndex + 1;
      if (declaredSegCount !== actualSegCount) {
        errors.push(`Segment count mismatch in SE01: declared ${declaredSegCount}, actual ${actualSegCount}`);
      }
    }

    const totalQty = lineItems.reduce((acc, it) => acc + it.quantity, 0);
    const totalAmount = lineItems.reduce((acc, it) => acc + it.subtotal, 0);

    if (ctt.length) {
      const declaredLines = parseInt(ctt[1], 10);
      if (declaredLines !== lineItems.length) {
        errors.push(`Line count mismatch in CTT01: declared ${declaredLines}, actual ${lineItems.length}`);
      }
      if (ctt[2]) {
        const declaredHash = parseFloat(ctt[2]);
        if (Math.abs(declaredHash - totalQty) > 0.01) {
          errors.push(`Hash total mismatch in CTT02: declared ${declaredHash}, actual ${totalQty}`);
        }
      }
    }

    const poNumber = beg[3] || "UNKNOWN-PO";
    const poDate = beg[5] || "";

    const data: Edi850ParsedData = {
      interchangeHeader: {
        senderId: (isa[6] || "").trim(),
        receiverId: (isa[8] || "").trim(),
        controlNumber: isa[13] || "",
        date: isa[9] || "",
        time: isa[10] || "",
      },
      groupHeader: {
        sender: gs[2] || "",
        receiver: gs[3] || "",
        controlNumber: gs[6] || "",
        date: gs[4] || "",
        time: gs[5] || "",
      },
      poNumber,
      poDate,
      poType: beg[2] || "SA",
      purposeCode: beg[1] || "00",
      referenceNumber: references[0]?.id,
      requestedDeliveryDate,
      buyer,
      seller,
      lineItems,
      totals: {
        totalLines: lineItems.length,
        totalQuantity: totalQty,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
      controlNumbers: {
        isaControlNumber: isa[13] || "",
        gsControlNumber: gs[6] || "",
        stControlNumber: st[2] || "",
      },
      meshOrderPayload: {
        OrderDate: poDate
          ? `${poDate.slice(0, 4)}-${poDate.slice(4, 6)}-${poDate.slice(6, 8)}T00:00:00.000Z`
          : new Date().toISOString(),
        ProviderID: seller.code || seller.name || "PROVIDER",
        providerName: seller.name || "Provider",
        buyerName: buyer.name || "Buyer",
        poNumber,
        items: lineItems.map((item) => ({
          ProductCode: item.productCode,
          ProductName: item.description || item.productCode,
          OrderQuantity: item.quantity,
          UnitPrice: item.unitPrice,
          Subtotal: item.subtotal,
          ExpectedDate: requestedDeliveryDate || null,
        })),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
    };

    return {
      data,
      validation: {
        isValid: errors.length === 0,
        segmentCount: rawSegments.length,
        errors,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // OUTBOUND GENERATOR: ANSI X12 856 (Advance Ship Notice / ASN)
  // ---------------------------------------------------------------------------

  public static generateX12_856(delivery: EdiDeliveryInput, options: EdiEnvelopeOptions = {}): string {
    const now = new Date();
    const senderId = this.padRight(options.senderId || delivery.company?.companyCode || "MESHWHSE", 15);
    const receiverId = this.padRight(
      options.receiverId || delivery.Customer?.CustomerID || delivery.CustomerID || "MESHCUST",
      15
    );
    const isaDate = this.formatDateYYMMDD(now);
    const isaTime = this.formatTimeHHMM(now);
    const timeHHMMSS = this.formatTimeHHMMSS(now);
    const shipDateCCYY = this.formatDateCCYYMMDD(delivery.SalesDate || now);

    const controlNum = options.controlNumber ? Number(options.controlNumber) : 200000001;
    const isaCtrl = this.padLeft(controlNum, 9);
    const gsCtrl = String(controlNum).slice(-6);
    const stCtrl = "0001";
    const usageIndicator = options.isTest ? "T" : "P";

    const segments: string[] = [];

    // Interchange Header
    segments.push(
      `ISA*00*          *00*          *ZZ*${senderId}*ZZ*${receiverId}*${isaDate}*${isaTime}*U*00401*${isaCtrl}*0*${usageIndicator}*:~`
    );

    // Functional Group Header (GS*SH)
    segments.push(
      `GS*SH*${senderId.trim()}*${receiverId.trim()}*${shipDateCCYY}*${isaTime}*${gsCtrl}*X*004010~`
    );

    // Transaction Set Header (ST*856)
    const stIndex = segments.length;
    segments.push(`ST*856*${stCtrl}~`);

    // Beginning Segment for Ship Notice (BSN)
    // BSN01: Purpose ('00' = Original), BSN02: Shipment ID, BSN03: Date, BSN04: Time, BSN05: Hierarchical Struct ('0001')
    const shipmentId = delivery.DeliveryID;
    segments.push(`BSN*00*${shipmentId}*${shipDateCCYY}*${timeHHMMSS}*0001~`);

    // Date/Time Reference (DTM)
    segments.push(`DTM*011*${shipDateCCYY}~`); // 011 = Shipped Date

    const details = delivery.DeliveryDetail && delivery.DeliveryDetail.length > 0 ? delivery.DeliveryDetail : [];
    const expectedDate = details[0]?.ExpectedDate ? this.formatDateCCYYMMDD(details[0].ExpectedDate) : shipDateCCYY;
    segments.push(`DTM*017*${expectedDate}~`); // 017 = Estimated Delivery Date

    // -------------------------------------------------------------
    // HIERARCHICAL LOOP LEVEL 1: SHIPMENT (HL*1**S)
    // -------------------------------------------------------------
    segments.push(`HL*1**S~`);
    segments.push(`TD1*CNT25*${Math.max(1, Math.ceil(details.length / 3))}~`); // Packaging / Cartons
    segments.push(`TD5*B*02*UPSN*M*UPS GROUND FREIGHT~`); // Carrier routing
    segments.push(`REF*BM*BOL-${shipmentId.slice(-8)}~`); // Bill of Lading
    segments.push(`REF*CN*1Z999999${shipmentId.slice(-6)}~`); // Tracking / Pro Number

    // Ship From Party (N1*SF)
    const whseName = delivery.Warehouse?.WarehouseName || delivery.company?.companyName || "Distribution Hub 1";
    const whseCode = delivery.Warehouse?.WarehouseID || delivery.WarehouseID || "WH-01";
    const whseAddr = this.parseAddressString(delivery.Warehouse?.Location?.LocationAddress);
    segments.push(`N1*SF*${whseName}*91*${whseCode}~`);
    segments.push(`N3*${whseAddr.street}~`);
    segments.push(`N4*${whseAddr.city}*${whseAddr.state}*${whseAddr.postalCode}*${whseAddr.country}~`);

    // Ship To Party (N1*ST)
    const custName = delivery.Customer?.CustomerName || "Client Receiving Facility";
    const custCode = delivery.Customer?.CustomerID || delivery.CustomerID || "CUST-01";
    const custAddr = this.parseAddressString(delivery.Customer?.CustomerAddress);
    segments.push(`N1*ST*${custName}*92*${custCode}~`);
    segments.push(`N3*${custAddr.street}~`);
    segments.push(`N4*${custAddr.city}*${custAddr.state}*${custAddr.postalCode}*${custAddr.country}~`);

    // -------------------------------------------------------------
    // HIERARCHICAL LOOP LEVEL 2: ORDER (HL*2*1*O)
    // -------------------------------------------------------------
    segments.push(`HL*2*1*O~`);
    segments.push(`PRF*PO-${shipmentId.slice(-6)}~`); // Purchase Order Reference

    // -------------------------------------------------------------
    // HIERARCHICAL LOOP LEVEL 3: ITEMS (HL*X*2*I)
    // -------------------------------------------------------------
    let hlCounter = 2;
    let totalShippedUnits = 0;
    let itemIndex = 0;

    if (details.length === 0) {
      hlCounter++;
      itemIndex = 1;
      const shippedQty = 10;
      totalShippedUnits += shippedQty;
      segments.push(`HL*${hlCounter}*2*I~`);
      segments.push(`LIN*${itemIndex}*BP*PROD-DELIVERY-01*UP*000012345678~`);
      segments.push(`SN1*${itemIndex}*${shippedQty}*EA~`);
      segments.push(`PID*F****Dispatched Warehouse Stock Item~`);
    } else {
      for (const item of details) {
        hlCounter++;
        itemIndex++;
        const qty = item.DeliveryQuantity || 1;
        totalShippedUnits += qty;
        const sku = item.Product?.ProductCode || `SKU-${itemIndex}`;
        const upc = item.Product?.BarCode || `000000${itemIndex}`;
        const desc = item.Product?.ProductName || item.Product?.ProductDescription || `Dispatched SKU ${sku}`;

        segments.push(`HL*${hlCounter}*2*I~`);
        segments.push(`LIN*${itemIndex}*BP*${sku}*UP*${upc}~`);
        segments.push(`SN1*${itemIndex}*${qty}*EA~`);
        segments.push(`PID*F****${desc.replace(/[\*~]/g, " ")}~`);
      }
    }

    // Transaction Totals (CTT)
    segments.push(`CTT*${itemIndex}*${totalShippedUnits}~`);

    // Transaction Set Trailer (SE)
    const seCount = segments.length - stIndex + 1;
    segments.push(`SE*${seCount}*${stCtrl}~`);

    // Functional Group Trailer (GE)
    segments.push(`GE*1*${gsCtrl}~`);

    // Interchange Trailer (IEA)
    segments.push(`IEA*1*${isaCtrl}~`);

    return segments.join("\n");
  }

  // ---------------------------------------------------------------------------
  // INBOUND PARSER: ANSI X12 856 (Advance Ship Notice / ASN)
  // ---------------------------------------------------------------------------

  public static parseX12_856(rawEdi: string): { data: Edi856ParsedData; validation: EdiValidationResult } {
    const rawSegments = this.splitX12Segments(rawEdi);
    const errors: string[] = [];

    if (rawSegments.length === 0) {
      return {
        data: {} as any,
        validation: { isValid: false, segmentCount: 0, errors: ["Empty EDI content"] },
      };
    }

    let isa: string[] = [];
    let gs: string[] = [];
    let st: string[] = [];
    let bsn: string[] = [];
    let se: string[] = [];
    let ge: string[] = [];
    let iea: string[] = [];
    let ctt: string[] = [];

    let estimatedDeliveryDate: string | undefined;
    const carrier: any = {};
    let shipFrom: any = { name: "Unknown Shipper" };
    let shipTo: any = { name: "Unknown Consignee" };
    let currentRole = "";

    const orders: any[] = [];
    let currentOrder: any = { poNumber: "UNKNOWN", items: [] };
    const allItems: any[] = [];
    let currentItem: any = null;

    let stIndex = -1;
    let seIndex = -1;

    for (let i = 0; i < rawSegments.length; i++) {
      const segText = rawSegments[i];
      const elements = this.splitX12Elements(segText);
      const tag = elements[0].toUpperCase();

      switch (tag) {
        case "ISA":
          isa = elements;
          break;
        case "GS":
          gs = elements;
          break;
        case "ST":
          st = elements;
          stIndex = i;
          break;
        case "BSN":
          bsn = elements;
          break;
        case "DTM":
          if (elements[1] === "017") estimatedDeliveryDate = elements[2];
          break;
        case "TD5":
          carrier.carrierCode = elements[3] || "";
          carrier.transitMethod = elements[4] || "";
          carrier.carrierName = elements[5] || "";
          break;
        case "REF":
          if (elements[1] === "BM") carrier.billOfLading = elements[2];
          if (elements[1] === "CN") carrier.trackingNumber = elements[2];
          break;
        case "N1": {
          const role = elements[1];
          currentRole = role;
          const entity = { name: elements[2] || "", code: elements[4] || "" };
          if (role === "SF") shipFrom = { ...shipFrom, ...entity };
          if (role === "ST") shipTo = { ...shipTo, ...entity };
          break;
        }
        case "N3": {
          const addr = elements[1] || "";
          if (currentRole === "SF") shipFrom.address = addr;
          if (currentRole === "ST") shipTo.address = addr;
          break;
        }
        case "N4": {
          const city = elements[1] || "";
          const state = elements[2] || "";
          const postalCode = elements[3] || "";
          const country = elements[4] || "US";
          if (currentRole === "SF") Object.assign(shipFrom, { city, state, postalCode, country });
          if (currentRole === "ST") Object.assign(shipTo, { city, state, postalCode, country });
          break;
        }
        case "HL": {
          const levelCode = elements[3];
          if (levelCode === "O") {
            if (currentOrder && currentOrder.items.length > 0) {
              orders.push(currentOrder);
            }
            currentOrder = { poNumber: "UNKNOWN", items: [] };
          }
          break;
        }
        case "PRF":
          if (currentOrder) {
            currentOrder.poNumber = elements[1] || "UNKNOWN";
          }
          break;
        case "LIN": {
          if (currentItem) {
            allItems.push(currentItem);
            if (currentOrder) currentOrder.items.push(currentItem);
          }
          const lineNum = parseInt(elements[1], 10) || allItems.length + 1;
          let productCode = "";
          let barcode = "";
          for (let p = 2; p < elements.length; p += 2) {
            const qual = elements[p];
            const val = elements[p + 1];
            if (!val) continue;
            if (["BP", "VN", "SK", "IN"].includes(qual) && !productCode) productCode = val;
            if (["UP", "EN"].includes(qual) && !barcode) barcode = val;
          }
          currentItem = {
            lineNumber: lineNum,
            productCode: productCode || `SKU-${lineNum}`,
            barcode,
            shippedQuantity: 0,
            unitOfMeasure: "EA",
          };
          break;
        }
        case "SN1":
          if (currentItem) {
            currentItem.shippedQuantity = parseFloat(elements[2]) || 0;
            currentItem.unitOfMeasure = elements[3] || "EA";
          }
          break;
        case "PID":
          if (currentItem) {
            currentItem.description = elements[5] || elements[4] || "";
          }
          break;
        case "CTT":
          ctt = elements;
          break;
        case "SE":
          se = elements;
          seIndex = i;
          if (currentItem) {
            allItems.push(currentItem);
            if (currentOrder) currentOrder.items.push(currentItem);
            currentItem = null;
          }
          if (currentOrder && currentOrder.items.length > 0) {
            orders.push(currentOrder);
            currentOrder = null;
          }
          break;
        case "GE":
          ge = elements;
          break;
        case "IEA":
          iea = elements;
          break;
      }
    }

    if (currentItem) {
      allItems.push(currentItem);
      if (currentOrder) currentOrder.items.push(currentItem);
    }
    if (currentOrder && currentOrder.items.length > 0) {
      orders.push(currentOrder);
    }

    // Envelope Validations
    if (!isa.length) errors.push("Missing ISA interchange header segment");
    if (!iea.length) errors.push("Missing IEA interchange trailer segment");
    if (isa.length && iea.length && isa[13] !== iea[2]) {
      errors.push(`ISA control number mismatch: ISA13 (${isa[13]}) != IEA02 (${iea[2]})`);
    }

    if (!gs.length) errors.push("Missing GS functional group header segment");
    if (!ge.length) errors.push("Missing GE functional group trailer segment");
    if (gs.length && ge.length && gs[6] !== ge[2]) {
      errors.push(`GS control number mismatch: GS06 (${gs[6]}) != GE02 (${ge[2]})`);
    }

    if (!st.length) errors.push("Missing ST transaction set header segment");
    if (!se.length) errors.push("Missing SE transaction set trailer segment");
    if (st.length && se.length && st[2] !== se[2]) {
      errors.push(`ST control number mismatch: ST02 (${st[2]}) != SE02 (${se[2]})`);
    }

    if (stIndex !== -1 && seIndex !== -1 && se.length) {
      const declared = parseInt(se[1], 10);
      const actual = seIndex - stIndex + 1;
      if (declared !== actual) {
        errors.push(`Segment count mismatch in SE01: declared ${declared}, actual ${actual}`);
      }
    }

    const totalShipped = allItems.reduce((acc, it) => acc + it.shippedQuantity, 0);
    if (ctt.length) {
      const declaredItems = parseInt(ctt[1], 10);
      if (declaredItems !== allItems.length) {
        errors.push(`Line item count mismatch in CTT01: declared ${declaredItems}, actual ${allItems.length}`);
      }
      if (ctt[2]) {
        const declaredQty = parseFloat(ctt[2]);
        if (Math.abs(declaredQty - totalShipped) > 0.01) {
          errors.push(`Total shipped quantity mismatch in CTT02: declared ${declaredQty}, actual ${totalShipped}`);
        }
      }
    }

    const shipmentId = bsn[2] || "UNKNOWN-SHIPMENT";
    const shipmentDate = bsn[3] || "";

    const data: Edi856ParsedData = {
      interchangeHeader: {
        senderId: (isa[6] || "").trim(),
        receiverId: (isa[8] || "").trim(),
        controlNumber: isa[13] || "",
        date: isa[9] || "",
        time: isa[10] || "",
      },
      groupHeader: {
        sender: gs[2] || "",
        receiver: gs[3] || "",
        controlNumber: gs[6] || "",
        date: gs[4] || "",
        time: gs[5] || "",
      },
      shipmentId,
      shipmentDate,
      shipmentTime: bsn[4] || "",
      estimatedDeliveryDate,
      carrier,
      shipFrom,
      shipTo,
      orders,
      lineItems: allItems,
      totals: {
        totalLines: allItems.length,
        totalShippedQuantity: totalShipped,
      },
      controlNumbers: {
        isaControlNumber: isa[13] || "",
        gsControlNumber: gs[6] || "",
        stControlNumber: st[2] || "",
      },
      meshDeliveryPayload: {
        DeliveryID: shipmentId,
        SalesDate: shipmentDate
          ? `${shipmentDate.slice(0, 4)}-${shipmentDate.slice(4, 6)}-${shipmentDate.slice(6, 8)}T00:00:00.000Z`
          : new Date().toISOString(),
        ExpectedDate: estimatedDeliveryDate
          ? `${estimatedDeliveryDate.slice(0, 4)}-${estimatedDeliveryDate.slice(4, 6)}-${estimatedDeliveryDate.slice(6, 8)}T00:00:00.000Z`
          : undefined,
        carrier,
        Customer: shipTo,
        Warehouse: shipFrom,
        items: allItems.map((item) => ({
          ProductCode: item.productCode,
          ProductName: item.description || item.productCode,
          DeliveryQuantity: item.shippedQuantity,
        })),
      },
    };

    return {
      data,
      validation: {
        isValid: errors.length === 0,
        segmentCount: rawSegments.length,
        errors,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // OUTBOUND GENERATOR: ANSI X12 810 (Commercial Invoice)
  // ---------------------------------------------------------------------------

  public static generateX12_810(invoice: EdiInvoiceInput, options: EdiEnvelopeOptions = {}): string {
    const now = new Date();
    const senderId = this.padRight(options.senderId || invoice.company?.companyCode || "MESHSUPPLIER", 15);
    const receiverId = this.padRight(
      options.receiverId || invoice.Delivery?.Customer?.CustomerID || invoice.Order?.company?.companyCode || "MESHBUYER",
      15
    );
    const isaDate = this.formatDateYYMMDD(now);
    const isaTime = this.formatTimeHHMM(now);
    const invDateCCYY = this.formatDateCCYYMMDD(invoice.invoiceDate || now);

    const controlNum = options.controlNumber ? Number(options.controlNumber) : 300000001;
    const isaCtrl = this.padLeft(controlNum, 9);
    const gsCtrl = String(controlNum).slice(-6);
    const stCtrl = "0001";
    const usageIndicator = options.isTest ? "T" : "P";

    const segments: string[] = [];

    // Interchange Header (ISA)
    segments.push(
      `ISA*00*          *00*          *ZZ*${senderId}*ZZ*${receiverId}*${isaDate}*${isaTime}*U*00401*${isaCtrl}*0*${usageIndicator}*:~`
    );

    // Functional Group Header (GS*IN)
    segments.push(
      `GS*IN*${senderId.trim()}*${receiverId.trim()}*${invDateCCYY}*${isaTime}*${gsCtrl}*X*004010~`
    );

    // Transaction Set Header (ST*810)
    const stIndex = segments.length;
    segments.push(`ST*810*${stCtrl}~`);

    // Beginning Segment for Invoice (BIG)
    // BIG01: Invoice Date, BIG02: Invoice Number, BIG03: PO Date, BIG04: Purchase Order #
    const invoiceNum = invoice.invoiceNumber || invoice.PaymentID || `INV-${this.padLeft(controlNum, 6)}`;
    const poNum = invoice.OrderID || invoice.Order?.OrderID || "PO-STANDARD";
    const poDateCCYY = invoice.Order?.OrderDate ? this.formatDateCCYYMMDD(invoice.Order.OrderDate) : invDateCCYY;
    segments.push(`BIG*${invDateCCYY}*${invoiceNum}*${poDateCCYY}*${poNum}~`);

    // Reference Identification (REF)
    segments.push(`REF*DP*ACCOUNTS-PAYABLE~`);

    // Remit To Party (N1*RE - Vendor)
    const vendorName =
      invoice.Order?.Provider?.ProviderName || invoice.company?.companyName || "Global Industrial Products Ltd";
    const vendorCode =
      invoice.Order?.Provider?.ProviderID || invoice.Order?.ProviderID || invoice.company?.companyCode || "SUPP-01";
    const vendorAddr = this.parseAddressString(invoice.Order?.Provider?.ProviderAddress);
    segments.push(`N1*RE*${vendorName}*92*${vendorCode}~`);
    segments.push(`N3*${vendorAddr.street}~`);
    segments.push(`N4*${vendorAddr.city}*${vendorAddr.state}*${vendorAddr.postalCode}*${vendorAddr.country}~`);

    // Bill To Party (N1*BT - Buyer)
    const billToName =
      invoice.Delivery?.Customer?.CustomerName || invoice.Order?.company?.companyName || "Acme Logistics Enterprise";
    const billToCode =
      invoice.Delivery?.Customer?.CustomerID || invoice.Order?.company?.companyCode || "BUYER-01";
    const billToAddr = this.parseAddressString(invoice.Delivery?.Customer?.CustomerAddress);
    segments.push(`N1*BT*${billToName}*92*${billToCode}~`);
    segments.push(`N3*${billToAddr.street}~`);
    segments.push(`N4*${billToAddr.city}*${billToAddr.state}*${billToAddr.postalCode}*${billToAddr.country}~`);

    // Terms of Sale / Deferred Terms (ITD)
    // ITD01: '01' (Basic), ITD02: '3' (Invoice date basis), ITD03: '2' (2% discount), ITD05: '10' (days), ITD07: '30' (net days)
    segments.push(`ITD*01*3*2**10**30~`);

    // Invoice Line Items (IT1)
    let itemsToProcess = invoice.items || [];
    if (itemsToProcess.length === 0 && invoice.Order?.Orderdetail && invoice.Order.Orderdetail.length > 0) {
      itemsToProcess = invoice.Order.Orderdetail.map((od, idx) => ({
        lineNumber: idx + 1,
        quantity: od.OrderQuantity || 1,
        unitPrice: od.Products?.CostPrice ?? od.Products?.SellPrice ?? 25.0,
        productCode: od.Products?.ProductCode || `SKU-${idx + 1}`,
        productName: od.Products?.ProductName || "Standard Catalog Part",
        description: od.Products?.ProductDescription || od.Products?.ProductName || "Item",
        barCode: od.Products?.BarCode || `000000${idx + 1}`,
      }));
    } else if (itemsToProcess.length === 0 && invoice.Delivery?.DeliveryDetail && invoice.Delivery.DeliveryDetail.length > 0) {
      itemsToProcess = invoice.Delivery.DeliveryDetail.map((dd, idx) => ({
        lineNumber: idx + 1,
        quantity: dd.DeliveryQuantity || 1,
        unitPrice: dd.Product?.SellPrice ?? dd.Product?.CostPrice ?? 25.0,
        productCode: dd.Product?.ProductCode || `SKU-${idx + 1}`,
        productName: dd.Product?.ProductName || "Delivered Good",
        description: dd.Product?.ProductDescription || dd.Product?.ProductName || "Delivered Item",
        barCode: dd.Product?.BarCode || `000000${idx + 1}`,
      }));
    }

    if (itemsToProcess.length === 0) {
      const amount = invoice.PaymentAmount || 250.0;
      itemsToProcess = [
        {
          lineNumber: 1,
          quantity: 1,
          unitPrice: amount,
          productCode: "SERVICE-LOGISTICS",
          productName: invoice.PaymentDescription || "Freight Fulfillment Settlement",
          description: invoice.PaymentDescription || "Supply chain operational delivery",
          barCode: "000000000000",
        },
      ];
    }

    let calculatedTotal = 0;
    let totalQty = 0;
    let lineIndex = 0;

    for (const item of itemsToProcess) {
      lineIndex++;
      const qty = item.quantity || 1;
      const price = item.unitPrice || 0;
      const subtotal = parseFloat((qty * price).toFixed(2));
      calculatedTotal += subtotal;
      totalQty += qty;

      const sku = item.productCode || `SKU-${lineIndex}`;
      const upc = item.barCode || `UPC-${lineIndex}`;
      const desc = item.productName || item.description || `Item ${sku}`;

      segments.push(`IT1*${lineIndex}*${qty}*EA*${Number(price).toFixed(2)}**VN*${sku}*UP*${upc}~`);
      segments.push(`PID*F****${desc.replace(/[\*~]/g, " ")}~`);
    }

    // Total Monetary Value Summary (TDS)
    // Standard ANSI X12 TDS represents total amount in cents (or explicit decimal)
    // Here we emit standard integer cents (e.g. $1225.50 -> 122550)
    const totalInCents = Math.round(calculatedTotal * 100);
    segments.push(`TDS*${totalInCents}~`);

    // Carrier & Shipment reference (CAD)
    segments.push(`CAD*T***UPSN*UPS GROUND~`);

    // Transaction Totals (CTT)
    segments.push(`CTT*${lineIndex}*${totalQty}~`);

    // Transaction Set Trailer (SE)
    const seCount = segments.length - stIndex + 1;
    segments.push(`SE*${seCount}*${stCtrl}~`);

    // Functional Group Trailer (GE)
    segments.push(`GE*1*${gsCtrl}~`);

    // Interchange Control Trailer (IEA)
    segments.push(`IEA*1*${isaCtrl}~`);

    return segments.join("\n");
  }

  // ---------------------------------------------------------------------------
  // INBOUND PARSER: ANSI X12 810 (Commercial Invoice)
  // ---------------------------------------------------------------------------

  public static parseX12_810(rawEdi: string): { data: Edi810ParsedData; validation: EdiValidationResult } {
    const rawSegments = this.splitX12Segments(rawEdi);
    const errors: string[] = [];

    if (rawSegments.length === 0) {
      return {
        data: {} as any,
        validation: { isValid: false, segmentCount: 0, errors: ["Empty EDI content"] },
      };
    }

    let isa: string[] = [];
    let gs: string[] = [];
    let st: string[] = [];
    let big: string[] = [];
    let se: string[] = [];
    let ge: string[] = [];
    let iea: string[] = [];
    let ctt: string[] = [];
    let tdsRaw = "";

    let remitTo: any = { name: "Unknown Vendor" };
    let billTo: any = { name: "Unknown Buyer" };
    let currentRole = "";
    let paymentTerms: any = undefined;

    const lineItems: any[] = [];
    let currentItem: any = null;

    let stIndex = -1;
    let seIndex = -1;

    for (let i = 0; i < rawSegments.length; i++) {
      const segText = rawSegments[i];
      const elements = this.splitX12Elements(segText);
      const tag = elements[0].toUpperCase();

      switch (tag) {
        case "ISA":
          isa = elements;
          break;
        case "GS":
          gs = elements;
          break;
        case "ST":
          st = elements;
          stIndex = i;
          break;
        case "BIG":
          big = elements;
          break;
        case "ITD":
          paymentTerms = {
            termsCode: elements[1] || "",
            discountPercent: elements[3] ? parseFloat(elements[3]) : undefined,
            discountDays: elements[5] ? parseInt(elements[5], 10) : undefined,
            netDays: elements[7] ? parseInt(elements[7], 10) : undefined,
          };
          break;
        case "N1": {
          const role = elements[1];
          currentRole = role;
          const entity = { name: elements[2] || "", code: elements[4] || "" };
          if (role === "RE") remitTo = { ...remitTo, ...entity };
          if (role === "BT") billTo = { ...billTo, ...entity };
          break;
        }
        case "N3": {
          const addr = elements[1] || "";
          if (currentRole === "RE") remitTo.address = addr;
          if (currentRole === "BT") billTo.address = addr;
          break;
        }
        case "N4": {
          const city = elements[1] || "";
          const state = elements[2] || "";
          const postalCode = elements[3] || "";
          const country = elements[4] || "US";
          if (currentRole === "RE") Object.assign(remitTo, { city, state, postalCode, country });
          if (currentRole === "BT") Object.assign(billTo, { city, state, postalCode, country });
          break;
        }
        case "IT1": {
          if (currentItem) lineItems.push(currentItem);
          const lineNum = parseInt(elements[1], 10) || lineItems.length + 1;
          const qty = parseFloat(elements[2]) || 0;
          const uom = elements[3] || "EA";
          const unitPrice = parseFloat(elements[4]) || 0;

          let productCode = "";
          let barcode = "";
          for (let p = 5; p < elements.length; p += 2) {
            const qual = elements[p];
            const val = elements[p + 1];
            if (!val) continue;
            if (["VN", "BP", "SK", "IN"].includes(qual) && !productCode) productCode = val;
            if (["UP", "EN"].includes(qual) && !barcode) barcode = val;
          }
          currentItem = {
            lineNumber: lineNum,
            quantity: qty,
            unitOfMeasure: uom,
            unitPrice,
            productCode: productCode || `SKU-${lineNum}`,
            barcode,
            subtotal: parseFloat((qty * unitPrice).toFixed(2)),
          };
          break;
        }
        case "PID":
          if (currentItem) {
            currentItem.description = elements[5] || elements[4] || "";
          }
          break;
        case "TDS":
          tdsRaw = elements[1] || "0";
          break;
        case "CTT":
          ctt = elements;
          break;
        case "SE":
          se = elements;
          seIndex = i;
          if (currentItem) {
            lineItems.push(currentItem);
            currentItem = null;
          }
          break;
        case "GE":
          ge = elements;
          break;
        case "IEA":
          iea = elements;
          break;
      }
    }

    if (currentItem) lineItems.push(currentItem);

    // Envelope Validations
    if (!isa.length) errors.push("Missing ISA interchange header segment");
    if (!iea.length) errors.push("Missing IEA interchange trailer segment");
    if (isa.length && iea.length && isa[13] !== iea[2]) {
      errors.push(`ISA control number mismatch: ISA13 (${isa[13]}) != IEA02 (${iea[2]})`);
    }

    if (!gs.length) errors.push("Missing GS functional group header segment");
    if (!ge.length) errors.push("Missing GE functional group trailer segment");
    if (gs.length && ge.length && gs[6] !== ge[2]) {
      errors.push(`GS control number mismatch: GS06 (${gs[6]}) != GE02 (${ge[2]})`);
    }

    if (!st.length) errors.push("Missing ST transaction set header segment");
    if (!se.length) errors.push("Missing SE transaction set trailer segment");
    if (st.length && se.length && st[2] !== se[2]) {
      errors.push(`ST control number mismatch: ST02 (${st[2]}) != SE02 (${se[2]})`);
    }

    if (stIndex !== -1 && seIndex !== -1 && se.length) {
      const declared = parseInt(se[1], 10);
      const actual = seIndex - stIndex + 1;
      if (declared !== actual) {
        errors.push(`Segment count mismatch in SE01: declared ${declared}, actual ${actual}`);
      }
    }

    // TDS Total Parsing: Supports both integer cents (e.g. 122550 -> 1225.50) and decimal string
    let parsedTds = 0;
    if (tdsRaw) {
      if (tdsRaw.includes(".")) {
        parsedTds = parseFloat(tdsRaw);
      } else {
        parsedTds = parseInt(tdsRaw, 10) / 100;
      }
    }

    const calculatedTotalFromItems = parseFloat(
      lineItems.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2)
    );
    const totalsMatch = Math.abs(parsedTds - calculatedTotalFromItems) < 0.05;

    if (!totalsMatch && tdsRaw) {
      errors.push(
        `Invoice total mismatch: TDS declared total is $${parsedTds.toFixed(
          2
        )}, but sum of line items is $${calculatedTotalFromItems.toFixed(2)}`
      );
    }

    const totalQty = lineItems.reduce((acc, it) => acc + it.quantity, 0);
    if (ctt.length) {
      const declaredLines = parseInt(ctt[1], 10);
      if (declaredLines !== lineItems.length) {
        errors.push(`Line item count mismatch in CTT01: declared ${declaredLines}, actual ${lineItems.length}`);
      }
    }

    const invoiceNumber = big[2] || "UNKNOWN-INV";
    const invoiceDate = big[1] || "";
    const poNumber = big[4] || "UNKNOWN-PO";
    const poDate = big[3] || "";

    const data: Edi810ParsedData = {
      interchangeHeader: {
        senderId: (isa[6] || "").trim(),
        receiverId: (isa[8] || "").trim(),
        controlNumber: isa[13] || "",
        date: isa[9] || "",
        time: isa[10] || "",
      },
      groupHeader: {
        sender: gs[2] || "",
        receiver: gs[3] || "",
        controlNumber: gs[6] || "",
        date: gs[4] || "",
        time: gs[5] || "",
      },
      invoiceNumber,
      invoiceDate,
      poNumber,
      poDate,
      remitTo,
      billTo,
      paymentTerms,
      lineItems,
      totals: {
        totalAmount: parsedTds || calculatedTotalFromItems,
        calculatedFromItems: calculatedTotalFromItems,
        totalsMatch,
        totalLines: lineItems.length,
        totalQuantity: totalQty,
      },
      controlNumbers: {
        isaControlNumber: isa[13] || "",
        gsControlNumber: gs[6] || "",
        stControlNumber: st[2] || "",
      },
      meshPaymentPayload: {
        PaymentAmount: parsedTds || calculatedTotalFromItems,
        PaymentStatus: "INITIATED",
        PaymentDescription: `EDI 810 Invoice ${invoiceNumber} for Purchase Order ${poNumber}`,
        OrderID: poNumber,
        invoiceNumber,
        invoiceDate: invoiceDate
          ? `${invoiceDate.slice(0, 4)}-${invoiceDate.slice(4, 6)}-${invoiceDate.slice(6, 8)}T00:00:00.000Z`
          : new Date().toISOString(),
        vendor: remitTo,
        customer: billTo,
        items: lineItems,
        totalsMatch,
      },
    };

    return {
      data,
      validation: {
        isValid: errors.length === 0,
        segmentCount: rawSegments.length,
        errors,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // EDIFACT OUTBOUND: ORDERS (Purchase Order)
  // ---------------------------------------------------------------------------

  public static generateEdifactOrders(order: EdiOrderInput, options: EdiEnvelopeOptions = {}): string {
    const now = new Date();
    const sender = options.senderId || order.company?.companyCode || "MESHBUYER";
    const receiver = options.receiverId || order.Provider?.ProviderID || order.ProviderID || "MESHSUPPLIER";
    const controlNum = options.controlNumber ? String(options.controlNumber) : "000000001";
    const edifactDate = this.formatDateYYMMDD(now);
    const edifactTime = this.formatTimeHHMM(now);
    const fullDate = this.formatDateCCYYMMDD(order.OrderDate || now);

    const segments: string[] = [];

    // Interchange Header (UNB)
    segments.push(`UNB+UNOC:3+${sender}:ZZ+${receiver}:ZZ+${edifactDate}:${edifactTime}+${controlNum}'`);

    const msgSegments: string[] = [];

    // Message Header (UNH)
    msgSegments.push(`UNH+0001+ORDERS:D:96A:UN:EAN008'`);

    // Beginning of Message (BGM)
    msgSegments.push(`BGM+220+${order.OrderID}+9'`);

    // Document Date (DTM)
    msgSegments.push(`DTM+137:${fullDate}:102'`);

    // Buyer Party (NAD+BY)
    const buyerName = order.company?.companyName || "Mesh Supply Chain Corp";
    const buyerCode = order.company?.companyCode || order.companyId || "BUYER-01";
    msgSegments.push(`NAD+BY+${buyerCode}::92++${buyerName}+100 MARKET ST+SAN FRANCISCO++94105+US'`);

    // Supplier Party (NAD+SU)
    const suppName = order.Provider?.ProviderName || "Global Industrial Supply";
    const suppCode = order.Provider?.ProviderID || order.ProviderID || "SUPP-01";
    const suppAddr = this.parseAddressString(order.Provider?.ProviderAddress);
    msgSegments.push(
      `NAD+SU+${suppCode}::92++${suppName}+${suppAddr.street}+${suppAddr.city}++${suppAddr.postalCode}+${suppAddr.country}'`
    );

    // Line Items
    const details = order.Orderdetail && order.Orderdetail.length > 0 ? order.Orderdetail : [];
    let lineIdx = 0;

    if (details.length === 0) {
      lineIdx = 1;
      msgSegments.push(`LIN+${lineIdx}++SKU-GENERIC:IN'`);
      msgSegments.push(`IMD+F++:::Catalog Stock Item'`);
      msgSegments.push(`QTY+21:1:EA'`);
      msgSegments.push(`PRI+AAA:50.00:CT:NTP'`);
    } else {
      for (const item of details) {
        lineIdx++;
        const sku = item.Products?.ProductCode || `SKU-${lineIdx}`;
        const qty = item.OrderQuantity || 1;
        const price = item.Products?.CostPrice ?? item.Products?.SellPrice ?? 15.0;
        const desc = item.Products?.ProductName || item.Products?.ProductDescription || `Item ${sku}`;

        msgSegments.push(`LIN+${lineIdx}++${sku}:IN'`);
        msgSegments.push(`IMD+F++:::${desc.replace(/['+:]/g, " ")}'`);
        msgSegments.push(`QTY+21:${qty}:EA'`);
        msgSegments.push(`PRI+AAA:${Number(price).toFixed(2)}:CT:NTP'`);
      }
    }

    // Section Control (UNS)
    msgSegments.push(`UNS+S'`);

    // Control Total (CNT) - Line items count
    msgSegments.push(`CNT+2:${lineIdx}'`);

    // Message Trailer (UNT) - Segments count from UNH through UNT inclusive
    const untCount = msgSegments.length + 1;
    msgSegments.push(`UNT+${untCount}+0001'`);

    segments.push(...msgSegments);

    // Interchange Trailer (UNZ)
    segments.push(`UNZ+1+${controlNum}'`);

    return segments.join("\n");
  }

  // ---------------------------------------------------------------------------
  // EDIFACT INBOUND: ORDERS (Purchase Order)
  // ---------------------------------------------------------------------------

  public static parseEdifactOrders(rawEdi: string): { data: Edi850ParsedData; validation: EdiValidationResult } {
    const rawSegments = this.splitEdifactSegments(rawEdi);
    const errors: string[] = [];

    if (rawSegments.length === 0) {
      return {
        data: {} as any,
        validation: { isValid: false, segmentCount: 0, errors: ["Empty EDIFACT content"] },
      };
    }

    let unb: string[] = [];
    let unh: string[] = [];
    let unt: string[] = [];
    let unz: string[] = [];
    let bgm: string[] = [];

    let poDate = "";
    let buyer: any = { name: "Unknown Buyer" };
    let seller: any = { name: "Unknown Supplier" };
    const lineItems: any[] = [];
    let currentLine: any = null;

    let unhIndex = -1;
    let untIndex = -1;

    for (let i = 0; i < rawSegments.length; i++) {
      const segText = rawSegments[i];
      const elements = this.splitEdifactElements(segText);
      const tag = elements[0].toUpperCase();

      switch (tag) {
        case "UNB":
          unb = elements;
          break;
        case "UNH":
          unh = elements;
          unhIndex = i;
          break;
        case "BGM":
          bgm = elements;
          break;
        case "DTM": {
          const comps = this.splitEdifactComponents(elements[1] || "");
          if (comps[0] === "137" && comps[1]) poDate = comps[1];
          break;
        }
        case "NAD": {
          const role = elements[1];
          const idComps = this.splitEdifactComponents(elements[2] || "");
          const entity = {
            code: idComps[0] || "",
            name: elements[4] || "",
            address: elements[5] || "",
            city: elements[6] || "",
            postalCode: elements[8] || "",
            country: elements[9] || "US",
          };
          if (role === "BY") buyer = entity;
          if (role === "SU") seller = entity;
          break;
        }
        case "LIN": {
          if (currentLine) lineItems.push(currentLine);
          const lineNum = parseInt(elements[1], 10) || lineItems.length + 1;
          const itemComps = this.splitEdifactComponents(elements[3] || "");
          currentLine = {
            lineNumber: lineNum,
            quantity: 1,
            unitOfMeasure: "EA",
            unitPrice: 0,
            productCode: itemComps[0] || `ITEM-${lineNum}`,
            subtotal: 0,
          };
          break;
        }
        case "IMD":
          if (currentLine) {
            const descComps = this.splitEdifactComponents(elements[3] || "");
            currentLine.description = descComps[3] || descComps[0] || "";
          }
          break;
        case "QTY":
          if (currentLine) {
            const qtyComps = this.splitEdifactComponents(elements[1] || "");
            currentLine.quantity = parseFloat(qtyComps[1]) || 1;
            currentLine.unitOfMeasure = qtyComps[2] || "EA";
          }
          break;
        case "PRI":
          if (currentLine) {
            const priComps = this.splitEdifactComponents(elements[1] || "");
            currentLine.unitPrice = parseFloat(priComps[1]) || 0;
            currentLine.subtotal = parseFloat((currentLine.quantity * currentLine.unitPrice).toFixed(2));
          }
          break;
        case "UNT":
          unt = elements;
          untIndex = i;
          if (currentLine) {
            lineItems.push(currentLine);
            currentLine = null;
          }
          break;
        case "UNZ":
          unz = elements;
          break;
      }
    }

    if (currentLine) lineItems.push(currentLine);

    // Validation
    if (!unb.length) errors.push("Missing UNB interchange header segment");
    if (!unz.length) errors.push("Missing UNZ interchange trailer segment");
    if (unb.length && unz.length && unb[5] !== unz[2]) {
      errors.push(`UNB/UNZ control reference mismatch: UNB05 (${unb[5]}) != UNZ02 (${unz[2]})`);
    }

    if (!unh.length) errors.push("Missing UNH message header segment");
    if (!unt.length) errors.push("Missing UNT message trailer segment");
    if (unh.length && unt.length && unh[1] !== unt[2]) {
      errors.push(`UNH/UNT message reference mismatch: UNH01 (${unh[1]}) != UNT02 (${unt[2]})`);
    }

    if (unhIndex !== -1 && untIndex !== -1 && unt.length) {
      const declared = parseInt(unt[1], 10);
      const actual = untIndex - unhIndex + 1;
      if (declared !== actual) {
        errors.push(`Segment count mismatch in UNT01: declared ${declared}, actual ${actual}`);
      }
    }

    const totalQty = lineItems.reduce((acc, it) => acc + it.quantity, 0);
    const totalAmount = lineItems.reduce((acc, it) => acc + it.subtotal, 0);
    const poNumber = bgm[2] || "UNKNOWN-PO";

    const senderComps = this.splitEdifactComponents(unb[2] || "");
    const receiverComps = this.splitEdifactComponents(unb[3] || "");

    const data: Edi850ParsedData = {
      interchangeHeader: {
        senderId: senderComps[0] || "",
        receiverId: receiverComps[0] || "",
        controlNumber: unb[5] || "",
        date: unb[4]?.split(":")[0] || "",
        time: unb[4]?.split(":")[1] || "",
      },
      groupHeader: {
        sender: senderComps[0] || "",
        receiver: receiverComps[0] || "",
        controlNumber: unb[5] || "",
        date: unb[4]?.split(":")[0] || "",
        time: unb[4]?.split(":")[1] || "",
      },
      poNumber,
      poDate,
      poType: "SA",
      purposeCode: bgm[3] || "9",
      buyer,
      seller,
      lineItems,
      totals: {
        totalLines: lineItems.length,
        totalQuantity: totalQty,
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
      controlNumbers: {
        isaControlNumber: unb[5] || "",
        gsControlNumber: unb[5] || "",
        stControlNumber: unh[1] || "",
      },
      meshOrderPayload: {
        OrderDate: poDate
          ? `${poDate.slice(0, 4)}-${poDate.slice(4, 6)}-${poDate.slice(6, 8)}T00:00:00.000Z`
          : new Date().toISOString(),
        ProviderID: seller.code || seller.name || "PROVIDER",
        providerName: seller.name || "Provider",
        buyerName: buyer.name || "Buyer",
        poNumber,
        items: lineItems.map((item) => ({
          ProductCode: item.productCode,
          ProductName: item.description || item.productCode,
          OrderQuantity: item.quantity,
          UnitPrice: item.unitPrice,
          Subtotal: item.subtotal,
        })),
        totalAmount: parseFloat(totalAmount.toFixed(2)),
      },
    };

    return {
      data,
      validation: {
        isValid: errors.length === 0,
        segmentCount: rawSegments.length,
        errors,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // EDIFACT OUTBOUND: DESADV (Despatch Advice / 856 ASN)
  // ---------------------------------------------------------------------------

  public static generateEdifactDesadv(delivery: EdiDeliveryInput, options: EdiEnvelopeOptions = {}): string {
    const now = new Date();
    const sender = options.senderId || delivery.company?.companyCode || "MESHWHSE";
    const receiver = options.receiverId || delivery.Customer?.CustomerID || delivery.CustomerID || "MESHCUST";
    const controlNum = options.controlNumber ? String(options.controlNumber) : "000000002";
    const edifactDate = this.formatDateYYMMDD(now);
    const edifactTime = this.formatTimeHHMM(now);
    const shipDate = this.formatDateCCYYMMDD(delivery.SalesDate || now);

    const segments: string[] = [];
    segments.push(`UNB+UNOC:3+${sender}:ZZ+${receiver}:ZZ+${edifactDate}:${edifactTime}+${controlNum}'`);

    const msgSegments: string[] = [];
    msgSegments.push(`UNH+0001+DESADV:D:96A:UN:EAN008'`);
    msgSegments.push(`BGM+351+${delivery.DeliveryID}+9'`);
    msgSegments.push(`DTM+137:${shipDate}:102'`);
    msgSegments.push(`DTM+11:${shipDate}:102'`); // Despatch date

    // Order Reference
    msgSegments.push(`RFF+ON:PO-${delivery.DeliveryID.slice(-6)}'`);

    // Consignee (NAD+CZ)
    const custName = delivery.Customer?.CustomerName || "Client Receiving Facility";
    const custCode = delivery.Customer?.CustomerID || delivery.CustomerID || "CUST-01";
    const custAddr = this.parseAddressString(delivery.Customer?.CustomerAddress);
    msgSegments.push(
      `NAD+CZ+${custCode}::92++${custName}+${custAddr.street}+${custAddr.city}++${custAddr.postalCode}+${custAddr.country}'`
    );

    // Shipper (NAD+FW)
    const whName = delivery.Warehouse?.WarehouseName || delivery.company?.companyName || "Central Warehouse";
    const whCode = delivery.Warehouse?.WarehouseID || delivery.WarehouseID || "WH-01";
    const whAddr = this.parseAddressString(delivery.Warehouse?.Location?.LocationAddress);
    msgSegments.push(
      `NAD+FW+${whCode}::92++${whName}+${whAddr.street}+${whAddr.city}++${whAddr.postalCode}+${whAddr.country}'`
    );

    // Consignment Packing Sequence (CPS)
    msgSegments.push(`CPS+1'`);

    const details = delivery.DeliveryDetail && delivery.DeliveryDetail.length > 0 ? delivery.DeliveryDetail : [];
    let lineIdx = 0;

    if (details.length === 0) {
      lineIdx = 1;
      msgSegments.push(`LIN+${lineIdx}++DISPATCH-STOCK-01:IN'`);
      msgSegments.push(`IMD+F++:::General Supply Delivery Item'`);
      msgSegments.push(`QTY+12:10:EA'`);
    } else {
      for (const item of details) {
        lineIdx++;
        const sku = item.Product?.ProductCode || `SKU-${lineIdx}`;
        const qty = item.DeliveryQuantity || 1;
        const desc = item.Product?.ProductName || item.Product?.ProductDescription || `Dispatched SKU ${sku}`;

        msgSegments.push(`LIN+${lineIdx}++${sku}:IN'`);
        msgSegments.push(`IMD+F++:::${desc.replace(/['+:]/g, " ")}'`);
        msgSegments.push(`QTY+12:${qty}:EA'`);
      }
    }

    msgSegments.push(`CNT+2:${lineIdx}'`);

    const untCount = msgSegments.length + 1;
    msgSegments.push(`UNT+${untCount}+0001'`);

    segments.push(...msgSegments);
    segments.push(`UNZ+1+${controlNum}'`);

    return segments.join("\n");
  }

  // ---------------------------------------------------------------------------
  // EDIFACT OUTBOUND: INVOIC (Commercial Invoice / 810)
  // ---------------------------------------------------------------------------

  public static generateEdifactInvoic(invoice: EdiInvoiceInput, options: EdiEnvelopeOptions = {}): string {
    const now = new Date();
    const sender = options.senderId || invoice.company?.companyCode || "MESHSUPPLIER";
    const receiver =
      options.receiverId || invoice.Delivery?.Customer?.CustomerID || invoice.Order?.company?.companyCode || "MESHBUYER";
    const controlNum = options.controlNumber ? String(options.controlNumber) : "000000003";
    const edifactDate = this.formatDateYYMMDD(now);
    const edifactTime = this.formatTimeHHMM(now);
    const invDate = this.formatDateCCYYMMDD(invoice.invoiceDate || now);

    const invoiceNum = invoice.invoiceNumber || invoice.PaymentID || `INV-${controlNum.slice(-6)}`;
    const poNum = invoice.OrderID || invoice.Order?.OrderID || "PO-REF-100";

    const segments: string[] = [];
    segments.push(`UNB+UNOC:3+${sender}:ZZ+${receiver}:ZZ+${edifactDate}:${edifactTime}+${controlNum}'`);

    const msgSegments: string[] = [];
    msgSegments.push(`UNH+0001+INVOIC:D:96A:UN:EAN008'`);
    msgSegments.push(`BGM+380+${invoiceNum}+9'`); // 380 = Commercial Invoice
    msgSegments.push(`DTM+137:${invDate}:102'`);
    msgSegments.push(`RFF+ON:${poNum}'`);

    // Supplier Party (NAD+SU)
    const suppName =
      invoice.Order?.Provider?.ProviderName || invoice.company?.companyName || "Global Industrial Products Ltd";
    const suppCode =
      invoice.Order?.Provider?.ProviderID || invoice.Order?.ProviderID || invoice.company?.companyCode || "SUPP-01";
    const suppAddr = this.parseAddressString(invoice.Order?.Provider?.ProviderAddress);
    msgSegments.push(
      `NAD+SU+${suppCode}::92++${suppName}+${suppAddr.street}+${suppAddr.city}++${suppAddr.postalCode}+${suppAddr.country}'`
    );

    // Invoicee Party (NAD+IV)
    const buyerName =
      invoice.Delivery?.Customer?.CustomerName || invoice.Order?.company?.companyName || "Acme Logistics Enterprise";
    const buyerCode =
      invoice.Delivery?.Customer?.CustomerID || invoice.Order?.company?.companyCode || "BUYER-01";
    const buyerAddr = this.parseAddressString(invoice.Delivery?.Customer?.CustomerAddress);
    msgSegments.push(
      `NAD+IV+${buyerCode}::92++${buyerName}+${buyerAddr.street}+${buyerAddr.city}++${buyerAddr.postalCode}+${buyerAddr.country}'`
    );

    let itemsToProcess = invoice.items || [];
    if (itemsToProcess.length === 0 && invoice.Order?.Orderdetail && invoice.Order.Orderdetail.length > 0) {
      itemsToProcess = invoice.Order.Orderdetail.map((od, idx) => ({
        lineNumber: idx + 1,
        quantity: od.OrderQuantity || 1,
        unitPrice: od.Products?.CostPrice ?? od.Products?.SellPrice ?? 25.0,
        productCode: od.Products?.ProductCode || `SKU-${idx + 1}`,
        productName: od.Products?.ProductName || "Standard Catalog Part",
      }));
    } else if (itemsToProcess.length === 0 && invoice.Delivery?.DeliveryDetail && invoice.Delivery.DeliveryDetail.length > 0) {
      itemsToProcess = invoice.Delivery.DeliveryDetail.map((dd, idx) => ({
        lineNumber: idx + 1,
        quantity: dd.DeliveryQuantity || 1,
        unitPrice: dd.Product?.SellPrice ?? dd.Product?.CostPrice ?? 25.0,
        productCode: dd.Product?.ProductCode || `SKU-${idx + 1}`,
        productName: dd.Product?.ProductName || "Delivered Good",
      }));
    }

    if (itemsToProcess.length === 0) {
      const amount = invoice.PaymentAmount || 250.0;
      itemsToProcess = [
        {
          lineNumber: 1,
          quantity: 1,
          unitPrice: amount,
          productCode: "SERVICE-LOGISTICS",
          productName: invoice.PaymentDescription || "Freight Fulfillment Settlement",
        },
      ];
    }

    let calculatedTotal = 0;
    let lineIdx = 0;

    for (const item of itemsToProcess) {
      lineIdx++;
      const qty = item.quantity || 1;
      const price = item.unitPrice || 0;
      const subtotal = parseFloat((qty * price).toFixed(2));
      calculatedTotal += subtotal;
      const sku = item.productCode || `SKU-${lineIdx}`;
      const desc = item.productName || item.description || `Item ${sku}`;

      msgSegments.push(`LIN+${lineIdx}++${sku}:IN'`);
      msgSegments.push(`IMD+F++:::${desc.replace(/['+:]/g, " ")}'`);
      msgSegments.push(`QTY+47:${qty}:EA'`); // 47 = Invoiced quantity
      msgSegments.push(`MOA+203:${subtotal.toFixed(2)}'`); // 203 = Line item total
      msgSegments.push(`PRI+AAA:${Number(price).toFixed(2)}:CT:NTP'`);
    }

    msgSegments.push(`UNS+S'`);
    msgSegments.push(`CNT+2:${lineIdx}'`);
    msgSegments.push(`MOA+77:${calculatedTotal.toFixed(2)}'`); // 77 = Total invoice amount

    const untCount = msgSegments.length + 1;
    msgSegments.push(`UNT+${untCount}+0001'`);

    segments.push(...msgSegments);
    segments.push(`UNZ+1+${controlNum}'`);

    return segments.join("\n");
  }

  // ---------------------------------------------------------------------------
  // EDIFACT INBOUND: INVOIC (Commercial Invoice / 810)
  // ---------------------------------------------------------------------------

  public static parseEdifactInvoic(rawEdi: string): { data: Edi810ParsedData; validation: EdiValidationResult } {
    const rawSegments = this.splitEdifactSegments(rawEdi);
    const errors: string[] = [];

    if (rawSegments.length === 0) {
      return {
        data: {} as any,
        validation: { isValid: false, segmentCount: 0, errors: ["Empty EDIFACT content"] },
      };
    }

    let unb: string[] = [];
    let unh: string[] = [];
    let unt: string[] = [];
    let unz: string[] = [];
    let bgm: string[] = [];
    let rff: string[] = [];

    let invDate = "";
    let remitTo: any = { name: "Unknown Vendor" };
    let billTo: any = { name: "Unknown Buyer" };
    const lineItems: any[] = [];
    let currentLine: any = null;
    let declaredInvoiceTotal = 0;

    let unhIndex = -1;
    let untIndex = -1;

    for (let i = 0; i < rawSegments.length; i++) {
      const segText = rawSegments[i];
      const elements = this.splitEdifactElements(segText);
      const tag = elements[0].toUpperCase();

      switch (tag) {
        case "UNB":
          unb = elements;
          break;
        case "UNH":
          unh = elements;
          unhIndex = i;
          break;
        case "BGM":
          bgm = elements;
          break;
        case "DTM": {
          const comps = this.splitEdifactComponents(elements[1] || "");
          if (comps[0] === "137" && comps[1]) invDate = comps[1];
          break;
        }
        case "RFF": {
          const comps = this.splitEdifactComponents(elements[1] || "");
          if (comps[0] === "ON") rff = comps;
          break;
        }
        case "NAD": {
          const role = elements[1];
          const idComps = this.splitEdifactComponents(elements[2] || "");
          const entity = {
            code: idComps[0] || "",
            name: elements[4] || "",
            address: elements[5] || "",
            city: elements[6] || "",
            postalCode: elements[8] || "",
            country: elements[9] || "US",
          };
          if (role === "SU") remitTo = entity;
          if (role === "IV" || role === "BY") billTo = entity;
          break;
        }
        case "LIN": {
          if (currentLine) lineItems.push(currentLine);
          const lineNum = parseInt(elements[1], 10) || lineItems.length + 1;
          const itemComps = this.splitEdifactComponents(elements[3] || "");
          currentLine = {
            lineNumber: lineNum,
            quantity: 1,
            unitOfMeasure: "EA",
            unitPrice: 0,
            productCode: itemComps[0] || `ITEM-${lineNum}`,
            subtotal: 0,
          };
          break;
        }
        case "IMD":
          if (currentLine) {
            const descComps = this.splitEdifactComponents(elements[3] || "");
            currentLine.description = descComps[3] || descComps[0] || "";
          }
          break;
        case "QTY":
          if (currentLine) {
            const qtyComps = this.splitEdifactComponents(elements[1] || "");
            currentLine.quantity = parseFloat(qtyComps[1]) || 1;
            currentLine.unitOfMeasure = qtyComps[2] || "EA";
          }
          break;
        case "PRI":
          if (currentLine) {
            const priComps = this.splitEdifactComponents(elements[1] || "");
            currentLine.unitPrice = parseFloat(priComps[1]) || 0;
            currentLine.subtotal = parseFloat((currentLine.quantity * currentLine.unitPrice).toFixed(2));
          }
          break;
        case "MOA": {
          const moaComps = this.splitEdifactComponents(elements[1] || "");
          if (moaComps[0] === "77") {
            declaredInvoiceTotal = parseFloat(moaComps[1]) || 0;
          } else if (moaComps[0] === "203" && currentLine) {
            currentLine.subtotal = parseFloat(moaComps[1]) || currentLine.subtotal;
          }
          break;
        }
        case "UNT":
          unt = elements;
          untIndex = i;
          if (currentLine) {
            lineItems.push(currentLine);
            currentLine = null;
          }
          break;
        case "UNZ":
          unz = elements;
          break;
      }
    }

    if (currentLine) lineItems.push(currentLine);

    // Validation
    if (!unb.length) errors.push("Missing UNB interchange header segment");
    if (!unz.length) errors.push("Missing UNZ interchange trailer segment");
    if (unb.length && unz.length && unb[5] !== unz[2]) {
      errors.push(`UNB/UNZ control reference mismatch: UNB05 (${unb[5]}) != UNZ02 (${unz[2]})`);
    }

    if (!unh.length) errors.push("Missing UNH message header segment");
    if (!unt.length) errors.push("Missing UNT message trailer segment");
    if (unh.length && unt.length && unh[1] !== unt[2]) {
      errors.push(`UNH/UNT message reference mismatch: UNH01 (${unh[1]}) != UNT02 (${unt[2]})`);
    }

    if (unhIndex !== -1 && untIndex !== -1 && unt.length) {
      const declared = parseInt(unt[1], 10);
      const actual = untIndex - unhIndex + 1;
      if (declared !== actual) {
        errors.push(`Segment count mismatch in UNT01: declared ${declared}, actual ${actual}`);
      }
    }

    const calculatedTotal = parseFloat(
      lineItems.reduce((acc, it) => acc + (it.subtotal || it.quantity * it.unitPrice), 0).toFixed(2)
    );
    const totalsMatch = Math.abs(declaredInvoiceTotal - calculatedTotal) < 0.05;

    if (!totalsMatch && declaredInvoiceTotal > 0) {
      errors.push(
        `EDIFACT INVOIC total mismatch: MOA+77 declared total is $${declaredInvoiceTotal.toFixed(
          2
        )}, but calculated items sum is $${calculatedTotal.toFixed(2)}`
      );
    }

    const totalQty = lineItems.reduce((acc, it) => acc + it.quantity, 0);
    const invoiceNumber = bgm[2] || "UNKNOWN-INV";
    const poNumber = rff[1] || "UNKNOWN-PO";

    const senderComps = this.splitEdifactComponents(unb[2] || "");
    const receiverComps = this.splitEdifactComponents(unb[3] || "");

    const data: Edi810ParsedData = {
      interchangeHeader: {
        senderId: senderComps[0] || "",
        receiverId: receiverComps[0] || "",
        controlNumber: unb[5] || "",
        date: unb[4]?.split(":")[0] || "",
        time: unb[4]?.split(":")[1] || "",
      },
      groupHeader: {
        sender: senderComps[0] || "",
        receiver: receiverComps[0] || "",
        controlNumber: unb[5] || "",
        date: unb[4]?.split(":")[0] || "",
        time: unb[4]?.split(":")[1] || "",
      },
      invoiceNumber,
      invoiceDate: invDate,
      poNumber,
      remitTo,
      billTo,
      lineItems,
      totals: {
        totalAmount: declaredInvoiceTotal || calculatedTotal,
        calculatedFromItems: calculatedTotal,
        totalsMatch,
        totalLines: lineItems.length,
        totalQuantity: totalQty,
      },
      controlNumbers: {
        isaControlNumber: unb[5] || "",
        gsControlNumber: unb[5] || "",
        stControlNumber: unh[1] || "",
      },
      meshPaymentPayload: {
        PaymentAmount: declaredInvoiceTotal || calculatedTotal,
        PaymentStatus: "INITIATED",
        PaymentDescription: `EDIFACT INVOIC ${invoiceNumber} for Purchase Order ${poNumber}`,
        OrderID: poNumber,
        invoiceNumber,
        invoiceDate: invDate
          ? `${invDate.slice(0, 4)}-${invDate.slice(4, 6)}-${invDate.slice(6, 8)}T00:00:00.000Z`
          : new Date().toISOString(),
        vendor: remitTo,
        customer: billTo,
        items: lineItems,
        totalsMatch,
      },
    };

    return {
      data,
      validation: {
        isValid: errors.length === 0,
        segmentCount: rawSegments.length,
        errors,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // UNIVERSAL PARSER & ROUTER
  // ---------------------------------------------------------------------------

  public static parse(rawEdi: string, typeHint: string = "auto"): EdiParseResponse {
    if (!rawEdi || typeof rawEdi !== "string" || !rawEdi.trim()) {
      throw new Error("rawEdi content must be a non-empty string");
    }

    const trimmed = rawEdi.trim();

    // 1. Determine Standard: ANSI X12 vs EDIFACT
    let standard: EdiStandard = "ANSI_X12";
    if (trimmed.startsWith("UNB") || trimmed.startsWith("UNA") || trimmed.includes("UNB+")) {
      standard = "EDIFACT";
    }

    // 2. Determine Document Type (850, 856, 810)
    let docType: EdiDocumentType = "850";
    const normalizedHint = typeHint?.toLowerCase();

    if (normalizedHint === "850" || normalizedHint === "orders" || normalizedHint === "po") {
      docType = "850";
    } else if (normalizedHint === "856" || normalizedHint === "desadv" || normalizedHint === "asn") {
      docType = "856";
    } else if (normalizedHint === "810" || normalizedHint === "invoic" || normalizedHint === "invoice") {
      docType = "810";
    } else {
      // Auto-detection
      if (standard === "ANSI_X12") {
        if (trimmed.includes("ST*850*") || trimmed.includes("BEG*")) {
          docType = "850";
        } else if (trimmed.includes("ST*856*") || trimmed.includes("BSN*")) {
          docType = "856";
        } else if (trimmed.includes("ST*810*") || trimmed.includes("BIG*")) {
          docType = "810";
        }
      } else {
        if (trimmed.includes("ORDERS")) {
          docType = "850";
        } else if (trimmed.includes("DESADV")) {
          docType = "856";
        } else if (trimmed.includes("INVOIC")) {
          docType = "810";
        }
      }
    }

    // 3. Dispatch to parser
    if (standard === "ANSI_X12") {
      if (docType === "850") {
        const result = this.parseX12_850(trimmed);
        return {
          success: true,
          standard,
          documentType: docType,
          parsedData: result.data,
          validation: result.validation,
        };
      } else if (docType === "856") {
        const result = this.parseX12_856(trimmed);
        return {
          success: true,
          standard,
          documentType: docType,
          parsedData: result.data,
          validation: result.validation,
        };
      } else {
        const result = this.parseX12_810(trimmed);
        return {
          success: true,
          standard,
          documentType: docType,
          parsedData: result.data,
          validation: result.validation,
        };
      }
    } else {
      // EDIFACT
      if (docType === "850") {
        const result = this.parseEdifactOrders(trimmed);
        return {
          success: true,
          standard,
          documentType: docType,
          parsedData: result.data,
          validation: result.validation,
        };
      } else if (docType === "856") {
        // Fallback / standard parse for DESADV
        const rawSegments = this.splitEdifactSegments(trimmed);
        const orders = this.parseEdifactOrders(trimmed);
        return {
          success: true,
          standard,
          documentType: "856",
          parsedData: {
            ...orders.data,
            shipmentId: orders.data.poNumber,
          },
          validation: orders.validation,
        };
      } else {
        const result = this.parseEdifactInvoic(trimmed);
        return {
          success: true,
          standard,
          documentType: docType,
          parsedData: result.data,
          validation: result.validation,
        };
      }
    }
  }

  // ---------------------------------------------------------------------------
  // SAMPLE TEMPLATES & SCHEMA DEFINITIONS (Visual Sandbox Testing)
  // ---------------------------------------------------------------------------

  public static getTemplates(): Record<string, any> {
    const sampleOrder: EdiOrderInput = {
      OrderID: "ORD-SANDBOX-850",
      OrderDate: new Date("2026-10-28T09:00:00.000Z"),
      ProviderID: "PROV-GLOBEX",
      Provider: {
        ProviderID: "PROV-GLOBEX",
        ProviderName: "Globex Industrial Supply Co.",
        ProviderAddress: "450 Industrial Parkway, Chicago, IL 60601, US",
      },
      company: {
        companyId: "COMP-MESH",
        companyName: "Mesh Supply Chain Global",
        companyCode: "MESH-01",
      },
      Orderdetail: [
        {
          OrderDetailID: "OD-001",
          OrderQuantity: 100,
          ExpectedDate: new Date("2026-11-05T00:00:00.000Z"),
          Products: {
            ProductID: "PROD-101",
            ProductCode: "SKU-BEARING-HD",
            ProductName: "Heavy-Duty Ceramic Ball Bearing",
            ProductDescription: "High-temperature ceramic ball bearing 25mm",
            CostPrice: 12.5,
            BarCode: "012345678901",
          },
        },
        {
          OrderDetailID: "OD-002",
          OrderQuantity: 50,
          ExpectedDate: new Date("2026-11-05T00:00:00.000Z"),
          Products: {
            ProductID: "PROD-102",
            ProductCode: "SKU-SEAL-NITRILE",
            ProductName: "Nitrile Hydraulic Oil Seal",
            ProductDescription: "Oil seal rotary shaft dual lip 35mm",
            CostPrice: 4.75,
            BarCode: "012345678902",
          },
        },
      ],
    };

    const sampleDelivery: EdiDeliveryInput = {
      DeliveryID: "DELIV-SANDBOX-856",
      SalesDate: new Date("2026-10-28T14:30:00.000Z"),
      CustomerID: "CUST-ACME",
      Customer: {
        CustomerID: "CUST-ACME",
        CustomerName: "Acme Logistics Distribution Center",
        CustomerAddress: "800 Fulfillment Drive, Austin, TX 78701, US",
      },
      WarehouseID: "WH-CENTRAL",
      Warehouse: {
        WarehouseID: "WH-CENTRAL",
        WarehouseName: "Mesh Central Logistics Hub #4",
        Location: {
          LocationName: "Midwest Distribution Hub",
          LocationAddress: "1200 Logistics Pkwy, Dallas, TX 75201, US",
        },
      },
      company: {
        companyId: "COMP-MESH",
        companyName: "Mesh Supply Chain Global",
        companyCode: "MESH-01",
      },
      DeliveryDetail: [
        {
          DeliveryDetailID: "DD-001",
          DeliveryQuantity: 100,
          ExpectedDate: new Date("2026-11-02T18:00:00.000Z"),
          Product: {
            ProductID: "PROD-101",
            ProductCode: "SKU-BEARING-HD",
            ProductName: "Heavy-Duty Ceramic Ball Bearing",
            BarCode: "012345678901",
          },
        },
        {
          DeliveryDetailID: "DD-002",
          DeliveryQuantity: 50,
          ExpectedDate: new Date("2026-11-02T18:00:00.000Z"),
          Product: {
            ProductID: "PROD-102",
            ProductCode: "SKU-SEAL-NITRILE",
            ProductName: "Nitrile Hydraulic Oil Seal",
            BarCode: "012345678902",
          },
        },
      ],
    };

    const sampleInvoice: EdiInvoiceInput = {
      PaymentID: "INV-SANDBOX-810",
      invoiceNumber: "INV-2026-8801",
      invoiceDate: new Date("2026-10-28T16:00:00.000Z"),
      PaymentAmount: 1487.5,
      OrderID: "ORD-SANDBOX-850",
      Order: sampleOrder,
      company: {
        companyId: "COMP-MESH",
        companyName: "Mesh Supply Chain Global",
        companyCode: "MESH-01",
      },
      items: [
        {
          lineNumber: 1,
          quantity: 100,
          unitPrice: 12.5,
          productCode: "SKU-BEARING-HD",
          productName: "Heavy-Duty Ceramic Ball Bearing",
          barCode: "012345678901",
        },
        {
          lineNumber: 2,
          quantity: 50,
          unitPrice: 4.75,
          productCode: "SKU-SEAL-NITRILE",
          productName: "Nitrile Hydraulic Oil Seal",
          barCode: "012345678902",
        },
      ],
    };

    return {
      "850": {
        name: "Purchase Order (EDI 850 / ORDERS)",
        description: "Initiates purchase orders between buyers and trading partners/suppliers.",
        ansiX12: this.generateX12_850(sampleOrder, { controlNumber: 100000001 }),
        edifact: this.generateEdifactOrders(sampleOrder, { controlNumber: "100000001" }),
        schema: {
          standard: "ANSI X12 004010 / EDIFACT D96A",
          segments: [
            { segment: "ISA", description: "Interchange Control Header", required: true },
            { segment: "GS", description: "Functional Group Header (PO)", required: true },
            { segment: "ST", description: "Transaction Set Header (850)", required: true },
            { segment: "BEG", description: "Beginning Segment for Purchase Order", required: true },
            { segment: "REF", description: "Reference Identification", required: false },
            { segment: "N1", description: "Party Identification (BY=Buyer, SE=Seller)", required: true },
            { segment: "PO1", description: "Baseline Item Data (Qty, Unit Price, SKU)", required: true },
            { segment: "PID", description: "Product/Item Description", required: false },
            { segment: "CTT", description: "Transaction Totals (Line Count & Hash)", required: true },
            { segment: "SE", description: "Transaction Set Trailer", required: true },
            { segment: "GE", description: "Functional Group Trailer", required: true },
            { segment: "IEA", description: "Interchange Control Trailer", required: true },
          ],
        },
      },
      "856": {
        name: "Advance Ship Notice / ASN (EDI 856 / DESADV)",
        description: "Electronic manifest detailing shipped goods, carrier tracking, and hierarchical packaging.",
        ansiX12: this.generateX12_856(sampleDelivery, { controlNumber: 200000001 }),
        edifact: this.generateEdifactDesadv(sampleDelivery, { controlNumber: "200000002" }),
        schema: {
          standard: "ANSI X12 004010 / EDIFACT D96A",
          segments: [
            { segment: "ISA/GS/ST", description: "Interchange Enveloping (GS*SH)", required: true },
            { segment: "BSN", description: "Beginning Segment for Ship Notice", required: true },
            { segment: "DTM", description: "Date/Time Reference (011=Ship, 017=Delivery)", required: true },
            { segment: "HL*S", description: "Hierarchical Level: Shipment", required: true },
            { segment: "TD1/TD5", description: "Carrier routing & Packaging quantity", required: true },
            { segment: "REF", description: "Bill of Lading & Tracking Pro Number", required: true },
            { segment: "N1*SF / N1*ST", description: "Ship From (Warehouse) & Ship To (Customer)", required: true },
            { segment: "HL*O", description: "Hierarchical Level: Order (PRF)", required: true },
            { segment: "HL*I", description: "Hierarchical Level: Item (LIN, SN1, PID)", required: true },
            { segment: "CTT", description: "Transaction Totals", required: true },
            { segment: "SE/GE/IEA", description: "Enveloping Trailers", required: true },
          ],
        },
      },
      "810": {
        name: "Commercial Invoice (EDI 810 / INVOIC)",
        description: "Billing invoice sent to request payment for goods or freight services provided.",
        ansiX12: this.generateX12_810(sampleInvoice, { controlNumber: 300000001 }),
        edifact: this.generateEdifactInvoic(sampleInvoice, { controlNumber: "300000003" }),
        schema: {
          standard: "ANSI X12 004010 / EDIFACT D96A",
          segments: [
            { segment: "ISA/GS/ST", description: "Interchange Enveloping (GS*IN)", required: true },
            { segment: "BIG", description: "Beginning Segment for Invoice", required: true },
            { segment: "N1*RE / N1*BT", description: "Remit To (Vendor) & Bill To (Customer)", required: true },
            { segment: "ITD", description: "Terms of Sale / Deferred Terms", required: false },
            { segment: "IT1", description: "Invoice Line Item (Quantity, Unit Price, Part #)", required: true },
            { segment: "PID", description: "Item Description", required: false },
            { segment: "TDS", description: "Total Monetary Value Summary (Cents format)", required: true },
            { segment: "CTT", description: "Transaction Line Count", required: true },
            { segment: "SE/GE/IEA", description: "Enveloping Trailers", required: true },
          ],
        },
      },
    };
  }
}
