"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Layers, MapPin, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/app/assets/api";
import { toast } from "@/components/ui/use-toast";
import type { Warehouse, Zone, ZoneType } from "@mesh/types";

interface AddZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  initialWarehouseId?: string;
  onSuccess: () => Promise<void>;
}

export function AddZoneModal({
  isOpen,
  onClose,
  warehouses,
  initialWarehouseId,
  onSuccess,
}: AddZoneModalProps) {
  const [mounted, setMounted] = useState(false);
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId || "");
  const [zoneName, setZoneName] = useState("");
  const [zoneType, setZoneType] = useState<ZoneType>("BULK");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (initialWarehouseId) {
      setWarehouseId(initialWarehouseId);
    } else if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].WarehouseID);
    }
  }, [initialWarehouseId, warehouses]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId || !zoneName.trim()) {
      setError("Warehouse facility and zone name are required.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post("/zone/add", {
        WarehouseID: warehouseId,
        ZoneName: zoneName.trim(),
        ZoneType: zoneType,
      });
      toast({
        title: "Zone created",
        description: `Successfully added zone "${zoneName}" to facility.`,
      });
      setZoneName("");
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to create zone.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-zone-title"
        className="bg-white rounded-xl shadow-xl border border-zinc-200/80 w-full max-w-md flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200/80 text-zinc-700 flex items-center justify-center">
              <Layers className="w-4 h-4 text-zinc-600" strokeWidth={1.5} />
            </div>
            <div>
              <h3 id="add-zone-title" className="text-sm font-semibold text-zinc-900">
                Add facility zone
              </h3>
              <p className="text-[11px] text-zinc-500">
                Configure discrete storage topological zone.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50/80 border border-red-200/80 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              Warehouse facility <span className="text-red-500">*</span>
            </Label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-colors duration-150"
              required
            >
              <option value="">Select warehouse facility...</option>
              {warehouses.map((w) => (
                <option key={w.WarehouseID} value={w.WarehouseID}>
                  {w.WarehouseName}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              Zone name <span className="text-red-500">*</span>
            </Label>
            <Input
              type="text"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="e.g. Cold Chain Zone 1, High-Bay Pallet Bay"
              className="h-8 text-xs rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-zinc-700">
              Zone type <span className="text-red-500">*</span>
            </Label>
            <select
              value={zoneType}
              onChange={(e) => setZoneType(e.target.value as ZoneType)}
              className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-colors duration-150"
              required
            >
              <option value="BULK">Bulk storage (Standard pallet floor / staging)</option>
              <option value="HIGH_BAY">High-bay vertical (Multi-level automated vertical racks)</option>
              <option value="COLD_CHAIN">Cold-chain climate (Refrigerated climate-controlled)</option>
              <option value="PICK_PACK">Pick-pack line (Active fulfillment and sorting lines)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-medium text-zinc-700 border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors duration-150"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-8 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-2xs transition-colors duration-150 cursor-pointer"
            >
              {loading ? "Creating zone..." : "Create zone"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

interface AddBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  warehouses: Warehouse[];
  zones: Zone[];
  initialWarehouseId?: string;
  initialZoneId?: string;
  onSuccess: () => Promise<void>;
}

export function AddBinModal({
  isOpen,
  onClose,
  warehouses,
  zones,
  initialWarehouseId,
  initialZoneId,
  onSuccess,
}: AddBinModalProps) {
  const [mounted, setMounted] = useState(false);
  const [warehouseId, setWarehouseId] = useState(initialWarehouseId || "");
  const [zoneId, setZoneId] = useState(initialZoneId || "");
  const [binCode, setBinCode] = useState("");
  const [aisle, setAisle] = useState("01");
  const [rack, setRack] = useState("01");
  const [shelf, setShelf] = useState("01");
  const [bin, setBin] = useState("01");
  const [maxWeightKg, setMaxWeightKg] = useState<string>("1000");
  const [maxVolumeCbm, setMaxVolumeCbm] = useState<string>("2.5");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const filteredZones = zones.filter((z) => !warehouseId || z.WarehouseID === warehouseId);

  useEffect(() => {
    if (initialWarehouseId) {
      setWarehouseId(initialWarehouseId);
    } else if (!warehouseId && warehouses.length > 0) {
      setWarehouseId(warehouses[0].WarehouseID);
    }
  }, [initialWarehouseId, warehouses]);

  useEffect(() => {
    if (initialZoneId) {
      setZoneId(initialZoneId);
    } else if (filteredZones.length > 0 && !filteredZones.some((z) => z.ZoneID === zoneId)) {
      setZoneId(filteredZones[0].ZoneID);
    }
  }, [initialZoneId, filteredZones]);

  // Auto-generate BinCode when coordinates change
  const handleGenerateBinCode = () => {
    const code = `A${aisle.padStart(2, "0")}-R${rack.padStart(2, "0")}-S${shelf.padStart(2, "0")}-B${bin.padStart(2, "0")}`;
    setBinCode(code);
  };

  useEffect(() => {
    if (!binCode) {
      handleGenerateBinCode();
    }
  }, [aisle, rack, shelf, bin]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseId || !zoneId || !binCode.trim() || !aisle || !rack || !shelf || !bin) {
      setError("Please complete all required location coordinate fields.");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await api.post("/bin-location/add", {
        WarehouseID: warehouseId,
        ZoneID: zoneId,
        BinCode: binCode.trim().toUpperCase(),
        Aisle: aisle.trim(),
        Rack: rack.trim(),
        Shelf: shelf.trim(),
        Bin: bin.trim(),
        MaxWeightKg: maxWeightKg ? Number(maxWeightKg) : null,
        MaxVolumeCbm: maxVolumeCbm ? Number(maxVolumeCbm) : null,
      });
      toast({
        title: "Bin location created",
        description: `Successfully added bin "${binCode}" to zone.`,
      });
      await onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Failed to create bin location.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-bin-title"
        className="bg-white rounded-xl shadow-xl border border-zinc-200/80 w-full max-w-lg flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-4 border-b border-zinc-200/80 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200/80 text-zinc-700 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-zinc-600" strokeWidth={1.5} />
            </div>
            <div>
              <h3 id="add-bin-title" className="text-sm font-semibold text-zinc-900">
                Add discrete bin location
              </h3>
              <p className="text-[11px] text-zinc-500">
                Define topological rack coordinates and capacity ratings.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
          {error && (
            <div className="p-3 rounded-lg bg-red-50/80 border border-red-200/80 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" strokeWidth={1.5} />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">
                Warehouse facility <span className="text-red-500">*</span>
              </Label>
              <select
                value={warehouseId}
                onChange={(e) => {
                  setWarehouseId(e.target.value);
                  const related = zones.filter((z) => z.WarehouseID === e.target.value);
                  if (related.length > 0) setZoneId(related[0].ZoneID);
                  else setZoneId("");
                }}
                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-colors duration-150"
                required
              >
                <option value="">Select facility...</option>
                {warehouses.map((w) => (
                  <option key={w.WarehouseID} value={w.WarehouseID}>
                    {w.WarehouseName}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-zinc-700">
                Parent zone <span className="text-red-500">*</span>
              </Label>
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full h-8 px-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-medium text-zinc-900 focus:outline-hidden focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 transition-colors duration-150"
                required
              >
                <option value="">Select zone...</option>
                {filteredZones.map((z) => (
                  <option key={z.ZoneID} value={z.ZoneID}>
                    {z.ZoneName} ({z.ZoneType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium text-zinc-700">
                Bin code identifier <span className="text-red-500">*</span>
              </Label>
              <button
                type="button"
                onClick={handleGenerateBinCode}
                className="text-[11px] font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1 transition-colors duration-150 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3 text-zinc-400" strokeWidth={1.5} />
                <span>Auto-format</span>
              </button>
            </div>
            <Input
              type="text"
              value={binCode}
              onChange={(e) => setBinCode(e.target.value.toUpperCase())}
              placeholder="e.g. A01-R02-S03-B04"
              className="h-8 text-xs font-mono tabular-nums font-semibold uppercase tracking-wider rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
              required
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-zinc-500">Aisle</Label>
              <Input
                type="text"
                value={aisle}
                onChange={(e) => setAisle(e.target.value)}
                className="h-8 text-xs font-mono tabular-nums text-center rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-zinc-500">Rack</Label>
              <Input
                type="text"
                value={rack}
                onChange={(e) => setRack(e.target.value)}
                className="h-8 text-xs font-mono tabular-nums text-center rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-zinc-500">Shelf</Label>
              <Input
                type="text"
                value={shelf}
                onChange={(e) => setShelf(e.target.value)}
                className="h-8 text-xs font-mono tabular-nums text-center rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-zinc-500">Bin</Label>
              <Input
                type="text"
                value={bin}
                onChange={(e) => setBin(e.target.value)}
                className="h-8 text-xs font-mono tabular-nums text-center rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-zinc-500">Max weight payload (kg)</Label>
              <Input
                type="number"
                value={maxWeightKg}
                onChange={(e) => setMaxWeightKg(e.target.value)}
                placeholder="e.g. 1000"
                className="h-8 text-xs font-mono tabular-nums rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] font-medium text-zinc-500">Max volume rating (m³)</Label>
              <Input
                type="number"
                step="0.1"
                value={maxVolumeCbm}
                onChange={(e) => setMaxVolumeCbm(e.target.value)}
                placeholder="e.g. 2.5"
                className="h-8 text-xs font-mono tabular-nums rounded-lg border-zinc-200 focus-visible:ring-1 focus-visible:ring-zinc-400"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="h-8 text-xs font-medium text-zinc-700 border-zinc-200 hover:bg-zinc-100 rounded-lg transition-colors duration-150"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !zoneId}
              className="h-8 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-2xs transition-colors duration-150 cursor-pointer"
            >
              {loading ? "Creating bin..." : "Create bin location"}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
