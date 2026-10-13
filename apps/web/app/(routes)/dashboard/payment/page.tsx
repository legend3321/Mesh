"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Coins, DollarSign, CheckCircle2, Clock, XCircle } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Payment, Order, Delivery } from "@mesh/types";

export default function PaymentPage() {
  const { activeCompanyId } = useCompany();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Payment | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Payment | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [payRes, ordRes, delRes] = await Promise.all([
        api.get("/payment/getAll"),
        api.get("/order/getAll"),
        api.get("/delivery/getAll"),
      ]);
      setPayments(payRes.data);
      setOrders(ordRes.data);
      setDeliveries(delRes.data);

      if (selectedItem) {
        const found = payRes.data.find((p: Payment) => p.PaymentID === selectedItem.PaymentID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching payments",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Payment) => {
    setTargetItem(p);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      PaymentAmount: Number(formData.PaymentAmount),
      OrderID: formData.OrderID || null,
      DeliveryID: formData.DeliveryID || null,
    };

    if (modalMode === "create") {
      const res = await api.post("/payment/add", payload);
      toast({
        title: "Payment recorded",
        description: `Logged $${payload.PaymentAmount.toFixed(2)}.`,
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/payment/edit", payload);
      toast({
        title: "Payment updated",
        description: "Payment status saved.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (p: Payment) => {
    try {
      await api.delete(`/payment/delete/${p.PaymentID}`);
      toast({
        title: "Payment deleted",
        description: "Ledger entry removed.",
      });
      if (selectedItem?.PaymentID === p.PaymentID) {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-teal-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-teal-600 shrink-0" />
            Completed
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-amber-600 shrink-0" />
            Processing
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-rose-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-rose-600 shrink-0" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="w-1.5 h-1.5 rounded-xs bg-slate-400 shrink-0" />
            Initiated
          </span>
        );
    }
  };

  const tableColumns: ColumnConfig<Payment>[] = [
    {
      key: "PaymentAmount",
      header: "Amount",
      sortable: true,
      render: (p) => (
        <span className="font-bold text-slate-900 text-sm">
          ${p.PaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      key: "PaymentStatus",
      header: "Status",
      sortable: true,
      render: (p) => getStatusBadge(p.PaymentStatus),
    },
    {
      key: "PaymentMode",
      header: "Method",
      render: (p) => (
        <span className="text-xs font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
          {p.PaymentMode || "Standard"}
        </span>
      ),
    },
    {
      key: "PaymentDescription",
      header: "Description / Reference",
      render: (p) => (
        <span className="text-slate-600 text-xs truncate max-w-xs block">
          {p.PaymentDescription || "—"}
        </span>
      ),
    },
    {
      key: "Reference",
      header: "Attached Reference",
      render: (p) => {
        if (p.OrderID) {
          return (
            <Link
              href={`/dashboard/order?id=${p.OrderID}`}
              className="text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline bg-blue-50 px-1.5 py-0.5 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              PO-{p.OrderID.slice(-6).toUpperCase()} →
            </Link>
          );
        }
        if (p.DeliveryID) {
          return (
            <Link
              href={`/dashboard/delivery?id=${p.DeliveryID}`}
              className="text-xs font-mono text-emerald-600 hover:text-emerald-800 hover:underline bg-emerald-50 px-1.5 py-0.5 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              DEL-{p.DeliveryID.slice(-6).toUpperCase()} →
            </Link>
          );
        }
        return <span className="text-xs text-slate-400">Direct Payment</span>;
      },
    },
  ];

  const drawerFields: DrawerField<Payment>[] = [
    {
      label: "Payment Amount",
      render: (p) => `$${p.PaymentAmount.toFixed(2)} USD`,
    },
    {
      label: "Current Status",
      render: (p) => getStatusBadge(p.PaymentStatus),
    },
    {
      label: "Payment Instrument / Mode",
      render: (p) => p.PaymentMode || "Not Specified",
    },
    {
      label: "Transaction Description",
      key: "PaymentDescription",
    },
    {
      label: "Related Purchase Order ID",
      render: (p) => p.OrderID || "None",
    },
    {
      label: "Related Delivery ID",
      render: (p) => p.DeliveryID || "None",
    },
    { label: "Payment Transaction ID", key: "PaymentID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "PaymentAmount",
      label: "Amount ($)",
      type: "number",
      required: true,
      defaultValue: 100,
    },
    {
      name: "PaymentStatus",
      label: "Status",
      type: "select",
      required: true,
      defaultValue: "COMPLETED",
      options: [
        { label: "COMPLETED", value: "COMPLETED" },
        { label: "PROCESSING", value: "PROCESSING" },
        { label: "INITIATED", value: "INITIATED" },
        { label: "CANCELLED", value: "CANCELLED" },
      ],
    },
    {
      name: "PaymentMode",
      label: "Payment Mode",
      type: "select",
      options: [
        { label: "ONLINE (Electronic Transfer / Card)", value: "ONLINE" },
        { label: "OFFLINE (Cash / Direct Deposit)", value: "OFFLINE" },
        { label: "CHEQUE (Bank Draft)", value: "CHEQUE" },
      ],
    },
    {
      name: "PaymentDescription",
      label: "Description / Memo",
      type: "text",
      placeholder: "e.g. Invoice settlement for PO-49A1",
    },
    {
      name: "OrderID",
      label: "Associate with Order (Optional)",
      type: "select",
      options: orders.map((o) => ({
        label: `PO-${o.OrderID.slice(-6).toUpperCase()}`,
        value: o.OrderID,
      })),
    },
    {
      name: "DeliveryID",
      label: "Associate with Delivery (Optional)",
      type: "select",
      options: deliveries.map((d) => ({
        label: `DEL-${d.DeliveryID.slice(-6).toUpperCase()}`,
        value: d.DeliveryID,
      })),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payments & Settlements
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts receivable and payable, transaction statuses, and invoice settlements.
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
            Record Payment
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={payments}
        columns={tableColumns}
        idKey="PaymentID"
        searchPlaceholder="Search payments..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No payment records found. Record your first payment."
      />

      <GenericEntityDrawer
        title={selectedItem ? `$${selectedItem.PaymentAmount.toFixed(2)}` : "Payment"}
        subtitle="Payment Record"
        item={selectedItem}
        icon={<Coins className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          ...(selectedItem?.OrderID
            ? [
                {
                  label: "Source Purchase Order",
                  sublabel: `Inspect procurement order PO-${selectedItem.OrderID.slice(-6).toUpperCase()}`,
                  href: (p: Payment) => `/dashboard/order?id=${p.OrderID}`,
                },
              ]
            : []),
          ...(selectedItem?.DeliveryID
            ? [
                {
                  label: "Associated Outbound Delivery",
                  sublabel: `Inspect delivery manifest DEL-${selectedItem.DeliveryID.slice(-6).toUpperCase()}`,
                  href: (p: Payment) => `/dashboard/delivery?id=${p.DeliveryID}`,
                },
              ]
            : []),
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Payment"
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
