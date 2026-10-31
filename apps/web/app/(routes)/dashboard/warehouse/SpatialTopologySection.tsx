"use client";

import React, { useState } from "react";
import {
  Layers,
  MapPin,
  Plus,
  Trash2,
  Scale,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/app/assets/api";
import { toast } from "@/components/ui/use-toast";
import type { Warehouse, Zone, BinLocation, ZoneType } from "@mesh/types";

interface SpatialTopologySectionProps {
  warehouse: Warehouse | null;
  warehouses: Warehouse[];
  zones: Zone[];
  binLocations: BinLocation[];
  onRefresh: () => Promise<void>;
  onOpenAddZone: (warehouseId?: string) => void;
  onOpenAddBin: (warehouseId?: string, zoneId?: string) => void;
  isDrawer?: boolean;
}

export default function SpatialTopologySection({
  warehouse,
  warehouses,
  zones,
  binLocations,
  onRefresh,
  onOpenAddZone,
  onOpenAddBin,
  isDrawer = false,
}: SpatialTopologySectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const targetWarehouseId = warehouse?.WarehouseID;
  const filteredZones = targetWarehouseId
    ? zones.filter((z) => z.WarehouseID === targetWarehouseId)
    : zones;

  const handleDeleteZone = async (zone: Zone) => {
    try {
      setDeletingId(zone.ZoneID);
      await api.delete(`/zone/delete/${zone.ZoneID}`);
      toast({
        title: "Zone removed",
        description: `Zone "${zone.ZoneName}" deleted.`,
      });
      await onRefresh();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteBin = async (bin: BinLocation) => {
    try {
      setDeletingId(bin.BinID);
      await api.delete(`/bin-location/delete/${bin.BinID}`);
      toast({
        title: "Bin location deleted",
        description: `Bin "${bin.BinCode}" removed from storage map.`,
      });
      await onRefresh();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const getZoneBadgeInfo = (zoneType: ZoneType | string) => {
    switch (zoneType) {
      case "BULK":
        return {
          label: "Bulk storage",
          className: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
        };
      case "HIGH_BAY":
        return {
          label: "High-bay vertical",
          className: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
        };
      case "COLD_CHAIN":
        return {
          label: "Cold-chain climate",
          className: "bg-sky-50 text-sky-800 border-sky-200/70",
        };
      case "PICK_PACK":
        return {
          label: "Pick-pack line",
          className: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
        };
      default:
        return {
          label: zoneType,
          className: "bg-zinc-100 text-zinc-700 border-zinc-200/80",
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 bg-zinc-50/70 border border-zinc-200/80 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-zinc-500 shrink-0" strokeWidth={1.5} />
            <h3 className="text-xs font-semibold text-zinc-900 tracking-tight">
              Spatial topology matrix
            </h3>
            <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md bg-zinc-200/70 text-zinc-700 font-medium border border-zinc-300/50">
              {filteredZones.length} {filteredZones.length === 1 ? "zone" : "zones"}
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            {warehouse
              ? `Discrete topological rack layout for ${warehouse.WarehouseName}.`
              : "Overview of storage zones and discrete bin locations across facilities."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenAddZone(targetWarehouseId)}
            className="h-8 gap-1.5 text-xs text-zinc-700 border-zinc-200 hover:bg-zinc-100 bg-white rounded-lg transition-colors duration-150 font-medium"
          >
            <Plus className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
            Add zone
          </Button>
          <Button
            size="sm"
            onClick={() => onOpenAddBin(targetWarehouseId)}
            className="h-8 gap-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-2xs transition-colors duration-150 font-medium"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Add bin location
          </Button>
        </div>
      </div>

      {/* Zone Cards */}
      {filteredZones.length === 0 ? (
        <div className="p-8 border border-dashed border-zinc-200/80 rounded-xl text-center bg-zinc-50/40">
          <Layers className="w-6 h-6 text-zinc-400 mx-auto mb-2" strokeWidth={1.5} />
          <h4 className="text-xs font-semibold text-zinc-900">No spatial zones configured</h4>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-3">
            This warehouse has no topological zones (bulk storage, high-bay vertical, cold-chain, or pick-pack) configured yet.
          </p>
          <Button
            size="sm"
            onClick={() => onOpenAddZone(targetWarehouseId)}
            className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg gap-1.5 font-medium transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            Create first zone
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredZones.map((zone) => {
            const binsInZone = binLocations.filter((b) => b.ZoneID === zone.ZoneID);
            const badge = getZoneBadgeInfo(zone.ZoneType);

            return (
              <div
                key={zone.ZoneID}
                className="bg-white border border-zinc-200/80 rounded-xl overflow-hidden shadow-2xs"
              >
                {/* Zone Header */}
                <div className="px-3.5 py-2.5 bg-zinc-50/70 border-b border-zinc-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-900">{zone.ZoneName}</span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                      ({binsInZone.length} {binsInZone.length === 1 ? "bin" : "bins"})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onOpenAddBin(zone.WarehouseID, zone.ZoneID)}
                      className="h-7 px-2 text-xs text-zinc-700 hover:text-zinc-900 hover:bg-zinc-100 gap-1 font-medium rounded-md transition-colors duration-150"
                    >
                      <Plus className="w-3 h-3 text-zinc-500" strokeWidth={1.5} />
                      Add bin
                    </Button>
                    <button
                      type="button"
                      disabled={deletingId === zone.ZoneID}
                      onClick={() => handleDeleteZone(zone)}
                      className="p-1 text-zinc-400 hover:text-red-600 rounded-md hover:bg-zinc-100 transition-colors duration-150 cursor-pointer"
                      title="Delete zone"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                </div>

                {/* Bins List / Grid */}
                <div className="p-3">
                  {binsInZone.length === 0 ? (
                    <div className="py-5 text-center text-zinc-400 text-xs">
                      No discrete bins allocated in this zone. Click &quot;Add bin&quot; to assign rack coordinates.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                      {binsInZone.map((bin) => (
                        <div
                          key={bin.BinID}
                          className="p-2.5 rounded-lg border border-zinc-200/80 bg-white hover:border-zinc-300 hover:bg-zinc-50/30 transition-colors duration-150 flex flex-col justify-between space-y-2 group"
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono tabular-nums font-semibold text-xs text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded border border-zinc-200/70">
                                {bin.BinCode}
                              </span>
                            </div>
                            <button
                              type="button"
                              disabled={deletingId === bin.BinID}
                              onClick={() => handleDeleteBin(bin)}
                              className="text-zinc-400 hover:text-red-600 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                              title="Delete bin"
                            >
                              <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                            </button>
                          </div>

                          <div className="text-[11px] font-mono tabular-nums text-zinc-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-zinc-400 shrink-0" strokeWidth={1.5} />
                            <span>
                              A{bin.Aisle} · R{bin.Rack} · S{bin.Shelf} · B{bin.Bin}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 pt-1 border-t border-zinc-100 text-[10px] text-zinc-500 font-mono tabular-nums">
                            {bin.MaxWeightKg ? (
                              <span className="inline-flex items-center gap-1 text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/60 font-mono tabular-nums">
                                <Scale className="w-2.5 h-2.5 text-zinc-400" strokeWidth={1.5} />
                                {Number(bin.MaxWeightKg).toLocaleString()} kg
                              </span>
                            ) : (
                              <span className="text-zinc-400">No wt limit</span>
                            )}
                            {bin.MaxVolumeCbm ? (
                              <span className="inline-flex items-center gap-1 text-zinc-700 bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200/60 font-mono tabular-nums">
                                <Box className="w-2.5 h-2.5 text-zinc-400" strokeWidth={1.5} />
                                {bin.MaxVolumeCbm} m³
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
