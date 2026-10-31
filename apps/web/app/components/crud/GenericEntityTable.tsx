"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Flag,
  Bookmark,
  RotateCcw,
  CheckCircle,
  Truck,
  Package,
  XCircle,
  Download,
  FileSpreadsheet,
  Rows,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { exportToExcel, exportToCSV, ExportColumn } from "@/app/lib/exportUtils";

export interface ColumnConfig<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortType?: "alphanumeric" | "numeric" | "date" | "string";
  editable?: boolean;
}

export interface GenericEntityTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  idKey: keyof T;
  searchKey?: keyof T;
  searchPlaceholder?: string;
  selectedItem?: T | null;
  onSelect: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onCellEdit?: (item: T, field: keyof T | string, newValue: any) => Promise<void> | void;
  onBulkAction?: (
    action: "approve" | "mark_shipped" | "cancel" | "requisition" | string,
    selectedIds: string[],
    selectedItems: T[]
  ) => void | Promise<void>;
  emptyMessage?: string;
  entityName?: string;
  exportFileName?: string;
}

// Deeply extract searchable strings from nested objects to prevent [object Object] bug
function extractSearchableStrings(val: any, depth = 0): string[] {
  if (val === null || val === undefined || depth > 4) return [];
  if (typeof val === "object") {
    if (val instanceof Date) {
      return [val.toISOString(), val.toLocaleDateString()];
    }
    const results: string[] = [];
    for (const v of Object.values(val)) {
      results.push(...extractSearchableStrings(v, depth + 1));
    }
    return results;
  }
  return [String(val)];
}

// Robust sort value parser for numeric, currency, date, and string values
function parseSortValue(val: any, explicitType?: "alphanumeric" | "numeric" | "date" | "string") {
  if (val === null || val === undefined || val === "") {
    return { isNull: true, num: 0, str: "", date: 0, type: "null" as const };
  }

  if (explicitType === "numeric") {
    const cleaned = String(val).replace(/[^0-9.-]+/g, "");
    const num = parseFloat(cleaned);
    return { isNull: false, num: isNaN(num) ? 0 : num, str: String(val), date: 0, type: "number" as const };
  }

  if (explicitType === "date") {
    const time = new Date(val).getTime();
    return { isNull: false, num: 0, str: String(val), date: isNaN(time) ? 0 : time, type: "date" as const };
  }

  if (typeof val === "number") {
    return { isNull: false, num: val, str: String(val), date: 0, type: "number" as const };
  }

  if (val instanceof Date) {
    return { isNull: false, num: 0, str: "", date: val.getTime(), type: "date" as const };
  }

  const str = String(val).trim();

  // Currency or formatted number check (e.g. "$1,000", "20.50", "-5%")
  const numCandidate = str.replace(/[^0-9.-]+/g, "");
  if (numCandidate !== "" && !isNaN(Number(numCandidate)) && /^[-+]?\$?[\d,]+(\.\d+)?%?$/.test(str)) {
    const num = parseFloat(numCandidate);
    return { isNull: false, num, str, date: 0, type: "number" as const };
  }

  // Date string check (e.g. "2026-03-01", "2026-03-01T12:00:00Z")
  if (str.length >= 8 && (str.includes("-") || str.includes("/")) && !/^\d+$/.test(str)) {
    const time = Date.parse(str);
    if (!isNaN(time)) {
      return { isNull: false, num: 0, str, date: time, type: "date" as const };
    }
  }

  return { isNull: false, num: 0, str: str.toLowerCase(), date: 0, type: "string" as const };
}

function compareValues(rawA: any, rawB: any, explicitType?: "alphanumeric" | "numeric" | "date" | "string"): number {
  const a = parseSortValue(rawA, explicitType);
  const b = parseSortValue(rawB, explicitType);

  if (a.isNull && b.isNull) return 0;
  if (a.isNull) return 1;
  if (b.isNull) return -1;

  if (explicitType === "numeric" || a.type === "number" || b.type === "number") {
    return a.num - b.num;
  }
  if (explicitType === "date" || a.type === "date" || b.type === "date") {
    return a.date - b.date;
  }
  return a.str.localeCompare(b.str, undefined, { numeric: true, sensitivity: "base" });
}

