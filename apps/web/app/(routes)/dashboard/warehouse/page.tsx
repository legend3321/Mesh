"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Warehouse as WarehouseIcon, Snowflake, MapPin } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Warehouse, Location } from "@mesh/types";

export default function WarehousePage() {
  const { activeCompanyId } = useCompany();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Warehouse | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Warehouse | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [whRes, locRes] = await Promise.all([
        api.get("/warehouse/getAll"),
        api.get("/location/getAll"),
      ]);
      setWarehouses(whRes.data);
      setLocations(locRes.data);

      if (selectedItem) {
        const found = whRes.data.find((w: Warehouse) => w.WarehouseID === selectedItem.WarehouseID);
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

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (wh: Warehouse) => {
    setTargetItem(wh);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (modalMode === "create") {
      const res = await api.post("/warehouse/add", formData);
      toast({
        title: "Warehouse created",
        description: `Added ${formData.WarehouseName} successfully.`,
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/warehouse/edit", formData);
      toast({
        title: "Warehouse updated",
        description: `Saved changes to ${formData.WarehouseName}.`,
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (wh: Warehouse) => {
    try {
      await api.delete(`/warehouse/delete/${wh.WarehouseID}`);
      toast({
        title: "Warehouse deleted",
        description: `Removed ${wh.WarehouseName}.`,
      });
      if (selectedItem?.WarehouseID === wh.WarehouseID) {
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

  const getLocationName = (locId: string) => {
    const loc = locations.find((l) => l.LocationID === locId);
    return loc ? loc.LocationName : locId;
  };

  const tableColumns: ColumnConfig<Warehouse>[] = [
    {
      key: "WarehouseName",
      header: "Warehouse Name",
      sortable: true,
      render: (wh) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{wh.WarehouseName}</span>
        </div>
      ),
    },
    {
      key: "LocationID",
      header: "Location",
      sortable: true,
      render: (wh) => (
        <Link
          href={`/dashboard/location?id=${wh.LocationID}`}
          className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 hover:underline font-medium text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <MapPin className="w-3.5 h-3.5 text-blue-500" />
          {getLocationName(wh.LocationID)}
        </Link>
      ),
    },
    {
      key: "isRefrigerated",
      header: "Climate Control",
      render: (wh) =>
        wh.isRefrigerated ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Snowflake className="w-3 h-3 text-cyan-600" />
            Refrigerated
          </span>
        ) : (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            Standard Ambient
          </span>
        ),
    },
    {
      key: "WarehouseID",
      header: "ID",
      render: (wh) => (
        <code className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {wh.WarehouseID}
        </code>
      ),
    },
  ];

  const drawerFields: DrawerField<Warehouse>[] = [
    { label: "Warehouse Name", key: "WarehouseName" },
    {
      label: "Location",
      render: (wh) => getLocationName(wh.LocationID),
    },
    {
      label: "Climate Conditioning",
      render: (wh) => (wh.isRefrigerated ? "Refrigerated / Cold Storage" : "Standard Ambient Storage"),
    },
    { label: "Warehouse ID", key: "WarehouseID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "WarehouseName",
      label: "Warehouse Name",
      type: "text",
      required: true,
      placeholder: "e.g. Ambient Storage East 2",
    },
    {
      name: "LocationID",
      label: "Parent Location",
      type: "select",
      required: true,
      options: locations.map((loc) => ({
        label: `${loc.LocationName} (${loc.LocationAddress})`,
        value: loc.LocationID,
      })),
    },
    {
      name: "isRefrigerated",
      label: "Refrigerated (Cold Storage)",
      type: "boolean",
      defaultValue: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Warehouses
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage storage facilities, cold rooms, and regional depots.
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
            Add Warehouse
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={warehouses}
        columns={tableColumns}
        idKey="WarehouseID"
        searchKey="WarehouseName"
        searchPlaceholder="Search warehouses by name..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No warehouses found. Add your first warehouse."
      />

      <GenericEntityDrawer
        title={selectedItem?.WarehouseName || "Warehouse"}
        subtitle="Facility Details"
        item={selectedItem}
        icon={<WarehouseIcon className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "Inventory Stored in Warehouse",
            sublabel: `Inspect all product stock located in ${selectedItem?.WarehouseName || "this facility"}`,
            href: (wh) => `/dashboard/inventory?q=${encodeURIComponent(wh.WarehouseName)}`,
          },
          {
            label: "Stock Transfers (Inbound/Outbound)",
            sublabel: `Review transfer manifests involving ${selectedItem?.WarehouseName || "this warehouse"}`,
            href: (wh) => `/dashboard/transfer?q=${encodeURIComponent(wh.WarehouseName)}`,
          },
          {
            label: "Parent Location Hub",
            sublabel: "View regional dispatch center and address details",
            href: (wh) => `/dashboard/location?id=${wh.LocationID}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Warehouse"
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
