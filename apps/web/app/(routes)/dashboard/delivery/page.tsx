"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Truck, Calendar, User } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Delivery, Customer } from "@mesh/types";

export default function DeliveryPage() {
  const { activeCompanyId } = useCompany();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Delivery | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Delivery | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [delivRes, custRes] = await Promise.all([
        api.get("/delivery/getAll"),
        api.get("/customer/getAll"),
      ]);
      setDeliveries(delivRes.data);
      setCustomers(custRes.data);

      if (selectedItem) {
        const found = delivRes.data.find((d: Delivery) => d.DeliveryID === selectedItem.DeliveryID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching deliveries",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (custId: string) => {
    const c = customers.find((cust) => cust.CustomerID === custId);
    return c ? c.CustomerName : custId;
  };

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (deliv: Delivery) => {
    setTargetItem(deliv);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      SalesDate: new Date(formData.SalesDate).toISOString(),
    };

    if (modalMode === "create") {
      const res = await api.post("/delivery/add", payload);
      toast({
        title: "Delivery logged",
        description: "Shipment dispatch recorded.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/delivery/edit", payload);
      toast({
        title: "Delivery updated",
        description: "Dispatch details saved.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (deliv: Delivery) => {
    try {
      await api.delete(`/delivery/delete/${deliv.DeliveryID}`);
      toast({
        title: "Delivery deleted",
        description: "Shipment record removed.",
      });
      if (selectedItem?.DeliveryID === deliv.DeliveryID) {
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

  const tableColumns: ColumnConfig<Delivery>[] = [
    {
      key: "DeliveryID",
      header: "Delivery ID",
      sortable: true,
      render: (d) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <Truck className="w-4 h-4 text-blue-600 shrink-0" />
          <code className="text-xs font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
            {d.DeliveryID}
          </code>
        </div>
      ),
    },
    {
      key: "CustomerID",
      header: "Recipient Customer",
      sortable: true,
      render: (d) => (
        <Link
          href={`/dashboard/customer?id=${d.CustomerID}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="w-3.5 h-3.5 text-blue-500" />
          {getCustomerName(d.CustomerID)}
        </Link>
      ),
    },
    {
      key: "SalesDate",
      header: "Sales / Dispatch Date",
      sortable: true,
      render: (d) => (
        <span className="inline-flex items-center gap-1 text-slate-600 text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          {d.SalesDate ? new Date(d.SalesDate).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ];

  const drawerFields: DrawerField<Delivery>[] = [
    { label: "Delivery ID", key: "DeliveryID" },
    {
      label: "Customer Account",
      render: (d) => getCustomerName(d.CustomerID),
    },
    {
      label: "Scheduled Dispatch Date",
      render: (d) => (d.SalesDate ? new Date(d.SalesDate).toLocaleString() : "—"),
    },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "CustomerID",
      label: "Customer",
      type: "select",
      required: true,
      options: customers.map((c) => ({
        label: `${c.CustomerName} (${c.CustomerAddress})`,
        value: c.CustomerID,
      })),
    },
    {
      name: "SalesDate",
      label: "Sales / Delivery Date",
      type: "datetime-local",
      required: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Outbound Deliveries
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track dispatches, customer drop-offs, and order fulfillment logistics.
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
            Create Delivery
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={deliveries}
        columns={tableColumns}
        idKey="DeliveryID"
        searchPlaceholder="Search deliveries..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No delivery records found. Record your first dispatch."
      />

      <GenericEntityDrawer
        title={selectedItem ? `Delivery #${selectedItem.DeliveryID.slice(-6)}` : "Delivery"}
        subtitle="Shipment Manifest"
        item={selectedItem}
        icon={<Truck className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "Recipient Customer Account",
            sublabel: "View customer address and order fulfillment profile",
            href: (d) => `/dashboard/customer?id=${d.CustomerID}`,
          },
          {
            label: "Associated Payments & Invoices",
            sublabel: `Browse payments linked to delivery #${selectedItem?.DeliveryID.slice(-6)}`,
            href: (d) => `/dashboard/payment?q=${encodeURIComponent(d.DeliveryID)}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Delivery"
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
