"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Warehouse as WarehouseIcon, MapPin, Layers } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Warehouse, Location, Zone, BinLocation } from "@mesh/types";
import SpatialTopologySection from "./SpatialTopologySection";
import { AddZoneModal, AddBinModal } from "./SpatialTopologyModals";

export default function WarehousePage() {
  const { activeCompanyId } = useCompany();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [binLocations, setBinLocations] = useState<BinLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Warehouse | null>(null);

  // Tab
  const [activeTab, setActiveTab] = useState<"facilities" | "topology">("facilities");
  const [selectedTopologyWh, setSelectedTopologyWh] = useState<string>("");

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Warehouse | null>(null);

  // Topology modals
  const [isAddZoneOpen, setIsAddZoneOpen] = useState(false);
  const [isAddBinOpen, setIsAddBinOpen] = useState(false);
  const [modalWarehouseId, setModalWarehouseId] = useState<string | undefined>(undefined);
  const [modalZoneId, setModalZoneId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [whRes, locRes, zoneRes, binRes] = await Promise.all([
        api.get("/warehouse/getAll"),
        api.get("/location/getAll"),
        api.get("/zone/getAll"),
        api.get("/bin-location/getAll"),
      ]);
      setWarehouses(whRes.data);
      setLocations(locRes.data);
      setZones(zoneRes.data);
      setBinLocations(binRes.data);

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
      header: "Warehouse name",
      sortable: true,
      render: (wh) => (
        <div className="font-medium text-zinc-900 flex items-center gap-2">
          <WarehouseIcon className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <span>{wh.WarehouseName}</span>
        </div>
      ),
    },
    {
      key: "LocationID",
      header: "Parent location",
      sortable: true,
      render: (wh) => (
        <Link
          href={`/dashboard/location?id=${wh.LocationID}`}
          className="inline-flex items-center gap-1.5 text-zinc-600 hover:text-zinc-900 font-medium text-xs transition-colors duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <span>{getLocationName(wh.LocationID)}</span>
        </Link>
      ),
    },
    {
      key: "isRefrigerated",
      header: "Climate control",
      render: (wh) =>
        wh.isRefrigerated ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            Refrigerated
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
            Ambient
          </span>
        ),
    },
    {
      key: "WarehouseID",
      header: "Facility ID",
      render: (wh) => (
        <code className="text-xs font-mono tabular-nums text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/80">
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Warehouse facilities
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage storage facilities, climate conditioning, and discrete spatial topology (zones & bins).
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 gap-1.5 text-xs font-medium text-zinc-700 bg-white border-zinc-200 hover:bg-zinc-50 rounded-lg transition-colors duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-8 gap-1.5 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white rounded-lg shadow-2xs transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Add warehouse
          </Button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg border border-zinc-200/80 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("facilities")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
            activeTab === "facilities"
              ? "bg-white text-zinc-900 shadow-2xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <WarehouseIcon className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
          <span>Warehouse facilities</span>
          <span className="font-mono tabular-nums text-[11px] text-zinc-400">({warehouses.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("topology")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 cursor-pointer ${
            activeTab === "topology"
              ? "bg-white text-zinc-900 shadow-2xs font-semibold"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
          <span>Spatial topology</span>
          <span className="font-mono tabular-nums text-[11px] text-zinc-400">
            ({zones.length} zones, {binLocations.length} bins)
          </span>
        </button>
      </div>

      {activeTab === "facilities" ? (
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
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5 border border-zinc-200/80 rounded-xl">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-600">Filter facility:</span>
              <select
                value={selectedTopologyWh}
                onChange={(e) => setSelectedTopologyWh(e.target.value)}
                className="h-8 px-2.5 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-900 bg-white focus:outline-hidden focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-colors duration-150"
              >
                <option value="">All facilities</option>
                {warehouses.map((w) => (
                  <option key={w.WarehouseID} value={w.WarehouseID}>
                    {w.WarehouseName}
                  </option>
                ))}
              </select>
            </div>
            <div className="text-xs text-zinc-500 font-mono tabular-nums">
              Showing {selectedTopologyWh ? zones.filter(z => z.WarehouseID === selectedTopologyWh).length : zones.length} zones
            </div>
          </div>

          <SpatialTopologySection
            warehouse={selectedTopologyWh ? warehouses.find((w) => w.WarehouseID === selectedTopologyWh) || null : null}
            warehouses={warehouses}
            zones={zones}
            binLocations={binLocations}
            onRefresh={fetchData}
            onOpenAddZone={(whId) => {
              setModalWarehouseId(whId || selectedTopologyWh || undefined);
              setIsAddZoneOpen(true);
            }}
            onOpenAddBin={(whId, zId) => {
              setModalWarehouseId(whId || selectedTopologyWh || undefined);
              setModalZoneId(zId);
              setIsAddBinOpen(true);
            }}
          />
        </div>
      )}

      <GenericEntityDrawer
        title={selectedItem?.WarehouseName || "Warehouse"}
        subtitle="Facility details & spatial map"
        item={selectedItem}
        icon={<WarehouseIcon className="w-4 h-4 text-zinc-700" strokeWidth={1.5} />}
        fields={drawerFields}
        extraContent={
          <SpatialTopologySection
            warehouse={selectedItem}
            warehouses={warehouses}
            zones={zones}
            binLocations={binLocations}
            onRefresh={fetchData}
            onOpenAddZone={(whId) => {
              setModalWarehouseId(whId || selectedItem?.WarehouseID);
              setIsAddZoneOpen(true);
            }}
            onOpenAddBin={(whId, zId) => {
              setModalWarehouseId(whId || selectedItem?.WarehouseID);
              setModalZoneId(zId);
              setIsAddBinOpen(true);
            }}
            isDrawer={true}
          />
        }
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

      <AddZoneModal
        isOpen={isAddZoneOpen}
        onClose={() => setIsAddZoneOpen(false)}
        warehouses={warehouses}
        initialWarehouseId={modalWarehouseId}
        onSuccess={fetchData}
      />

      <AddBinModal
        isOpen={isAddBinOpen}
        onClose={() => setIsAddBinOpen(false)}
        warehouses={warehouses}
        zones={zones}
        initialWarehouseId={modalWarehouseId}
        initialZoneId={modalZoneId}
        onSuccess={fetchData}
      />

      <Toaster />
    </div>
  );
}
