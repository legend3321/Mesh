"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, ListCheck, Calendar, Building } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Order, Provider } from "@mesh/types";

export default function OrderPage() {
  const { activeCompanyId } = useCompany();
  const [orders, setOrders] = useState<Order[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Order | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Order | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordRes, provRes] = await Promise.all([
        api.get("/order/getAll"),
        api.get("/provider/getAll"),
      ]);
      setOrders(ordRes.data);
      setProviders(provRes.data);

      if (selectedItem) {
        const found = ordRes.data.find((o: Order) => o.OrderID === selectedItem.OrderID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching orders",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProviderName = (provId: string) => {
    const p = providers.find((prov) => prov.ProviderID === provId);
    return p ? p.ProviderName : provId;
  };

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (order: Order) => {
    setTargetItem(order);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      OrderDate: new Date(formData.OrderDate).toISOString(),
    };

    if (modalMode === "create") {
      const res = await api.post("/order/add", payload);
      toast({
        title: "Order placed",
        description: "Purchase order created successfully.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/order/edit", payload);
      toast({
        title: "Order updated",
        description: "Order specifications saved.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (order: Order) => {
    try {
      await api.delete(`/order/delete/${order.OrderID}`);
      toast({
        title: "Order deleted",
        description: "Purchase order removed.",
      });
      if (selectedItem?.OrderID === order.OrderID) {
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

  const tableColumns: ColumnConfig<Order>[] = [
    {
      key: "OrderID",
      header: "Order Reference",
      sortable: true,
      render: (o) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <ListCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <code className="text-xs font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
            PO-{o.OrderID.slice(-6).toUpperCase()}
          </code>
        </div>
      ),
    },
    {
      key: "ProviderID",
      header: "Vendor / Provider",
      sortable: true,
      render: (o) => (
        <Link
          href={`/dashboard/provider?id=${o.ProviderID}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <Building className="w-3.5 h-3.5 text-blue-500" />
          {getProviderName(o.ProviderID)}
        </Link>
      ),
    },
    {
      key: "OrderDate",
      header: "Purchase Date",
      sortable: true,
      render: (o) => (
        <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {o.OrderDate ? new Date(o.OrderDate).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ];

  const drawerFields: DrawerField<Order>[] = [
    { label: "Purchase Order ID", key: "OrderID" },
    {
      label: "Selected Vendor",
      render: (o) => getProviderName(o.ProviderID),
    },
    {
      label: "Order Execution Date",
      render: (o) => (o.OrderDate ? new Date(o.OrderDate).toLocaleString() : "—"),
    },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "ProviderID",
      label: "Provider / Supplier",
      type: "select",
      required: true,
      options: providers.map((p) => ({
        label: `${p.ProviderName} (${p.ProviderAddress})`,
        value: p.ProviderID,
      })),
    },
    {
      name: "OrderDate",
      label: "Order Date",
      type: "datetime-local",
      required: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Purchase Orders
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Supplier requisitions, procurement workflows, and inbound purchasing.
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
            New Purchase Order
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={orders}
        columns={tableColumns}
        idKey="OrderID"
        searchPlaceholder="Search orders..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No orders found. Generate your first procurement order."
      />

      <GenericEntityDrawer
        title={selectedItem ? `PO-${selectedItem.OrderID.slice(-6).toUpperCase()}` : "Order"}
        subtitle="Purchase Order Details"
        item={selectedItem}
        icon={<ListCheck className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "Supplying Vendor Profile",
            sublabel: "Inspect vendor manufacturing facility and contacts",
            href: (o) => `/dashboard/provider?id=${o.ProviderID}`,
          },
          {
            label: "Linked Invoices & Settlements",
            sublabel: `Browse payments booked for purchase order #${selectedItem?.OrderID.slice(-6).toUpperCase()}`,
            href: (o) => `/dashboard/payment?q=${encodeURIComponent(o.OrderID)}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Purchase Order"
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
