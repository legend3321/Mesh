"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Captions, ShieldCheck, User as UserIcon } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { useCompany } from "@/app/components/CompanyContext";
import type { Transaction } from "@mesh/types";

export default function TransactionPage() {
  const { data: session } = useSession();
  const { activeCompanyId } = useCompany();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Transaction | null>(null);

  // Modal (Append-only logs)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<Transaction | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, [activeCompanyId]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const res = await api.get("/transaction/getAll");
      setTransactions(res.data);
      if (selectedItem) {
        const found = res.data.find((t: Transaction) => t.TransactionID === selectedItem.TransactionID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching transactions",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setTargetItem(null);
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      UserID: formData.UserID || (session?.user as any)?.id || "6aca01f97635e96df4e1b2bd",
    };

    const res = await api.post("/transaction/add", payload);
    toast({
      title: "Transaction logged",
      description: "Immutable audit trail entry recorded.",
    });
    await fetchTransactions();
    if (res.data) setSelectedItem(res.data);
  };

  const tableColumns: ColumnConfig<Transaction>[] = [
    {
      key: "TransactionID",
      header: "Log Ref",
      sortable: true,
      render: (t) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <Captions className="w-4 h-4 text-blue-600 shrink-0" />
          <code className="text-xs font-mono text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
            TX-{t.TransactionID.slice(-6).toUpperCase()}
          </code>
        </div>
      ),
    },
    {
      key: "TransactionDetail",
      header: "Action / Event Summary",
      sortable: true,
      render: (t) => (
        <span className="font-medium text-slate-800 text-sm">
          {t.TransactionDetail}
        </span>
      ),
    },
    {
      key: "UserID",
      header: "Operator / User ID",
      render: (t) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-600">
          <UserIcon className="w-3.5 h-3.5 text-slate-400" />
          <code className="font-mono">{t.UserID}</code>
        </span>
      ),
    },
  ];

  const drawerFields: DrawerField<Transaction>[] = [
    { label: "Audit Transaction ID", key: "TransactionID" },
    { label: "Operation Details", key: "TransactionDetail" },
    { label: "Executing User / System Actor ID", key: "UserID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "TransactionDetail",
      label: "Activity / Log Summary",
      type: "text",
      required: true,
      placeholder: "e.g. Approved warehouse transfer for Batch 41",
    },
    {
      name: "UserID",
      label: "Actor User ID (Optional, defaults to current user)",
      type: "text",
      placeholder: (session?.user as any)?.id || "Current User",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            System Transactions
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable audit logs, administrative actions, and user event history.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTransactions}
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
            Log Transaction
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={transactions}
        columns={tableColumns}
        idKey="TransactionID"
        searchKey="TransactionDetail"
        searchPlaceholder="Search audit log entries..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        emptyMessage="No transaction logs found. System events will be displayed here."
      />

      <GenericEntityDrawer
        title={selectedItem ? `TX-${selectedItem.TransactionID.slice(-6).toUpperCase()}` : "Transaction"}
        subtitle="Audit Log Event"
        item={selectedItem}
        icon={<ShieldCheck className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        onClose={() => setSelectedItem(null)}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Transaction Log"
        item={targetItem}
        mode="create"
        fields={modalFields}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
      />

      <Toaster />
    </div>
  );
}
