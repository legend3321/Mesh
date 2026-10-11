"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, MapPin } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useCompany } from "@/app/components/CompanyContext";
import type { Location } from "@mesh/types";

export default function LocationPage() {
  const { activeCompanyId } = useCompany();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Location | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Location | null>(null);

  useEffect(() => {
    fetchLocations();
  }, [activeCompanyId]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const res = await api.get("/location/getAll");
      setLocations(res.data);
      if (selectedItem) {
        const found = res.data.find((l: Location) => l.LocationID === selectedItem.LocationID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching locations",
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

  const handleOpenEdit = (loc: Location) => {
    setTargetItem(loc);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (modalMode === "create") {
      const res = await api.post("/location/add", formData);
      toast({
        title: "Location created",
        description: `Added ${formData.LocationName} successfully.`,
      });
      await fetchLocations();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/location/edit", formData);
      toast({
        title: "Location updated",
        description: `Saved changes to ${formData.LocationName}.`,
      });
      await fetchLocations();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (loc: Location) => {
    try {
      await api.delete(`/location/delete/${loc.LocationID}`);
      toast({
        title: "Location deleted",
        description: `Removed ${loc.LocationName}.`,
      });
      if (selectedItem?.LocationID === loc.LocationID) {
        setSelectedItem(null);
      }
      await fetchLocations();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const tableColumns: ColumnConfig<Location>[] = [
    {
      key: "LocationName",
      header: "Location Name",
      sortable: true,
      render: (loc) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{loc.LocationName}</span>
        </div>
      ),
    },
    {
      key: "LocationAddress",
      header: "Address",
      sortable: true,
      render: (loc) => <span className="text-slate-600">{loc.LocationAddress}</span>,
    },
    {
      key: "LocationID",
      header: "ID",
      render: (loc) => (
        <code className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {loc.LocationID}
        </code>
      ),
    },
  ];

  const drawerFields: DrawerField<Location>[] = [
    { label: "Location Name", key: "LocationName" },
    { label: "Street Address", key: "LocationAddress" },
    { label: "Location ID", key: "LocationID" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "LocationName",
      label: "Location Name",
      type: "text",
      required: true,
      placeholder: "e.g. West Coast Distribution Center",
    },
    {
      name: "LocationAddress",
      label: "Address",
      type: "text",
      required: true,
      placeholder: "e.g. 742 Evergreen Terrace, Springfield",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Locations
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage geographical hubs, operational bases, and dispatch centers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLocations}
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
            Add Location
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={locations}
        columns={tableColumns}
        idKey="LocationID"
        searchKey="LocationName"
        searchPlaceholder="Search locations by name..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No locations found. Add your first location."
      />

      <GenericEntityDrawer
        title={selectedItem?.LocationName || "Location"}
        subtitle="Location Details"
        item={selectedItem}
        icon={<MapPin className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "Warehouses in this Location",
            sublabel: `Browse storage facilities situated at ${selectedItem?.LocationName || "this location"}`,
            href: (loc) => `/dashboard/warehouse?q=${encodeURIComponent(loc.LocationName)}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Location"
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
