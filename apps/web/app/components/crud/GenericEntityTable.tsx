"use client";

import React, { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  User,
  MapPin,
  Calendar,
  Flag,
  Bookmark,
  Filter,
  LayoutGrid,
  List,
  CalendarRange,
  RotateCcw,
  Check,
} from "lucide-react";
import { useSearchParams } from "next/navigation";

export interface ColumnConfig<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface GenericEntityTableProps<T> {
  data: T[];
  columns: ColumnConfig<T>[];
  idKey: keyof T;
  searchKey?: keyof T;
  searchPlaceholder?: string;
  selectedItem?: T | null;
  onSelect: (item: T) => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  emptyMessage?: string;
}

export default function GenericEntityTable<T extends Record<string, any>>({
  data,
  columns: columnConfigs,
  idKey,
  searchKey,
  searchPlaceholder = "Search...",
  selectedItem,
  onSelect,
  onEdit,
  onDelete,
  emptyMessage = "No records found.",
}: GenericEntityTableProps<T>) {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("search") || "";
  const initialId = searchParams.get("id") || "";

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState(initialQuery);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);
  const [activeView, setActiveView] = useState<"list" | "board" | "calendar">("list");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  const autoSelectedRef = React.useRef(false);

  // Auto-select record once if specified in URL query on initial load
  React.useEffect(() => {
    if (initialId && data.length > 0 && !autoSelectedRef.current) {
      const match = data.find((item) => String(item[idKey]) === initialId);
      if (match) {
        autoSelectedRef.current = true;
        onSelect(match);
      }
    }
  }, [initialId, data, idKey, onSelect]);

  // Priority detection helper
  const getPriorityBadge = (val: string) => {
    const s = String(val).toUpperCase();
    if (s.includes("CRIT") || s.includes("HIGH") || s.includes("ALERT")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
          <Flag className="w-3 h-3 text-rose-600 fill-rose-600" />
          High
        </span>
      );
    }
    if (s.includes("MED") || s.includes("WARN")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/80">
          <Flag className="w-3 h-3 text-amber-600 fill-amber-600" />
          Medium
        </span>
      );
    }
    if (s.includes("LOW") || s.includes("NORMAL") || s.includes("GOOD") || s.includes("ACTIVE")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/80">
          <Flag className="w-3 h-3 text-emerald-600 fill-emerald-600" />
          Low
        </span>
      );
    }
    return null;
  };

  const columns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = [];

    // Checkbox selection column
    cols.push({
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={
            data.length > 0 &&
            selectedRowIds.size === data.length
          }
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRowIds(new Set(data.map((d) => String(d[idKey]))));
            } else {
              setSelectedRowIds(new Set());
            }
          }}
          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      ),
      cell: ({ row }) => {
        const id = String(row.original[idKey]);
        const isChecked = selectedRowIds.has(id);
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
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
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
        header: ({ column }) => {
          if (col.sortable) {
            return (
              <Button
                variant="ghost"
                size="sm"
                className="-ml-3 h-7 text-xs font-semibold text-slate-700 hover:text-slate-900"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
              >
                {col.header}
                <ArrowUpDown className="ml-1.5 h-3 w-3 text-slate-400" />
              </Button>
            );
          }
          return <span className="text-xs font-semibold text-slate-700">{col.header}</span>;
        },
        cell: ({ row }) => {
          if (col.render) {
            return col.render(row.original);
          }
          const val = row.original[col.key as keyof T];
          if (val === undefined || val === null) {
            return <span className="text-xs text-slate-400">—</span>;
          }

          const strVal = String(val);
          const colKey = String(col.key).toLowerCase();

          // Auto priority badge
          if (colKey.includes("priority") || colKey.includes("risk") || colKey.includes("status")) {
            const badge = getPriorityBadge(strVal);
            if (badge) return badge;
          }

          // Auto code / SKU styling
          if (colKey.includes("code") || colKey.includes("sku") || colKey.endsWith("id") || colKey.includes("number")) {
            return (
              <span className="font-mono text-xs font-medium bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60">
                {strVal}
              </span>
            );
          }

          return (
            <span className="text-xs font-normal text-slate-800">
              {strVal}
            </span>
          );
        },
      });
    });

    // Actions column
    cols.push({
      id: "actions",
      enableHiding: false,
      header: () => <span className="text-xs font-semibold text-slate-700 text-right block">Actions</span>,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="text-right" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg border border-slate-200">
                <DropdownMenuLabel className="text-xs text-slate-500">Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onSelect(item)}
                  className="cursor-pointer text-slate-700 focus:bg-slate-50 text-xs"
                >
                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEdit(item)}
                  className="cursor-pointer text-slate-700 focus:bg-slate-50 text-xs"
                >
                  <Edit2 className="mr-2 h-3.5 w-3.5 text-blue-600" />
                  Edit Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 text-xs"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5 text-red-600" />
                  Delete Record
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return cols;
  }, [columnConfigs, data, selectedRowIds, idKey, onSelect, onEdit, onDelete]);

  const filteredData = useMemo(() => {
    let result = data;

    // Global Search
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase();
      result = result.filter((item) => {
        if (searchKey) {
          const val = item[searchKey];
          return val ? String(val).toLowerCase().includes(q) : false;
        }
        return Object.values(item).some((v) =>
          v ? String(v).toLowerCase().includes(q) : false
        );
      });
    }

    // Priority Filter
    if (priorityFilter !== "ALL") {
      result = result.filter((item) => {
        const json = JSON.stringify(item).toUpperCase();
        return json.includes(priorityFilter);
      });
    }

    return result;
  }, [data, globalFilter, searchKey, priorityFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      pagination,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const totalCount = filteredData.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const startRow = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalCount);

  return (
    <div className="space-y-3">
      {/* Enterprise Filter & View Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder={searchPlaceholder}
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="pl-8 h-8 text-xs bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg shadow-2xs focus-visible:ring-blue-600"
            />
          </div>

          {/* Quick Filter Pills (matching screenshot) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Assigned to</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-40 bg-white text-xs">
              <DropdownMenuItem onClick={() => setGlobalFilter("")}>All Assignees</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGlobalFilter("Admin")}>Admin Lead</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setGlobalFilter("Manager")}>Operations</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors ${
                  priorityFilter !== "ALL"
                    ? "border-blue-400 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Flag className="w-3.5 h-3.5 text-slate-500" />
                <span>Priority {priorityFilter !== "ALL" ? `(${priorityFilter})` : ""}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36 bg-white text-xs">
              <DropdownMenuItem onClick={() => setPriorityFilter("ALL")}>All Priorities</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("CRIT")}>Critical</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("HIGH")}>High</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("MED")}>Medium</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPriorityFilter("LOW")}>Low</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            type="button"
            onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
            className={`h-8 px-2.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 shadow-2xs transition-colors ${
              bookmarkedOnly
                ? "border-blue-400 bg-blue-50 text-blue-700"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${bookmarkedOnly ? "text-blue-600 fill-blue-600" : "text-slate-500"}`} />
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
              className="h-8 px-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100 flex items-center gap-1 text-xs"
              title="Reset Filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* View Mode Segmented Controls (matching screenshot) */}
        <div className="flex items-center gap-2 self-end lg:self-center">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setActiveView("board")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeView === "board"
                  ? "bg-white text-blue-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Board</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("list")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeView === "list"
                  ? "bg-white text-blue-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView("calendar")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                activeView === "calendar"
                  ? "bg-white text-blue-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selected Rows Banner */}
      {selectedRowIds.size > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>{selectedRowIds.size} records selected</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRowIds(new Set())}
            className="text-xs text-blue-600 hover:underline font-semibold"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table Surface Frame */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/70 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="py-2.5 px-3.5 text-xs font-semibold text-slate-600 select-none"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const isSelected =
                    selectedItem &&
                    selectedItem[idKey] === row.original[idKey];
                  const isChecked = selectedRowIds.has(String(row.original[idKey]));

                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => onSelect(row.original)}
                      className={`cursor-pointer transition-colors border-b border-slate-100/90 ${
                        isChecked
                          ? "bg-blue-50/60 hover:bg-blue-50/80"
                          : isSelected
                          ? "bg-blue-50/70 hover:bg-blue-50/90"
                          : "hover:bg-slate-50/70"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2.5 px-3.5 text-xs text-slate-800">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-28 text-center text-xs text-slate-500 font-medium"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enterprise Pagination Bar (matching screenshot) */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-slate-100">
          {/* Page size dropdown */}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-7 px-2.5 text-xs rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 shadow-2xs font-medium"
                >
                  <span>{pageSize} results</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-32 bg-white text-xs">
                {[5, 10, 25, 50, 100].map((size) => (
                  <DropdownMenuItem
                    key={size}
                    onClick={() => {
                      setPagination((prev) => ({ ...prev, pageSize: size, pageIndex: 0 }));
                    }}
                    className="cursor-pointer"
                  >
                    {size} results
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Page info & chevrons */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              {startRow} - {endRow} of {totalCount} results
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
                title="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
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
