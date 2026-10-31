"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  BrainCircuit,
  X,
  AlertTriangle,
  AlertCircle,
  Warehouse as WarehouseIcon,
  MapPin,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/app/assets/api";
import { cn } from "@/lib/utils";
import type { Product, Warehouse, FefoPickingResponse } from "@mesh/types";

interface FefoAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  warehouses: Warehouse[];
  initialProductId?: string;
}

export default function FefoAdvisorModal({
  isOpen,
  onClose,
  products,
  warehouses,
  initialProductId,
}: FefoAdvisorModalProps) {
  const [mounted, setMounted] = useState(false);
  const [productId, setProductId] = useState(initialProductId || "");
  const [requestedQuantity, setRequestedQuantity] = useState<number>(50);
  const [warehouseId, setWarehouseId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FefoPickingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialProductId) {
      setProductId(initialProductId);
    } else if (!productId && products.length > 0) {
      setProductId(products[0].ProductID);
    }
  }, [initialProductId, products]);

  // Escape key dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleRunAdvisor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!productId) {
      setError("Select a product SKU to evaluate.");
      return;
    }
    if (!requestedQuantity || requestedQuantity <= 0) {
      setError("Enter a valid requested quantity greater than 0.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post("/inventory/fefo-picking", {
        productId,
        requestedQuantity: Number(requestedQuantity),
        warehouseId: warehouseId || undefined,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to calculate FEFO picking queue.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getDaysUntilExpiry = (expiryDateStr: string | Date) => {
    const exp = new Date(expiryDateStr);
    const now = new Date();
    return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-900/40 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fefo-advisor-title"
        className="bg-white rounded-xl shadow-xl border border-zinc-200/80 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200/80 flex items-center justify-between bg-white text-zinc-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-700 shrink-0">
              <BrainCircuit className="w-4 h-4 text-zinc-700" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="fefo-advisor-title" className="text-base font-semibold text-zinc-900 tracking-tight">
                  FEFO picking advisor
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/80 font-medium">
                  Batch allocation
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                First-expired-first-out lot allocation and spatial bin routing across facilities
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors duration-150 cursor-pointer"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {/* Query Parameter Form */}
        <div className="px-5 py-3.5 border-b border-zinc-200/80 bg-zinc-50/60 shrink-0">
          <form onSubmit={handleRunAdvisor} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5 space-y-1">
              <Label className="text-xs font-medium text-zinc-700">
                Product SKU <span className="text-red-500">*</span>
              </Label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-zinc-300 bg-white text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-colors"
                required
              >
                <option value="">Select SKU...</option>
                {products.map((p) => (
                  <option key={p.ProductID} value={p.ProductID}>
                    {p.ProductName} ({p.ProductCode}) — {p.ProductCategory}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3 space-y-1">
              <Label className="text-xs font-medium text-zinc-700">
                Quantity to pick <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="1"
                value={requestedQuantity}
                onChange={(e) => setRequestedQuantity(parseInt(e.target.value, 10) || 0)}
                className="h-9 text-xs bg-white border-zinc-300 font-mono tabular-nums focus-visible:ring-zinc-900"
                placeholder="50"
                required
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <Label className="text-xs font-medium text-zinc-700">Facility filter</Label>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="w-full h-9 px-2.5 rounded-lg border border-zinc-300 bg-white text-xs text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition-colors"
              >
                <option value="">All warehouses</option>
                {warehouses.map((w) => (
                  <option key={w.WarehouseID} value={w.WarehouseID}>
                    {w.WarehouseName}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={loading || !productId}
                className="w-full h-9 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white shadow-2xs gap-1.5 cursor-pointer disabled:opacity-50 transition-colors duration-150"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" strokeWidth={1.5} />
                    Calculating...
                  </span>
                ) : (
                  <>
                    <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                    Calculate pick plan
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <span className="font-semibold block mb-0.5">Allocation engine error</span>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {!result && !loading && !error && (
            <div className="py-12 flex flex-col items-center justify-center text-center text-zinc-400">
              <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500 mb-2.5 border border-zinc-200">
                <BrainCircuit className="w-5 h-5 text-zinc-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-xs font-medium text-zinc-900">Awaiting picking parameters</h3>
              <p className="text-xs text-zinc-500 max-w-sm mt-1">
                Select a product SKU and requested quantity above to calculate the optimal FEFO pick allocation queue across warehouse bins.
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Expired Stock Quarantine Alert */}
              {result.expiredStockFound && result.expiredStockFound.length > 0 && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center gap-2 text-red-900 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" strokeWidth={1.5} />
                    <span>Quarantine alert: Expired batches detected</span>
                  </div>
                  <p className="text-xs text-red-800">
                    The FEFO engine excluded expired stock from the picking queue. These lots must be moved to quarantine.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                    {result.expiredStockFound.map((exp, idx) => (
                      <div
                        key={idx}
                        className="bg-white border border-red-200/80 rounded-lg p-2.5 text-xs text-zinc-900 space-y-1 shadow-2xs"
                      >
                        <div className="flex items-center justify-between font-mono font-medium text-red-600">
                          <span>{exp.batchNumber}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-red-100 text-red-700">
                            EXPIRED
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-600 font-mono tabular-nums">
                          Expired: {new Date(exp.expiryDate).toISOString().split("T")[0]}
                        </div>
                        <div className="text-[11px] text-zinc-600 font-mono tabular-nums">
                          Quarantined: <span className="font-semibold text-red-700">{exp.quantity} units</span>
                        </div>
                        <div className="text-[10px] text-zinc-400 font-mono">
                          Bin: {exp.binCode || "UNASSIGNED"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Shortage Warning */}
              {!result.fullyAllocated && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <div>
                    <span className="font-semibold block mb-0.5">Inventory shortage detected</span>
                    <p className="text-amber-800">
                      Only {result.totalAllocatedQuantity} of {result.requestedQuantity} requested units could be allocated from healthy stock. Unfulfilled deficit: {result.remainingUnfulfilledQuantity} units.
                    </p>
                  </div>
                </div>
              )}

              {/* Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3">
                  <span className="text-xs text-zinc-500 block">Requested</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-semibold text-zinc-900 font-mono tabular-nums">{result.requestedQuantity}</span>
                    <span className="text-xs text-zinc-400 font-sans">units</span>
                  </div>
                </div>
                <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3">
                  <span className="text-xs text-zinc-500 block">FEFO allocated</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-semibold text-zinc-900 font-mono tabular-nums">{result.totalAllocatedQuantity}</span>
                    <span className="text-xs text-zinc-400 font-sans">units</span>
                  </div>
                </div>
                <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3">
                  <span className="text-xs text-zinc-500 block">Shortage</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span
                      className={cn(
                        "text-xl font-semibold font-mono tabular-nums",
                        result.remainingUnfulfilledQuantity > 0 ? "text-amber-700" : "text-zinc-900"
                      )}
                    >
                      {result.remainingUnfulfilledQuantity}
                    </span>
                    <span className="text-xs text-zinc-400 font-sans">units</span>
                  </div>
                </div>
                <div className="bg-zinc-50/70 border border-zinc-200/80 rounded-xl p-3">
                  <span className="text-xs text-zinc-500 block">Fulfillment status</span>
                  <div className="flex items-center gap-1.5 mt-1 font-mono text-xs font-medium">
                    {result.fullyAllocated ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-emerald-700">100% Allocated</span>
                      </>
                    ) : (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                        <span className="text-amber-700">Partial Shortage</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Allocation Queue Table */}
              <div className="border border-zinc-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="px-4 py-2.5 bg-zinc-50 border-b border-zinc-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900">
                      Recommended pick sequence
                    </span>
                    <span className="text-[11px] font-mono bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.2 rounded text-zinc-600 font-medium">
                      {result.allocations.length} step(s)
                    </span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Sorted by expiry date ASC
                  </span>
                </div>

                {result.allocations.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-xs font-mono">
                    No active stock available across batches to allocate.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50/70 text-zinc-500 font-medium border-b border-zinc-200/80">
                          <th className="py-2.5 px-3.5 text-[11px] font-mono uppercase tracking-wider">Step</th>
                          <th className="py-2.5 px-3.5 text-[11px] font-mono uppercase tracking-wider">Batch number</th>
                          <th className="py-2.5 px-3.5 text-[11px] font-mono uppercase tracking-wider">Expiry date</th>
                          <th className="py-2.5 px-3.5 text-[11px] font-mono uppercase tracking-wider">Pick quantity</th>
                          <th className="py-2.5 px-3.5 text-[11px] font-mono uppercase tracking-wider">Warehouse & bin</th>
                          <th className="py-2.5 px-3.5 text-[11px] font-mono uppercase tracking-wider">Stock remaining</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {result.allocations.map((alloc, idx) => {
                          const daysUntil = getDaysUntilExpiry(alloc.expiryDate);
                          const expStr = new Date(alloc.expiryDate).toISOString().split("T")[0];

                          return (
                            <tr key={idx} className="hover:bg-zinc-50/70 transition-colors duration-150">
                              <td className="py-3 px-3.5">
                                <span className="w-5 h-5 rounded-md bg-zinc-100 text-zinc-700 font-medium text-[11px] flex items-center justify-center font-mono border border-zinc-200/80">
                                  #{idx + 1}
                                </span>
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="font-mono text-xs font-medium text-zinc-900 block">
                                  {alloc.batchNumber}
                                </span>
                              </td>
                              <td className="py-3 px-3.5">
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-mono tabular-nums text-xs text-zinc-800">{expStr}</span>
                                  <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                                    <span
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full shrink-0",
                                        daysUntil <= 30 ? "bg-amber-500" : "bg-emerald-500"
                                      )}
                                    />
                                    <span className={daysUntil <= 30 ? "text-amber-700 font-medium" : "text-zinc-600"}>
                                      {daysUntil}d runway
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="font-mono tabular-nums font-semibold text-xs text-zinc-900">
                                  {alloc.allocatedQuantity}
                                </span>{" "}
                                <span className="text-zinc-400 text-[11px] font-sans">units</span>
                              </td>
                              <td className="py-3 px-3.5">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 text-zinc-700 font-medium text-xs">
                                    <WarehouseIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                                    <span>{alloc.warehouseName || alloc.warehouseId}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-zinc-700 bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.5 rounded-md">
                                      <MapPin className="w-3 h-3 text-zinc-400 shrink-0" strokeWidth={1.5} />
                                      {alloc.binCode || "Aisle " + (alloc.aisle || "01")}
                                    </span>
                                    {alloc.zoneName && (
                                      <span className="text-[10px] font-mono uppercase text-zinc-600 bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.2 rounded-md">
                                        {alloc.zoneName}
                                      </span>
                                    )}
                                  </div>
                                  {(alloc.aisle || alloc.rack || alloc.shelf || alloc.bin) && (
                                    <div className="text-[10px] text-zinc-400 font-mono tabular-nums">
                                      A{alloc.aisle} • R{alloc.rack} • S{alloc.shelf} • B{alloc.bin}
                                    </div>
                                  )}
                                </div>
                              </td>
                              <td className="py-3 px-3.5">
                                <span className="font-mono tabular-nums text-xs text-zinc-600">
                                  {alloc.availableStockInBatch - alloc.allocatedQuantity} / {alloc.availableStockInBatch} units
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200/80 bg-zinc-50/70 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500 font-mono">
            FEFO discrete warehouse spatial topology routing
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-3 text-xs font-medium text-zinc-700 hover:text-zinc-900 bg-white border-zinc-200/80 hover:bg-zinc-50 rounded-lg shadow-2xs transition-colors duration-150"
          >
            Close
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
