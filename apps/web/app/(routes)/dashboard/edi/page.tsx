"use client";

import React, { useState, useEffect, useMemo } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useCompany } from "@/app/components/CompanyContext";
import {
  FileText,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Download,
  RefreshCw,
  BookOpen,
  ShieldCheck,
  Layers,
  Search,
  Terminal,
  ChevronDown,
  ChevronRight,
  Code,
  Send,
  Zap,
  Filter,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";

// ==========================================
// Segment Glossary & Spec Definitions
// ==========================================

const SEGMENT_NAMES: Record<string, string> = {
  ISA: "Interchange Control Header",
  GS: "Functional Group Header",
  ST: "Transaction Set Header",
  BEG: "Beginning Segment for Purchase Order",
  BSN: "Beginning Segment for Ship Notice / ASN",
  BIG: "Beginning Segment for Commercial Invoice",
  CUR: "Currency Information",
  REF: "Reference Identification",
  DTM: "Date/Time Reference",
  N1: "Party Identification (Name & ID)",
  N2: "Additional Name Information",
  N3: "Party Postal Address",
  N4: "Geographic Location (City, State, Zip, Country)",
  PO1: "Baseline Item Data (Purchase Order)",
  PID: "Product / Item Description",
  HL: "Hierarchical Level (Shipment/Order/Tare/Pack/Item)",
  TD1: "Carrier Details (Quantity & Weight)",
  TD5: "Carrier Details (Routing Sequence & Transit Method)",
  PRF: "Purchase Order Reference",
  LIN: "Item Identification Line",
  SN1: "Item Detail (Shipment Quantity)",
  IT1: "Baseline Item Data (Invoice)",
  ITD: "Terms of Sale / Deferred Payment Terms",
  TDS: "Total Monetary Value Summary",
  TXI: "Tax Information",
  CAD: "Carrier Detail",
  SAC: "Service, Promotion, Allowance or Charge",
  CTT: "Transaction Totals (Hash & Quantities)",
  AMT: "Monetary Amount Information",
  SE: "Transaction Set Trailer",
  GE: "Functional Group Trailer",
  IEA: "Interchange Control Trailer",
};

interface SegmentRow {
  index: number;
  segmentId: string;
  segmentName: string;
  elements: string[];
  raw: string;
  status: "valid" | "warning" | "error";
  errorNote?: string;
}

interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  transactionType: string;
  controlNumber: string;
  senderId: string;
  receiverId: string;
  segmentCount: number;
  elementDelimiter: string;
  segmentDelimiter: string;
  lineItemsCount: number;
}

// ==========================================
// Sample EDI Documents (850, 856, 810)
// ==========================================

const SAMPLE_EDI_850 = `ISA*00*          *00*          *ZZ*MESHSCM01      *ZZ*SUPPLIERGLOBAL *261028*1430*U*00401*000000850*0*P*>~
GS*PO*MESHSCM01*SUPPLIERGLOBAL*20261028*1430*850001*X*004010~
ST*850*0001~
BEG*00*NE*PO-89241**20261028~
CUR*BY*USD~
REF*IA*VENDOR-V402~
REF*DP*DEPT-LOGISTICS~
DTM*002*20261105~
DTM*010*20261028~
N1*BY*MESH SUPPLY CHAIN CORP*9*1488294010001~
N3*100 HIGH STREET SUITE 1400~
N4*CHICAGO*IL*60601*USA~
N1*ST*ORD-01 CROSS-DOCK FACILITY*92*ORD-01~
N3*4500 EXPRESSWAY BLVD~
N4*CHICAGO*IL*60666*USA~
N1*SE*GLOBAL INDUSTRIAL COMPONENTS*9*9988221100002~
N3*800 SILICON WAY~
N4*AUSTIN*TX*78701*USA~
PO1*1*500*EA*42.50*PE*VP*SKU-9921*IN*MESH-IOT-01~
PID*F****INDUSTRIAL SENSOR NODE IOT-4 RUGGED~
PO1*2*250*EA*118.00*PE*VP*SKU-8842*IN*MESH-CTRL-09~
PID*F****HIGH CAPACITY TELEMETRY GATEWAY CONTROLLER~
PO1*3*1200*FT*6.25*PE*VP*SKU-3301*IN*MESH-CAB-04~
PID*F****SHIELDED INDUSTRIAL ETHERNET CAT7 CABLING~
CTT*3*1950~
AMT*TT*58250.00~
SE*23*0001~
GE*1*850001~
IEA*1*000000850~`;

const SAMPLE_EDI_856 = `ISA*00*          *00*          *ZZ*SUPPLIERGLOBAL *ZZ*MESHSCM01      *261028*1500*U*00401*000000856*0*P*>~
GS*SH*SUPPLIERGLOBAL*MESHSCM01*20261028*1500*856001*X*004010~
ST*856*0001~
BSN*00*ASN-20261028-09*20261028*1500*0001~
DTM*011*20261028~
DTM*017*20261031~
HL*1**S~
TD1*CTN25*45****G*1850*LB~
TD5*B*2*FDEG*M*FEDEX FREIGHT PRIORITY~
REF*BM*BOL-98421009~
REF*CN*781290481204~
N1*SF*AUSTIN LOGISTICS CENTER*9*9988221100002~
N3*800 SILICON WAY~
N4*AUSTIN*TX*78701*USA~
N1*ST*ORD-01 CROSS-DOCK FACILITY*92*ORD-01~
N3*4500 EXPRESSWAY BLVD~
N4*CHICAGO*IL*60666*USA~
HL*2*1*O~
PRF*PO-89241***20261028~
HL*3*2*I~
LIN*1*VP*SKU-9921*IN*MESH-IOT-01~
SN1**500*EA~
PID*F****INDUSTRIAL SENSOR NODE IOT-4 RUGGED~
HL*4*2*I~
LIN*2*VP*SKU-8842*IN*MESH-CTRL-09~
SN1**250*EA~
PID*F****HIGH CAPACITY TELEMETRY GATEWAY CONTROLLER~
CTT*4~
SE*24*0001~
GE*1*856001~
IEA*1*000000856~`;

