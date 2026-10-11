"use client";

import React, { useState, useMemo } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
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
  searchPlaceholder = "Search records...",
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

  const columns = useMemo<ColumnDef<T>[]>(() => {
    const cols: ColumnDef<T>[] = columnConfigs.map((col) => ({
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
              className="-ml-3 h-8 text-xs font-semibold text-slate-700 hover:text-slate-900"
              onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
              {col.header}
              <ArrowUpDown className="ml-2 h-3.5 w-3.5 text-slate-400" />
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
        return (
          <span className="text-sm text-slate-700">
            {val !== undefined && val !== null ? String(val) : "—"}
          </span>
        );
      },
    }));

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
                  className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 bg-white shadow-lg border border-slate-200">
                <DropdownMenuLabel className="text-xs text-slate-500">Actions</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => onSelect(item)}
                  className="cursor-pointer text-slate-700 focus:bg-slate-50"
                >
                  <Eye className="mr-2 h-4 w-4 text-slate-500" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEdit(item)}
                  className="cursor-pointer text-slate-700 focus:bg-slate-50"
                >
                  <Edit2 className="mr-2 h-4 w-4 text-blue-600" />
                  Edit Record
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(item)}
                  className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4 text-red-600" />
                  Delete Record
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return cols;
  }, [columnConfigs, onSelect, onEdit, onDelete]);

  const filteredData = useMemo(() => {
    if (!globalFilter.trim()) return data;
    const q = globalFilter.toLowerCase();
    return data.filter((item) => {
      if (searchKey) {
        const val = item[searchKey];
        return val ? String(val).toLowerCase().includes(q) : false;
      }
      return Object.values(item).some((v) =>
        v ? String(v).toLowerCase().includes(q) : false
      );
    });
  }, [data, globalFilter, searchKey]);

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

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => {
              setGlobalFilter(e.target.value);
              setPagination((prev) => ({ ...prev, pageIndex: 0 }));
            }}
            className="pl-9 bg-white border-slate-200 text-sm focus-visible:ring-blue-600"
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Showing {filteredData.length} total records
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/75 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="py-3 px-4">
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
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() => onSelect(row.original)}
                      className={`cursor-pointer transition-colors border-b border-slate-100 ${
                        isSelected
                          ? "bg-blue-50/80 hover:bg-blue-50"
                          : "hover:bg-slate-50/60"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-3.5 px-4">
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
                    className="h-32 text-center text-sm text-slate-500"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(1, table.getPageCount())}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 px-2.5 text-xs text-slate-700 bg-white"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 px-2.5 text-xs text-slate-700 bg-white"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
