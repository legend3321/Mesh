export interface EDI850Item {
  line: number;
  productCode: string;
  quantity: number;
  unitPrice: number;
  uom?: string; // Unit of measure (default: 'EA')
  description?: string;
}

export interface EDI850Document {
  senderDuns: string;
  receiverDuns: string;
  controlNumber: string;
  poNumber: string;
  poDate: string; // YYYYMMDD
  currency: string;
  items: EDI850Item[];
  totalAmount: number;
}

export interface EDI856Item {
  line: number;
  productCode: string;
  quantityShipped: number;
  lotNumber?: string;
  uom?: string;
}

export interface EDI856Document {
  senderDuns: string;
  receiverDuns: string;
  controlNumber: string;
  shipmentId: string;
  shipDate: string; // YYYYMMDD
  carrierScac: string;
  trackingNumber: string;
  billOfLading: string;
  poNumber: string;
  packagingCode: string;
  totalWeightKg: number;
  items: EDI856Item[];
}

export interface EDI810Item {
  line: number;
  productCode: string;
  quantityBilled: number;
  unitPrice: number;
  lineTotal: number;
  uom?: string;
}

export interface EDI810Document {
  senderDuns: string;
  receiverDuns: string;
  controlNumber: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYYMMDD
  poNumber: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  items: EDI810Item[];
}

export class EDIService {
  // Delimiters
  private static readonly ELEM_SEP = "*";
  private static readonly SEG_TERM = "~\n";

  // =========================================================================
  // EDI 850: PURCHASE ORDER
  // =========================================================================

  public static generateEDI850(doc: EDI850Document): string {
    const dateFormatted = doc.poDate.replace(/-/g, "");
    const segments: string[] = [];

    // ISA Envelope
    segments.push(
      `ISA*00*          *00*          *ZZ*${doc.senderDuns.padEnd(15)}*ZZ*${doc.receiverDuns.padEnd(15)}*${dateFormatted.slice(2)}*1200*U*00401*${doc.controlNumber.padStart(9, "0")}*0*P*>~`
    );
    // Functional Group GS
    segments.push(
      `GS*PO*${doc.senderDuns.trim()}*${doc.receiverDuns.trim()}*${dateFormatted}*1200*${doc.controlNumber}*X*004010~`
    );
    // Transaction Set Header ST
    segments.push(`ST*850*${doc.controlNumber.padStart(4, "0")}~`);
    // Beginning Segment for Purchase Order BEG
    segments.push(`BEG*00*SA*${doc.poNumber}**${dateFormatted}~`);
    // Currency CUR
    segments.push(`CUR*BY*${doc.currency || "USD"}~`);

    // Line items PO1
    let totalQty = 0;
    doc.items.forEach((item) => {
      totalQty += item.quantity;
      segments.push(
        `PO1*${item.line}*${item.quantity}*${item.uom || "EA"}*${item.unitPrice.toFixed(2)}*PE*VP*${item.productCode}~`
      );
    });

    // Transaction Totals CTT
    segments.push(`CTT*${doc.items.length}*${totalQty}~`);
    // Transaction Set Trailer SE
    // Count segments from ST to SE inclusive: ST, BEG, CUR, PO1*(items), CTT, SE = 4 + items.length
    const seCount = 4 + doc.items.length;
    segments.push(`SE*${seCount}*${doc.controlNumber.padStart(4, "0")}~`);
    // Functional Group Trailer GE
    segments.push(`GE*1*${doc.controlNumber}~`);
    // Interchange Control Trailer IEA
    segments.push(`IEA*1*${doc.controlNumber.padStart(9, "0")}~`);

    return segments.join("\n");
  }

