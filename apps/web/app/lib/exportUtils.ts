import * as XLSX from "xlsx";

export interface ExportColumn<T = any> {
  key: string;
  header: string;
  formatter?: (value: any, row: T) => any;
}

/**
 * Regular expression to detect standard ISO 8601 date strings.
 */
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Format a Date object cleanly into YYYY-MM-DD or readable string with time.
 */
function formatDate(d: Date): string {
  if (isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();

  // If time is 00:00:00 (pure date), format as YYYY-MM-DD
  if (hours === 0 && minutes === 0 && seconds === 0) {
    return `${year}-${month}-${day}`;
  }
  const hh = String(hours).padStart(2, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${year}-${month}-${day} ${hh}:${mm}:${ss}`;
}

/**
 * Extract human-readable string labels from nested objects.
 * Prevents "[object Object]" bugs by inspecting common domain properties.
 */
function extractObjectLabel(obj: Record<string, any>): string {
  // Predefined display keys common across the application models
  const candidateKeys = [
    "name",
    "label",
    "title",
    "companyName",
    "CompanyName",
    "groupName",
    "GroupName",
    "customerName",
    "CustomerName",
    "providerName",
    "ProviderName",
    "productName",
    "ProductName",
    "warehouseName",
    "WarehouseName",
    "locationName",
    "LocationName",
    "userName",
    "UserName",
    "userEmail",
    "UserEmail",
    "email",
    "code",
    "Code",
    "companyCode",
    "CompanyCode",
    "productCode",
    "ProductCode",
    "groupCode",
    "GroupCode",
    "description",
    "Description",
    "value",
    "id",
    "_id",
  ];

  for (const k of candidateKeys) {
    const val = obj[k];
    if (val !== undefined && val !== null) {
      if (typeof val === "string" && val.trim() !== "") {
        return val.trim();
      }
      if (typeof val === "number") {
        return String(val);
      }
    }
  }

  // Fallback 1: First non-empty string property that isn't private / metadata
  const stringEntries = Object.entries(obj).filter(
    ([k, v]) => !k.startsWith("_") && !k.startsWith("$") && typeof v === "string" && v.trim() !== ""
  );
  if (stringEntries.length > 0) {
    return (stringEntries[0][1] as string).trim();
  }

  // Fallback 2: Key-value summary of primitive properties
  const primitiveEntries = Object.entries(obj).filter(
    ([k, v]) => !k.startsWith("_") && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
  );
  if (primitiveEntries.length > 0) {
    return primitiveEntries.map(([k, v]) => `${k}: ${v}`).join(", ");
  }

  return "";
}

/**
 * Safely resolves nested property paths using dot notation (e.g. "company.companyName").
 */
export function getRowValue(row: any, key: string): any {
  if (row === null || row === undefined) return "";
  if (key in row) {
    return row[key];
  }
  if (key.includes(".")) {
    const parts = key.split(".");
    let current = row;
    for (const part of parts) {
      if (current === null || current === undefined) return "";
      current = current[part];
    }
    return current;
  }
  return (row as Record<string, any>)[key];
}

/**
 * Format any cell value into a clean, human-readable string or clean number.
 * - Formats dates to YYYY-MM-DD or readable string.
 * - Prevents "[object Object]" by extracting nested object labels/names.
 * - Formats numbers cleanly (resolving floating point imprecisions).
 * - Formats booleans to "Yes" / "No".
 * - Formats arrays to comma-separated values.
 */
export function formatCellValue(val: any): string | number {
  if (val === null || val === undefined) {
    return "";
  }

  // Date object handling
  if (val instanceof Date) {
    return formatDate(val);
  }

  // ISO date string handling
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (ISO_DATE_REGEX.test(trimmed)) {
      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        return formatDate(parsedDate);
      }
    }
    return trimmed;
  }

  // Number handling: eliminate floating point issues e.g. 0.10000000000000002
  if (typeof val === "number") {
    if (isNaN(val) || !isFinite(val)) return "";
    if (Number.isInteger(val)) return val;
    return Number(Math.round(Number(val + "e+6")) + "e-6");
  }

  // Boolean handling
  if (typeof val === "boolean") {
    return val ? "Yes" : "No";
  }

  // Array handling
  if (Array.isArray(val)) {
    return val
      .map((item) => formatCellValue(item))
      .filter((formatted) => formatted !== "")
      .join(", ");
  }

  // Nested object handling
  if (typeof val === "object") {
    return extractObjectLabel(val);
  }

  return String(val);
}

/**
 * 1-Click native Export to Microsoft Excel (.xlsx) using the xlsx library.
 *
 * @param data Array of records to export
 * @param columns Array of column definitions with key and header title
 * @param filename Desired filename (without or with .xlsx extension)
 */
export function exportToExcel<T = any>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = "export"
): void {
  if (!data || data.length === 0) {
    console.warn("exportToExcel: No data to export");
  }

  // Map objects to column headers: { [col.header]: formattedValue }
  const rows = (data || []).map((item) => {
    const rowObj: Record<string, any> = {};
    for (const col of columns) {
      const rawValue = getRowValue(item, col.key);
      const val = col.formatter ? col.formatter(rawValue, item) : formatCellValue(rawValue);
      rowObj[col.header] = val ?? "";
    }
    return rowObj;
  });

  // Create worksheet using XLSX.utils.json_to_sheet(rows)
  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set column widths automatically based on max cell content length + padding
  const colWidths = columns.map((col) => {
    let maxLen = (col.header || "").toString().length;
    for (const row of rows) {
      const cellVal = row[col.header];
      const cellLen = cellVal !== null && cellVal !== undefined ? String(cellVal).length : 0;
      if (cellLen > maxLen) {
        maxLen = cellLen;
      }
    }
    // Padding of 3 chars, minimum width 10, max capped at 60 for clean presentation
    return { wch: Math.min(Math.max(maxLen + 3, 10), 60) };
  });
  worksheet["!cols"] = colWidths;

  // Create workbook using XLSX.utils.book_new(), append sheet, call XLSX.writeFile
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

  const cleanFilename = (filename || "export").replace(/\.(xlsx|csv)$/i, "").trim() || "export";
  XLSX.writeFile(workbook, `${cleanFilename}.xlsx`);
}

/**
 * 1-Click native Export to CSV (.csv) with UTF-8 BOM for Microsoft Excel compatibility.
 *
 * @param data Array of records to export
 * @param columns Array of column definitions with key and header title
 * @param filename Desired filename (without or with .csv extension)
 */
export function exportToCSV<T = any>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string = "export"
): void {
  if (!data || data.length === 0) {
    console.warn("exportToCSV: No data to export");
  }

  // Map objects to column headers: { [col.header]: formattedValue }
  const rows = (data || []).map((item) => {
    const rowObj: Record<string, any> = {};
    for (const col of columns) {
      const rawValue = getRowValue(item, col.key);
      const val = col.formatter ? col.formatter(rawValue, item) : formatCellValue(rawValue);
      rowObj[col.header] = val ?? "";
    }
    return rowObj;
  });

  // Use XLSX.utils.json_to_sheet and XLSX.utils.sheet_to_csv for standard RFC 4180 CSV generation
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const csvContent = XLSX.utils.sheet_to_csv(worksheet);

  // Prepend UTF-8 BOM (\uFEFF) so Excel opens UTF-8 CSV with special characters properly
  if (typeof window !== "undefined") {
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const cleanFilename = (filename || "export").replace(/\.(xlsx|csv)$/i, "").trim() || "export";

    const link = document.createElement("a");
    link.href = url;
    link.download = `${cleanFilename}.csv`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
