"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  ColumnDef,
  ColumnFiltersState,
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
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns: ColumnDef<Product, any>[] = [
    {
      id: "ProductCode",
      accessorKey: "ProductCode",
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 text-xs font-semibold text-slate-700 hover:text-slate-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          SKU / Code
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
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
          className="-ml-3 h-8 text-xs font-semibold text-slate-700 hover:text-slate-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product Name
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <span className="font-medium text-slate-900 hover:text-blue-600 transition-colors">
            {row.original.ProductName}
          </span>
          <span className="text-xs text-slate-400 font-mono">
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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
          {row.original.ProductCategory}
        </span>
      ),
    },
    {
      id: "CostPrice",
      accessorKey: "CostPrice",
      header: "Cost Price",
      cell: ({ row }) => (
        <span className="text-slate-600 text-xs font-mono">
          ${row.original.CostPrice?.toFixed(2)}
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
          className="-ml-3 h-8 text-xs font-semibold text-slate-700 hover:text-slate-900"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Sell Price
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-bold text-slate-900 text-xs font-mono">
          ${row.original.SellPrice?.toFixed(2)}
        </span>
      ),
    },
    {
      id: "Storage",
      header: "Storage",
      cell: ({ row }) => (
        row.original.Refrigerated ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded">
            <Thermometer className="w-3 h-3 text-cyan-600" /> Cold Chain
          </span>
        ) : (
          <span className="text-slate-400 text-xs">Ambient</span>
        )
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div
            className="flex items-center justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuLabel className="text-xs">Product Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => onSelectProduct(item)} className="cursor-pointer text-xs">
                  <Eye className="w-3.5 h-3.5 mr-2 text-slate-500" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEditProduct(item)} className="cursor-pointer text-xs">
                  <Edit2 className="w-3.5 h-3.5 mr-2 text-blue-500" />
                  Edit Product
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDeleteProduct(item)}
                  className="cursor-pointer text-xs text-red-600 focus:text-red-700 focus:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2 text-red-500" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: products,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="space-y-4">
      {/* Table Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <Input
          placeholder="Search by Product Name..."
          value={(table.getColumn("ProductName")?.getFilterValue() as string) || ""}
          onChange={(event) =>
            table.getColumn("ProductName")?.setFilterValue(event.target.value)
          }
          className="max-w-xs bg-white text-sm"
        />

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto text-xs border-slate-200">
                Columns <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize text-xs"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-200/80">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs font-semibold text-slate-600 h-10">
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
                return (
                  <TableRow
                    key={row.id}
                    onClick={() => onSelectProduct(row.original)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-l-blue-600 hover:bg-blue-50"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-400 text-sm">
                  No products found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination & Count */}
      <div className="flex items-center justify-between text-xs text-slate-500 px-1">
        <div>
          Showing {table.getRowModel().rows.length} of {products.length} products
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
