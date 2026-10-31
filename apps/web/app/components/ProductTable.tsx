"use client";

import React, { useState, useMemo } from "react";
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
  Search,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
} from "lucide-react";

import {
  DropdownMenu,
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const columns = useMemo<ColumnDef<Product, any>[]>(() => [
    {
      id: "select",
      header: () => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            aria-label="Select all products on page"
            checked={products.length > 0 && selectedRowIds.size === products.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowIds(new Set(products.map((p) => p.ProductID)));
              } else {
                setSelectedRowIds(new Set());
              }
            }}
            className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#FD3706] text-zinc-900 focus:ring-1 focus:ring-zinc-900 cursor-pointer"
          />
        </div>
      ),
      cell: ({ row }) => {
        const id = row.original.ProductID;
        const isChecked = selectedRowIds.has(id);
        const productLabel = row.original.ProductName || row.original.ProductCode || id;
        return (
          <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center">
            <input
              type="checkbox"
              aria-label={`Select product ${productLabel}`}
              checked={isChecked}
              onChange={(e) => {
                const next = new Set(selectedRowIds);
                if (e.target.checked) next.add(id);
                else next.delete(id);
                setSelectedRowIds(next);
              }}
              className="w-3.5 h-3.5 rounded border-zinc-300 accent-[#FD3706] text-zinc-900 focus:ring-1 focus:ring-zinc-900 cursor-pointer"
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
          className="-ml-3 h-7 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          SKU / Code
          <ArrowUpDown className="ml-1.5 h-3 w-3 text-zinc-400" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs font-medium bg-zinc-100 text-zinc-800 px-1.5 py-0.5 rounded border border-zinc-200/80">
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
          className="-ml-3 h-7 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product name
          <ArrowUpDown className="ml-1.5 h-3 w-3 text-zinc-400" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-xs text-zinc-900 hover:text-zinc-700 transition-colors duration-150">
            {row.original.ProductName}
          </span>
          {row.original.BarCode && (
            <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
              {row.original.BarCode}
            </span>
          )}
        </div>
      ),
    },
    {
      id: "ProductCategory",
      accessorKey: "ProductCategory",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-xs font-medium text-zinc-700">
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
          className="-ml-3 h-7 text-xs font-semibold text-zinc-700 hover:text-zinc-900 hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Unit price
          <ArrowUpDown className="ml-1.5 h-3 w-3 text-zinc-400" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs font-medium text-zinc-900">
          ${Number(row.original.SellPrice || 0).toFixed(2)}
        </span>
      ),
    },
    {
      id: "PackedWeight",
      accessorKey: "PackedWeight",
      header: "Weight",
      cell: ({ row }) => (
        <span className="font-mono tabular-nums text-xs text-zinc-600">
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
            <span className="text-xs text-zinc-500 font-mono tabular-nums">
              {p.PackedHeight}×{p.PackedWidth}×{p.PackedDepth} cm
            </span>
          );
        }
        return <span className="text-xs text-zinc-400">—</span>;
      },
    },
    {
      id: "Refrigerated",
      accessorKey: "Refrigerated",
      header: "Handling",
      cell: ({ row }) => {
        const isCold = row.original.Refrigerated;
        return isCold ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
            Cold chain
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-zinc-700 bg-zinc-100 border border-zinc-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 shrink-0" />
            Ambient
          </span>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      header: () => <span className="text-xs font-semibold text-zinc-700 text-right block">Actions</span>,
      cell: ({ row }) => {
        const p = row.original;
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
                  onClick={() => onSelectProduct(p)}
                  className="cursor-pointer text-zinc-700 focus:bg-zinc-50 focus:text-zinc-900 text-xs rounded-md px-2 py-1.5"
                >
                  <Eye className="mr-2 h-3.5 w-3.5 text-zinc-500" />
                  View details
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onEditProduct(p)}
                  className="cursor-pointer text-zinc-700 focus:bg-zinc-50 focus:text-zinc-900 text-xs rounded-md px-2 py-1.5"
                >
                  <Edit2 className="mr-2 h-3.5 w-3.5 text-zinc-600" />
                  Edit SKU
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                <DropdownMenuItem
                  onClick={() => onDeleteProduct(p)}
                  className="cursor-pointer text-rose-600 focus:bg-rose-50 focus:text-rose-700 text-xs rounded-md px-2 py-1.5"
                >
                  <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Delete SKU
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ], [products, selectedRowIds, onSelectProduct, onEditProduct, onDeleteProduct]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (globalFilter.trim()) {
      const q = globalFilter.toLowerCase();
      result = result.filter(
        (p) =>
          p.ProductName.toLowerCase().includes(q) ||
          p.ProductCode.toLowerCase().includes(q) ||
          (p.ProductCategory && p.ProductCategory.toLowerCase().includes(q))
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
      {/* Search and Filter Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Input */}
          <div className="relative w-56 sm:w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <Input
              placeholder="Search catalog SKUs..."
              value={globalFilter}
              onChange={(e) => {
                setGlobalFilter(e.target.value);
                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
              }}
              className="pl-8 h-8 text-xs bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 rounded-lg shadow-2xs focus-visible:ring-1 focus-visible:ring-zinc-900"
            />
          </div>

          {/* Quick Filter: Handling */}
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
                <span>
                  Handling {priorityFilter === "COLD" ? "(Cold chain)" : priorityFilter === "STD" ? "(Ambient)" : ""}
                </span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36 bg-white text-xs border-zinc-200/80 rounded-lg p-1">
              <DropdownMenuItem
                onClick={() => {
                  setPriorityFilter("ALL");
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                className="cursor-pointer text-xs rounded-md"
              >
                All storage
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPriorityFilter("COLD");
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                className="cursor-pointer text-xs rounded-md"
              >
                Cold chain
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setPriorityFilter("STD");
                  setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                }}
                className="cursor-pointer text-xs rounded-md"
              >
                Ambient
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {(globalFilter || priorityFilter !== "ALL") && (
            <button
              type="button"
              onClick={() => {
                setGlobalFilter("");
                setPriorityFilter("ALL");
              }}
              className="h-8 px-2 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 flex items-center gap-1 text-xs transition-colors duration-150 cursor-pointer"
              title="Reset filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Selected Rows Banner */}
      {selectedRowIds.size > 0 && (
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900 text-zinc-100 shadow-md border border-zinc-800 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FD3706] shrink-0" />
            <span className="text-xs font-mono tabular-nums font-medium text-zinc-200">
              {selectedRowIds.size} SKUs selected
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedRowIds(new Set())}
            className="text-xs text-zinc-400 hover:text-white transition-colors duration-150 font-medium cursor-pointer"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table Frame */}
      <div className="rounded-xl border border-zinc-200/80 bg-white shadow-2xs overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table>
            <TableHeader className="bg-zinc-50/95 border-b border-zinc-200/80">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-0">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      scope="col"
                      className="h-8 py-1.5 px-3.5 text-xs font-semibold text-zinc-700 select-none"
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
                      className={`h-9 cursor-pointer transition-colors duration-150 border-b border-zinc-100 ${
                        isChecked
                          ? "bg-zinc-100/80 hover:bg-zinc-100"
                          : isSelected
                          ? "bg-zinc-100/70 hover:bg-zinc-100/90"
                          : "hover:bg-zinc-50/60"
                      }`}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-2 px-3.5 text-xs text-zinc-800">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-28 text-center text-zinc-400 text-xs">
                    No products found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Enterprise Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-zinc-200/80">
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
                    onClick={() =>
                      setPagination({ pageIndex: 0, pageSize: size })
                    }
                    className="cursor-pointer font-mono tabular-nums text-xs rounded-md"
                  >
                    {size} rows
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

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
