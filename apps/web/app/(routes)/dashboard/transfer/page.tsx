"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, ArrowLeftRight, Calendar, Package, ArrowRight } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Transfer, Product, Warehouse } from "@mesh/types";

export default function TransferPage() {
  const { activeCompanyId } = useCompany();
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Transfer | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Transfer | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [transRes, prodRes, whRes] = await Promise.all([
        api.get("/transfer/getAll"),
        api.get("/product/getAll"),
        api.get("/warehouse/getAll"),
      ]);
      setTransfers(transRes.data);
      setProducts(prodRes.data);
      setWarehouses(whRes.data);

      if (selectedItem) {
        const found = transRes.data.find((t: Transfer) => t.TransferID === selectedItem.TransferID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching transfers",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (prodId: string) => {
    const p = products.find((prod) => prod.ProductID === prodId);
    return p ? p.ProductName : prodId;
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

  const handleOpenEdit = (t: Transfer) => {
    setTargetItem(t);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (formData.OutWarehouseID === formData.InWarehouseID) {
      toast({
        title: "Invalid Transfer",
        description: "Origin and Destination warehouse cannot be the same.",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      ...formData,
      TransferQuantity: Number(formData.TransferQuantity),
      SentDate: new Date(formData.SentDate).toISOString(),
    };
    if (formData.RecievedDate) {
      payload.RecievedDate = new Date(formData.RecievedDate).toISOString();
    }

    if (modalMode === "create") {
      const res = await api.post("/transfer/add", payload);
      toast({
        title: "Transfer initiated",
        description: "Stock transit scheduled.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/transfer/edit", payload);
      toast({
        title: "Transfer updated",
        description: "Transit status updated.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (t: Transfer) => {
    try {
      await api.delete(`/transfer/delete/${t.TransferID}`);
      toast({
        title: "Transfer deleted",
        description: "Movement ledger removed.",
      });
      if (selectedItem?.TransferID === t.TransferID) {
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

  const tableColumns: ColumnConfig<Transfer>[] = [
    {
      key: "ProductID",
      header: "Transferred Product",
      sortable: true,
      render: (t) => (
        <Link
          href={`/dashboard/product?q=${encodeURIComponent(getProductName(t.ProductID))}`}
          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <Package className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{getProductName(t.ProductID)}</span>
        </Link>
      ),
    },
    {
      key: "Route",
      header: "Warehouse Route",
      render: (t) => (
        <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <Link
            href={`/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(t.OutWarehouseID))}`}
            className="bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded text-slate-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {getWarehouseName(t.OutWarehouseID)}
          </Link>
          <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <Link
            href={`/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(t.InWarehouseID))}`}
            className="bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded text-blue-800 hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            {getWarehouseName(t.InWarehouseID)}
          </Link>
        </div>
      ),
    },
    {
      key: "TransferQuantity",
      header: "Quantity",
      sortable: true,
      render: (t) => (
        <span className="font-semibold text-slate-900 text-sm">
          {t.TransferQuantity.toLocaleString()} units
        </span>
      ),
    },
    {
      key: "SentDate",
      header: "Sent / Dispatch Date",
      sortable: true,
      render: (t) => (
        <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {t.SentDate ? new Date(t.SentDate).toLocaleDateString() : "—"}
        </span>
      ),
    },
    {
      key: "Status",
      header: "Transit State",
      render: (t) =>
        t.RecievedDate ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-teal-600 shrink-0" />
            Received
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-amber-600 shrink-0" />
            In Transit
          </span>
        ),
    },
  ];

  const drawerFields: DrawerField<Transfer>[] = [
    {
      label: "Product",
      render: (t) => getProductName(t.ProductID),
    },
    {
      label: "Transit Quantity",
      render: (t) => `${t.TransferQuantity} units`,
    },
    {
      label: "Dispatch Warehouse (Origin)",
      render: (t) => getWarehouseName(t.OutWarehouseID),
    },
    {
      label: "Receiving Warehouse (Destination)",
      render: (t) => getWarehouseName(t.InWarehouseID),
    },
    {
      label: "Date Dispatched",
      render: (t) => (t.SentDate ? new Date(t.SentDate).toLocaleString() : "—"),
    },
    {
      label: "Date Received at Destination",
      render: (t) => (t.RecievedDate ? new Date(t.RecievedDate).toLocaleString() : "Pending In-transit"),
    },
    { label: "Transfer Record ID", key: "TransferID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "ProductID",
      label: "Product",
      type: "select",
      required: true,
      options: products.map((p) => ({
        label: p.ProductName,
        value: p.ProductID,
      })),
    },
    {
      name: "OutWarehouseID",
      label: "Origin Warehouse",
      type: "select",
      required: true,
      options: warehouses.map((w) => ({
        label: w.WarehouseName,
        value: w.WarehouseID,
      })),
    },
    {
      name: "InWarehouseID",
      label: "Destination Warehouse",
      type: "select",
      required: true,
      options: warehouses.map((w) => ({
        label: w.WarehouseName,
        value: w.WarehouseID,
      })),
    },
    {
      name: "TransferQuantity",
      label: "Quantity to Transfer",
      type: "number",
      required: true,
      defaultValue: 25,
    },
    {
      name: "SentDate",
      label: "Dispatch Date",
      type: "datetime-local",
      required: true,
    },
    {
      name: "RecievedDate",
      label: "Received Date (Optional)",
      type: "datetime-local",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Internal Transfers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Reallocate stock across warehouses, track active shipments, and balance supply.
          </p>
        </div>
        <div className="flex items-center gap-3">
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
            Initiate Transfer
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={transfers}
        columns={tableColumns}
        idKey="TransferID"
        searchPlaceholder="Search transfers..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No stock transfers found. Initiate your first warehouse reallocation."
      />

      <GenericEntityDrawer
        title={selectedItem ? `Transfer #${selectedItem.TransferID.slice(-6)}` : "Transfer"}
        subtitle="Stock Relocation"
        item={selectedItem}
        icon={<ArrowLeftRight className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "Product Catalog Master",
            sublabel: "View detailed specifications and pricing for this product",
            href: (t) => `/dashboard/product?q=${encodeURIComponent(getProductName(t.ProductID))}`,
          },
          {
            label: "Origin Warehouse Facility",
            sublabel: `Inspect source warehouse (${getWarehouseName(selectedItem?.OutWarehouseID || "")})`,
            href: (t) => `/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(t.OutWarehouseID))}`,
          },
          {
            label: "Destination Warehouse Facility",
            sublabel: `Inspect target warehouse (${getWarehouseName(selectedItem?.InWarehouseID || "")})`,
            href: (t) => `/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(t.InWarehouseID))}`,
          },
          {
            label: "Product Inventory Ledger",
            sublabel: "Track total warehouse stock balance for this product",
            href: (t) => `/dashboard/inventory?q=${encodeURIComponent(getProductName(t.ProductID))}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Stock Transfer"
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
