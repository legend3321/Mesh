"use client";

import React, { useState } from "react";
import type { Product } from "@mesh/types";
import {
  X,
  Edit2,
  Trash2,
  Package,
  Layers,
  Thermometer,
  Boxes,
  DollarSign,
  Maximize2,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface ProductDrawerProps {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export default function ProductDrawer({
  product,
  onClose,
  onEdit,
  onDelete,
}: ProductDrawerProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!product) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out Drawer Panel */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full sm:w-[460px] md:w-[500px] bg-white shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {product.ProductCategory || "General"}
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-1 leading-snug">
                {product.ProductName}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          {/* Identification Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Product Code</span>
              <span className="font-mono text-sm font-semibold text-slate-900 block mt-0.5 select-all">
                {product.ProductCode}
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100">
              <span className="text-xs font-medium text-slate-500 block">Bar Code</span>
              <span className="font-mono text-sm font-semibold text-slate-900 block mt-0.5 select-all">
                {product.BarCode}
              </span>
            </div>
          </div>

          {/* Description */}
          {product.ProductDescription && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Description
              </h4>
              <p className="text-slate-700 leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-100 text-sm">
                {product.ProductDescription}
              </p>
            </div>
          )}

          {/* Pricing Overview */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              Financials & Pricing
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <span className="text-xs text-slate-500 block">Cost Price</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  ${product.CostPrice?.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                <span className="text-xs text-emerald-700 font-medium block">Sell Price</span>
                <span className="text-base font-bold text-emerald-800 mt-1 block">
                  ${product.SellPrice?.toFixed(2)}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-center">
                <span className="text-xs text-slate-500 block">Max Retail</span>
                <span className="text-base font-bold text-slate-900 mt-1 block">
                  ${product.MaxretailPrice?.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Logistics & Physical Properties */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Boxes className="w-3.5 h-3.5 text-slate-400" />
              Packaging & Logistics
            </h4>
            <div className="bg-slate-50 rounded-lg border border-slate-100 divide-y divide-slate-100">
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600 flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-slate-400" />
                  Refrigerated Storage
                </span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    product.Refrigerated
                      ? "bg-cyan-100 text-cyan-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {product.Refrigerated ? "Required (Cold Chain)" : "Standard Ambient"}
                </span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-slate-400" />
                  Reorder Threshold
                </span>
                <span className="font-semibold text-slate-900">
                  {product.ReorderQuantity ? `${product.ReorderQuantity} units` : "Not set"}
                </span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600 flex items-center gap-2">
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                  Dimensions (H × W × D)
                </span>
                <span className="font-mono text-slate-900">
                  {product.PackedHeight || 0} × {product.PackedWidth || 0} × {product.PackedDepth || 0} cm
                </span>
              </div>
              <div className="p-3 flex justify-between items-center">
                <span className="text-slate-600 flex items-center gap-2">
                  <Package className="w-4 h-4 text-slate-400" />
                  Packed Unit Weight
                </span>
                <span className="font-semibold text-slate-900">
                  {product.PackedWeight ? `${product.PackedWeight} kg` : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Database Meta */}
          <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 font-mono">
            System ID: {product.ProductID}
          </div>

          {/* Interlinked Related Records */}
          <div className="pt-4 border-t border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2.5">
              Related Category Ledgers
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href={`/dashboard/inventory?q=${encodeURIComponent(product.ProductName)}`}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 block truncate">
                    Stock Ledger
                  </span>
                  <span className="text-[11px] text-slate-500">View in Inventory →</span>
                </div>
              </Link>

              <Link
                href={`/dashboard/transfer?q=${encodeURIComponent(product.ProductName)}`}
                className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-colors group"
              >
                <div className="p-1.5 rounded-md bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                  <Boxes className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold text-slate-900 block truncate">
                    Transfers
                  </span>
                  <span className="text-[11px] text-slate-500">Track shipments →</span>
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex flex-col gap-2">
          {confirmDelete ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-red-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                Are you sure you want to delete this product?
              </div>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onDelete(product)}
                >
                  Confirm Delete
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-300 hover:bg-slate-100 text-slate-800"
                onClick={() => onEdit(product)}
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Product
              </Button>
              <Button
                variant="destructive"
                className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
