"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Product } from "@mesh/types";
import { X, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Partial<Product>) => Promise<void>;
  product?: Product | null;
  mode: "create" | "edit";
}

export default function ProductModal({
  isOpen,
  onClose,
  onSubmit,
  product,
  mode,
}: ProductModalProps) {
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    ProductCode: "",
    BarCode: "",
    ProductName: "",
    ProductDescription: "",
    ProductCategory: "",
    CostPrice: 0,
    SellPrice: 0,
    MaxretailPrice: 0,
    ReorderQuantity: 10,
    PackedWeight: 1,
    PackedHeight: 10,
    PackedWidth: 10,
    PackedDepth: 10,
    Refrigerated: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (product && mode === "edit") {
      setFormData({
        ProductID: product.ProductID,
        ProductCode: product.ProductCode || "",
        BarCode: product.BarCode || "",
        ProductName: product.ProductName || "",
        ProductDescription: product.ProductDescription || "",
        ProductCategory: product.ProductCategory || "",
        CostPrice: product.CostPrice || 0,
        SellPrice: product.SellPrice || 0,
        MaxretailPrice: product.MaxretailPrice || 0,
        ReorderQuantity: product.ReorderQuantity ?? 10,
        PackedWeight: product.PackedWeight ?? 1,
        PackedHeight: product.PackedHeight ?? 10,
        PackedWidth: product.PackedWidth ?? 10,
        PackedDepth: product.PackedDepth ?? 10,
        Refrigerated: !!product.Refrigerated,
      });
    } else if (mode === "create") {
      setFormData({
        ProductCode: `PRD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        BarCode: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
        ProductName: "",
        ProductDescription: "",
        ProductCategory: "General",
        CostPrice: 10,
        SellPrice: 15,
        MaxretailPrice: 20,
        ReorderQuantity: 20,
        PackedWeight: 1.5,
        PackedHeight: 15,
        PackedWidth: 15,
        PackedDepth: 15,
        Refrigerated: false,
      });
    }
    setError(null);
  }, [product, mode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ProductName || !formData.ProductCode || !formData.BarCode) {
      setError("Product Name, Code, and Barcode are required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await onSubmit(formData);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to save product.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {mode === "create" ? "Add New Product" : "Edit Product"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {mode === "create"
                ? "Enter product details to add to catalog and warehouse inventory."
                : `Update properties for ${product?.ProductName}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form id="product-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ProductName">Product Name *</Label>
              <Input
                id="ProductName"
                required
                className="mt-1"
                placeholder="e.g. Wireless Barcode Scanner"
                value={formData.ProductName}
                onChange={(e) => setFormData({ ...formData, ProductName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="ProductCategory">Category</Label>
              <Input
                id="ProductCategory"
                className="mt-1"
                placeholder="e.g. Electronics"
                value={formData.ProductCategory}
                onChange={(e) => setFormData({ ...formData, ProductCategory: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="ProductCode">Product Code / SKU *</Label>
              <Input
                id="ProductCode"
                required
                className="mt-1 font-mono text-sm"
                placeholder="PRD-XXXXXX"
                value={formData.ProductCode}
                onChange={(e) => setFormData({ ...formData, ProductCode: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="BarCode">Barcode *</Label>
              <Input
                id="BarCode"
                required
                className="mt-1 font-mono text-sm"
                placeholder="12 digit barcode"
                value={formData.BarCode}
                onChange={(e) => setFormData({ ...formData, BarCode: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ProductDescription">Description</Label>
            <textarea
              id="ProductDescription"
              rows={2}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Product technical specifications or usage notes..."
              value={formData.ProductDescription}
              onChange={(e) => setFormData({ ...formData, ProductDescription: e.target.value })}
            />
          </div>

          {/* Pricing Row */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Pricing Details ($)
            </h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="CostPrice">Cost Price</Label>
                <Input
                  id="CostPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1"
                  value={formData.CostPrice}
                  onChange={(e) => setFormData({ ...formData, CostPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="SellPrice">Sell Price</Label>
                <Input
                  id="SellPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1"
                  value={formData.SellPrice}
                  onChange={(e) => setFormData({ ...formData, SellPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="MaxretailPrice">Max Retail (MRP)</Label>
                <Input
                  id="MaxretailPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  className="mt-1"
                  value={formData.MaxretailPrice}
                  onChange={(e) => setFormData({ ...formData, MaxretailPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Logistics Row */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Dimensions & Storage
            </h4>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label htmlFor="PackedWeight">Weight (kg)</Label>
                <Input
                  id="PackedWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  className="mt-1"
                  value={formData.PackedWeight ?? ""}
                  onChange={(e) => setFormData({ ...formData, PackedWeight: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="PackedHeight">Height (cm)</Label>
                <Input
                  id="PackedHeight"
                  type="number"
                  step="0.1"
                  min="0"
                  className="mt-1"
                  value={formData.PackedHeight ?? ""}
                  onChange={(e) => setFormData({ ...formData, PackedHeight: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="PackedWidth">Width (cm)</Label>
                <Input
                  id="PackedWidth"
                  type="number"
                  step="0.1"
                  min="0"
                  className="mt-1"
                  value={formData.PackedWidth ?? ""}
                  onChange={(e) => setFormData({ ...formData, PackedWidth: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="PackedDepth">Depth (cm)</Label>
                <Input
                  id="PackedDepth"
                  type="number"
                  step="0.1"
                  min="0"
                  className="mt-1"
                  value={formData.PackedDepth ?? ""}
                  onChange={(e) => setFormData({ ...formData, PackedDepth: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <Label htmlFor="ReorderQuantity">Reorder Threshold (units)</Label>
                <Input
                  id="ReorderQuantity"
                  type="number"
                  min="0"
                  className="mt-1"
                  value={formData.ReorderQuantity ?? ""}
                  onChange={(e) => setFormData({ ...formData, ReorderQuantity: parseInt(e.target.value, 10) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="Refrigerated"
                  checked={!!formData.Refrigerated}
                  onCheckedChange={(checked) => setFormData({ ...formData, Refrigerated: !!checked })}
                />
                <label
                  htmlFor="Refrigerated"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Requires Cold Storage (Refrigerated)
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60 flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button form="product-form" type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-800">
            <Save className="w-4 h-4 mr-1.5" />
            {loading ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
