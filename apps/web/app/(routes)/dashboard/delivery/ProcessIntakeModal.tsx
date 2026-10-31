"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Warehouse as WarehouseIcon,
  MapPin,
  ShieldAlert,
  Coins,
  Package,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/app/assets/api";
import { toast } from "@/components/ui/use-toast";
import type {
  RMA,
  RMADisposition,
  RMAStatus,
  Warehouse,
  BinLocation,
  Product,
} from "@mesh/types";

interface ProcessIntakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  rma: RMA | null;
  allRmas: RMA[];
  warehouses: Warehouse[];
  binLocations: BinLocation[];
  products: Product[];
  onSuccess: () => Promise<void>;
}

interface IntakeItemState {
  rmaDetailId?: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  disposition: RMADisposition;
  warehouseId: string;
  binId: string;
  creditAmount: number;
  notes: string;
}

export default function ProcessIntakeModal({
  isOpen,
  onClose,
  rma,
  allRmas,
  warehouses,
  binLocations,
  products,
  onSuccess,
}: ProcessIntakeModalProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedRmaId, setSelectedRmaId] = useState(rma?.RMAID || "");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [finalStatus, setFinalStatus] = useState<RMAStatus>("SETTLED");
  const [items, setItems] = useState<IntakeItemState[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeRma = allRmas.find((r) => r.RMAID === selectedRmaId) || rma;

  // Initialize items when activeRma changes
  useEffect(() => {
    if (rma) {
      setSelectedRmaId(rma.RMAID);
    }
  }, [rma]);

  useEffect(() => {
    if (!activeRma) {
      setItems([]);
      return;
    }

    const defaultWarehouseId = warehouses[0]?.WarehouseID || "";

    if (activeRma.RMADetails && activeRma.RMADetails.length > 0) {
      const initialItems: IntakeItemState[] = activeRma.RMADetails.map((detail) => {
        const prod = products.find((p) => p.ProductID === detail.ProductID);
        return {
          rmaDetailId: detail.RMADetailID,
          productId: detail.ProductID,
          productName: prod ? prod.ProductName : detail.ProductID,
          productCode: prod ? prod.ProductCode : "",
          quantity: detail.QuantityReturned,
          disposition: (detail.Disposition as RMADisposition) || "RESTOCK",
          warehouseId: detail.WarehouseID || defaultWarehouseId,
          binId: "",
          creditAmount: detail.CreditAmount ? Number(detail.CreditAmount) : 0,
          notes: "",
        };
      });
      setItems(initialItems);
    } else {
      // Fallback: if no details, empty or 1 item
      setItems([]);
    }
  }, [activeRma, warehouses, products]);

  // Escape listener
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleItemChange = (index: number, field: keyof IntakeItemState, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalCredit = items.reduce((sum, item) => sum + (Number(item.creditAmount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRmaId) {
      setError("Please select an RMA record to process.");
      return;
    }

    if (items.length === 0) {
      setError("No return items to process in this RMA.");
      return;
    }

    // Verify each item has warehouseId
    for (const item of items) {
      if (!item.warehouseId) {
        setError(`Please select a warehouse facility for item "${item.productName}".`);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        rmaId: selectedRmaId,
        status: finalStatus,
        intakeNotes: intakeNotes.trim() || undefined,
        items: items.map((i) => ({
          rmaDetailId: i.rmaDetailId,
          productId: i.productId,
          quantity: Number(i.quantity),
          disposition: i.disposition,
          warehouseId: i.warehouseId,
          binId: i.binId || null,
          creditAmount: Number(i.creditAmount) || 0,
          notes: i.notes || undefined,
        })),
      };

      const res = await api.post("/rma/process-intake", payload);
      const data = res.data;

      toast({
        title: "Return Intake Completed",
        description: `Successfully processed RMA. Restocked: ${data.restockedItemsCount || 0} units, Credit Issued: $${(data.totalCreditIssued || totalCredit).toFixed(2)}.`,
      });

      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to process return intake.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="process-intake-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="process-intake-title" className="text-base font-bold text-white">
                  Process Return Intake & Restock
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Reverse Logistics
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Inspect physical returns, assign disposition, restock warehouse inventory, and settle credit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* RMA Selection Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-6 space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Target RMA Record</Label>
              <select
                value={selectedRmaId}
                onChange={(e) => setSelectedRmaId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">Select an RMA...</option>
                {allRmas.map((r) => (
                  <option key={r.RMAID} value={r.RMAID}>
                    {r.RMANumber} — {r.Customer?.CustomerName || r.CustomerID} ({r.Status})
                  </option>
                ))}
              </select>
            </div>

            {activeRma && (
              <div className="md:col-span-6 flex items-center justify-end gap-3 text-xs text-slate-600">
                <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                  <span className="text-[10px] text-slate-400 block">Customer</span>
                  <span className="font-semibold text-slate-800">
                    {activeRma.Customer?.CustomerName || "Account"}
                  </span>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg px-2.5 py-1">
                  <span className="text-[10px] text-slate-400 block">Current Status</span>
                  <span className="font-bold font-mono text-indigo-700">{activeRma.Status}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Return Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Product Disposition & Restock Destinations ({items.length} item{items.length === 1 ? "" : "s"})
              </h4>
              <span className="text-xs text-slate-500 font-mono">
                Total Credit: <strong className="text-emerald-600">${totalCredit.toFixed(2)}</strong>
              </span>
            </div>

            {items.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
                Please select an RMA with line items above to proceed with intake inspection.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => {
                  const binsForWarehouse = binLocations.filter(
                    (b) => b.WarehouseID === item.warehouseId
                  );

                  return (
                    <div
                      key={idx}
                      className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-bold text-xs text-slate-900">{item.productName}</span>
                          {item.productCode && (
                            <span className="text-[11px] font-mono text-slate-400">
                              ({item.productCode})
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded font-mono">
                          {item.quantity} units to inspect
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {/* Disposition */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600">
                            Disposition <span className="text-red-500">*</span>
                          </Label>
                          <select
                            value={item.disposition}
                            onChange={(e) =>
                              handleItemChange(idx, "disposition", e.target.value as RMADisposition)
                            }
                            className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                            required
                          >
                            <option value="RESTOCK">RESTOCK (Return to active inventory)</option>
                            <option value="QUARANTINE">QUARANTINE (Hold for QC / audit)</option>
                            <option value="REWORK">REWORK (Repair / repackaging)</option>
                            <option value="SCRAP">SCRAP (Dispose / total loss)</option>
                          </select>
                        </div>

                        {/* Destination Warehouse */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600">
                            Target Warehouse <span className="text-red-500">*</span>
                          </Label>
                          <select
                            value={item.warehouseId}
                            onChange={(e) => handleItemChange(idx, "warehouseId", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                            required
                          >
                            <option value="">Select Warehouse...</option>
                            {warehouses.map((w) => (
                              <option key={w.WarehouseID} value={w.WarehouseID}>
                                {w.WarehouseName}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Destination Bin */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600">
                            Bin Location (Optional)
                          </Label>
                          <select
                            value={item.binId}
                            onChange={(e) => handleItemChange(idx, "binId", e.target.value)}
                            className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                          >
                            <option value="">Auto / Unassigned</option>
                            {binsForWarehouse.map((b) => (
                              <option key={b.BinID} value={b.BinID}>
                                {b.BinCode} (A{b.Aisle}-R{b.Rack}-S{b.Shelf}-B{b.Bin})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Credit Amount */}
                        <div className="space-y-1">
                          <Label className="text-[11px] font-semibold text-slate-600">
                            Credit Amount ($)
                          </Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.creditAmount}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                "creditAmount",
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="h-8 text-xs font-mono font-bold"
                          />
                        </div>
                      </div>

                      {/* Notes per item */}
                      <div className="pt-1">
                        <Input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(idx, "notes", e.target.value)}
                          placeholder="Inspection findings (e.g. unbroken seal, cosmetic box damage only)"
                          className="h-7 text-xs bg-slate-50 border-slate-200"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Overall Intake Form Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Target RMA Status</Label>
              <select
                value={finalStatus}
                onChange={(e) => setFinalStatus(e.target.value as RMAStatus)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="SETTLED">SETTLED (Intake completed & credit finalized)</option>
                <option value="INSPECTED">INSPECTED (Inspection passed, awaiting financial settlement)</option>
                <option value="RECEIVED">RECEIVED (Items physically checked into facility dock)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Intake Audit Notes</Label>
              <Input
                type="text"
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                placeholder="e.g. Return inspection passed dock QA. 10 units restocked to East Depot."
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Footer inside form */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Coins className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Total Credit Authorization:</span>
              <strong className="text-emerald-700 font-bold">${totalCredit.toFixed(2)}</strong>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-9 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || items.length === 0}
                className="h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer shadow-xs"
              >
                {loading ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Processing Restock...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Complete Intake & Restock Inventory
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
