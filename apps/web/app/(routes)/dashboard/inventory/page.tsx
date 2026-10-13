"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Layers, AlertCircle, Warehouse as WarehouseIcon, Package, BrainCircuit } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Inventory, Product, Warehouse } from "@mesh/types";

export default function InventoryPage() {
  const { activeCompanyId } = useCompany();
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Inventory | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, prodRes, whRes] = await Promise.all([
        api.get("/inventory/getAll"),
        api.get("/product/getAll"),
        api.get("/warehouse/getAll"),
      ]);
      setInventories(invRes.data);
      setProducts(prodRes.data);
      setWarehouses(whRes.data);

      if (selectedItem) {
        const found = invRes.data.find((i: Inventory) => i.InventoryID === selectedItem.InventoryID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (prodId: string) => {
    const p = products.find((prod) => prod.ProductID === prodId);
    return p ? `${p.ProductName} (${p.ProductCode})` : prodId;
  };

  const getWarehouseName = (whId: string) => {
    const w = warehouses.find((wh) => wh.WarehouseID === whId);
    return w ? w.WarehouseName : whId;
  };

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inv: Inventory) => {
    setTargetItem(inv);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      InventoryAvailable: Number(formData.InventoryAvailable),
      MinStockLevel: Number(formData.MinStockLevel),
      MaxStockLevel: Number(formData.MaxStockLevel),
      ReorderPoint: Number(formData.ReorderPoint),
    };

    if (modalMode === "create") {
      const res = await api.post("/inventory/add", payload);
      toast({
        title: "Inventory record created",
        description: "Stock ledger entry added.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/inventory/edit", payload);
      toast({
        title: "Inventory updated",
        description: "Stock levels saved.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (inv: Inventory) => {
    try {
      await api.delete(`/inventory/delete/${inv.InventoryID}`);
      toast({
        title: "Record deleted",
        description: "Inventory stock entry removed.",
      });
      if (selectedItem?.InventoryID === inv.InventoryID) {
        setSelectedItem(null);
      }
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const tableColumns: ColumnConfig<Inventory>[] = [
    {
      key: "ProductID",
      header: "Product",
      sortable: true,
      render: (inv) => (
        <Link
          href={`/dashboard/product?q=${encodeURIComponent(getProductName(inv.ProductID))}`}
          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Package className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{getProductName(inv.ProductID)}</span>
        </Link>
      ),
    },
    {
      key: "WarehouseID",
      header: "Warehouse",
      sortable: true,
      render: (inv) => (
        <Link
          href={`/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(inv.WarehouseID))}`}
          className="inline-flex items-center gap-1.5 text-slate-700 hover:text-blue-700 hover:underline font-medium text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <WarehouseIcon className="w-3.5 h-3.5 text-slate-400" />
          {getWarehouseName(inv.WarehouseID)}
        </Link>
      ),
    },
    {
      key: "InventoryAvailable",
      header: "Available Stock",
      sortable: true,
      render: (inv) => {
        const isLow = inv.InventoryAvailable <= inv.ReorderPoint;
        return (
          <div className="flex items-center gap-2.5">
            <span
              className={`font-semibold text-xs ${
                isLow ? "text-amber-600 font-bold" : "text-slate-900"
              }`}
            >
              {inv.InventoryAvailable.toLocaleString()} units
            </span>
            {isLow ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                <span className="w-1.5 h-1.5 rounded-xs bg-amber-600 shrink-0" />
                Low Stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-600">
                <span className="w-1.5 h-1.5 rounded-xs bg-teal-600 shrink-0" />
                In Stock
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "ReorderPoint",
      header: "Reorder Point",
      render: (inv) => (
        <span className="text-slate-600">{inv.ReorderPoint} units</span>
      ),
    },
    {
      key: "StockLimits",
      header: "Min / Max",
      render: (inv) => (
        <span className="text-xs text-slate-500">
          {inv.MinStockLevel} — {inv.MaxStockLevel}
        </span>
      ),
    },
  ];

  const drawerFields: DrawerField<Inventory>[] = [
    {
      label: "Product",
      render: (inv) => getProductName(inv.ProductID),
    },
    {
      label: "Warehouse Location",
      render: (inv) => getWarehouseName(inv.WarehouseID),
    },
    {
      label: "Current Available Inventory",
      render: (inv) => `${inv.InventoryAvailable.toLocaleString()} units`,
    },
    {
      label: "Stock Reorder Trigger Point",
      render: (inv) => `${inv.ReorderPoint} units`,
    },
    {
      label: "Minimum Safe Stock Level",
      render: (inv) => `${inv.MinStockLevel} units`,
    },
    {
      label: "Maximum Capacity Threshold",
      render: (inv) => `${inv.MaxStockLevel} units`,
    },
    { label: "Inventory Record ID", key: "InventoryID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "ProductID",
      label: "Product",
      type: "select",
      required: true,
      options: products.map((p) => ({
        label: `${p.ProductName} (${p.ProductCode})`,
        value: p.ProductID,
      })),
    },
    {
      name: "WarehouseID",
      label: "Warehouse",
      type: "select",
      required: true,
      options: warehouses.map((w) => ({
        label: w.WarehouseName,
        value: w.WarehouseID,
      })),
    },
    {
      name: "InventoryAvailable",
      label: "Available Quantity",
      type: "number",
      required: true,
      defaultValue: 100,
    },
    {
      name: "MinStockLevel",
      label: "Min Stock Level",
      type: "number",
      required: true,
      defaultValue: 20,
    },
    {
      name: "MaxStockLevel",
      label: "Max Stock Level",
      type: "number",
      required: true,
      defaultValue: 500,
    },
    {
      name: "ReorderPoint",
      label: "Reorder Point",
      type: "number",
      required: true,
      defaultValue: 40,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time stock tracking, min-max thresholds, and warehouse allocation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard/forecast">
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50 bg-white shadow-xs"
            >
              <BrainCircuit className="w-3.5 h-3.5 text-indigo-600" />
              ML Forecaster & Auto-PO
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-slate-700 bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Stock Entry
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={inventories}
        columns={tableColumns}
        idKey="InventoryID"
        searchPlaceholder="Search inventory..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No inventory entries found. Allocate your first stock item."
      />

      <GenericEntityDrawer
        title={selectedItem ? getProductName(selectedItem.ProductID) : "Stock Details"}
        subtitle="Inventory Record"
        item={selectedItem}
        icon={<Layers className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "ML Stockout Risk Forecaster & Auto-PO",
            sublabel: "Run XGBoost predictive risk modeling and automated purchase order execution",
            href: (inv) => `/dashboard/forecast?q=${encodeURIComponent(getProductName(inv.ProductID))}`,
          },
          {
            label: "Product Catalog Master",
            sublabel: "View complete product specifications, pricing, and packaging",
            href: (inv) => `/dashboard/product?q=${encodeURIComponent(getProductName(inv.ProductID))}`,
          },
          {
            label: "Warehouse Facility Details",
            sublabel: "Inspect warehouse specifications and location hub",
            href: (inv) => `/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(inv.WarehouseID))}`,
          },
          {
            label: "Active Stock Transfers",
            sublabel: "Check inter-warehouse shipments for this product",
            href: (inv) => `/dashboard/transfer?q=${encodeURIComponent(getProductName(inv.ProductID))}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Inventory Stock"
        item={targetItem}
        mode={modalMode}
        fields={modalFields}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
      />

      <Toaster />
    </div>
  );
}
