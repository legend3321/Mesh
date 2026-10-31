"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Calculator, Building, Calendar, Layers, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Provider, Product } from "@mesh/types";

export interface LineItemDraft {
  tempId: string;
  ProductID: string;
  OrderQuantity: number;
  UnitPrice: number;
  TaxRate: number;
  ExpectedDate: string;
}

export interface CompoundOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    ProviderID: string;
    OrderDate: string;
    Status: string;
    items: Array<{
      ProductID: string;
      OrderQuantity: number;
      UnitPrice: number;
      TaxRate: number;
      ExpectedDate: string;
    }>;
  }) => Promise<void>;
  providers: Provider[];
  products: Product[];
}

export default function CompoundOrderModal({
  isOpen,
  onClose,
  onSubmit,
  providers,
  products,
}: CompoundOrderModalProps) {
  const [providerId, setProviderId] = useState("");
  const [orderDate, setOrderDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [status, setStatus] = useState("INITIATED");

  const [lineItems, setLineItems] = useState<LineItemDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Initialize with 1 empty line item on open
  useEffect(() => {
    if (isOpen) {
      setProviderId(providers[0]?.ProviderID || "");
      setOrderDate(new Date().toISOString().slice(0, 16));
      setStatus("INITIATED");
      setErrorMessage("");

      const initialProduct = products[0];
      setLineItems([
        {
          tempId: `line_${Date.now()}_0`,
          ProductID: initialProduct?.ProductID || "",
          OrderQuantity: 10,
          UnitPrice: initialProduct ? Number(initialProduct.CostPrice) || 0 : 0,
          TaxRate: 0,
          ExpectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        },
      ]);
    }
  }, [isOpen, providers, products]);

  const addLineItem = () => {
    const defaultProduct = products[0];
    setLineItems((prev) => [
      ...prev,
      {
        tempId: `line_${Date.now()}_${prev.length}`,
        ProductID: defaultProduct?.ProductID || "",
        OrderQuantity: 10,
        UnitPrice: defaultProduct ? Number(defaultProduct.CostPrice) || 0 : 0,
        TaxRate: 0,
        ExpectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      },
    ]);
  };

  const removeLineItem = (tempId: string) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((item) => item.tempId !== tempId));
  };

  const updateLineItem = (tempId: string, updates: Partial<LineItemDraft>) => {
    setLineItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== tempId) return item;
        const updated = { ...item, ...updates };

        // If product changed, update default unit price to product cost price
        if (updates.ProductID && updates.ProductID !== item.ProductID) {
          const selectedProd = products.find((p) => p.ProductID === updates.ProductID);
          if (selectedProd) {
            updated.UnitPrice = Number(selectedProd.CostPrice) || 0;
          }
        }
        return updated;
      })
    );
  };

  // Real-time automatic computation of Net Valuation, Tax, and Gross Amount
  const { totalNet, totalTax, totalGross } = useMemo(() => {
    let net = 0;
    let tax = 0;

    lineItems.forEach((item) => {
      const qty = Number(item.OrderQuantity) || 0;
      const price = Number(item.UnitPrice) || 0;
      const rate = Number(item.TaxRate) || 0;

      const lineNet = qty * price;
      const lineTax = lineNet * (rate / 100);

      net += lineNet;
      tax += lineTax;
    });

    return {
      totalNet: Math.round(net * 100) / 100,
      totalTax: Math.round(tax * 100) / 100,
      totalGross: Math.round((net + tax) * 100) / 100,
    };
  }, [lineItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) {
      setErrorMessage("Please select a vendor/provider.");
      return;
    }
    if (lineItems.length === 0) {
      setErrorMessage("At least one line item is required.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage("");

      const payload = {
        ProviderID: providerId,
        OrderDate: new Date(orderDate).toISOString(),
        Status: status,
        items: lineItems.map((line) => ({
          ProductID: line.ProductID,
          OrderQuantity: Number(line.OrderQuantity),
          UnitPrice: Number(line.UnitPrice),
          TaxRate: Number(line.TaxRate),
          ExpectedDate: new Date(line.ExpectedDate).toISOString(),
        })),
      };

      await onSubmit(payload);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.error || err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-zinc-950/40 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-xl shadow-xl border border-zinc-200/80 w-full max-w-4xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200/80 bg-zinc-50/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200/80 flex items-center justify-center font-medium">
              <Layers className="w-4 h-4" strokeWidth={1.5} />
            </div>
            <div>
              <span className="text-[11px] font-mono font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-[6px] border border-zinc-200/80 inline-block">
                Compound requisition
              </span>
              <h2 className="text-base font-semibold text-zinc-900 mt-1">
                New purchase order
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors duration-150 cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center gap-2 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" strokeWidth={1.5} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Header Section: Provider, Date, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-zinc-50/60 border border-zinc-200/80">
            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Vendor / provider *</span>
              </label>
              <select
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                required
                className="w-full h-8 px-2.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium text-zinc-800 transition-colors duration-150"
              >
                {providers.map((p) => (
                  <option key={p.ProviderID} value={p.ProviderID}>
                    {p.ProviderName} ({p.ProviderAddress})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
                <span>Requisition date *</span>
              </label>
              <Input
                type="datetime-local"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
                className="h-8 text-xs bg-white border-zinc-200 rounded-lg font-mono tabular-nums text-zinc-800"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 mb-1.5">
                Lifecycle status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-8 px-2.5 text-xs bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-zinc-400 font-medium text-zinc-800 transition-colors duration-150"
              >
                <option value="INITIATED">Initiated</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Line Items Grid Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-medium text-zinc-900 flex items-center gap-1.5">
                  <span>Procurement line items</span>
                  <span className="font-mono tabular-nums text-zinc-500">({lineItems.length})</span>
                </h3>
                <p className="text-xs text-zinc-500">
                  Specify catalog products, contracted unit pricing, and quantity allocations.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="h-8 text-xs gap-1.5 border-zinc-200/80 bg-white hover:bg-zinc-50 text-zinc-700 hover:text-zinc-900 rounded-lg font-medium transition-colors duration-150"
              >
                <Plus className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
                Add line item
              </Button>
            </div>

            <div className="rounded-lg border border-zinc-200/80 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-mono text-[11px]">
                    <tr>
                      <th className="py-2 px-3 font-medium min-w-[220px]">Catalog product</th>
                      <th className="py-2 px-3 font-medium w-24">Quantity</th>
                      <th className="py-2 px-3 font-medium w-28">Contract price ($)</th>
                      <th className="py-2 px-3 font-medium w-24">Tax rate (%)</th>
                      <th className="py-2 px-3 font-medium w-28 text-right">Line total ($)</th>
                      <th className="py-2 px-2 font-medium w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {lineItems.map((item) => {
                      const qty = Number(item.OrderQuantity) || 0;
                      const price = Number(item.UnitPrice) || 0;
                      const rate = Number(item.TaxRate) || 0;
                      const net = qty * price;
                      const lineTotal = net * (1 + rate / 100);

                      return (
                        <tr key={item.tempId} className="hover:bg-zinc-50/50 transition-colors duration-150">
                          <td className="py-2 px-3">
                            <select
                              value={item.ProductID}
                              onChange={(e) => updateLineItem(item.tempId, { ProductID: e.target.value })}
                              required
                              className="w-full h-7 px-2 text-xs bg-white border border-zinc-200 rounded-[6px] font-medium focus:outline-none focus:ring-1 focus:ring-zinc-400 text-zinc-800"
                            >
                              {products.map((p) => (
                                <option key={p.ProductID} value={p.ProductID}>
                                  {p.ProductName} ({p.ProductCode}) — ${p.CostPrice?.toFixed(2)}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              min="1"
                              value={item.OrderQuantity}
                              onChange={(e) =>
                                updateLineItem(item.tempId, { OrderQuantity: Math.max(1, parseInt(e.target.value) || 0) })
                              }
                              required
                              className="h-7 text-xs font-mono tabular-nums font-medium px-2 rounded-[6px] border-zinc-200"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.UnitPrice}
                              onChange={(e) =>
                                updateLineItem(item.tempId, { UnitPrice: parseFloat(e.target.value) || 0 })
                              }
                              required
                              className="h-7 text-xs font-mono tabular-nums font-medium px-2 rounded-[6px] border-zinc-200"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={item.TaxRate}
                              onChange={(e) =>
                                updateLineItem(item.tempId, { TaxRate: parseFloat(e.target.value) || 0 })
                              }
                              className="h-7 text-xs font-mono tabular-nums font-medium px-2 rounded-[6px] border-zinc-200"
                            />
                          </td>
                          <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-zinc-900">
                            ${lineTotal.toFixed(2)}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeLineItem(item.tempId)}
                              disabled={lineItems.length <= 1}
                              className="p-1 text-zinc-400 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-zinc-400 cursor-pointer rounded-[6px] transition-colors duration-150"
                              title="Remove line item"
                              aria-label="Remove line item"
                            >
                              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Live Valuation Summary Breakdown */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-lg bg-zinc-50/80 border border-zinc-200/80 text-zinc-900">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-zinc-400 shrink-0" strokeWidth={1.5} />
              <div>
                <span className="text-xs font-medium text-zinc-900 block">
                  Valuation summary
                </span>
                <p className="text-xs text-zinc-500">
                  Calculated across {lineItems.length} procurement line item(s).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-right">
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block">Net subtotal</span>
                <span className="text-xs font-mono tabular-nums font-medium text-zinc-700">
                  ${totalNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-zinc-500 block">Estimated tax</span>
                <span className="text-xs font-mono tabular-nums font-medium text-zinc-700">
                  ${totalTax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="pl-6 border-l border-zinc-200/80">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block">Total valuation</span>
                <span className="text-base font-mono tabular-nums font-semibold text-zinc-900">
                  ${totalGross.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-200/80">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="h-8 px-4 text-xs font-medium text-zinc-700 hover:bg-zinc-50 rounded-lg border-zinc-200/80 transition-colors duration-150"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-8 px-4 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white rounded-lg shadow-none gap-1.5 transition-colors duration-150"
            >
              {submitting ? "Placing order..." : "Place purchase order"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