// Sentence-case humanizer for status values
function formatSentenceCase(str: string): string {
  const clean = str.replace(/_/g, " ").trim();
  if (!clean) return "";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

// Quiet status badge with 6px status dot adhering to Mesh graphite neutral ramp
function renderStatusText(val: string) {
  const s = String(val).trim().toUpperCase();
  const label = formatSentenceCase(val);

  // Emerald - In stock, Active, Completed, Delivered, Paid, Low risk/Safe
  if (
    s.includes("IN STOCK") ||
    s.includes("DELIVER") ||
    s.includes("PAID") ||
    s.includes("COMPLET") ||
    s.includes("ACTIVE") ||
    s.includes("SAFE") ||
    s.includes("NORMAL") ||
    s.includes("GOOD") ||
    s === "LOW" ||
    s === "SUCCESS"
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
        {label}
      </span>
    );
  }

  // Amber - Low Stock, Warning, Medium, Pending, Processing, In Transit
  if (
    s.includes("LOW STOCK") ||
    s.includes("WARN") ||
    s.includes("PEND") ||
    s.includes("PROCESS") ||
    s.includes("TRANSIT") ||
    s.includes("MED") ||
    s.includes("REORDER")
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
        {label}
      </span>
    );
  }

  // Rose - Out of Stock, Critical, High, Alert, Cancelled, Failed, Overdue
  if (
    s.includes("OUT OF STOCK") ||
    s.includes("CRIT") ||
    s.includes("HIGH") ||
    s.includes("ALERT") ||
    s.includes("CANCEL") ||
    s.includes("FAIL") ||
    s.includes("OVERDUE") ||
    s.includes("REFUND")
  ) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200/60">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
        {label}
      </span>
    );
  }

  // Neutral - Inactive, Draft, Standalone, etc.
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-zinc-600 bg-zinc-100 border border-zinc-200/80">
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
      {label}
    </span>
  );
}

interface InlineCellProps<T> {
  item: T;
  col: ColumnConfig<T>;
  idKey: keyof T;
  isEditing: boolean;
  isEditable: boolean;
  density: "compact" | "standard";
  onStartEdit: (rowId: string, colKey: string) => void;
  onSave: (item: T, colKey: string, newValue: string) => Promise<void>;
  onCancel: () => void;
  onTabNext: (shiftKey: boolean) => void;
}

