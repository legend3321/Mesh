"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  Edit2,
  Trash2,
  Eye,
  Thermometer,
  Search,
  ChevronLeft,
  ChevronRight,
  User,
  MapPin,
  Calendar,
  Flag,
  Bookmark,
  RotateCcw,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Product } from "@mesh/types";

interface ProductTableProps {
  products: Product[];
  selectedProduct?: Product | null;
  onSelectProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onDeleteProduct: (product: Product) => void;
}

export default function ProductTable({
  products,
  selectedProduct,
  onSelectProduct,
  onEditProduct,
  onDeleteProduct,
}: ProductTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [priorityFilter, setPriorityFilter] = React.useState("ALL");
  const [bookmarkedOnly, setBookmarkedOnly] = React.useState(false);
  const [selectedRowIds, setSelectedRowIds] = React.useState<Set<string>>(new Set());
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns: ColumnDef<Product, any>[] = [
    {
      id: "select",
      header: () => (
        <input
          type="checkbox"
          checked={products.length > 0 && selectedRowIds.size === products.length}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedRowIds(new Set(products.map((p) => p.ProductID)));
            } else {
              setSelectedRowIds(new Set());
            }
          }}
          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        />
      ),
      cell: ({ row }) => {
        const id = row.original.ProductID;
        const isChecked = selectedRowIds.has(id);
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(e) => {
                const next = new Set(selectedRowIds);
                if (e.target.checked) next.add(id);
                else next.delete(id);
                setSelectedRowIds(next);
              }}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
          </div>
        );
      },
    },
    {
      id: "ProductCode",
      accessorKey: "ProductCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-7 text-xs font-semibold text-slate-700 hover:text-slate-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          SKU / Code
          <ArrowUpDown className="ml-1.5 h-3 w-3 text-slate-400" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200/60">
          {row.original.ProductCode}
        </span>
      ),
    },
    {
      id: "ProductName",
      accessorKey: "ProductName",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-7 text-xs font-semibold text-slate-700 hover:text-slate-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product Name
          <ArrowUpDown className="ml-1.5 h-3 w-3 text-slate-400" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs text-slate-900 hover:text-blue-600 transition-colors">
            {row.original.ProductName}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {row.original.BarCode}
          </span>
        </div>
      ),
    },
    {
      id: "ProductCategory",
      accessorKey: "ProductCategory",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-slate-700">
          {row.original.ProductCategory}
        </span>
      ),
    },
    {
      id: "SellPrice",
      accessorKey: "SellPrice",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-7 text-xs font-semibold text-slate-700 hover:text-slate-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Unit Price
          <ArrowUpDown className="ml-1.5 h-3 w-3 text-slate-400" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-semibold text-slate-900">
          ${Number(row.original.SellPrice || 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "PackedWeight",
      accessorKey: "PackedWeight",
      header: "Weight",
      cell: ({ row }) => (
        <span className="text-xs text-slate-600">
          {row.original.PackedWeight ? `${row.original.PackedWeight} kg` : "—"}
        </span>
      ),
    },
    {
      id: "Dimensions",
      header: "Dimensions",
      cell: ({ row }) => {
        const p = row.original;
        if (p.PackedHeight && p.PackedWidth && p.PackedDepth) {
          return (
            <span className="text-xs text-slate-500 font-mono">
              {p.PackedHeight}×{p.PackedWidth}×{p.PackedDepth}cm
            </span>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      id: "Refrigerated",
      accessorKey: "Refrigerated",
      header: "Handling",
      cell: ({ row }) => {
        const isCold = row.original.Refrigerated;
        return isCold ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-amber-600 shrink-0" />
            Cold Chain
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-teal-600 shrink-0" />
            Ambient
          </span>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <span className="text-xs font-semibold text-slate-700 text-right block">Actions</span>,
      cell: ({ row }) => {
        const p = row.original;
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
                  onClick={() => onSelectProduct(p)}
                  className="cursor-pointer text-slate-700 focus:bg-slate-50 text-xs"
                >
                  <Eye className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEditProduct(p)}
                  className="cursor-pointer text-slate-700 focus:bg-slate-50 text-xs"
                >
                  <Edit2 className="mr-2 h-3.5 w-3.5 text-blue-600" />
                  Edit SKU
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteProduct(p)}
                  className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700 text-xs"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5 text-red-600" />
                  Delete SKU
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const filteredProducts = React.useMemo(() => {
    let result = products;
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase();
      result = result.filter(
        (p) =>
          p.ProductName.toLowerCase().includes(q) ||
          p.ProductCode.toLowerCase().includes(q) ||
          p.ProductCategory.toLowerCase().includes(q)
      );
    }
    if (priorityFilter !== "ALL") {
      result = result.filter((p) => {
        if (priorityFilter === "COLD") return !!p.Refrigerated;
        if (priorityFilter === "STD") return !p.Refrigerated;
        return true;
      });
    }
    return result;
  }, [products, globalFilter, priorityFilter]);

  const table = useReactTable({
    data: filteredProducts,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  });

  const totalCount = filteredProducts.length;
  const pageIndex = pagination.pageIndex;
  const pageSize = pagination.pageSize;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
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
              placeholder="Search catalog SKUs..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="pl-8 h-8 text-xs bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-lg shadow-2xs focus-visible:ring-blue-600"
            />
          </div>

          {/* Quick Filter Pills */}
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
              <DropdownMenuItem onClick={() => { setGlobalFilter(""); setPagination((prev) => ({ ...prev, pageIndex: 0 })); }}>All Leads</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setGlobalFilter("Apex"); setPagination((prev) => ({ ...prev, pageIndex: 0 })); }}>Apex Logistics</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setGlobalFilter("Starlight"); setPagination((prev) => ({ ...prev, pageIndex: 0 })); }}>Starlight Retail</DropdownMenuItem>
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
                <span>Handling {priorityFilter !== "ALL" ? `(${priorityFilter})` : ""}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36 bg-white text-xs">
              <DropdownMenuItem onClick={() => { setPriorityFilter("ALL"); setPagination((prev) => ({ ...prev, pageIndex: 0 })); }}>All Storage</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPriorityFilter("COLD"); setPagination((prev) => ({ ...prev, pageIndex: 0 })); }}>Cold Chain</DropdownMenuItem>
              <DropdownMenuItem onClick={() => { setPriorityFilter("STD"); setPagination((prev) => ({ ...prev, pageIndex: 0 })); }}>Ambient</DropdownMenuItem>
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
      </div>

      {/* Selected Rows Banner */}
      {selectedRowIds.size > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
          <div className="flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span>{selectedRowIds.size} SKUs selected</span>
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

      {/* Table Frame */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs overflow-hidden">
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
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const isSelected = selectedProduct?.ProductID === row.original.ProductID;
                const isChecked = selectedRowIds.has(row.original.ProductID);

                return (
                  <TableRow
                    key={row.id}
                    onClick={() => onSelectProduct(row.original)}
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
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-28 text-center text-slate-400 text-xs">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Enterprise Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-slate-100">
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
                    onClick={() =>
                      setPagination({ pageIndex: 0, pageSize: size })
                    }
                    className="cursor-pointer"
                  >
                    {size} results
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 font-medium">
              {startRow} - {endRow} of {totalCount} results
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
                className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs transition-colors"
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
                      <span key={`ellipsis-${pageIdx}`} className="px-1 text-slate-400 text-xs">
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
                    className={`min-w-7 h-7 px-2 rounded-md text-xs font-semibold transition-colors flex items-center justify-center ${
                      isActive
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
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
