"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  Layers,
  Warehouse as WarehouseIcon,
  Package,
  BrainCircuit,
  ShieldAlert,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Boxes,
} from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCompany } from "@/app/components/CompanyContext";
import { cn } from "@/lib/utils";
import type { Inventory, Product, Warehouse, BinLocation, Batch } from "@mesh/types";
import FefoAdvisorModal from "./FefoAdvisorModal";

export default function InventoryPage() {
  const { data: session } = useSession();
  const { activeCompanyId } = useCompany();
  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const userCompanyId = (session?.user as any)?.companyId;
  const isCompanyMember = !!userCompanyId;

  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [binLocations, setBinLocations] = useState<BinLocation[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Inventory | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Inventory | null>(null);

  // FEFO Picking Advisor
  const [isFefoOpen, setIsFefoOpen] = useState(false);
  const [fefoProductId, setFefoProductId] = useState<string | undefined>(undefined);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, prodRes, whRes, binRes, batchRes] = await Promise.all([
        api.get("/inventory/getAll"),
        api.get("/product/getAll"),
        api.get("/warehouse/getAll"),
        api.get("/bin-location/getAll"),
        api.get("/batch/getAll"),
      ]);
      setInventories(invRes.data);
      setProducts(prodRes.data);
      setWarehouses(whRes.data);
      setBinLocations(binRes.data);
      setBatches(batchRes.data);

      if (selectedItem) {
        const found = invRes.data.find((i: Inventory) => i.InventoryID === selectedItem.InventoryID);
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

  const getProductName = (prodId: string) => {
    const p = products.find((prod) => prod.ProductID === prodId);
    return p ? `${p.ProductName} (${p.ProductCode})` : prodId;
  };

  const getWarehouseName = (whId: string) => {
    const w = warehouses.find((wh) => wh.WarehouseID === whId);
    return w ? w.WarehouseName : whId;
  };

  const getBinLocation = (binId?: string | null, invBin?: BinLocation | null) => {
    if (invBin) return invBin;
    if (!binId) return null;
    return binLocations.find((b) => b.BinID === binId) || null;
  };

  const getBatch = (batchId?: string | null, invBatch?: Batch | null) => {
    if (invBatch) return invBatch;
    if (!batchId) return null;
    return batches.find((b) => b.BatchID === batchId) || null;
  };

  const getFefoStatus = (expiryDateInput?: string | Date | null) => {
    if (!expiryDateInput) return null;
    const exp = new Date(expiryDateInput);
    if (isNaN(exp.getTime())) return null;
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) {
      return {
        status: "EXPIRED",
        label: `Expired (${Math.abs(diffDays)}d ago)`,
        days: diffDays,
        dotClass: "bg-red-500",
        textClass: "text-red-700 font-medium",
        icon: AlertTriangle,
      };
    }
    if (diffDays <= 30) {
      return {
        status: "EXPIRING_SOON",
        label: `Expiring soon (${diffDays}d left)`,
        days: diffDays,
        dotClass: "bg-amber-500",
        textClass: "text-amber-700 font-medium",
        icon: Clock,
      };
    }
    return {
      status: "HEALTHY",
      label: `Healthy (${diffDays}d left)`,
      days: diffDays,
      dotClass: "bg-emerald-500",
      textClass: "text-zinc-600",
      icon: CheckCircle2,
    };
  };

  // Operational Telemetry Metrics
  const telemetry = useMemo(() => {
    const totalSkus = inventories.length;
    const totalUnits = inventories.reduce(
      (sum, item) => sum + (Number(item.InventoryAvailable) || 0),
      0
    );
    const lowStockCount = inventories.filter(
      (item) => item.InventoryAvailable <= item.ReorderPoint
    ).length;
    const expiringCount = inventories.filter((inv) => {
      const b = getBatch(inv.BatchID, inv.Batch);
      if (!b) return false;
      const status = getFefoStatus(b.ExpiryDate)?.status;
      return status === "EXPIRED" || status === "EXPIRING_SOON";
    }).length;

    return { totalSkus, totalUnits, lowStockCount, expiringCount };
  }, [inventories, batches]);

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (inv: Inventory) => {
    setTargetItem(inv);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      InventoryAvailable: Number(formData.InventoryAvailable),
      MinStockLevel: Number(formData.MinStockLevel),
      MaxStockLevel: Number(formData.MaxStockLevel),
      ReorderPoint: Number(formData.ReorderPoint),
      BinID: formData.BinID ? formData.BinID : null,
      BatchID: formData.BatchID ? formData.BatchID : null,
    };

    if (modalMode === "create") {
      const res = await api.post("/inventory/add", payload);
      toast({
        title: "Inventory record created",
        description: "Stock ledger entry added.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/inventory/edit", payload);
      toast({
        title: "Inventory updated",
        description: "Stock levels saved.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (inv: Inventory) => {
    try {
      await api.delete(`/inventory/delete/${inv.InventoryID}`);
      toast({
        title: "Record deleted",
        description: "Inventory stock entry removed.",
      });
      if (selectedItem?.InventoryID === inv.InventoryID) {
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

  const tableColumns: ColumnConfig<Inventory>[] = [
    {
      key: "ProductID",
      header: "Product",
      sortable: true,
      render: (inv) => (
        <Link
          href={`/dashboard/product?q=${encodeURIComponent(getProductName(inv.ProductID))}`}
          className="font-medium text-zinc-900 hover:text-[#FD3706] transition-colors duration-150 flex items-center gap-2 group"
          onClick={(e) => e.stopPropagation()}
        >
          <Package className="w-4 h-4 text-zinc-400 group-hover:text-[#FD3706] transition-colors shrink-0" strokeWidth={1.5} />
          <span className="truncate">{getProductName(inv.ProductID)}</span>
        </Link>
      ),
    },
    {
      key: "WarehouseID",
      header: "Warehouse",
      sortable: true,
      render: (inv) => (
        <Link
          href={`/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(inv.WarehouseID))}`}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 font-medium transition-colors duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <WarehouseIcon className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <span>{getWarehouseName(inv.WarehouseID)}</span>
        </Link>
      ),
    },
    {
      key: "BinID",
      header: "Bin location",
      render: (inv) => {
        const bin = getBinLocation(inv.BinID, inv.BinLocation);
        if (!bin) {
          return (
            <span className="text-xs text-zinc-400 font-mono">
              Unassigned
            </span>
          );
        }
        const zoneName = bin.Zone?.ZoneName || bin.Zone?.ZoneType;
        return (
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-zinc-100 text-zinc-700 border border-zinc-200/80">
                <MapPin className="w-3 h-3 text-zinc-400 shrink-0" strokeWidth={1.5} />
                {bin.BinCode}
              </span>
              {zoneName && (
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/80">
                  {zoneName}
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-400 font-mono tabular-nums">
              A{bin.Aisle}-R{bin.Rack}-S{bin.Shelf}-B{bin.Bin}
            </span>
          </div>
        );
      },
    },
    {
      key: "BatchID",
      header: "Batch / FEFO",
      render: (inv) => {
        const batch = getBatch(inv.BatchID, inv.Batch);
        if (!batch) {
          return (
            <span className="text-xs text-zinc-400 font-mono">
              No batch
            </span>
          );
        }
        const fefo = getFefoStatus(batch.ExpiryDate);
        const expStr = new Date(batch.ExpiryDate).toISOString().split("T")[0];

        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-medium text-zinc-900">
                {batch.BatchNumber}
              </span>
              {batch.SupplierLotNumber && (
                <span className="text-[10px] text-zinc-400 font-mono">
                  (Lot: {batch.SupplierLotNumber})
                </span>
              )}
            </div>
            {fefo && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", fefo.dotClass)} />
                <span className={fefo.textClass}>{fefo.label}</span>
                <span className="text-zinc-400 font-normal">({expStr})</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "InventoryAvailable",
      header: "Available stock",
      sortable: true,
      render: (inv) => {
        const isLow = inv.InventoryAvailable <= inv.ReorderPoint;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums font-semibold text-xs text-zinc-900">
              {inv.InventoryAvailable.toLocaleString()}{" "}
              <span className="font-sans font-normal text-zinc-400 text-[11px]">units</span>
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-medium font-mono",
                isLow ? "text-amber-700" : "text-emerald-700"
              )}
            >
              <span
                className={cn(
                  "w-1.5 h-1.5 rounded-full shrink-0",
                  isLow ? "bg-amber-500" : "bg-emerald-500"
                )}
              />
              <span>{isLow ? "Low stock" : "In stock"}</span>
            </span>
          </div>
        );
      },
    },
    {
      key: "ReorderPoint",
      header: "Reorder point",
      render: (inv) => (
        <span className="font-mono tabular-nums text-xs text-zinc-600">
          {inv.ReorderPoint} units
        </span>
      ),
    },
    {
      key: "StockLimits",
      header: "Min / Max",
      render: (inv) => (
        <span className="font-mono tabular-nums text-xs text-zinc-500">
          {inv.MinStockLevel} – {inv.MaxStockLevel}
        </span>
      ),
    },
  ];

  const drawerFields: DrawerField<Inventory>[] = [
    {
      label: "Product",
      render: (inv) => getProductName(inv.ProductID),
    },
    {
      label: "Warehouse location",
      render: (inv) => getWarehouseName(inv.WarehouseID),
    },
    {
      label: "Bin location",
      render: (inv) => {
        const bin = getBinLocation(inv.BinID, inv.BinLocation);
        if (!bin) return <span className="text-zinc-400 font-mono text-xs">Unassigned</span>;
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-xs bg-zinc-100 text-zinc-900 px-2 py-0.5 rounded-md border border-zinc-200/80">
                {bin.BinCode}
              </span>
              {(bin.Zone?.ZoneName || bin.Zone?.ZoneType) && (
                <span className="text-[10px] font-mono uppercase bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-md border border-zinc-200/80">
                  {bin.Zone?.ZoneName || bin.Zone?.ZoneType}
                </span>
              )}
            </div>
            <div className="text-xs text-zinc-600 font-mono tabular-nums">
              Coordinates: Aisle {bin.Aisle} • Rack {bin.Rack} • Shelf {bin.Shelf} • Bin {bin.Bin}
            </div>
            {(bin.MaxWeightKg || bin.MaxVolumeCbm) && (
              <div className="text-[11px] text-zinc-400 font-mono tabular-nums">
                Capacity: {bin.MaxWeightKg ? `${bin.MaxWeightKg} kg` : ""} {bin.MaxVolumeCbm ? `| ${bin.MaxVolumeCbm} cbm` : ""}
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Batch & FEFO status",
      render: (inv) => {
        const batch = getBatch(inv.BatchID, inv.Batch);
        if (!batch) return <span className="text-zinc-400 font-mono text-xs">No linked batch</span>;
        const fefo = getFefoStatus(batch.ExpiryDate);
        return (
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-medium text-xs text-zinc-900">{batch.BatchNumber}</span>
              {batch.SupplierLotNumber && (
                <span className="text-[11px] text-zinc-400 font-mono">Lot: {batch.SupplierLotNumber}</span>
              )}
            </div>
            <div className="text-xs text-zinc-600 font-mono tabular-nums">
              Expiry date: <span className="font-medium text-zinc-900">{new Date(batch.ExpiryDate).toISOString().split("T")[0]}</span>
            </div>
            {fefo && (
              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums">
                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", fefo.dotClass)} />
                <span className={fefo.textClass}>{fefo.label}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Available inventory",
      render: (inv) => (
        <span className="font-mono tabular-nums font-semibold text-xs text-zinc-900">
          {inv.InventoryAvailable.toLocaleString()} <span className="font-sans font-normal text-zinc-400">units</span>
        </span>
      ),
    },
    {
      label: "Reorder trigger point",
      render: (inv) => (
        <span className="font-mono tabular-nums text-xs text-zinc-700">
          {inv.ReorderPoint} units
        </span>
      ),
    },
    {
      label: "Minimum stock level",
      render: (inv) => (
        <span className="font-mono tabular-nums text-xs text-zinc-700">
          {inv.MinStockLevel} units
        </span>
      ),
    },
    {
      label: "Maximum stock capacity",
      render: (inv) => (
        <span className="font-mono tabular-nums text-xs text-zinc-700">
          {inv.MaxStockLevel} units
        </span>
      ),
    },
    {
      label: "Inventory record ID",
      render: (inv) => (
        <span className="font-mono text-xs text-zinc-500">
          {inv.InventoryID}
        </span>
      ),
    },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "ProductID",
      label: "Product",
      type: "select",
      required: true,
      options: products.map((p) => ({
        label: `${p.ProductName} (${p.ProductCode})`,
        value: p.ProductID,
      })),
    },
    {
      name: "WarehouseID",
      label: "Warehouse",
      type: "select",
      required: true,
      options: warehouses.map((w) => ({
        label: w.WarehouseName,
        value: w.WarehouseID,
      })),
    },
    {
      name: "BinID",
      label: "Bin location",
      type: "select",
      required: false,
      options: binLocations.map((b) => ({
        label: `${b.BinCode} [${b.Zone?.ZoneName || b.Zone?.ZoneType || "Zone"}] (${getWarehouseName(b.WarehouseID)}: A${b.Aisle}-R${b.Rack}-S${b.Shelf}-B${b.Bin})`,
        value: b.BinID,
      })),
    },
    {
      name: "BatchID",
      label: "Batch number",
      type: "select",
      required: false,
      options: batches.map((b) => {
        const exp = new Date(b.ExpiryDate).toISOString().split("T")[0];
        const fefo = getFefoStatus(b.ExpiryDate);
        return {
          label: `${b.BatchNumber} (Exp: ${exp} — ${fefo?.status || "VALID"})`,
          value: b.BatchID,
        };
      }),
    },
    {
      name: "InventoryAvailable",
      label: "Available quantity",
      type: "number",
      required: true,
      defaultValue: 100,
    },
    {
      name: "MinStockLevel",
      label: "Min stock level",
      type: "number",
      required: true,
      defaultValue: 20,
    },
    {
      name: "MaxStockLevel",
      label: "Max stock level",
      type: "number",
      required: true,
      defaultValue: 500,
    },
    {
      name: "ReorderPoint",
      label: "Reorder point",
      type: "number",
      required: true,
      defaultValue: 40,
    },
  ];

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto w-full pb-16">
      {isSuperAdmin && !isCompanyMember && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 flex items-start sm:items-center justify-between gap-3 text-amber-900 text-xs shadow-2xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.5} />
            <span>
              <strong>SuperAdmin operational audit mode:</strong> You are inspecting multi-facility inventory ledgers in view-only mode. Stock mutations and replenishment allocations require tenant-level company membership.
            </span>
          </div>
          <Link
            href="/dashboard/superadmin"
            className="inline-flex items-center gap-1 font-medium text-amber-900 hover:text-amber-950 underline shrink-0 transition-colors"
          >
            Audit console
          </Link>
        </div>
      )}

      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Inventory ledger
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Real-time multi-facility stock tracking, FEFO batch thresholds, and bin coordinate allocation.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setFefoProductId(selectedItem ? selectedItem.ProductID : undefined);
              setIsFefoOpen(true);
            }}
            className="h-9 px-3.5 gap-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg shadow-2xs transition-colors duration-150"
          >
            <BrainCircuit className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            FEFO advisor
          </Button>
          <Link href="/dashboard/forecast">
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-3.5 gap-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg shadow-2xs transition-colors duration-150"
            >
              <Clock className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
              Demand forecast
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-9 px-3 gap-2 text-xs font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg shadow-2xs transition-colors duration-150"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-zinc-500", loading && "animate-spin")} strokeWidth={1.5} />
            Refresh
          </Button>
          {(!isSuperAdmin || isCompanyMember) && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 px-3.5 gap-2 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white rounded-lg shadow-2xs transition-colors duration-150"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} />
              Add stock entry
            </Button>
          )}
        </div>
      </div>

      {/* Operational Telemetry Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl p-4 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Tracked SKUs</span>
            <Boxes className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
              {telemetry.totalSkus}
            </span>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Active ledger records</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Available buffer</span>
            <Package className="w-4 h-4 text-zinc-400" strokeWidth={1.5} />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
              {telemetry.totalUnits.toLocaleString()}
            </span>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Units across facilities</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Reorder triggers</span>
            <span className={cn("w-2 h-2 rounded-full", telemetry.lowStockCount > 0 ? "bg-amber-500" : "bg-emerald-500")} />
          </div>
          <div className="mt-2">
            <span
              className={cn(
                "text-2xl font-semibold tracking-tight font-mono tabular-nums",
                telemetry.lowStockCount > 0 ? "text-amber-700" : "text-zinc-900"
              )}
            >
              {telemetry.lowStockCount}
            </span>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">SKUs below safe threshold</p>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">Shelf-life runway</span>
            <span className={cn("w-2 h-2 rounded-full", telemetry.expiringCount > 0 ? "bg-red-500" : "bg-emerald-500")} />
          </div>
          <div className="mt-2">
            <span
              className={cn(
                "text-2xl font-semibold tracking-tight font-mono tabular-nums",
                telemetry.expiringCount > 0 ? "text-red-700" : "text-zinc-900"
              )}
            >
              {telemetry.expiringCount}
            </span>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">Expiring or quarantined batches</p>
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <GenericEntityTable
        data={inventories}
        columns={tableColumns}
        idKey="InventoryID"
        searchPlaceholder="Search inventory by SKU, warehouse, or batch..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={isSuperAdmin && !isCompanyMember ? undefined : handleOpenEdit}
        onDelete={isSuperAdmin && !isCompanyMember ? undefined : handleDelete}
        emptyMessage="No inventory entries found. Allocate your first stock item."
      />

      {/* Side Inspector Drawer */}
      <GenericEntityDrawer
        title={selectedItem ? getProductName(selectedItem.ProductID) : "Stock details"}
        subtitle="Inventory record"
        item={selectedItem}
        icon={<Layers className="w-4 h-4 text-zinc-600" strokeWidth={1.5} />}
        fields={drawerFields}
        customActions={(inv) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFefoProductId(inv.ProductID);
              setIsFefoOpen(true);
            }}
            className="h-8 px-3 gap-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
            FEFO pick plan
          </Button>
        )}
        relatedLinks={[
          {
            label: "Demand forecaster & auto-PO",
            sublabel: "Run predictive risk modeling and automated purchase order execution",
            href: (inv) => `/dashboard/forecast?q=${encodeURIComponent(getProductName(inv.ProductID))}`,
          },
          {
            label: "Product catalog",
            sublabel: "View complete product specifications, pricing, and packaging",
            href: (inv) => `/dashboard/product?q=${encodeURIComponent(getProductName(inv.ProductID))}`,
          },
          {
            label: "Warehouse facility",
            sublabel: "Inspect warehouse specifications and bin topology",
            href: (inv) => `/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(inv.WarehouseID))}`,
          },
          {
            label: "Stock transfers",
            sublabel: "Check inter-warehouse shipments and transfers for this SKU",
            href: (inv) => `/dashboard/transfer?q=${encodeURIComponent(getProductName(inv.ProductID))}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={isSuperAdmin && !isCompanyMember ? undefined : handleOpenEdit}
        onDelete={isSuperAdmin && !isCompanyMember ? undefined : handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="Inventory stock"
        item={targetItem}
        mode={modalMode}
        fields={modalFields}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
      />

      <FefoAdvisorModal
        isOpen={isFefoOpen}
        onClose={() => setIsFefoOpen(false)}
        products={products}
        warehouses={warehouses}
        initialProductId={fefoProductId}
      />

      <Toaster />
    </div>
  );
}