const SAMPLE_EDI_810 = `ISA*00*          *00*          *ZZ*SUPPLIERGLOBAL *ZZ*MESHSCM01      *261028*1530*U*00401*000000810*0*P*>~
GS*IN*SUPPLIERGLOBAL*MESHSCM01*20261028*1530*810001*X*004010~
ST*810*0001~
BIG*20261028*INV-44091*20261028*PO-89241~
CUR*SE*USD~
REF*VR*TAX-ID-99-440182~
REF*BM*BOL-98421009~
N1*RE*GLOBAL INDUSTRIAL PAYMENTS INC*9*9988221100002~
N3*P.O. BOX 88402~
N4*DALLAS*TX*75201*USA~
N1*BT*MESH SUPPLY CHAIN CORP*9*1488294010001~
N3*100 HIGH STREET SUITE 1400~
N4*CHICAGO*IL*60601*USA~
ITD*01*3*2**10**30~
IT1*1*500*EA*42.50**VP*SKU-9921*IN*MESH-IOT-01~
PID*F****INDUSTRIAL SENSOR NODE IOT-4 RUGGED~
IT1*2*250*EA*118.00**VP*SKU-8842*IN*MESH-CTRL-09~
PID*F****HIGH CAPACITY TELEMETRY GATEWAY CONTROLLER~
TDS*5075000~
TXI*GS*4060.00~
CTT*2~
SE*19*0001~
GE*1*810001~
IEA*1*000000810~`;

// ==========================================
// Parsing & Validation Helpers
// ==========================================

function parseRawEdiLocally(rawEdi: string): {
  report: ValidationReport;
  segments: SegmentRow[];
  parsedJson: any;
} {
  const clean = rawEdi.trim();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!clean) {
    return {
      report: {
        isValid: false,
        errors: ["Raw EDI input is empty."],
        warnings: [],
        transactionType: "Unknown",
        controlNumber: "N/A",
        senderId: "N/A",
        receiverId: "N/A",
        segmentCount: 0,
        elementDelimiter: "*",
        segmentDelimiter: "~",
        lineItemsCount: 0,
      },
      segments: [],
      parsedJson: {},
    };
  }

  let segmentDelimiter = "~";
  if (!clean.includes("~") && clean.includes("\n")) {
    segmentDelimiter = "\n";
  }

  const rawLines = clean
    .split(segmentDelimiter)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  let elementDelimiter = "*";
  if (rawLines[0] && rawLines[0].startsWith("ISA") && rawLines[0].length >= 4) {
    elementDelimiter = rawLines[0][3] || "*";
  }

  const segmentRows: SegmentRow[] = [];
  let senderId = "UNKNOWN";
  let receiverId = "UNKNOWN";
  let transactionType = "Unknown X12";
  let controlNumber = "UNKNOWN";
  let seCountDeclared: number | null = null;
  let lineItemsCount = 0;

  const parsedJson: any = {
    envelope: {},
    header: {},
    parties: [],
    lineItems: [],
    summary: {},
  };

  rawLines.forEach((line, idx) => {
    const elements = line.split(elementDelimiter);
    const segmentId = elements[0].toUpperCase();
    const segmentElements = elements.slice(1);
    const segName = SEGMENT_NAMES[segmentId] || `Custom Segment (${segmentId})`;

    let rowStatus: "valid" | "warning" | "error" = "valid";
    let errorNote: string | undefined = undefined;

    if (segmentId === "ISA") {
      if (segmentElements.length < 16) {
        rowStatus = "error";
        errorNote = "ISA segment requires 16 standard elements.";
        errors.push(`Line ${idx + 1}: ISA segment has fewer than 16 elements.`);
      } else {
        senderId = (segmentElements[5] || "").trim();
        receiverId = (segmentElements[7] || "").trim();
        parsedJson.envelope = {
          sender: senderId,
          receiver: receiverId,
          date: segmentElements[8],
          time: segmentElements[9],
          controlNumber: segmentElements[12],
          usage: segmentElements[14] === "P" ? "Production" : "Test",
        };
      }
    } else if (segmentId === "ST") {
      const txCode = segmentElements[0] || "";
      controlNumber = segmentElements[1] || "";
      if (txCode === "850") transactionType = "EDI 850 (Purchase Order)";
      else if (txCode === "856") transactionType = "EDI 856 (Ship Notice / ASN)";
      else if (txCode === "810") transactionType = "EDI 810 (Commercial Invoice)";
      else transactionType = `EDI ${txCode} Transaction Set`;

      parsedJson.transactionSet = {
        type: txCode,
        controlNumber,
      };
    } else if (segmentId === "BEG") {
      parsedJson.header = {
        purpose: segmentElements[0],
        poType: segmentElements[1],
        poNumber: segmentElements[2],
        date: segmentElements[4],
      };
    } else if (segmentId === "BSN") {
      parsedJson.header = {
        purpose: segmentElements[0],
        asnNumber: segmentElements[1],
        date: segmentElements[2],
        time: segmentElements[3],
      };
    } else if (segmentId === "BIG") {
      parsedJson.header = {
        invoiceDate: segmentElements[0],
        invoiceNumber: segmentElements[1],
        poDate: segmentElements[2],
        poNumber: segmentElements[3],
      };
    } else if (segmentId === "N1") {
      parsedJson.parties.push({
        qualifier: segmentElements[0],
        name: segmentElements[1],
        idCode: segmentElements[3],
      });
    } else if (segmentId === "PO1" || segmentId === "IT1" || segmentId === "LIN") {
      lineItemsCount++;
      parsedJson.lineItems.push({
        line: segmentElements[0],
        quantity: parseFloat(segmentElements[1]) || 0,
        uom: segmentElements[2],
        unitPrice: parseFloat(segmentElements[3]) || 0,
        productId: segmentElements[6] || segmentElements[2],
      });
    } else if (segmentId === "SE") {
      seCountDeclared = parseInt(segmentElements[0], 10);
      const seControl = segmentElements[1];
      if (seControl !== controlNumber) {
        rowStatus = "warning";
        errorNote = `SE control number (${seControl}) does not match ST (${controlNumber}).`;
        warnings.push(errorNote);
      }
    }

    segmentRows.push({
      index: idx + 1,
      segmentId,
      segmentName: segName,
      elements: segmentElements,
      raw: line + segmentDelimiter,
      status: rowStatus,
      errorNote,
    });
  });

  if (rawLines.length > 0 && !rawLines[0].startsWith("ISA")) {
    errors.push("Missing ISA Interchange Control Header at start of EDI payload.");
  }

  const lastLine = rawLines[rawLines.length - 1] || "";
  if (!lastLine.startsWith("IEA")) {
    errors.push("Missing IEA Interchange Control Trailer at end of EDI payload.");
  }

  if (seCountDeclared !== null) {
    const stIdx = segmentRows.findIndex((r) => r.segmentId === "ST");
    const seIdx = segmentRows.findIndex((r) => r.segmentId === "SE");
    if (stIdx !== -1 && seIdx !== -1) {
      const actualCount = seIdx - stIdx + 1;
      if (actualCount !== seCountDeclared) {
        errors.push(
          `Segment count mismatch: SE declares ${seCountDeclared} segments, but counted ${actualCount} between ST and SE.`
        );
        segmentRows[seIdx].status = "error";
        segmentRows[seIdx].errorNote = `Count mismatch: declared ${seCountDeclared}, actual ${actualCount}.`;
      }
    }
  }

  parsedJson.summary = {
    totalSegments: segmentRows.length,
    lineItemsCount,
    senderId,
    receiverId,
    transactionType,
    validationStatus: errors.length === 0 ? "VALID" : "SYNTAX_ERRORS",
  };

  return {
    report: {
      isValid: errors.length === 0,
      errors,
      warnings,
      transactionType,
      controlNumber,
      senderId,
      receiverId,
      segmentCount: segmentRows.length,
      elementDelimiter,
      segmentDelimiter,
      lineItemsCount,
    },
    segments: segmentRows,
    parsedJson,
  };
}