function InlineCell<T extends Record<string, any>>({
  item,
  col,
  idKey,
  isEditing,
  isEditable,
  density,
  onStartEdit,
  onSave,
  onCancel,
  onTabNext,
}: InlineCellProps<T>) {
  const initialValue = item[col.key as keyof T];
  const [localVal, setLocalVal] = useState<string>(
    initialValue !== undefined && initialValue !== null ? String(initialValue) : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      const v = item[col.key as keyof T];
      setLocalVal(v !== undefined && v !== null ? String(v) : "");
      requestAnimationFrame(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      });
    }
  }, [isEditing, item, col.key]);

  if (isEditing) {
    return (
      <div className="w-full flex items-center" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={localVal}
          disabled={isSaving}
          onChange={(e) => setLocalVal(e.target.value)}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.stopPropagation();
              setIsSaving(true);
              try {
                await onSave(item, String(col.key), localVal);
              } finally {
                setIsSaving(false);
                onCancel();
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              e.stopPropagation();
              onCancel();
            } else if (e.key === "Tab") {
              e.preventDefault();
              e.stopPropagation();
              setIsSaving(true);
              try {
                await onSave(item, String(col.key), localVal);
              } finally {
                setIsSaving(false);
                onTabNext(e.shiftKey);
              }
            }
          }}
          onBlur={async () => {
            setIsSaving(true);
            try {
              await onSave(item, String(col.key), localVal);
            } finally {
              setIsSaving(false);
              onCancel();
            }
          }}
          className={cn(
            "w-full min-w-[60px] rounded-md border border-zinc-900 bg-white font-mono tabular-nums text-xs text-zinc-900 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-zinc-900",
            density === "compact" ? "h-6 px-1.5 py-0" : "h-7 px-2 py-0.5"
          )}
        />
      </div>
    );
  }

  let content: React.ReactNode;
  if (col.render) {
    content = col.render(item);
  } else {
    const val = item[col.key as keyof T];
    if (val === undefined || val === null) {
      content = <span className="text-xs text-zinc-400">—</span>;
    } else {
      const strVal = String(val);
      const colKeyLower = String(col.key).toLowerCase();

      if (
        colKeyLower.includes("priority") ||
        colKeyLower.includes("risk") ||
        colKeyLower.includes("status") ||
        colKeyLower.includes("state")
      ) {
        content = renderStatusText(strVal);
      } else if (
        colKeyLower.includes("code") ||
        colKeyLower.includes("sku") ||
        colKeyLower.endsWith("id") ||
        colKeyLower.includes("number")
      ) {
        content = (
          <span className="font-mono tabular-nums text-xs font-medium bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/80">
            {strVal}
          </span>
        );
      } else if (
        colKeyLower.includes("price") ||
        colKeyLower.includes("cost") ||
        colKeyLower.includes("amount") ||
        colKeyLower.includes("rate") ||
        colKeyLower.includes("total") ||
        colKeyLower.includes("balance") ||
        colKeyLower.includes("qty") ||
        colKeyLower.includes("quantity") ||
        colKeyLower.includes("count") ||
        colKeyLower.includes("date") ||
        colKeyLower.includes("time")
      ) {
        content = <span className="text-xs font-mono tabular-nums text-zinc-900">{strVal}</span>;
      } else {
        content = <span className="text-xs font-normal text-zinc-800">{strVal}</span>;
      }
    }
  }

  if (isEditable) {
    return (
      <div
        onDoubleClick={(e) => {
          e.stopPropagation();
          onStartEdit(String(item[idKey]), String(col.key));
        }}
        title="Double-click to edit cell"
        className="w-full flex items-center justify-between group/cell cursor-pointer"
      >
        <div className="truncate">{content}</div>
        <Edit2 className="w-3 h-3 text-zinc-400 opacity-0 group-hover/cell:opacity-100 ml-1 shrink-0 transition-opacity" />
      </div>
    );
  }

  return <>{content}</>;
}

