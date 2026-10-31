"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  X,
  RotateCcw,
  Plus,
  Trash2,
  AlertCircle,
  Package,
  User,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/app/assets/api";
import { toast } from "@/components/ui/use-toast";
import type { Customer, Order, Product } from "@mesh/types";

interface NewRmaModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  orders: Order[];
  products: Product[];
  onSuccess: () => Promise<void>;
}

interface ItemEntry {
  productId: string;
  quantity: number;
  creditAmount?: number;
}

export default function NewRmaModal({
  isOpen,
  onClose,
  customers,
  orders,
  products,
  onSuccess,
}: NewRmaModalProps) {
  const [mounted, setMounted] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [items, setItems] = useState<ItemEntry[]>([
    { productId: "", quantity: 1, creditAmount: 0 },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Available orders
  const filteredOrders = orders;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleAddItem = () => {
    setItems([...items, { productId: "", quantity: 1, creditAmount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleItemChange = (index: number, field: keyof ItemEntry, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !reason.trim()) {
      setError("Customer and Return Reason are required.");
      return;
    }

    const validItems = items.filter((i) => i.productId && i.quantity > 0);
    if (validItems.length === 0) {
      setError("Please add at least one returned product item.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const payload = {
        CustomerID: customerId,
        OrderID: orderId || null,
        Reason: reason.trim(),
        Status: "REQUESTED",
        RMADetails: validItems.map((item) => ({
          ProductID: item.productId,
          QuantityReturned: Number(item.quantity),
          CreditAmount: item.creditAmount ? Number(item.creditAmount) : null,
        })),
      };

      await api.post("/rma/add", payload);
      toast({
        title: "RMA Initiated",
        description: "Return Authorization request created successfully.",
      });

      // Reset
      setReason("");
      setCustomerId("");
      setOrderId("");
      setItems([{ productId: "", quantity: 1, creditAmount: 0 }]);
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to initiate RMA request.");
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
        aria-labelledby="new-rma-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 id="new-rma-title" className="text-base font-bold text-slate-900">
                New Return Material Authorization (RMA)
              </h3>
              <p className="text-xs text-slate-500">
                Authorize customer return and record expected reverse logistics items.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Customer Account <span className="text-red-500">*</span>
              </Label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
                required
              >
                <option value="">Select Customer...</option>
                {customers.map((c) => (
                  <option key={c.CustomerID} value={c.CustomerID}>
                    {c.CustomerName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Associated Outbound Order (Optional)
              </Label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-600"
              >
                <option value="">No linked order</option>
                {filteredOrders.map((o) => (
                  <option key={o.OrderID} value={o.OrderID}>
                    Order #{o.OrderID.slice(-6)} ({o.Status || "DELIVERED"})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Return Reason / Defect Justification <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Defective seal on packaging, incorrect item shipped, customer cancelled order"
              className="h-9 text-xs"
              required
            />
          </div>

          {/* Returned Items Line Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Returned Product Items ({items.length})
                </Label>
                <p className="text-[11px] text-slate-500">
                  Specify products and expected quantities to be checked at warehouse intake.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleAddItem}
                className="h-7 text-xs gap-1 border-dashed text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              >
                <Plus className="w-3 h-3 text-indigo-600" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-lg p-2.5 grid grid-cols-12 gap-2 items-center shadow-2xs"
                >
                  <div className="col-span-6 space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">Product SKU</Label>
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                      className="w-full h-8 px-2 rounded-md border border-slate-300 bg-white text-xs font-medium text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-indigo-600"
                      required
                    >
                      <option value="">Select SKU...</option>
                      {products.map((p) => (
                        <option key={p.ProductID} value={p.ProductID}>
                          {p.ProductName} ({p.ProductCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3 space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">Qty Returned</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(idx, "quantity", parseInt(e.target.value, 10) || 1)
                      }
                      className="h-8 text-xs font-mono font-bold"
                      required
                    />
                  </div>

                  <div className="col-span-2 space-y-1">
                    <Label className="text-[10px] font-semibold text-slate-500">Credit ($)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.creditAmount ?? ""}
                      onChange={(e) =>
                        handleItemChange(
                          idx,
                          "creditAmount",
                          e.target.value ? parseFloat(e.target.value) : undefined
                        )
                      }
                      placeholder="0.00"
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="col-span-1 flex justify-end pt-3">
                    <button
                      type="button"
                      disabled={items.length <= 1}
                      onClick={() => handleRemoveItem(idx)}
                      className={`p-1.5 rounded text-slate-400 hover:text-red-600 transition-colors ${
                        items.length <= 1 ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                      }`}
                      title="Remove line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer inside form */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              RMA will be created in <span className="font-semibold text-slate-600">REQUESTED</span> status.
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onClose}
                className="h-8 text-xs font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer shadow-xs"
              >
                {loading ? "Creating RMA..." : "Authorize RMA Request"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