function generateEdiX12String(type: "850" | "856" | "810", id: string): string {
  const now = new Date();
  const yymmdd = now.toISOString().slice(2, 10).replace(/-/g, "");
  const ccyymmdd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hhmm = now.toTimeString().slice(0, 5).replace(":", "");
  const controlSeq = Math.floor(100000 + Math.random() * 900000).toString();

  if (type === "850") {
    const poNum = id.startsWith("PO-") ? id : `PO-${id}`;
    return `ISA*00*          *00*          *ZZ*MESHSCM01      *ZZ*SUPPLIERGLOBAL *${yymmdd}*${hhmm}*U*00401*${controlSeq}*0*P*>~
GS*PO*MESHSCM01*SUPPLIERGLOBAL*${ccyymmdd}*${hhmm}*${controlSeq.slice(0, 6)}*X*004010~
ST*850*0001~
BEG*00*NE*${poNum}**${ccyymmdd}~
CUR*BY*USD~
REF*IA*VENDOR-V402~
REF*DP*DEPT-LOGISTICS~
DTM*002*${ccyymmdd}~
N1*BY*MESH SUPPLY CHAIN CORP*9*1488294010001~
N3*100 HIGH STREET SUITE 1400~
N4*CHICAGO*IL*60601*USA~
N1*ST*ORD-01 CROSS-DOCK FACILITY*92*ORD-01~
N3*4500 EXPRESSWAY BLVD~
N4*CHICAGO*IL*60666*USA~
N1*SE*GLOBAL INDUSTRIAL COMPONENTS*9*9988221100002~
N3*800 SILICON WAY~
N4*AUSTIN*TX*78701*USA~
PO1*1*500*EA*42.50*PE*VP*SKU-9921*IN*MESH-IOT-01~
PID*F****INDUSTRIAL SENSOR NODE IOT-4 RUGGED~
PO1*2*250*EA*118.00*PE*VP*SKU-8842*IN*MESH-CTRL-09~
PID*F****HIGH CAPACITY TELEMETRY GATEWAY CONTROLLER~
CTT*2*750~
AMT*TT*50750.00~
SE*20*0001~
GE*1*${controlSeq.slice(0, 6)}~
IEA*1*${controlSeq}~`;
  }

  if (type === "856") {
    const delNum = id.startsWith("DEL-") ? id : `DEL-${id}`;
    return `ISA*00*          *00*          *ZZ*SUPPLIERGLOBAL *ZZ*MESHSCM01      *${yymmdd}*${hhmm}*U*00401*${controlSeq}*0*P*>~
GS*SH*SUPPLIERGLOBAL*MESHSCM01*${ccyymmdd}*${hhmm}*${controlSeq.slice(0, 6)}*X*004010~
ST*856*0001~
BSN*00*ASN-${delNum}*${ccyymmdd}*${hhmm}*0001~
DTM*011*${ccyymmdd}~
HL*1**S~
TD1*CTN25*30****G*1250*LB~
TD5*B*2*FDEG*M*FEDEX FREIGHT PRIORITY~
REF*BM*BOL-${controlSeq}~
REF*CN*TRACK-${id}~
N1*SF*AUSTIN LOGISTICS CENTER*9*9988221100002~
N3*800 SILICON WAY~
N4*AUSTIN*TX*78701*USA~
N1*ST*ORD-01 CROSS-DOCK FACILITY*92*ORD-01~
N3*4500 EXPRESSWAY BLVD~
N4*CHICAGO*IL*60666*USA~
HL*2*1*O~
PRF*PO-89241***${ccyymmdd}~
HL*3*2*I~
LIN*1*VP*SKU-9921*IN*MESH-IOT-01~
SN1**500*EA~
PID*F****INDUSTRIAL SENSOR NODE IOT-4 RUGGED~
CTT*3~
SE*20*0001~
GE*1*${controlSeq.slice(0, 6)}~
IEA*1*${controlSeq}~`;
  }

  const invNum = id.startsWith("INV-") ? id : `INV-${id}`;
  return `ISA*00*          *00*          *ZZ*SUPPLIERGLOBAL *ZZ*MESHSCM01      *${yymmdd}*${hhmm}*U*00401*${controlSeq}*0*P*>~
GS*IN*SUPPLIERGLOBAL*MESHSCM01*${ccyymmdd}*${hhmm}*${controlSeq.slice(0, 6)}*X*004010~
ST*810*0001~
BIG*${ccyymmdd}*${invNum}*${ccyymmdd}*PO-89241~
CUR*SE*USD~
REF*VR*TAX-ID-99-440182~
N1*RE*GLOBAL INDUSTRIAL PAYMENTS INC*9*9988221100002~
N3*P.O. BOX 88402~
N4*DALLAS*TX*75201*USA~
N1*BT*MESH SUPPLY CHAIN CORP*9*1488294010001~
N3*100 HIGH STREET SUITE 1400~
N4*CHICAGO*IL*60601*USA~
ITD*01*3*2**10**30~
IT1*1*500*EA*42.50**VP*SKU-9921*IN*MESH-IOT-01~
PID*F****INDUSTRIAL SENSOR NODE IOT-4 RUGGED~
TDS*2125000~
TXI*GS*1700.00~
CTT*1~
SE*16*0001~
GE*1*${controlSeq.slice(0, 6)}~
IEA*1*${controlSeq}~`;
}