export default function GenericEntityTable<T extends Record<string, any>>({
  data,
  columns: columnConfigs,
  idKey,
  searchKey,
  searchPlaceholder = "Search records...",
  selectedItem,
  onSelect,
  onEdit,
  onDelete,
  onCellEdit,
  onBulkAction,
  emptyMessage = "No records found.",
  entityName,
  exportFileName,
}: GenericEntityTableProps<T>) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("search") || "";
  const initialId = searchParams.get("id") || "";

  // Density Mode State (compact: 32px vs standard: 36px)
  const [density, setDensity] = useState<"compact" | "standard">("compact");

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialQuery);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  // Inline Cell Editing State
  const [editingCell, setEditingCell] = useState<{ rowId: string; colKey: string } | null>(null);

  const tableScrollRef = useRef<HTMLDivElement>(null);
  const autoSelectedRef = useRef(false);

  // Auto-select record once if specified in URL query on initial load
  useEffect(() => {
    if (initialId && data.length > 0 && !autoSelectedRef.current) {
      const match = data.find((item) => String(item[idKey]) === initialId);
      if (match) {
        autoSelectedRef.current = true;
        onSelect(match);
      }
    }
  }, [initialId, data, idKey, onSelect]);

  // Determine if a column is editable
  const isColEditable = useCallback(
    (col: ColumnConfig<T>): boolean => {
      if (!onCellEdit) return false;
      if (col.editable === false) return false;
      if (col.editable === true) return true;
      // If undefined: auto-editable for text/numeric fields when no custom render
      return !col.render;
    },
    [onCellEdit]
  );

  // Editable column keys for tab navigation
  const editableColKeys = useMemo(() => {
    if (!onCellEdit) return [];
    return columnConfigs.filter(isColEditable).map((c) => String(c.key));
  }, [columnConfigs, onCellEdit, isColEditable]);

  // Handle commit save for cell
  const handleSaveCell = useCallback(
    async (item: T, colKey: string, newValue: string) => {
      if (!onCellEdit) return;
      const originalValue = item[colKey as keyof T];
      if (String(originalValue ?? "") === newValue) return;

      try {
        let parsed: any = newValue;
        if (typeof originalValue === "number" && !isNaN(Number(newValue)) && newValue.trim() !== "") {
          parsed = Number(newValue);
        }
        await onCellEdit(item, colKey, parsed);
      } catch (err) {
        console.error("Failed to commit cell edit:", err);
      }
    },
    [onCellEdit]
  );

  const handleStartEdit = useCallback((rowId: string, colKey: string) => {
    setEditingCell({ rowId, colKey });
  }, []);

  const handleCancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const handleTabNext = useCallback(
    (item: T, colKey: string, shiftKey: boolean) => {
      const currentIndex = editableColKeys.indexOf(colKey);
      if (currentIndex !== -1) {
        const nextIndex = shiftKey ? currentIndex - 1 : currentIndex + 1;
        if (nextIndex >= 0 && nextIndex < editableColKeys.length) {
          const nextColKey = editableColKeys[nextIndex];
          setEditingCell({
            rowId: String(item[idKey]),
            colKey: nextColKey,
          });
          return;
        }
      }
      setEditingCell(null);
    },
    [editableColKeys, idKey]
  );

  // Selected item objects array for bulk actions
  const selectedItems = useMemo(() => {
    return data.filter((item) => selectedRowIds.has(String(item[idKey])));
  }, [data, selectedRowIds, idKey]);

  // Export Columns definition
  const exportColumns: ExportColumn[] = useMemo(() => {
    return columnConfigs.map((col) => ({
      key: String(col.key),
      header: col.header,
    }));
  }, [columnConfigs]);

  const baseFilename = exportFileName || entityName || "mesh-export";

  // Bulk action dispatcher
  const handleBulkAction = useCallback(
    (action: "approve" | "mark_shipped" | "cancel" | "requisition" | string) => {
      const ids = Array.from(selectedRowIds);
      if (onBulkAction) {
        onBulkAction(action, ids, selectedItems);
      } else {
        console.info(`[Bulk Action] ${action}:`, ids, selectedItems);
      }
    },
    [onBulkAction, selectedRowIds, selectedItems]
  );

  const columns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    // Checkbox selection column (col index 0)
    cols.push({
      id: "select",
      header: () => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label="Select all records on current page"
            checked={data.length > 0 && selectedRowIds.size === data.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowIds(new Set(data.map((d) => String(d[idKey]))));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
            className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#FD3706] text-zinc-900 focus:ring-1 focus:ring-zinc-900 cursor-pointer"
          />
        </div>
      ),
      cell: ({ row }) => {
        const id = String(row.original[idKey]);
        const isChecked = selectedRowIds.has(id);
        const recordLabel = row.original.ProductName || row.original.CustomerName || row.original.ProviderName || id;
        return (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label={`Select record ${recordLabel}`}
              checked={isChecked}
              onChange={(e) => {
                const next = new Set(selectedRowIds);
                if (e.target.checked) {
                  next.add(id);
                } else {
                  next.delete(id);
                }
                setSelectedRowIds(next);
              }}
              className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#FD3706] text-zinc-900 focus:ring-1 focus:ring-zinc-900 cursor-pointer"
            />
          </div>
        );
      },
    });

    // Content columns
    columnConfigs.forEach((col) => {
      cols.push({
        id: String(col.key),
        accessorFn: (row: T) => {
          const val = row[col.key as keyof T];
          return val !== undefined && val !== null ? String(val) : "";
        },
        sortingFn: (rowA, rowB) => {
          const rawA = rowA.original[col.key as keyof T];
          const rawB = rowB.original[col.key as keyof T];
          return compareValues(rawA, rawB, col.sortType);
        },
        header: ({ column }) => {
          if (col.sortable) {
            const isSorted = column.getIsSorted();
            const ariaSort = isSorted === "asc" ? "ascending" : isSorted === "desc" ? "descending" : "none";
            return (
              <Button
                variant="ghost"
                size="sm"
                aria-sort={ariaSort}
                aria-label={`Sort by ${col.header}${isSorted === "asc" ? " descending" : isSorted === "desc" ? " clear sort" : " ascending"}`}
                className="-ml-3 h-7 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-transparent"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                {col.header}
                <ArrowUpDown className="ml-1.5 h-3 w-3 text-zinc-400" />
              </Button>
            );
          }
          return <span className="text-xs font-semibold text-zinc-700">{col.header}</span>;
        },
        cell: ({ row }) => {
          const item = row.original;
          const colKey = String(col.key);
          const isEditing = editingCell?.rowId === String(item[idKey]) && editingCell?.colKey === colKey;

          return (
            <InlineCell
              item={item}
              col={col}
              idKey={idKey}
              isEditing={isEditing}
              isEditable={isColEditable(col)}
              density={density}
              onStartEdit={handleStartEdit}
              onSave={handleSaveCell}
              onCancel={handleCancelEdit}
              onTabNext={(shiftKey) => handleTabNext(item, colKey, shiftKey)}
            />
          );
        },
      });
    });

    // Actions column
    cols.push({
      id: "actions",
      enableHiding: false,
      header: () => <span className="text-xs font-semibold text-zinc-700 text-right block">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors duration-150 cursor-pointer"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg border border-zinc-200/80 rounded-lg p-1">
                <DropdownMenuLabel className="text-xs font-medium text-zinc-500 px-2 py-1.5">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onSelect(item)}
                  className="cursor-pointer text-zinc-700 focus:bg-zinc-50 focus:text-zinc-900 text-xs rounded-md px-2 py-1.5"
                >
                  <Eye className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                  View details
                </DropdownMenuItem>
                {onEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit?.(item)}
                    className="cursor-pointer text-zinc-700 focus:bg-zinc-50 focus:text-zinc-900 text-xs rounded-md px-2 py-1.5"
                  >
                    <Edit2 className="mr-2 h-3.5 w-3.5 text-zinc-600" />
                    Edit record
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <>
                    <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                    <DropdownMenuItem
                      onClick={() => onDelete?.(item)}
                      className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700 text-xs rounded-md px-2 py-1.5"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600" />
                      Delete record
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return cols;
  }, [
    columnConfigs,
    data,
    selectedRowIds,
    idKey,
    onSelect,
    onEdit,
    onDelete,
    editingCell,
    density,
    isColEditable,
    handleStartEdit,
    handleSaveCell,
    handleCancelEdit,
    handleTabNext,
  ]);

  // Reset pagination index to page 0 whenever search query or filters change
  useEffect(() => {
    setPagination((prev) => (prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 }));
  }, [globalFilter, priorityFilter, bookmarkedOnly]);

  const filteredData = useMemo(() => {
    let result = data;

    // Global Search with deep nested extraction to prevent [object Object] bug
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase();
      result = result.filter((item) => {
        if (searchKey) {
          const val = item[searchKey];
          const strings = extractSearchableStrings(val);
          return strings.some((s) => s.toLowerCase().includes(q));
        }
        const strings = extractSearchableStrings(item);
        return strings.some((s) => s.toLowerCase().includes(q));
      });
    }

    // Priority Filter
    if (priorityFilter !== "ALL") {
      result = result.filter((item) => {
        const json = JSON.stringify(item).toUpperCase();
        return json.includes(priorityFilter);
      });
    }

    // Bookmarked Only Filter
    if (bookmarkedOnly) {
      result = result.filter((item) => selectedRowIds.has(String(item[idKey])));
    }

    return result;
  }, [data, globalFilter, searchKey, priorityFilter, bookmarkedOnly, selectedRowIds, idKey]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const { rows } = table.getRowModel();

  // TanStack Virtualizer targeting tableScrollRef (standardized row heights: 32px compact, 36px standard)
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: useCallback(() => (density === "compact" ? 32 : 36), [density]),
    overscan: 10,
  });

  // Re-measure virtualizer whenever density mode changes
  useEffect(() => {
    rowVirtualizer.measure();
  }, [density, rowVirtualizer]);

  // Scroll to top on page index change
  useEffect(() => {
    if (tableScrollRef.current) {
      tableScrollRef.current.scrollTop = 0;
    }
  }, [pagination.pageIndex, pagination.pageSize]);

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalVirtualSize = rowVirtualizer.getTotalSize();

  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start ?? 0 : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalVirtualSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
      : 0;

  const totalCount = filteredData.length;
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <div className="space-y-3">
      {/* Search and Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="pl-8 h-8 text-xs bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 rounded-lg shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-900"
            />
          </div>

          {/* Quick Filter: Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors duration-150 cursor-pointer ${
                  priorityFilter !== "ALL"
                    ? "border-zinc-300 bg-zinc-100 text-zinc-900 font-semibold"
                    : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                <Flag className="w-3.5 h-3.5 text-zinc-500" />
                <span>Priority {priorityFilter !== "ALL" ? `(${formatSentenceCase(priorityFilter)})` : ""}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36 bg-white text-xs border-zinc-200/80 rounded-lg p-1">
              <DropdownMenuItem onClick={() => setPriorityFilter("ALL")} className="cursor-pointer text-xs rounded-md">
                All priorities
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("CRIT")} className="cursor-pointer text-xs rounded-md">
                Critical
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("HIGH")} className="cursor-pointer text-xs rounded-md">
                High
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("MED")} className="cursor-pointer text-xs rounded-md">
                Medium
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("LOW")} className="cursor-pointer text-xs rounded-md">
                Low
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Quick Filter: Bookmarked */}
          <button
            type="button"
            onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors duration-150 cursor-pointer ${
              bookmarkedOnly
                ? "border-zinc-300 bg-zinc-100 text-zinc-900 font-semibold"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarkedOnly ? "text-[#FD3706] fill-[#FD3706]" : "text-zinc-500"}`} />
            <span>Bookmarked</span>
          </button>

          {(globalFilter || priorityFilter !== "ALL" || bookmarkedOnly) && (
            <button
              type="button"
              onClick={() => {
                setGlobalFilter("");
                setPriorityFilter("ALL");
                setBookmarkedOnly(false);
              }}
              className="h-8 px-2 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 flex items-center gap-1 text-xs transition-colors duration-150 cursor-pointer"
              title="Reset filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Toolbar Controls: Density Toggle + Excel / CSV Exports */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Density Toggle Button */}
          <button
            type="button"
            onClick={() => setDensity((d) => (d === "compact" ? "standard" : "compact"))}
            className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors duration-150 cursor-pointer"
            title={`Toggle row density (currently ${density})`}
          >
            <Rows className="w-3.5 h-3.5 text-zinc-500" />
            <span>{density === "compact" ? "Compact (32px)" : "Standard (36px)"}</span>
          </button>

          {/* Export to Excel (.xlsx) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportToExcel(filteredData, exportColumns, baseFilename)}
            disabled={filteredData.length === 0}
            className="h-8 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border-zinc-200 shadow-2xs gap-1.5 cursor-pointer disabled:opacity-50 transition-colors duration-150"
            title="Export filtered records to Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </Button>

          {/* Export to CSV (.csv) */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => exportToCSV(filteredData, exportColumns, baseFilename)}
            disabled={filteredData.length === 0}
            className="h-8 px-2.5 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 border-zinc-200 shadow-2xs gap-1.5 cursor-pointer disabled:opacity-50 transition-colors duration-150"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-zinc-600" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Actionable Bulk Operation Tray */}
      {selectedRowIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-2 rounded-xl bg-zinc-900 text-zinc-100 shadow-md border border-zinc-800 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Selected count badge with quiet status dot */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-mono tabular-nums font-medium border border-zinc-700/80">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FD3706] shrink-0" />
              <span>{selectedRowIds.size} selected</span>
            </div>

            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

            {/* Quick Action buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                onClick={() => handleBulkAction("approve")}
                className="h-7 px-2.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 shadow-2xs gap-1.5 rounded-lg cursor-pointer transition-colors duration-150"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>Approve PO</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleBulkAction("mark_shipped")}
                className="h-7 px-2.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 shadow-2xs gap-1.5 rounded-lg cursor-pointer transition-colors duration-150"
              >
                <Truck className="w-3.5 h-3.5 text-zinc-300" />
                <span>Mark shipped</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleBulkAction("requisition")}
                className="h-7 px-2.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 shadow-2xs gap-1.5 rounded-lg cursor-pointer transition-colors duration-150"
              >
                <Package className="w-3.5 h-3.5 text-zinc-300" />
                <span>Batch requisition</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleBulkAction("cancel")}
                className="h-7 px-2.5 text-xs font-medium bg-zinc-800 hover:bg-rose-950/60 hover:text-rose-300 hover:border-rose-800 text-zinc-300 border border-zinc-700/80 shadow-2xs gap-1.5 rounded-lg cursor-pointer transition-colors duration-150"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Cancel</span>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export Selected Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors duration-150 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Export selected</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-white text-zinc-800 shadow-xl border border-zinc-200/80 rounded-lg p-1 text-xs">
                <DropdownMenuItem
                  onClick={() => exportToExcel(selectedItems, exportColumns, `${baseFilename}-selected`)}
                  className="cursor-pointer flex items-center gap-2 text-zinc-700 hover:text-zinc-900 rounded-md"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Export selected (Excel)</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => exportToCSV(selectedItems, exportColumns, `${baseFilename}-selected`)}
                  className="cursor-pointer flex items-center gap-2 text-zinc-700 hover:text-zinc-900 rounded-md"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Export selected (CSV)</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedRowIds(new Set())}
              className="h-7 px-2.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors duration-150 cursor-pointer"
            >
              Clear selection
            </button>
          </div>
        </div>
      )}

      {/* Table Surface Frame with Virtualized Scroll Container */}
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-2xs overflow-hidden">
        <div
          ref={tableScrollRef}
          className="max-h-[620px] overflow-auto relative"
        >
          <table className="w-full caption-bottom text-sm border-separate border-spacing-0">
            {/* Table Header: 32px height, sticky top */}
            <thead className="sticky top-0 z-20 bg-zinc-50/95 backdrop-blur-xs border-b border-zinc-200/80">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header, headerIndex) => {
                    const isFirstCol = headerIndex === 0; // Checkbox
                    const isPrimaryCol = headerIndex === 1; // Primary identifier
                    const isActionsCol = headerIndex === headerGroup.headers.length - 1; // Actions

                    let stickyHeaderClass = "sticky top-0 z-20 bg-zinc-50/95 backdrop-blur-xs border-b border-zinc-200/80";
                    if (isFirstCol) {
                      stickyHeaderClass = "sticky left-0 z-30 bg-zinc-50 border-b border-zinc-200/80 w-11 min-w-[44px] max-w-[44px]";
                    } else if (isPrimaryCol) {
                      stickyHeaderClass = "sticky left-[44px] z-30 bg-zinc-50 border-r border-zinc-200/80 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)] border-b";
                    } else if (isActionsCol) {
                      stickyHeaderClass = "sticky right-0 z-30 bg-zinc-50 border-l border-zinc-200/80 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.05)] border-b";
                    }

                    const densityHeaderClass =
                      density === "compact" ? "h-8 py-1.5 px-3 text-xs" : "h-8 py-1.5 px-3.5 text-xs";

                    const isSorted = header.column.getIsSorted();
                    const ariaSort = isSorted === "asc" ? "ascending" : isSorted === "desc" ? "descending" : undefined;

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={ariaSort}
                        className={cn(
                          "font-semibold text-zinc-700 select-none text-left align-middle",
                          densityHeaderClass,
                          stickyHeaderClass
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {rows.length > 0 ? (
                <>
                  {/* Top virtual spacer row */}
                  {paddingTop > 0 && (
                    <tr style={{ height: `${paddingTop}px` }}>
                      <td
                        colSpan={columns.length}
                        style={{ height: `${paddingTop}px` }}
                        className="p-0 border-0 m-0"
                      />
                    </tr>
                  )}

                  {/* Virtualized mapped rows */}
                  {virtualRows.map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    if (!row) return null;

                    const isSelected = selectedItem && selectedItem[idKey] === row.original[idKey];
                    const isChecked = selectedRowIds.has(String(row.original[idKey]));

                    const rowBgClass = isChecked
                      ? "bg-zinc-100/80 hover:bg-zinc-100"
                      : isSelected
                      ? "bg-zinc-100/70 hover:bg-zinc-100/90"
                      : "hover:bg-zinc-50/60";

                    const rowHeightClass = density === "compact" ? "h-8" : "h-9";

                    return (
                      <tr
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={rowVirtualizer.measureElement}
                        onClick={() => onSelect(row.original)}
                        className={cn(
                          "group cursor-pointer transition-colors duration-150 border-b border-zinc-100",
                          rowBgClass,
                          rowHeightClass
                        )}
                      >
                        {row.getVisibleCells().map((cell, cellIndex) => {
                          const isFirstCol = cellIndex === 0; // Checkbox
                          const isPrimaryCol = cellIndex === 1; // Primary identifier
                          const isActionsCol = cellIndex === row.getVisibleCells().length - 1; // Actions

                          const cellBgClass = isChecked
                            ? "bg-zinc-100 group-hover:bg-zinc-100"
                            : isSelected
                            ? "bg-zinc-100/90 group-hover:bg-zinc-100"
                            : "bg-white group-hover:bg-zinc-50/60";

                          let cellStickyClass = "";
                          if (isFirstCol) {
                            cellStickyClass = `sticky left-0 z-10 ${cellBgClass} border-r border-zinc-200/50 w-11 min-w-[44px] max-w-[44px]`;
                          } else if (isPrimaryCol) {
                            cellStickyClass = `sticky left-[44px] z-10 ${cellBgClass} border-r border-zinc-200/80 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.05)]`;
                          } else if (isActionsCol) {
                            cellStickyClass = `sticky right-0 z-10 ${cellBgClass} border-l border-zinc-200/80 shadow-[-2px_0_4px_-2px_rgba(0,0,0,0.05)]`;
                          }

                          const densityCellClass =
                            density === "compact"
                              ? "h-8 py-1 px-3 text-xs"
                              : "h-9 py-2 px-3.5 text-xs";

                          return (
                            <td
                              key={cell.id}
                              className={cn(
                                "text-zinc-800 align-middle border-b border-zinc-100",
                                densityCellClass,
                                cellStickyClass
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {/* Bottom virtual spacer row */}
                  {paddingBottom > 0 && (
                    <tr style={{ height: `${paddingBottom}px` }}>
                      <td
                        colSpan={columns.length}
                        style={{ height: `${paddingBottom}px` }}
                        className="p-0 border-0 m-0"
                      />
                    </tr>
                  )}
                </>
              ) : (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="h-28 text-center text-xs text-zinc-500 font-medium"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Enterprise Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-zinc-200/80">
          {/* Page size dropdown */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 px-2.5 text-xs rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 flex items-center gap-1.5 shadow-2xs font-medium cursor-pointer transition-colors duration-150"
                >
                  <span className="font-mono tabular-nums">{pageSize}</span>
                  <span>rows</span>
                  <ChevronDown className="w-3 h-3 text-zinc-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32 bg-white text-xs border-zinc-200/80 rounded-lg p-1">
                {[5, 10, 25, 50, 100].map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => {
                      setPagination({ pageIndex: 0, pageSize: size });
                    }}
                    className="cursor-pointer font-mono tabular-nums text-xs rounded-md"
                  >
                    {size} rows
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Page info & pagination buttons */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              {startRow}–{endRow} of {totalCount} records
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: Math.max(0, prev.pageIndex - 1),
                  }))
                }
                disabled={pageIndex === 0}
                className="w-8 h-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors duration-150 cursor-pointer"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i).map((pageIdx) => {
                if (
                  totalPages > 7 &&
                  pageIdx !== 0 &&
                  pageIdx !== totalPages - 1 &&
                  Math.abs(pageIdx - pageIndex) > 1
                ) {
                  if (pageIdx === 1 || pageIdx === totalPages - 2) {
                    return (
                      <span key={`ellipsis-${pageIdx}`} className="px-1 text-zinc-400 text-xs">
                        ...
                      </span>
                    );
                  }
                  return null;
                }

                const isActive = pageIdx === pageIndex;
                return (
                  <button
                    key={pageIdx}
                    type="button"
                    onClick={() =>
                      setPagination((prev) => ({ ...prev, pageIndex: pageIdx }))
                    }
                    className={`min-w-8 h-8 px-2.5 rounded-lg text-xs font-mono tabular-nums font-semibold transition-colors duration-150 flex items-center justify-center cursor-pointer ${
                      isActive
                        ? "bg-[#FD3706] text-white shadow-xs"
                        : "bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    {pageIdx + 1}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    pageIndex: Math.min(totalPages - 1, prev.pageIndex + 1),
                  }))
                }
                disabled={pageIndex >= totalPages - 1}
                className="w-8 h-8 rounded-lg border border-zinc-200 bg-white flex items-center justify-center text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors duration-150 cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
