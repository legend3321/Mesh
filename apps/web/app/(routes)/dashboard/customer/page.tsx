"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Users, MapPin, Building2 } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useCompany } from "@/app/components/CompanyContext";
import type { Customer } from "@mesh/types";

export default function CustomerPage() {
  const { activeCompanyId } = useCompany();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Customer | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Customer | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [activeCompanyId]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/customer/getAll");
      setCustomers(res.data);
      if (selectedItem) {
        const found = res.data.find((c: Customer) => c.CustomerID === selectedItem.CustomerID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching customers",
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

  const handleOpenEdit = (customer: Customer) => {
    setTargetItem(customer);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (modalMode === "create") {
      const res = await api.post("/customer/add", formData);
      toast({
        title: "Customer created",
        description: `Customer ${formData.CustomerName} added.`,
      });
      await fetchCustomers();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/customer/edit", formData);
      toast({
        title: "Customer updated",
        description: `Changes to ${formData.CustomerName} saved.`,
      });
      await fetchCustomers();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (customer: Customer) => {
    try {
      await api.delete(`/customer/delete/${customer.CustomerID}`);
      toast({
        title: "Customer deleted",
        description: `Removed ${customer.CustomerName}.`,
      });
      if (selectedItem?.CustomerID === customer.CustomerID) {
        setSelectedItem(null);
      }
      await fetchCustomers();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const tableColumns: ColumnConfig<Customer>[] = [
    {
      key: "CustomerName",
      header: "Customer Name",
      sortable: true,
      render: (c) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
            {c.CustomerName.charAt(0).toUpperCase()}
          </div>
          <span>{c.CustomerName}</span>
        </div>
      ),
    },
    {
      key: "CustomerAddress",
      header: "Billing / Shipping Address",
      sortable: true,
      render: (c) => (
        <span className="inline-flex items-center gap-1.5 text-slate-600">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {c.CustomerAddress}
        </span>
      ),
    },
    {
      key: "CustomerID",
      header: "ID",
      render: (c) => (
        <code className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {c.CustomerID}
        </code>
      ),
    },
  ];

  const drawerFields: DrawerField<Customer>[] = [
    { label: "Customer Name", key: "CustomerName" },
    { label: "Physical Address", key: "CustomerAddress" },
    { label: "Customer ID", key: "CustomerID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "CustomerName",
      label: "Customer Name",
      type: "text",
      required: true,
      placeholder: "e.g. Acme Retail Corporation",
    },
    {
      name: "CustomerAddress",
      label: "Address",
      type: "text",
      required: true,
      placeholder: "e.g. 100 Main Street, Suite 400, New York",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Accounts, client directories, delivery destinations, and buyer records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCustomers}
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
            Add Customer
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={customers}
        columns={tableColumns}
        idKey="CustomerID"
        searchKey="CustomerName"
        searchPlaceholder="Search customers by name or address..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No customers found. Add your first customer."
      />

      <GenericEntityDrawer
        title={selectedItem?.CustomerName || "Customer"}
        subtitle="Customer Account"
        item={selectedItem}
        icon={<Users className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "Customer Delivery Dispatches",
            sublabel: `Browse outbound deliveries fulfilled for ${selectedItem?.CustomerName || "this customer"}`,
            href: (c) => `/dashboard/delivery?q=${encodeURIComponent(c.CustomerName)}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Customer"
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
