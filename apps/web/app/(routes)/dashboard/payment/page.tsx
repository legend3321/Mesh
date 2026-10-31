"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Coins, DollarSign, CheckCircle2, Clock, XCircle, ShieldAlert, ArrowUpRight } from "lucide-react";
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
      const normalizedPayments = (payRes.data || []).map((p: any) => ({
        ...p,
        DeliveryID: p.DeliveryID || p.DeileveryID || null,
        Delivery: p.Delivery || p.Dilevery || null,
      }));
      setPayments(normalizedPayments);
      setOrders(ordRes.data);
      setDeliveries(delRes.data);

      if (selectedItem) {
        const found = normalizedPayments.find((p: Payment) => p.PaymentID === selectedItem.PaymentID);
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
    setTargetItem({
      ...p,
      DeliveryID: p.DeliveryID || (p as any).DeileveryID || undefined,
    });
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
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-emerald-600 shrink-0" />
            Completed
          </span>
        );
      case "PENDING_APPROVAL":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
            Pending Approval
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
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-red-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-red-600 shrink-0" />
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
      render: (p) => {
        const isHighValue = p.PaymentAmount >= 10000;
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-bold text-slate-900 text-sm font-mono">
              ${p.PaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
            {isHighValue && (
              <Link
                href="/dashboard/approval"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold tracking-tight bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
                title="Transaction amount exceeds $10,000 statutory limit. Maker-Checker approval required."
              >
                <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" />
                <span>High-Value (SoD) →</span>
              </Link>
            )}
          </div>
        );
      },
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
        const delId = p.DeliveryID || (p as any).DeileveryID;
        if (delId) {
          return (
            <Link
              href={`/dashboard/delivery?id=${delId}`}
              className="text-xs font-mono text-emerald-600 hover:text-emerald-800 hover:underline bg-emerald-50 px-1.5 py-0.5 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              DEL-{delId.slice(-6).toUpperCase()} →
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
      render: (p) => {
        const isHighValue = p.PaymentAmount >= 10000;
        return (
          <div className="space-y-2">
            <span className="font-mono font-extrabold text-sm text-slate-900 block">
              ${p.PaymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
            {isHighValue && (
              <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-200/90 text-xs text-amber-900 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>High-Value Transaction (Maker-Checker Approval Required)</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Settlements and disbursements valued at or above $10,000 require independent dual-control authorization before ledger clearance.
                </p>
                <Link
                  href="/dashboard/approval"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 underline hover:text-amber-950 mt-0.5"
                >
                  Inspect Approval Queue <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        );
      },
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
      render: (p) => p.DeliveryID || (p as any).DeileveryID || "None",
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
        { label: "PENDING_APPROVAL", value: "PENDING_APPROVAL" },
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
            className="h-9 gap-1.5 text-xs bg-[#FD3706] hover:bg-[#E02E00] text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Record Payment
          </Button>
        </div>
      </div>

      {/* High-Value / Dual-Control Governance Alert Banner */}
      {payments.some((p) => p.PaymentAmount >= 10000 || p.PaymentStatus === "PENDING_APPROVAL") && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 px-4 flex items-center justify-between gap-3 text-amber-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Maker-Checker Dual Control Active:</strong> High-value payment settlements (&ge; $10,000) and pending disbursements require segregated approval sign-off.
            </span>
          </div>
          <Link
            href="/dashboard/approval"
            className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:text-amber-950 underline shrink-0 whitespace-nowrap"
          >
            Review Approval Queue <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

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
          ...((selectedItem?.DeliveryID || (selectedItem as any)?.DeileveryID)
            ? [
                {
                  label: "Associated Outbound Delivery",
                  sublabel: `Inspect delivery manifest DEL-${(selectedItem?.DeliveryID || (selectedItem as any)?.DeileveryID || "").slice(-6).toUpperCase()}`,
                  href: (p: Payment) => `/dashboard/delivery?id=${p.DeliveryID || (p as any).DeileveryID}`,
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
