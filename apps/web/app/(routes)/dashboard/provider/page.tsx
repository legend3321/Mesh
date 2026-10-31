"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, BookUser, MapPin, Building } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useCompany } from "@/app/components/CompanyContext";
import type { Provider } from "@mesh/types";

export default function ProviderPage() {
  const { activeCompanyId } = useCompany();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Provider | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Provider | null>(null);

  useEffect(() => {
    fetchProviders();
  }, [activeCompanyId]);

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const res = await api.get("/provider/getAll");
      setProviders(res.data);
      if (selectedItem) {
        const found = res.data.find((p: Provider) => p.ProviderID === selectedItem.ProviderID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching providers",
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

  const handleOpenEdit = (p: Provider) => {
    setTargetItem(p);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (modalMode === "create") {
      const res = await api.post("/provider/add", formData);
      toast({
        title: "Provider added",
        description: `Supplier ${formData.ProviderName} registered.`,
      });
      await fetchProviders();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/provider/edit", formData);
      toast({
        title: "Provider updated",
        description: `Changes to ${formData.ProviderName} saved.`,
      });
      await fetchProviders();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (p: Provider) => {
    try {
      await api.delete(`/provider/delete/${p.ProviderID}`);
      toast({
        title: "Provider deleted",
        description: `Removed supplier ${p.ProviderName}.`,
      });
      if (selectedItem?.ProviderID === p.ProviderID) {
        setSelectedItem(null);
      }
      await fetchProviders();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const tableColumns: ColumnConfig<Provider>[] = [
    {
      key: "ProviderName",
      header: "Provider / Supplier Name",
      sortable: true,
      render: (p) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <Building className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{p.ProviderName}</span>
        </div>
      ),
    },
    {
      key: "ProviderAddress",
      header: "Facility Address",
      sortable: true,
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {p.ProviderAddress}
        </span>
      ),
    },
    {
      key: "ProviderID",
      header: "ID",
      render: (p) => (
        <code className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {p.ProviderID}
        </code>
      ),
    },
  ];

  const drawerFields: DrawerField<Provider>[] = [
    { label: "Vendor / Supplier Name", key: "ProviderName" },
    { label: "Official Address", key: "ProviderAddress" },
    { label: "Provider ID", key: "ProviderID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "ProviderName",
      label: "Supplier Name",
      type: "text",
      required: true,
      placeholder: "e.g. Apex Global Logistics & Supplies",
    },
    {
      name: "ProviderAddress",
      label: "Supplier Address",
      type: "text",
      required: true,
      placeholder: "e.g. 500 Industrial Parkway, Chicago, IL",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Suppliers & Providers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Maintain wholesale suppliers, manufacturers, and vendor logistics contacts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviders}
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
            Add Provider
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={providers}
        columns={tableColumns}
        idKey="ProviderID"
        searchKey="ProviderName"
        searchPlaceholder="Search providers by name or address..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No providers found. Register your first vendor."
      />

      <GenericEntityDrawer
        title={selectedItem?.ProviderName || "Provider"}
        subtitle="Vendor Profile"
        item={selectedItem}
        icon={<BookUser className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "Purchase Orders from this Vendor",
            sublabel: `Inspect procurement orders and supplier requisitions for ${selectedItem?.ProviderName || "this provider"}`,
            href: (p) => `/dashboard/order?q=${encodeURIComponent(p.ProviderName)}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Provider"
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