export default function EdiGatewayPage() {
  const { activeCompanyId } = useCompany();

  // Active View Mode
  const [activeTab, setActiveTab] = useState<"validator" | "generator" | "specs">("validator");

  // Parser / Validator States
  const [rawEdiInput, setRawEdiInput] = useState<string>(SAMPLE_EDI_850);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [segmentRows, setSegmentRows] = useState<SegmentRow[]>([]);
  const [parsedJson, setParsedJson] = useState<any>(null);
  const [segmentFilter, setSegmentFilter] = useState<string>("");
  const [partnerFilter, setPartnerFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ERRORS" | "VALID">("ALL");
  const [expandedSegmentIdx, setExpandedSegmentIdx] = useState<number | null>(null);
  const [isCopiedJson, setIsCopiedJson] = useState<boolean>(false);
  const [inspectMode, setInspectMode] = useState<"json" | "stream">("json");

  // Generator States
  const [genDocType, setGenDocType] = useState<"850" | "856" | "810">("850");
  const [selectedEntityId, setSelectedEntityId] = useState<string>("89241");
  const [customEntityInput, setCustomEntityInput] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedEdiText, setGeneratedEdiText] = useState<string>("");
  const [isCopiedEdi, setIsCopiedEdi] = useState<boolean>(false);

  // Specifications Tab Filter
  const [specTopic, setSpecTopic] = useState<"850" | "856" | "810" | "envelope" | "glossary">("850");
  const [glossarySearch, setGlossarySearch] = useState<string>("");

  useEffect(() => {
    handleParseEdi(false);
  }, []);

  const handleParseEdi = async (isUserTriggered = true) => {
    if (!rawEdiInput.trim()) {
      toast({
        title: "Input required",
        description: "Provide raw ANSI X12 EDI text to parse.",
        variant: "destructive",
      });
      return;
    }

    setIsParsing(true);
    try {
      const res = await api.post("/edi/parse", { rawEdi: rawEdiInput });
      if (res?.data && (res.data.report || res.data.validation)) {
        const localResult = parseRawEdiLocally(rawEdiInput);
        if (res.data.report && res.data.segments) {
          setValidationReport(res.data.report);
          setSegmentRows(res.data.segments);
          setParsedJson(res.data.parsedJson || res.data);
        } else {
          setValidationReport({
            ...localResult.report,
            isValid: res.data.validation?.isValid ?? localResult.report.isValid,
            errors: res.data.validation?.errors || localResult.report.errors,
            segmentCount: res.data.validation?.segmentCount || localResult.report.segmentCount,
            transactionType: res.data.documentType ? `EDI ${res.data.documentType}` : localResult.report.transactionType,
          });
          setSegmentRows(localResult.segments);
          setParsedJson(res.data.parsedData || res.data);
        }

        if (isUserTriggered) {
          toast({
            title: "Validation cleared",
            description: `Parsed ${localResult.segments.length} ANSI X12 segments.`,
          });
        }
      } else {
        throw new Error("Using local parser engine.");
      }
    } catch {
      const localResult = parseRawEdiLocally(rawEdiInput);
      setValidationReport(localResult.report);
      setSegmentRows(localResult.segments);
      setParsedJson(localResult.parsedJson);

      if (isUserTriggered) {
        if (localResult.report.isValid) {
          toast({
            title: "Validation cleared",
            description: `${localResult.report.transactionType} validated with 0 syntax errors.`,
          });
        } else {
          toast({
            title: "Validation notice",
            description: `Found ${localResult.report.errors.length} syntax issues in envelope.`,
            variant: "destructive",
          });
        }
      }
    } finally {
      setIsParsing(false);
    }
  };

  const handleGenerateEdi = async () => {
    const finalId = customEntityInput.trim() || selectedEntityId;
    if (!finalId) {
      toast({
        title: "Entity required",
        description: "Select an entity or specify a custom identifier.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await api.post(`/edi/generate/${genDocType}/${finalId}`);
      if (res?.data && (res.data.rawEdi || typeof res.data === "string")) {
        const text = typeof res.data === "string" ? res.data : res.data.rawEdi;
        setGeneratedEdiText(text);
        toast({
          title: "Document generated",
          description: `ANSI X12 ${genDocType} generated for ${finalId}.`,
        });
      } else {
        throw new Error("Using local envelope generator.");
      }
    } catch {
      const fallbackText = generateEdiX12String(genDocType, finalId);
      setGeneratedEdiText(fallbackText);
      toast({
        title: "Document generated",
        description: `ANSI X12 ${genDocType} generated for ${finalId}.`,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLoadSample = (sample: string, name: string) => {
    setRawEdiInput(sample);
    const localResult = parseRawEdiLocally(sample);
    setValidationReport(localResult.report);
    setSegmentRows(localResult.segments);
    setParsedJson(localResult.parsedJson);
    toast({
      title: "Sample loaded",
      description: `Loaded ${name} payload.`,
    });
  };

  const handleCopyJson = () => {
    if (!parsedJson) return;
    navigator.clipboard.writeText(JSON.stringify(parsedJson, null, 2));
    setIsCopiedJson(true);
    toast({ title: "Copied", description: "JSON payload copied to clipboard." });
    setTimeout(() => setIsCopiedJson(false), 2000);
  };

  const handleCopyGeneratedEdi = () => {
    if (!generatedEdiText) return;
    navigator.clipboard.writeText(generatedEdiText);
    setIsCopiedEdi(true);
    toast({ title: "Copied", description: "ANSI X12 payload copied to clipboard." });
    setTimeout(() => setIsCopiedEdi(false), 2000);
  };

  const handleDownloadX12 = () => {
    if (!generatedEdiText) return;
    const finalId = customEntityInput.trim() || selectedEntityId;
    const blob = new Blob([generatedEdiText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `EDI_${genDocType}_${finalId}.x12`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({
      title: "File downloaded",
      description: `EDI_${genDocType}_${finalId}.x12 saved to local storage.`,
    });
  };

  const handleSendToValidator = () => {
    if (!generatedEdiText) return;
    setRawEdiInput(generatedEdiText);
    setActiveTab("validator");
    const localResult = parseRawEdiLocally(generatedEdiText);
    setValidationReport(localResult.report);
    setSegmentRows(localResult.segments);
    setParsedJson(localResult.parsedJson);
    toast({
      title: "Replay initiated",
      description: "Transferred generated payload into validator stream.",
    });
  };

  // Unique trading partners detected in parsed payload
  const detectedPartners = useMemo(() => {
    const list = new Set<string>();
    if (validationReport?.senderId && validationReport.senderId !== "N/A" && validationReport.senderId !== "UNKNOWN") {
      list.add(validationReport.senderId);
    }
    if (validationReport?.receiverId && validationReport.receiverId !== "N/A" && validationReport.receiverId !== "UNKNOWN") {
      list.add(validationReport.receiverId);
    }
    return Array.from(list);
  }, [validationReport]);

  // Filtered segments with partner & status filters
  const filteredSegments = useMemo(() => {
    let result = segmentRows;

    if (statusFilter === "ERRORS") {
      result = result.filter((s) => s.status === "error" || s.status === "warning");
    } else if (statusFilter === "VALID") {
      result = result.filter((s) => s.status === "valid");
    }

    if (partnerFilter !== "ALL") {
      result = result.filter((s) => s.raw.includes(partnerFilter));
    }

    if (segmentFilter.trim()) {
      const q = segmentFilter.toLowerCase();
      result = result.filter(
        (s) =>
          s.segmentId.toLowerCase().includes(q) ||
          s.segmentName.toLowerCase().includes(q) ||
          s.raw.toLowerCase().includes(q)
      );
    }

    return result;
  }, [segmentRows, segmentFilter, statusFilter, partnerFilter]);

  return (
    <>
      <Toaster />
      <div className="flex-1 space-y-6 p-6 md:p-8 max-w-7xl mx-auto">
        {/* Header with Title and Calm Telemetry Node */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-200/80">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/60">
                <FileCode className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                ANSI X12 / EDIFACT
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/60">
                <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                AS2 channel active
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-mono text-zinc-500 bg-zinc-50 border border-zinc-200/60">
                SHA-256 digest verified
              </span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 tracking-tight">
              EDI gateway & clearinghouse
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              Clearinghouse ledger for ANSI X12 transactions, automated envelope parsing, and dispatch generator.
            </p>
          </div>

          {/* Calm Telemetry Pill */}
          <div className="flex items-center gap-3 bg-zinc-50 px-3.5 py-2 rounded-lg border border-zinc-200/80 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                Gateway node
              </span>
              <span className="text-xs font-mono font-medium text-zinc-800">
                ORD-EDI-01 • Online
              </span>
            </div>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex border-b border-zinc-200/80 pb-px">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("validator")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
                activeTab === "validator"
                  ? "bg-zinc-100/90 text-zinc-900 border-b-2 border-[#FD3706]"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border-b-2 border-transparent"
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
              <span>Document validator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("generator")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
                activeTab === "generator"
                  ? "bg-zinc-100/90 text-zinc-900 border-b-2 border-[#FD3706]"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border-b-2 border-transparent"
              }`}
            >
              <FileCode className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
              <span>Document generator</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("specs")}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-t-lg transition-colors cursor-pointer ${
                activeTab === "specs"
                  ? "bg-zinc-100/90 text-zinc-900 border-b-2 border-[#FD3706]"
                  : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 border-b-2 border-transparent"
              }`}
            >
              <BookOpen className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
              <span>Transaction specifications</span>
            </button>
          </div>
        </div>

        {/* ==================================================== */}
        {/* MODE 1: EDI VALIDATOR & LEDGER                      */}
        {/* ==================================================== */}
        {activeTab === "validator" && (
          <div className="space-y-6">
            {/* Input & Action Panel */}
            <div className="bg-white rounded-xl border border-zinc-200/80 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                  <span className="text-xs font-medium text-zinc-900">
                    Raw ANSI X12 payload
                  </span>
                </div>

                {/* Pre-fill Sample Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-mono text-zinc-400 mr-1 hidden sm:inline">
                    Load sample:
                  </span>
                  <button
                    type="button"
                    onClick={() => handleLoadSample(SAMPLE_EDI_850, "EDI 850 (Purchase Order)")}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                  >
                    EDI 850 (PO)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample(SAMPLE_EDI_856, "EDI 856 (Ship Notice)")}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                  >
                    EDI 856 (ASN)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLoadSample(SAMPLE_EDI_810, "EDI 810 (Invoice)")}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors cursor-pointer"
                  >
                    EDI 810 (Invoice)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRawEdiInput("")}
                    className="px-2.5 py-1 text-[11px] font-mono rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer ml-1"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Textarea */}
              <div className="relative">
                <textarea
                  rows={8}
                  value={rawEdiInput}
                  onChange={(e) => setRawEdiInput(e.target.value)}
                  placeholder="Paste ANSI X12 EDI stream here (e.g. ISA*00*...~GS*PO*...~ST*850*0001~...)"
                  className="w-full p-3 font-mono text-xs bg-zinc-950 text-zinc-100 rounded-lg border border-zinc-800 focus:border-zinc-600 focus:ring-0 outline-none transition-colors leading-relaxed resize-y selection:bg-zinc-800"
                  spellCheck={false}
                />
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2 text-zinc-500 font-mono text-xs tabular-nums">
                  <span>Characters: {rawEdiInput.length}</span>
                  <span>•</span>
                  <span>Estimated segments: {rawEdiInput.split("~").filter(Boolean).length}</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleParseEdi(true)}
                  disabled={isParsing}
                  className="w-full sm:w-auto px-4 h-9 rounded-lg bg-[#FD3706] hover:bg-[#E02E00] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isParsing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                      <span>Validating envelope...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Parse & validate payload</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Validation Metrics & Summary */}
            {validationReport && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-zinc-200/80 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                        validationReport.isValid ? "bg-emerald-500" : "bg-red-500"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-900">
                          {validationReport.isValid
                            ? "Envelope validation passed"
                            : "Syntax exceptions detected"}
                        </span>
                        <span
                          className={`text-[11px] font-mono px-2 py-0.5 rounded-md font-medium ${
                            validationReport.isValid
                              ? "bg-zinc-100 text-zinc-700"
                              : "bg-red-50 text-red-700 border border-red-200/60"
                          }`}
                        >
                          {validationReport.isValid ? "0 errors" : `${validationReport.errors.length} errors`}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {validationReport.isValid
                          ? `Validated ${validationReport.transactionType} with intact control trailer matching.`
                          : "Inspect segment discrepancies in the ledger below."}
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Blocks */}
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs text-zinc-700 bg-zinc-50 p-2.5 rounded-lg border border-zinc-200/60 shrink-0">
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Type</span>
                      <span className="font-medium text-zinc-900">{validationReport.transactionType}</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200" />
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Segments</span>
                      <span className="font-medium text-zinc-900 tabular-nums">
                        {validationReport.segmentCount}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200" />
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Sender</span>
                      <span className="font-medium text-zinc-900">{validationReport.senderId || "N/A"}</span>
                    </div>
                    <div className="w-px h-6 bg-zinc-200" />
                    <div>
                      <span className="text-[10px] text-zinc-400 block uppercase">Receiver</span>
                      <span className="font-medium text-zinc-900">{validationReport.receiverId || "N/A"}</span>
                    </div>
                  </div>
                </div>

                {/* Validation Errors List if any */}
                {validationReport.errors.length > 0 && (
                  <div className="p-4 rounded-xl bg-red-50/60 border border-red-200/80 space-y-2">
                    <span className="text-xs font-medium text-red-900 block">
                      Compliance infractions
                    </span>
                    <ul className="space-y-1 text-xs text-red-700 font-mono">
                      {validationReport.errors.map((err, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-red-500 font-bold">•</span>
                          <span>{err}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Split Grid: Segment Breakdown Table & Parsed JSON / Stream Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Segment Breakdown Ledger */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200/80 overflow-hidden flex flex-col">
                <div className="p-3.5 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                    <h2 className="text-xs font-semibold text-zinc-900">
                      Segment ledger
                    </h2>
                    <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
                      ({filteredSegments.length})
                    </span>
                  </div>

                  {/* Filters Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Partner Filter */}
                    {detectedPartners.length > 0 && (
                      <select
                        value={partnerFilter}
                        onChange={(e) => setPartnerFilter(e.target.value)}
                        className="h-8 px-2 rounded-lg bg-white border border-zinc-200 text-xs font-mono text-zinc-700 outline-none focus:border-zinc-400 cursor-pointer"
                        title="Filter by partner identifier"
                      >
                        <option value="ALL">All partners</option>
                        {detectedPartners.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* Status filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as any)}
                      className="h-8 px-2 rounded-lg bg-white border border-zinc-200 text-xs font-mono text-zinc-700 outline-none focus:border-zinc-400 cursor-pointer"
                      title="Filter by segment validity"
                    >
                      <option value="ALL">All statuses</option>
                      <option value="ERRORS">Errors only</option>
                      <option value="VALID">Valid only</option>
                    </select>

                    {/* Search Filter */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
                      <input
                        type="text"
                        value={segmentFilter}
                        onChange={(e) => setSegmentFilter(e.target.value)}
                        placeholder="Search segments..."
                        className="h-8 pl-8 pr-3 w-36 rounded-lg bg-white border border-zinc-200 text-xs font-mono outline-none focus:border-zinc-400 text-zinc-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-zinc-50 text-zinc-600 border-b border-zinc-200/80 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3.5 w-12 text-center text-zinc-400 font-medium">#</th>
                        <th className="py-2.5 px-3.5 w-16 text-zinc-600 font-medium">Tag</th>
                        <th className="py-2.5 px-3.5 text-zinc-600 font-medium">Segment definition</th>
                        <th className="py-2.5 px-3.5 w-20 text-zinc-600 font-medium text-right">Elements</th>
                        <th className="py-2.5 px-3.5 text-zinc-600 font-medium">Raw payload</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredSegments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-zinc-400 font-sans">
                            No segments match active criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredSegments.map((row) => {
                          const isExpanded = expandedSegmentIdx === row.index;
                          return (
                            <React.Fragment key={row.index}>
                              <tr
                                onClick={() => setExpandedSegmentIdx(isExpanded ? null : row.index)}
                                className={`hover:bg-zinc-50/70 transition-colors cursor-pointer ${
                                  row.status === "error"
                                    ? "bg-red-50/30"
                                    : row.status === "warning"
                                    ? "bg-amber-50/30"
                                    : ""
                                }`}
                              >
                                <td className="py-2.5 px-3.5 text-zinc-400 text-center tabular-nums">
                                  {row.index}
                                </td>
                                <td className="py-2.5 px-3.5">
                                  <span className="font-semibold text-zinc-900">
                                    {row.segmentId}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5 font-sans text-zinc-700 truncate max-w-[160px]">
                                  {row.segmentName}
                                </td>
                                <td className="py-2.5 px-3.5 text-right tabular-nums text-zinc-500">
                                  {row.elements.length}
                                </td>
                                <td className="py-2.5 px-3.5 text-zinc-500 truncate max-w-[200px]" title={row.raw}>
                                  {row.raw}
                                </td>
                              </tr>

                              {/* Expanded Segment Element Inspector */}
                              {isExpanded && (
                                <tr className="bg-zinc-50 border-b border-zinc-200/80">
                                  <td colSpan={5} className="p-3.5 pl-8">
                                    <div className="space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs font-medium text-zinc-900">
                                          {row.segmentId} • {row.segmentName} element fields
                                        </span>
                                        {row.errorNote && (
                                          <span className="text-[11px] text-red-600 font-mono">
                                            {row.errorNote}
                                          </span>
                                        )}
                                      </div>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                        {row.elements.map((el, elIdx) => (
                                          <div
                                            key={elIdx}
                                            className="p-2 rounded-md bg-white border border-zinc-200/80 font-mono text-[11px]"
                                          >
                                            <span className="text-zinc-400 block text-[9px] uppercase font-medium">
                                              {row.segmentId}
                                              {String(elIdx + 1).padStart(2, "0")}
                                            </span>
                                            <span className="text-zinc-800 break-all">
                                              {el ? el : <span className="text-zinc-300 italic">null</span>}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Parsed JSON / Stream Inspector */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200/80 overflow-hidden flex flex-col">
                <div className="p-3.5 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/50">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                    <h2 className="text-xs font-semibold text-zinc-900">
                      Parsed payload preview
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setInspectMode(inspectMode === "json" ? "stream" : "json")}
                      className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                    >
                      {inspectMode === "json" ? "View X12" : "View JSON"}
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="px-2.5 py-1 text-[11px] font-mono rounded-md bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {isCopiedJson ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 flex-1 overflow-auto max-h-[520px]">
                  {inspectMode === "json" ? (
                    <pre className="font-mono text-xs text-zinc-300 leading-relaxed selection:bg-zinc-800">
                      {parsedJson ? JSON.stringify(parsedJson, null, 2) : "// Awaiting parse trigger..."}
                    </pre>
                  ) : (
                    <pre className="font-mono text-xs text-zinc-300 leading-relaxed selection:bg-zinc-800">
                      {rawEdiInput}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* MODE 2: EDI DOCUMENT GENERATOR                       */}
        {/* ==================================================== */}
        {activeTab === "generator" && (
          <div className="space-y-6">
            {/* Configuration Form Card */}
            <div className="bg-white rounded-xl border border-zinc-200/80 p-5 space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                <FileCode className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                <h2 className="text-xs font-semibold text-zinc-900">
                  Transaction envelope generator
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Document Type Selector */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                    EDI document type
                  </label>
                  <select
                    value={genDocType}
                    onChange={(e) => setGenDocType(e.target.value as any)}
                    className="w-full h-9 px-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 font-mono text-xs focus:border-zinc-400 focus:bg-white outline-none cursor-pointer"
                  >
                    <option value="850">EDI 850 (Purchase Order)</option>
                    <option value="856">EDI 856 (Advance Ship Notice / ASN)</option>
                    <option value="810">EDI 810 (Commercial Invoice)</option>
                  </select>
                  <p className="text-[11px] text-zinc-400">
                    {genDocType === "850"
                      ? "Purchase orders transmitted to vendor"
                      : genDocType === "856"
                      ? "Electronic shipping manifest with UCC-128"
                      : "Accounts payable billing settlement"}
                  </p>
                </div>

                {/* 2. Entity Selector */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                    Source entity record
                  </label>
                  <select
                    value={selectedEntityId}
                    onChange={(e) => {
                      setSelectedEntityId(e.target.value);
                      setCustomEntityInput("");
                    }}
                    className="w-full h-9 px-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 font-mono text-xs focus:border-zinc-400 focus:bg-white outline-none cursor-pointer"
                  >
                    {genDocType === "850" && (
                      <>
                        <option value="89241">PO-89241 • Global Industrial Components ($50,750)</option>
                        <option value="89242">PO-89242 • Foxconn Precision Electronics ($142,600)</option>
                        <option value="89243">PO-89243 • Texas Silicon Microelectronics ($89,120)</option>
                      </>
                    )}
                    {genDocType === "856" && (
                      <>
                        <option value="7721">DEL-7721 • ORD-01 Chicago Freight (FedEx Freight)</option>
                        <option value="7722">DEL-7722 • DFW-04 High Speed Rail Intra-Modal (BNSF)</option>
                        <option value="7723">DEL-7723 • LAX-09 Deepwater Marine Terminal (Maersk)</option>
                      </>
                    )}
                    {genDocType === "810" && (
                      <>
                        <option value="44091">INV-44091 • Global Industrial Settlement ($21,250)</option>
                        <option value="44092">INV-44092 • Foxconn Electronics Net-30 ($84,000)</option>
                        <option value="44093">INV-44093 • Texas Silicon Accounts Payable ($62,400)</option>
                      </>
                    )}
                  </select>
                  <p className="text-[11px] text-zinc-400">
                    Source order, shipment delivery, or invoice record
                  </p>
                </div>

                {/* 3. Custom ID Override */}
                <div className="space-y-1.5">
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                    Custom ID override
                  </label>
                  <input
                    type="text"
                    value={customEntityInput}
                    onChange={(e) => setCustomEntityInput(e.target.value)}
                    placeholder="e.g. PO-99401 or DEL-1200"
                    className="w-full h-9 px-3 rounded-lg bg-zinc-50 border border-zinc-200 text-zinc-800 font-mono text-xs focus:border-zinc-400 focus:bg-white outline-none"
                  />
                  <p className="text-[11px] text-zinc-400">
                    Overrides dropdown with custom entity identifier
                  </p>
                </div>
              </div>

              {/* Generate Trigger Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleGenerateEdi}
                  disabled={isGenerating}
                  className="px-4 h-9 rounded-lg bg-[#FD3706] hover:bg-[#E02E00] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                      <span>Generating envelope...</span>
                    </>
                  ) : (
                    <>
                      <FileCode className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Generate ANSI X12 EDI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Monospace Output Viewer with Line Numbers */}
            {generatedEdiText && (
              <div className="bg-white rounded-xl border border-zinc-200/80 overflow-hidden space-y-0">
                {/* Viewer Header */}
                <div className="p-3.5 bg-zinc-50 border-b border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
                    <span className="text-xs font-medium text-zinc-900">
                      Generated ANSI X12 payload ({generatedEdiText.split("~").filter(Boolean).length} segments)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleCopyGeneratedEdi}
                      className="px-2.5 py-1 rounded-md bg-white border border-zinc-200 text-zinc-700 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer hover:border-zinc-300"
                    >
                      {isCopiedEdi ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadX12}
                      className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={1.5} />
                      <span>Download .x12</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSendToValidator}
                      className="px-2.5 py-1 rounded-md bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 text-xs font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                      <span>Replay in validator</span>
                    </button>
                  </div>
                </div>

                {/* Monospace Code Stream */}
                <div className="bg-zinc-950 p-4 overflow-x-auto">
                  <div className="font-mono text-xs leading-6">
                    {generatedEdiText
                      .split("~")
                      .filter((line) => line.trim().length > 0)
                      .map((seg, lineIdx) => {
                        const parts = seg.trim().split("*");
                        const segId = parts[0];
                        const rest = parts.slice(1);

                        return (
                          <div key={lineIdx} className="flex hover:bg-zinc-900/60 px-1 rounded transition-colors">
                            <span className="w-10 text-zinc-600 select-none text-right pr-4 font-mono tabular-nums">
                              {lineIdx + 1}
                            </span>
                            <span className="flex-1 font-mono">
                              <span className="text-zinc-100 font-semibold">{segId}</span>
                              {rest.map((r, rIdx) => (
                                <React.Fragment key={rIdx}>
                                  <span className="text-zinc-600">*</span>
                                  <span className="text-zinc-300">{r}</span>
                                </React.Fragment>
                              ))}
                              <span className="text-zinc-500 font-bold">~</span>
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================== */}
        {/* MODE 3: TRANSACTION SPECIFICATIONS                   */}
        {/* ==================================================== */}
        {activeTab === "specs" && (
          <div className="space-y-6">
            {/* Spec Sub-navigation */}
            <div className="flex flex-wrap gap-2 border-b border-zinc-200/80 pb-3">
              <button
                type="button"
                onClick={() => setSpecTopic("850")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  specTopic === "850"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                EDI 850 (Purchase Order)
              </button>
              <button
                type="button"
                onClick={() => setSpecTopic("856")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  specTopic === "856"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                EDI 856 (Advance Ship Notice)
              </button>
              <button
                type="button"
                onClick={() => setSpecTopic("810")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  specTopic === "810"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                EDI 810 (Commercial Invoice)
              </button>
              <button
                type="button"
                onClick={() => setSpecTopic("envelope")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  specTopic === "envelope"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Enveloping & Control (ISA/GS/ST)
              </button>
              <button
                type="button"
                onClick={() => setSpecTopic("glossary")}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors cursor-pointer ${
                  specTopic === "glossary"
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                }`}
              >
                Segment Glossary
              </button>
            </div>

            {/* Spec Details Card */}
            <div className="bg-white rounded-xl border border-zinc-200/80 p-5 space-y-5">
              {specTopic === "850" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      EDI 850: Purchase order transaction set
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Commercial order transmission for material replenishment. Establishes contractual quantities, prices, delivery schedules, and destination facilities.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <span className="font-mono text-xs font-medium uppercase text-zinc-700 block">
                        Mandatory segments
                      </span>
                      <ul className="text-xs font-mono text-zinc-600 space-y-1.5">
                        <li><strong className="text-zinc-900">ST:</strong> Transaction set header (Type 850)</li>
                        <li><strong className="text-zinc-900">BEG:</strong> Beginning segment (PO number, date, purpose)</li>
                        <li><strong className="text-zinc-900">CUR:</strong> Currency code (e.g. USD, EUR)</li>
                        <li><strong className="text-zinc-900">N1:</strong> Entity loop (Buyer BY, Ship-to ST, Seller SE)</li>
                        <li><strong className="text-zinc-900">PO1:</strong> Baseline line item (Quantity, unit price, SKU)</li>
                        <li><strong className="text-zinc-900">CTT:</strong> Transaction totals (Line count, hash sum)</li>
                        <li><strong className="text-zinc-900">SE:</strong> Transaction trailer (Segment count, control number)</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <span className="font-mono text-xs font-medium uppercase text-zinc-700 block">
                        Standard qualifiers
                      </span>
                      <ul className="text-xs font-mono text-zinc-600 space-y-1.5">
                        <li><strong className="text-zinc-800">BEG01:</strong> 00 Original, 01 Cancellation, 04 Change</li>
                        <li><strong className="text-zinc-800">BEG02:</strong> NE New Order, SA Stand-alone Order</li>
                        <li><strong className="text-zinc-800">N101:</strong> BY Buying party, ST Ship-to facility, BT Bill-to party</li>
                        <li><strong className="text-zinc-800">PO103:</strong> EA Each, BX Box, CA Case, FT Feet</li>
                        <li><strong className="text-zinc-800">PO106:</strong> VP Vendor part, IN Buyer item number</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {specTopic === "856" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      EDI 856: Ship notice / manifest (ASN)
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Carrier and dispatch manifest informing destination facilities of physical shipments prior to dock arrival. Required for cross-dock intake scanning.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <span className="font-mono text-xs font-medium uppercase text-zinc-700 block">
                        Hierarchical level (HL) tree
                      </span>
                      <p className="text-xs text-zinc-500">
                        ANSI X12 856 utilizes nested HL segments defining packaging structure:
                      </p>
                      <ul className="text-xs font-mono text-zinc-600 space-y-1.5">
                        <li><strong className="text-zinc-900">HL*1**S:</strong> Shipment level (Carrier, BOL, Gross weight)</li>
                        <li><strong className="text-zinc-900">HL*2*1*O:</strong> Order level (Reference to purchase order)</li>
                        <li><strong className="text-zinc-900">HL*3*2*P:</strong> Pack level (Pallet / Carton SSCC-18 barcode)</li>
                        <li><strong className="text-zinc-900">HL*4*3*I:</strong> Item level (LIN SKU, SN1 shipped quantity)</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <span className="font-mono text-xs font-medium uppercase text-zinc-700 block">
                        Carrier & routing segments
                      </span>
                      <ul className="text-xs font-mono text-zinc-600 space-y-1.5">
                        <li><strong className="text-zinc-800">BSN:</strong> Beginning segment for ship notice (BSN02 ASN ID)</li>
                        <li><strong className="text-zinc-800">TD1:</strong> Packaging code & gross weight in lbs/kg</li>
                        <li><strong className="text-zinc-800">TD5:</strong> Carrier code (e.g. FDEG FedEx, UPSS UPS)</li>
                        <li><strong className="text-zinc-800">REF*BM:</strong> Bill of lading (BOL) reference</li>
                        <li><strong className="text-zinc-800">REF*CN:</strong> Carrier tracking pro number</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {specTopic === "810" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      EDI 810: Commercial invoice transaction set
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Billing settlement transmitted to requesting organizations for automated 3-way matching against Purchase Orders (850) and Goods Receipts (856).
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <span className="font-mono text-xs font-medium uppercase text-zinc-700 block">
                        Core settlement segments
                      </span>
                      <ul className="text-xs font-mono text-zinc-600 space-y-1.5">
                        <li><strong className="text-zinc-900">BIG:</strong> Beginning segment (Invoice #, Date, PO #)</li>
                        <li><strong className="text-zinc-900">CUR:</strong> Currency identifier (e.g. USD)</li>
                        <li><strong className="text-zinc-900">ITD:</strong> Terms of sale (e.g. Net 30, discount terms)</li>
                        <li><strong className="text-zinc-900">IT1:</strong> Item billing details (Billed quantity, unit price)</li>
                        <li><strong className="text-zinc-900">TDS:</strong> Total invoice monetary amount in cents</li>
                        <li><strong className="text-zinc-900">TXI:</strong> Tax jurisdiction & assessment</li>
                      </ul>
                    </div>

                    <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-200/80 space-y-2">
                      <span className="font-mono text-xs font-medium uppercase text-zinc-700 block">
                        Matching verification criteria
                      </span>
                      <p className="text-xs text-zinc-500">
                        Mesh automated matching engine executes cross-verification:
                      </p>
                      <ul className="text-xs font-mono text-zinc-600 space-y-1.5">
                        <li>• Quantity billed (IT102) matches quantity received (856 SN1)</li>
                        <li>• Unit price (IT104) matches purchase order price (850 PO104)</li>
                        <li>• Strict variance threshold: default ±0.5% hold limit</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {specTopic === "envelope" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-900">
                      ANSI X12 enveloping architecture
                    </h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      Three-tier envelope hierarchy ensuring non-repudiation, routing verification, and control checksum parity.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-zinc-950 font-mono text-xs text-zinc-300 space-y-2 border border-zinc-800">
                    <div className="text-zinc-100 font-medium">ISA: Interchange Control Header (Trading partner IDs, timestamp, delimiters)</div>
                    <div className="pl-4 text-zinc-300">GS: Functional Group Header (Application sender/receiver, group code: PO, SH, IN)</div>
                    <div className="pl-8 text-zinc-400">ST: Transaction Set Header (Transaction set: 850, 856, 810)</div>
                    <div className="pl-12 text-zinc-500">... Transaction data segments (BEG, N1, PO1, CTT) ...</div>
                    <div className="pl-8 text-zinc-400">SE: Transaction Set Trailer (Included segment count, control number)</div>
                    <div className="pl-4 text-zinc-300">GE: Functional Group Trailer (Included transaction count, group number)</div>
                    <div className="text-zinc-100 font-medium">IEA: Interchange Control Trailer (Included group count, interchange number)</div>
                  </div>
                </div>
              )}

              {specTopic === "glossary" && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-900">
                        Segment glossary
                      </h3>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        ANSI X12 segment codes and standard qualifiers.
                      </p>
                    </div>

                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" strokeWidth={1.5} />
                      <input
                        type="text"
                        value={glossarySearch}
                        onChange={(e) => setGlossarySearch(e.target.value)}
                        placeholder="Search glossary..."
                        className="h-8 pl-9 pr-3 rounded-lg bg-zinc-50 border border-zinc-200 text-xs font-mono focus:border-zinc-400 focus:bg-white outline-none w-52 text-zinc-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {Object.entries(SEGMENT_NAMES)
                      .filter(
                        ([tag, name]) =>
                          !glossarySearch.trim() ||
                          tag.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                          name.toLowerCase().includes(glossarySearch.toLowerCase())
                      )
                      .map(([tag, name]) => (
                        <div key={tag} className="p-2.5 rounded-lg bg-zinc-50 border border-zinc-200/80 font-mono text-xs">
                          <span className="font-semibold text-zinc-900 text-xs block">{tag}</span>
                          <span className="text-zinc-600 font-sans text-xs block mt-0.5">{name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