  public static parseEDI850(ediText: string): EDI850Document {
    const lines = ediText.split("~").map((l) => l.trim()).filter(Boolean);
    let poNumber = "";
    let poDate = "";
    let senderDuns = "";
    let receiverDuns = "";
    let controlNumber = "";
    let currency = "USD";
    const items: EDI850Item[] = [];

    for (const rawLine of lines) {
      const parts = rawLine.split("*");
      const tag = parts[0];

      if (tag === "ISA") {
        senderDuns = parts[6]?.trim() || "";
        receiverDuns = parts[8]?.trim() || "";
        controlNumber = parts[13]?.trim() || "";
      } else if (tag === "BEG") {
        poNumber = parts[3] || "";
        poDate = parts[5] || "";
      } else if (tag === "CUR") {
        currency = parts[2] || "USD";
      } else if (tag === "PO1") {
        const line = parseInt(parts[1], 10);
        const quantity = parseFloat(parts[2]);
        const uom = parts[3];
        const unitPrice = parseFloat(parts[4]);
        const productCode = parts[7] || "";
        items.push({ line, productCode, quantity, unitPrice, uom });
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

    return {
      senderDuns,
      receiverDuns,
      controlNumber,
      poNumber,
      poDate,
      currency,
      items,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  // =========================================================================
  // EDI 856: SHIP NOTICE / MANIFEST (ASN)
  // =========================================================================

  public static generateEDI856(doc: EDI856Document): string {
    const dateFormatted = doc.shipDate.replace(/-/g, "");
    const segments: string[] = [];

    // ISA & GS
    segments.push(
      `ISA*00*          *00*          *ZZ*${doc.senderDuns.padEnd(15)}*ZZ*${doc.receiverDuns.padEnd(15)}*${dateFormatted.slice(2)}*1200*U*00401*${doc.controlNumber.padStart(9, "0")}*0*P*>~`
    );
    segments.push(
      `GS*SH*${doc.senderDuns.trim()}*${doc.receiverDuns.trim()}*${dateFormatted}*1200*${doc.controlNumber}*X*004010~`
    );
    segments.push(`ST*856*${doc.controlNumber.padStart(4, "0")}~`);
    // Beginning Segment for Ship Notice BSN
    segments.push(`BSN*00*${doc.shipmentId}*${dateFormatted}*1200*0001~`);

    // Hierarchical Level 1: Shipment (S)
    segments.push(`HL*1**S~`);
    segments.push(`TD5*B*2*${doc.carrierScac}*M~`);
    segments.push(`REF*BM*${doc.billOfLading}~`);
    segments.push(`REF*CN*${doc.trackingNumber}~`);

    // Hierarchical Level 2: Order (O)
    segments.push(`HL*2*1*O~`);
    segments.push(`PRF*${doc.poNumber}~`);

    // Hierarchical Level 3: Items (I)
    let hlIndex = 3;
    doc.items.forEach((item) => {
      segments.push(`HL*${hlIndex}*2*I~`);
      segments.push(`LIN*${item.line}*VP*${item.productCode}~`);
      segments.push(`SN1*${item.line}*${item.quantityShipped}*${item.uom || "EA"}~`);
      if (item.lotNumber) {
        segments.push(`REF*LT*${item.lotNumber}~`);
      }
      hlIndex++;
    });

    // CTT & Trailers
    segments.push(`CTT*${hlIndex - 1}~`);
    segments.push(`SE*${segments.length - 2}*${doc.controlNumber.padStart(4, "0")}~`);
    segments.push(`GE*1*${doc.controlNumber}~`);
    segments.push(`IEA*1*${doc.controlNumber.padStart(9, "0")}~`);

    return segments.join("\n");
  }

  public static parseEDI856(ediText: string): EDI856Document {
    const lines = ediText.split("~").map((l) => l.trim()).filter(Boolean);
    let senderDuns = "";
    let receiverDuns = "";
    let controlNumber = "";
    let shipmentId = "";
    let shipDate = "";
    let carrierScac = "";
    let trackingNumber = "";
    let billOfLading = "";
    let poNumber = "";
    const items: EDI856Item[] = [];

    let currentItem: Partial<EDI856Item> | null = null;

    for (const rawLine of lines) {
      const parts = rawLine.split("*");
      const tag = parts[0];

      if (tag === "ISA") {
        senderDuns = parts[6]?.trim() || "";
        receiverDuns = parts[8]?.trim() || "";
        controlNumber = parts[13]?.trim() || "";
      } else if (tag === "BSN") {
        shipmentId = parts[2] || "";
        shipDate = parts[3] || "";
      } else if (tag === "TD5") {
        carrierScac = parts[3] || "";
      } else if (tag === "REF") {
        if (parts[1] === "BM") billOfLading = parts[2] || "";
        if (parts[1] === "CN") trackingNumber = parts[2] || "";
        if (parts[1] === "LT" && currentItem) currentItem.lotNumber = parts[2] || "";
      } else if (tag === "PRF") {
        poNumber = parts[1] || "";
      } else if (tag === "LIN") {
        if (currentItem && currentItem.productCode) {
          items.push(currentItem as EDI856Item);
        }
        currentItem = {
          line: parseInt(parts[1], 10),
          productCode: parts[3] || "",
        };
      } else if (tag === "SN1" && currentItem) {
        currentItem.quantityShipped = parseFloat(parts[2]);
        currentItem.uom = parts[3] || "EA";
      }
    }

    if (currentItem && currentItem.productCode) {
      items.push(currentItem as EDI856Item);
    }

    return {
      senderDuns,
      receiverDuns,
      controlNumber,
      shipmentId,
      shipDate,
      carrierScac,
      trackingNumber,
      billOfLading,
      poNumber,
      packagingCode: "CTN25",
      totalWeightKg: items.reduce((sum, i) => sum + i.quantityShipped * 2.5, 0),
      items,
    };
  }

  // =========================================================================
  // EDI 810: COMMERCIAL INVOICE
  // =========================================================================

  public static generateEDI810(doc: EDI810Document): string {
    const dateFormatted = doc.invoiceDate.replace(/-/g, "");
    const segments: string[] = [];

    // ISA & GS
    segments.push(
      `ISA*00*          *00*          *ZZ*${doc.senderDuns.padEnd(15)}*ZZ*${doc.receiverDuns.padEnd(15)}*${dateFormatted.slice(2)}*1200*U*00401*${doc.controlNumber.padStart(9, "0")}*0*P*>~`
    );
    segments.push(
      `GS*IN*${doc.senderDuns.trim()}*${doc.receiverDuns.trim()}*${dateFormatted}*1200*${doc.controlNumber}*X*004010~`
    );
    segments.push(`ST*810*${doc.controlNumber.padStart(4, "0")}~`);
    // Beginning Segment for Invoice BIG
    segments.push(`BIG*${dateFormatted}*${doc.invoiceNumber}*${dateFormatted}*${doc.poNumber}~`);
    segments.push(`CUR*SE*${doc.currency || "USD"}~`);

    // Line items IT1
    doc.items.forEach((item) => {
      segments.push(
        `IT1*${item.line}*${item.quantityBilled}*${item.uom || "EA"}*${item.unitPrice.toFixed(2)}**VP*${item.productCode}~`
      );
    });

    // Total Monetary Value Summary TDS (Total in cents or 2 decimal representation)
    segments.push(`TDS*${Math.round(doc.totalAmount * 100)}~`);
    if (doc.taxAmount > 0) {
      segments.push(`TXI*TX*${doc.taxAmount.toFixed(2)}~`);
    }

    segments.push(`CTT*${doc.items.length}~`);
    segments.push(`SE*${segments.length - 2}*${doc.controlNumber.padStart(4, "0")}~`);
    segments.push(`GE*1*${doc.controlNumber}~`);
    segments.push(`IEA*1*${doc.controlNumber.padStart(9, "0")}~`);

    return segments.join("\n");
  }

  public static parseEDI810(ediText: string): EDI810Document {
    const lines = ediText.split("~").map((l) => l.trim()).filter(Boolean);
    let senderDuns = "";
    let receiverDuns = "";
    let controlNumber = "";
    let invoiceNumber = "";
    let invoiceDate = "";
    let poNumber = "";
    let currency = "USD";
    let totalInCents = 0;
    let taxAmount = 0;
    const items: EDI810Item[] = [];

    for (const rawLine of lines) {
      const parts = rawLine.split("*");
      const tag = parts[0];

      if (tag === "ISA") {
        senderDuns = parts[6]?.trim() || "";
        receiverDuns = parts[8]?.trim() || "";
        controlNumber = parts[13]?.trim() || "";
      } else if (tag === "BIG") {
        invoiceDate = parts[1] || "";
        invoiceNumber = parts[2] || "";
        poNumber = parts[4] || "";
      } else if (tag === "CUR") {
        currency = parts[2] || "USD";
      } else if (tag === "IT1") {
        const line = parseInt(parts[1], 10);
        const quantityBilled = parseFloat(parts[2]);
        const uom = parts[3] || "EA";
        const unitPrice = parseFloat(parts[4]);
        const productCode = parts[7] || "";
        const lineTotal = Math.round(quantityBilled * unitPrice * 100) / 100;
        items.push({ line, productCode, quantityBilled, unitPrice, lineTotal, uom });
      } else if (tag === "TDS") {
        totalInCents = parseFloat(parts[1]);
      } else if (tag === "TXI") {
        taxAmount = parseFloat(parts[2]);
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalAmount = totalInCents > 0 ? totalInCents / 100 : subtotal + taxAmount;

    return {
      senderDuns,
      receiverDuns,
      controlNumber,
      invoiceNumber,
      invoiceDate,
      poNumber,
      currency,
      subtotal: Math.round(subtotal * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      items,
    };
  }
}
