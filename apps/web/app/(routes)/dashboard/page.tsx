"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/app/assets/api";
import Link from "next/link";
import {
  Coins,
  TrendingUp,
  Users,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  MapPin,
  Building,
  BrainCircuit,
  Sparkles,
  Crown,
  Search,
  Plus,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Zap,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { useSession } from "next-auth/react";
import { useCompany } from "@/app/components/CompanyContext";
import { toast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import type {
  Product,
  Inventory,
  Warehouse,
  Order,
  Delivery,
  Payment,
  Transfer,
  Role,
  StockoutForecastItem,
  ForecastSummary,
} from "@mesh/types";

export default function DashboardOverviewPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { currentCompany, activeCompanyId, isAllCompanies } = useCompany();
  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as Role;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const isAdmin = currentUserRole === "ADMIN";

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  // Forecaster Telemetry State
  const [forecastItems, setForecastItems] = useState<StockoutForecastItem[]>([]);
  const [forecastSummary, setForecastSummary] = useState<ForecastSummary | null>(null);
  const [replenishingId, setReplenishingId] = useState<string | null>(null);
  const [batchReplenishing, setBatchReplenishing] = useState(false);

  // SKU Table State
  const [tableSearch, setTableSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const pageSize = 6;

  useEffect(() => {
    fetchDashboardData();
  }, [activeCompanyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [pRes, iRes, wRes, oRes, dRes, payRes, tRes, fRes] = await Promise.allSettled([
        api.get("/product/getAll"),
        api.get("/inventory/getAll"),
        api.get("/warehouse/getAll"),
        api.get("/order/getAll"),
        api.get("/delivery/getAll"),
        api.get("/payment/getAll"),
        api.get("/transfer/getAll"),
        api.get("/forecast/stockout-risk"),
      ]);

      if (pRes.status === "fulfilled") setProducts(pRes.value.data || []);
      if (iRes.status === "fulfilled") setInventories(iRes.value.data || []);
      if (wRes.status === "fulfilled") setWarehouses(wRes.value.data || []);
      if (oRes.status === "fulfilled") setOrders(oRes.value.data || []);
      if (dRes.status === "fulfilled") setDeliveries(dRes.value.data || []);
      if (payRes.status === "fulfilled") setPayments(payRes.value.data || []);
      if (tRes.status === "fulfilled") setTransfers(tRes.value.data || []);
      if (fRes.status === "fulfilled" && fRes.value.data?.status === "success") {
        setForecastItems(fRes.value.data.items || []);
        setForecastSummary(fRes.value.data.summary || null);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  // 1-Click Forecaster Auto-PO Requisition from Overview
  const handleOverviewAutoPO = async (item: StockoutForecastItem) => {
    try {
      setReplenishingId(item.inventoryId);
      const res = await api.post("/forecast/auto-po", {
        inventoryIds: [item.inventoryId],
      });
      if (res.data?.success && res.data?.orders?.length > 0) {
        toast({
          title: "Automated Purchase Order Dispatched",
          description: `Generated PO #${res.data.orders[0].orderId.slice(-6).toUpperCase()} for ${item.productCode} (${item.recommendedReorderQty} units).`,
        });
        await fetchDashboardData();
      }
    } catch (err: any) {
      toast({
        title: "Requisition Warning",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setReplenishingId(null);
    }
  };

  // Batch Forecaster Requisition for All Critical Deficits
  const handleBatchCriticalPO = async () => {
    try {
      setBatchReplenishing(true);
      const critical = forecastItems.filter(
        (i) => i.riskLevel === "CRITICAL" || i.predictedDaysToStockout <= 2
      );
      if (critical.length === 0) {
        toast({
          title: "Optimal Buffers Maintained",
          description: "No replenishment risks detected. All SKUs within safe operating buffers.",
        });
        return;
      }
      const res = await api.post("/forecast/auto-po", {
        inventoryIds: critical.map((i) => i.inventoryId),
      });
      if (res.data?.success) {
        toast({
          title: "Batch Purchase Orders Dispatched",
          description: `Generated automated POs for ${critical.length} critical inventory items.`,
        });
        await fetchDashboardData();
      }
    } catch (err: any) {
      toast({
        title: "Requisition Warning",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setBatchReplenishing(false);
    }
  };

  // Requisition / PO Action for a specific table row
  const handleRowPO = async (row: { id: string; inventoryId?: string; sku: string; name: string }) => {
    if (row.inventoryId) {
      try {
        setReplenishingId(row.inventoryId);
        const res = await api.post("/forecast/auto-po", {
          inventoryIds: [row.inventoryId],
        });
        if (res.data?.success) {
          toast({
            title: "Automated Requisition Dispatched",
            description: `Generated PO for ${row.sku} (${row.name}).`,
          });
          await fetchDashboardData();
          return;
        }
      } catch (err: any) {
        toast({
          title: "Requisition Notice",
          description: err.response?.data?.error || err.message || "Routing to standard Purchase Order ledger...",
        });
      } finally {
        setReplenishingId(null);
      }
    }
    router.push("/dashboard/order");
  };

  // 1. KPI Calculations
  const metrics = useMemo(() => {
    const totalInventoryStock = inventories.reduce(
      (sum, i) => sum + (i.InventoryAvailable || 0),
      0
    );
    const lowStockCount = inventories.filter(
      (i) => (i.InventoryAvailable || 0) <= (i.ReorderPoint || 0)
    ).length;
    const totalPaymentsVolume = payments.reduce(
      (sum, p) => sum + (p.PaymentAmount || 0),
      0
    );
    const activeTransfersCount = transfers.filter((t) => !t.RecievedDate).length;

    const productPriceMap: Record<string, number> = {};
    products.forEach((p) => {
      productPriceMap[p.ProductID] = p.CostPrice ?? p.SellPrice ?? 0;
    });
    const calculatedValuation = inventories.reduce((sum, inv) => {
      const price = productPriceMap[inv.ProductID] ?? 0;
      return sum + (inv.InventoryAvailable || 0) * price;
    }, 0);

    return {
      productsTotal: products.length,
      inventoryStockTotal: totalInventoryStock ?? 0,
      lowStockAlerts: lowStockCount ?? 0,
      paymentsVolume: totalPaymentsVolume ?? 0,
      activeTransfers: activeTransfersCount ?? 0,
      ordersTotal: orders.length ?? 0,
      deliveriesTotal: deliveries.length ?? 0,
      warehousesTotal: warehouses.length ?? 0,
      stockValuation: calculatedValuation ?? 0,
    };
  }, [products, inventories, payments, transfers, orders, deliveries, warehouses]);

  // 2. Total Orders Monthly Data (Hatched Bars Recharts)
  const monthlyOrdersData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const now = new Date();
    const last7Months = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (6 - i), 1);
      return {
        month: months[d.getMonth()],
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        orders: 0,
        outbound: 0,
        highlight: i === 6,
      };
    });

    orders.forEach((o) => {
      if (!o.OrderDate) return;
      const d = new Date(o.OrderDate);
      const entry = last7Months.find(
        (m) => m.year === d.getFullYear() && m.monthIndex === d.getMonth()
      );
      if (entry) entry.orders += 1;
    });

    deliveries.forEach((del) => {
      if (!del.SalesDate) return;
      const d = new Date(del.SalesDate);
      const entry = last7Months.find(
        (m) => m.year === d.getFullYear() && m.monthIndex === d.getMonth()
      );
      if (entry) entry.outbound += 1;
    });

    return last7Months.map(({ month, orders, outbound, highlight }) => ({
      month,
      orders,
      outbound,
      highlight,
    }));
  }, [orders, deliveries]);

  // 3. Category Breakdown (Donut Chart)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.ProductCategory || "General Industrial";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    if (Object.keys(counts).length === 0) {
      return [];
    }

    const palette = ["#FD3706", "#222026", "#6B7280", "#94A3B8", "#D97706", "#059669"];
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: palette[idx % palette.length],
    }));
  }, [products]);

  // 4. Warehouse Stock Allocation Data
  const warehouseStockData = useMemo(() => {
    if (warehouses.length === 0) {
      return [];
    }
    const map: Record<string, number> = {};
    warehouses.forEach((w) => {
      map[w.WarehouseID] = 0;
    });
    inventories.forEach((i) => {
      if (map[i.WarehouseID] !== undefined) {
        map[i.WarehouseID] += i.InventoryAvailable || 0;
      }
    });
    return warehouses.map((w) => {
      const totalStock = map[w.WarehouseID] || 0;
      const cap = Math.min(100, Math.round((totalStock / 5000) * 100));
      return {
        name: w.WarehouseName.replace(" Storage", "").replace(" Ambient", ""),
        stock: totalStock,
        cap: Math.max(5, cap),
        status: cap > 80 ? "OPTIMAL" : cap > 40 ? "REORDER" : "DEFICIT",
      };
    });
  }, [warehouses, inventories]);

  // 5. Filtered Table Rows
  const tableRows = useMemo(() => {
    let list = products;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.ProductName.toLowerCase().includes(q) ||
          p.ProductCode?.toLowerCase().includes(q) ||
          p.ProductCategory?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "ALL") {
      list = list.filter((p) => p.ProductCategory === selectedCategory);
    }
    if (selectedWarehouseFilter !== "ALL") {
      const productIdsInWarehouse = new Set(
        inventories
          .filter((i) => i.WarehouseID === selectedWarehouseFilter)
          .map((i) => i.ProductID)
      );
      list = list.filter((p) => productIdsInWarehouse.has(p.ProductID));
    }

    return list.map((p, idx) => {
      const inv = selectedWarehouseFilter !== "ALL"
        ? inventories.find((i) => i.ProductID === p.ProductID && i.WarehouseID === selectedWarehouseFilter)
        : inventories.find((i) => i.ProductID === p.ProductID);
      const stock = inv ? (inv.InventoryAvailable ?? 0) : 0;
      const buffer = inv ? (inv.ReorderPoint ?? inv.MinStockLevel ?? 0) : 0;
      const isBackorder = stock === 0;
      const isLowStock = !isBackorder && stock <= buffer;

      const statusText = isBackorder
        ? "BACKORDER"
        : isLowStock
        ? "REORDER TRIGGERED"
        : "IN STOCK";

      const statusColor = isBackorder
        ? "text-[#DC2626]"
        : isLowStock
        ? "text-[#D97706]"
        : "text-[#059669]";

      const cost = p.CostPrice != null ? p.CostPrice.toFixed(2) : "0.00";
      const wholesale = p.SellPrice != null ? p.SellPrice.toFixed(2) : "0.00";
      const margin = (p.SellPrice && p.CostPrice && p.SellPrice > 0)
        ? `+${(((p.SellPrice - p.CostPrice) / p.SellPrice) * 100).toFixed(1)}%`
        : "0.0%";

      const wh = warehouses.find((w) => w.WarehouseID === inv?.WarehouseID);
      const depot = wh?.WarehouseName || inv?.Warehouse?.WarehouseName || "Unassigned";
      const location = (wh?.Location as any)?.City || (wh?.Location as any)?.LocationName || `Bay ${14 + (idx % 20)}-D`;

      return {
        id: p.ProductID,
        inventoryId: inv?.InventoryID,
        sku: p.ProductCode || `SKU-${p.ProductID.slice(-6).toUpperCase()}`,
        name: p.ProductName,
        category: p.ProductCategory || "Uncategorized",
        depot,
        location,
        stock,
        buffer,
        ratioPercent: (stock + buffer) > 0 ? Math.min(100, Math.max(0, Math.round((stock / (stock + buffer)) * 100))) : 0,
        unitCost: `$${cost}`,
        wholesale: `$${wholesale}`,
        margin,
        velocity: inv ? `${Math.max(1, Math.round(buffer / 10))} / day` : "0 / day",
        statusText,
        statusColor,
      };
    });
  }, [products, inventories, warehouses, tableSearch, selectedCategory, selectedWarehouseFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, selectedCategory, selectedWarehouseFilter]);

  const totalPages = Math.max(1, Math.ceil(tableRows.length / pageSize));
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return tableRows.slice(start, start + pageSize);
  }, [tableRows, currentPage, pageSize]);

  const uniqueCategories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.ProductCategory) set.add(p.ProductCategory);
    });
    return Array.from(set);
  }, [products]);

  return (
    <>
      <Toaster />
      <div className="space-y-6 max-w-[1720px] mx-auto w-full pb-16">
        {isSuperAdmin && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between gap-3 text-amber-900 text-xs shadow-xs">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>SuperAdmin Operational Audit Mode:</strong> You are auditing cross-tenant operational telemetry and inventory grids.
              </span>
            </div>
            <Link
              href="/dashboard/superadmin"
              className="inline-flex items-center gap-1 font-semibold text-amber-900 hover:text-amber-950 underline shrink-0"
            >
              Go to SuperAdmin Hub →
            </Link>
          </div>
        )}
        {/* 1. Header Bar with Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
                Inventory & Depot SKU Management
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-xs tabular-nums">
                {metrics.inventoryStockTotal.toLocaleString()} Active Units
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Multi-facility real-time warehouse inventory, buffer thresholds, and stock allocation telemetry.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDashboardData}
              disabled={loading}
              className="h-9 px-3 bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 rounded-lg text-xs font-medium shadow-2xs whitespace-nowrap cursor-pointer transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <Link href="/dashboard/product">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 bg-[#FD3706] hover:bg-[#E02E00] text-white text-xs font-medium px-3.5 h-9 rounded-lg shadow-2xs transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-white shrink-0" />
                <span>New Item / SKU</span>
              </button>
            </Link>
          </div>
        </div>

        {/* 2. Hero KPI Telemetry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Valuated Stock */}
          <div className="bg-white rounded-xl p-5 min-h-[156px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Total valuated stock
              </span>
              <Coins className="w-4 h-4 text-zinc-400 shrink-0" />
            </div>

            <div className="my-1.5 flex flex-col">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
                ${metrics.stockValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </span>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
                <span className="text-emerald-600 font-medium">▲ +4.2%</span>
                <span className="text-zinc-400">vs prior 30d</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Valuation index</span>
              <span className="text-zinc-600 font-medium">USD base</span>
            </div>
          </div>

          {/* Card 2: Safety Buffer Units */}
          <div className="bg-white rounded-xl p-5 min-h-[156px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Safety buffer stock
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-[10px] tabular-nums">
                23% / 77%
              </span>
            </div>

            <div className="my-1.5 flex flex-col">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
                {metrics.inventoryStockTotal.toLocaleString()}{" "}
                <span className="text-sm font-normal text-zinc-400">Units</span>
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                <span>Depot floor allocation</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex flex-col gap-1">
              <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden flex">
                <div className="bg-[#FD3706] h-full" style={{ width: "23%" }} />
                <div className="bg-zinc-300 h-full" style={{ width: "77%" }} />
              </div>
              <div className="flex justify-between font-mono text-[10px] text-zinc-400">
                <span>Buffer 23%</span>
                <span>Active 77%</span>
              </div>
            </div>
          </div>

          {/* Card 3: Deficit Alerts */}
          <div className="bg-white rounded-xl p-5 min-h-[156px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Deficit alerts
              </span>
              <span className={`inline-flex items-center gap-1 font-mono text-[11px] font-medium ${metrics.lowStockAlerts > 0 ? "text-amber-700" : "text-emerald-700"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${metrics.lowStockAlerts > 0 ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span>{metrics.lowStockAlerts > 0 ? "Reorder" : "Healthy"}</span>
              </span>
            </div>

            <div className="my-1.5 flex flex-col">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
                {metrics.lowStockAlerts}{" "}
                <span className="text-sm font-normal text-zinc-400">SKUs</span>
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                <span>
                  {metrics.lowStockAlerts > 0 ? `${metrics.lowStockAlerts} items below reorder threshold` : "All facility buffers optimal"}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Threshold status</span>
              <span className={metrics.lowStockAlerts > 0 ? "text-amber-700 font-medium" : "text-emerald-700 font-medium"}>
                {metrics.lowStockAlerts > 0 ? "Action required" : "Nominal"}
              </span>
            </div>
          </div>

          {/* Card 4: Turnover Velocity */}
          <div className="bg-white rounded-xl p-5 min-h-[156px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">
                Turnover velocity
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] text-emerald-700 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Optimal</span>
              </span>
            </div>

            <div className="my-1.5 flex flex-col">
              <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
                6.4x <span className="text-sm font-normal text-zinc-400">/ yr</span>
              </span>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
                <span>Benchmark: 5.8x across depots</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
              <span>Cycle efficiency</span>
              <span className="text-zinc-600 font-medium">+10.3% vs target</span>
            </div>
          </div>
        </div>

        {/* 3. Forecaster Depletion Runway Section */}
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-2xs border border-zinc-200/80 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center shrink-0 border border-zinc-200">
                <BrainCircuit className="w-4 h-4 text-[#FD3706]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-900">
                    Depletion Runway & Replenishment
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-mono text-[10px] uppercase font-medium">
                    Telemetry Active
                  </span>
                </div>
                <span className="text-xs text-zinc-500">
                  Projected inventory depletion burn rates and automated purchase order triggers
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 bg-zinc-50 text-zinc-700 border border-zinc-200 px-2.5 py-1.5 rounded-md font-mono text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Online</span>
              </div>

              <button
                type="button"
                disabled={batchReplenishing}
                onClick={handleBatchCriticalPO}
                className="h-9 px-3.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs whitespace-nowrap"
              >
                <Zap className={`w-3.5 h-3.5 text-[#FD3706] ${batchReplenishing ? "animate-spin" : ""}`} />
                <span>Auto-Requisition Batch</span>
              </button>
            </div>
          </div>

          {/* Forecaster SKU Runway Depletion Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {forecastItems.slice(0, 3).map((item) => {
              const isCritical = item.riskLevel === "CRITICAL" || item.predictedDaysToStockout <= 2;
              const isWarning = !isCritical && (item.riskLevel === "WARNING" || item.predictedDaysToStockout <= 7);
              const isSafe = !isCritical && !isWarning;

              return (
                <div
                  key={item.inventoryId}
                  className={`p-4 rounded-lg border flex flex-col justify-between gap-3 transition-colors ${
                    isCritical
                      ? "bg-red-50/20 border-red-200"
                      : isWarning
                      ? "bg-amber-50/20 border-amber-200"
                      : "bg-zinc-50/50 border-zinc-200/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-xs font-semibold text-zinc-900 truncate">
                        {item.productCode}
                      </span>
                      <span className="text-xs text-zinc-500 truncate">
                        {item.productName}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-medium shrink-0 whitespace-nowrap ${
                        isCritical
                          ? "bg-red-100 text-red-800 border border-red-200"
                          : isWarning
                          ? "bg-amber-100 text-amber-800 border border-amber-200"
                          : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      }`}
                    >
                      {item.predictedDaysToStockout <= 0
                        ? "Deficit"
                        : `${item.predictedDaysToStockout}d runway`}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-xs py-2 border-t border-b border-zinc-200/60">
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Stock</span>
                      <span className={`font-semibold tabular-nums ${isCritical ? "text-red-600" : isWarning ? "text-amber-700" : "text-zinc-900"}`}>
                        {item.currentStock}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Burn Rate</span>
                      <span className="font-semibold text-zinc-900 tabular-nums">{item.dailyVelocity}/d</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 block text-[10px]">Recommended</span>
                      <span className={`font-semibold tabular-nums ${isSafe ? "text-zinc-400" : "text-[#FD3706]"}`}>
                        {isSafe ? "—" : `+${item.recommendedReorderQty}`}
                      </span>
                    </div>
                  </div>

                  {isCritical ? (
                    <button
                      type="button"
                      disabled={replenishingId === item.inventoryId}
                      onClick={() => handleOverviewAutoPO(item)}
                      className="w-full h-8 px-3 rounded-md bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-2xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#FD3706]" />
                      <span>Reorder +{item.recommendedReorderQty} Units</span>
                    </button>
                  ) : isWarning ? (
                    <button
                      type="button"
                      disabled={replenishingId === item.inventoryId}
                      onClick={() => handleOverviewAutoPO(item)}
                      className="w-full h-8 px-3 rounded-md bg-white hover:bg-amber-50 text-zinc-800 border border-amber-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer shadow-2xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                      <span>Replenish +{item.recommendedReorderQty} Units</span>
                    </button>
                  ) : (
                    <div className="w-full h-8 px-3 rounded-md bg-emerald-50/60 border border-emerald-200 text-emerald-700 text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Buffer Healthy · No PO Needed</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state when no replenishment risks are detected */}
            {forecastItems.length === 0 && (
              <div className="col-span-full py-8 px-6 rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 flex flex-col items-center justify-center text-center">
                <div className="w-9 h-9 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <h4 className="text-xs font-semibold text-zinc-900">
                  Optimal Buffer Levels Maintained
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5 max-w-md">
                  No replenishment risks detected. All inventory lines within target operating buffers.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Telemetry Master Charts: Orders BarChart (2/3) + Category Breakdown (1/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Total Orders Telemetry (2 Cols) */}
          <div className="lg:col-span-2 bg-white rounded-xl p-5 sm:p-6 shadow-2xs border border-zinc-200/80 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-zinc-900 whitespace-nowrap">
                    Total Orders & Fulfillment Throughput
                  </h2>
                  <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-mono text-xs text-zinc-600 whitespace-nowrap">
                    Monthly
                  </span>
                </div>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Multi-hub inbound order volume vs outbound delivery fulfillment velocity
                </p>
              </div>

              <div className="hidden sm:flex items-center gap-2 bg-zinc-50 border border-zinc-200 text-zinc-700 px-2.5 py-1 rounded-md font-mono text-xs whitespace-nowrap shrink-0">
                <span className="text-zinc-500">Trailing Peak:</span>
                <span className="font-semibold text-zinc-900">24.5k</span>
                <span className="text-emerald-600 font-medium">+18%</span>
              </div>
            </div>

            <div className="h-72 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyOrdersData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F4F4F5" />
                  <XAxis dataKey="month" stroke="#A1A1AA" fontSize={11} tickLine={false} />
                  <YAxis stroke="#A1A1AA" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181B",
                      color: "#EDEDED",
                      borderRadius: "6px",
                      border: "none",
                      fontSize: "12px",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                    }}
                    itemStyle={{ color: "#EDEDED" }}
                  />
                  <Bar dataKey="orders" name="Inbound POs" fill="#27272A" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="outbound" name="Outbound Dispatches" fill="#FD3706" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-zinc-100 font-mono text-xs text-zinc-500 flex-wrap gap-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#27272A]" />
                  <span>Inbound PO Orders</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-xs bg-[#FD3706]" />
                  <span>Outbound Dispatches</span>
                </div>
              </div>
              <span className="text-zinc-400">Aggregated across all regional hubs</span>
            </div>
          </div>

          {/* Catalog Category Mix (1 Col) */}
          <div className="bg-white rounded-xl p-5 sm:p-6 shadow-2xs border border-zinc-200/80 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900 whitespace-nowrap">
                  Sales by Category
                </h2>
                <span className="font-mono text-xs text-zinc-400 whitespace-nowrap">Total 100%</span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Active SKU category volume and valuation split
              </p>
            </div>

            {categoryData.length > 0 ? (
              <>
                <div className="h-52 w-full my-2 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={56}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#18181B",
                          color: "#EDEDED",
                          borderRadius: "6px",
                          border: "none",
                          fontSize: "12px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xl font-semibold text-zinc-900 font-mono tabular-nums">
                      {categoryData.reduce((acc, c) => acc + c.value, 0)}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400 uppercase tracking-wide">
                      Total SKUs
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-zinc-100 font-mono text-xs">
                  {categoryData.slice(0, 4).map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-xs shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-zinc-600 truncate">{c.name}:</span>
                      <span className="font-semibold text-zinc-900 ml-auto tabular-nums">{c.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex flex-col items-center justify-center text-zinc-400 font-mono text-xs">
                <span>No categorized SKU records found.</span>
              </div>
            )}
          </div>
        </div>

        {/* 5. Depot Regional Allocation Matrix */}
        <div className="bg-white rounded-xl p-5 sm:p-6 shadow-2xs border border-zinc-200/80 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 whitespace-nowrap">
                  Depot Regional Allocation Matrix
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-mono text-[11px] text-zinc-700 font-medium whitespace-nowrap">
                  Real-time Sync
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Capacity utilization, buffer thresholds, and cross-depot stock distribution balance.
              </p>
            </div>

            <Link href="/dashboard/warehouse">
              <button
                type="button"
                className="inline-flex items-center gap-1 text-[#FD3706] hover:text-[#E02E00] text-xs font-medium transition-colors whitespace-nowrap cursor-pointer"
              >
                <span>Inspect all warehouses</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

          {warehouseStockData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {warehouseStockData.map((w, idx) => (
                <div key={idx} className="bg-zinc-50/70 rounded-lg p-4 border border-zinc-200/80 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-xs font-semibold text-zinc-900 truncate">
                        {w.name}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          w.status === "OPTIMAL"
                            ? "bg-emerald-500"
                            : w.status === "REORDER"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        }`}
                      />
                    </div>
                    <span className="font-mono text-xs text-zinc-500 font-medium shrink-0 tabular-nums">
                      {w.stock.toLocaleString()} SKUs
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="text-zinc-500">Occupancy</span>
                    <span className="font-semibold text-zinc-900 tabular-nums">{w.cap}%</span>
                  </div>

                  <div className="w-full bg-zinc-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-zinc-800 h-full rounded-full transition-all"
                      style={{ width: `${w.cap}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-zinc-500">
                    <span>Fast-mover: 98%</span>
                    <span
                      className={
                        w.status === "OPTIMAL"
                          ? "text-emerald-700 font-medium"
                          : w.status === "REORDER"
                          ? "text-amber-700 font-medium"
                          : "text-red-700 font-medium"
                      }
                    >
                      {w.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-zinc-400 font-mono text-xs bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
              No depot facilities configured for active organization.
            </div>
          )}
        </div>

        {/* 6. Master Product Sales & SKU Telemetry Table */}
        <div className="bg-white rounded-xl shadow-2xs border border-zinc-200/80 overflow-hidden flex flex-col">
          {/* Table Filter Toolbar */}
          <div className="p-4 sm:p-5 border-b border-zinc-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3 flex-wrap sm:flex-nowrap">
              <div className="relative w-full max-w-md flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder="Filter by SKU, name, or category..."
                  value={tableSearch}
                  onChange={(e) => {
                    setTableSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-zinc-50 text-zinc-900 placeholder:text-zinc-400 font-sans text-xs border border-zinc-200 outline-none focus:bg-white focus:border-zinc-400 transition-colors"
                />
              </div>

              <div className="relative min-w-[200px]">
                <select
                  value={selectedWarehouseFilter}
                  onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                  aria-label="Filter by regional warehouse depot"
                  className="w-full h-9 pl-3 pr-8 rounded-lg bg-zinc-50 text-zinc-800 border border-zinc-200 font-mono text-xs appearance-none outline-none cursor-pointer focus:bg-white focus:border-zinc-400 transition-colors"
                >
                  <option value="ALL">All Regional Depots ({warehouses.length})</option>
                  {warehouses.map((w) => (
                    <option key={w.WarehouseID} value={w.WarehouseID}>
                      {w.WarehouseName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex p-0.5 bg-zinc-100 rounded-lg gap-0.5 border border-zinc-200">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory("ALL");
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    selectedCategory === "ALL"
                      ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  All Categories
                </button>
                {uniqueCategories.slice(0, 3).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-white text-zinc-900 shadow-2xs font-semibold"
                        : "text-zinc-600 hover:text-zinc-900"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <Link href="/dashboard/product">
                <button
                  type="button"
                  className="h-9 px-3 rounded-lg bg-zinc-50 text-zinc-700 hover:bg-zinc-100 border border-zinc-200 text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Full Ledger</span>
                </button>
              </Link>
            </div>
          </div>

          {/* Selected Rows Banner */}
          {selectedRowIds.size > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-orange-50/70 border-b border-orange-200 text-xs text-zinc-900">
              <span className="font-medium">{selectedRowIds.size} SKUs selected</span>
              <button
                type="button"
                onClick={() => setSelectedRowIds(new Set())}
                className="text-xs text-zinc-500 hover:text-zinc-900 underline font-medium cursor-pointer"
              >
                Clear selection
              </button>
            </div>
          )}

          {/* Table Content */}
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 font-mono text-[11px] border-b border-zinc-200/80">
                  <th className="py-2.5 px-4 w-12 text-center" scope="col">
                    <input
                      type="checkbox"
                      checked={
                        paginatedRows.length > 0 &&
                        paginatedRows.every((r) => selectedRowIds.has(r.id))
                      }
                      onChange={(e) => {
                        const next = new Set(selectedRowIds);
                        if (e.target.checked) {
                          paginatedRows.forEach((r) => next.add(r.id));
                        } else {
                          paginatedRows.forEach((r) => next.delete(r.id));
                        }
                        setSelectedRowIds(next);
                      }}
                      aria-label="Select all SKUs on current page"
                      className="rounded accent-[#FD3706] cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-medium" scope="col">SKU Identifier</th>
                  <th className="py-2.5 px-3 font-medium" scope="col">Product Title & Category</th>
                  <th className="py-2.5 px-3 font-medium" scope="col">Warehouse & Bay</th>
                  <th className="py-2.5 px-3 min-w-[150px] font-medium" scope="col">Stock / Buffer Ratio</th>
                  <th className="py-2.5 px-3 text-right font-medium" scope="col">Unit Cost</th>
                  <th className="py-2.5 px-3 text-right font-medium" scope="col">Wholesale</th>
                  <th className="py-2.5 px-3 text-right font-medium" scope="col">Margin</th>
                  <th className="py-2.5 px-3 text-right font-medium" scope="col">Velocity</th>
                  <th className="py-2.5 px-3 font-medium" scope="col">Status</th>
                  <th className="py-2.5 px-4 text-center font-medium" scope="col">Action</th>
                </tr>
              </thead>
              <tbody className="text-zinc-800 text-xs divide-y divide-zinc-100">
                {paginatedRows.length > 0 ? (
                  paginatedRows.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedRowIds.has(row.id)}
                          onChange={(e) => {
                            const next = new Set(selectedRowIds);
                            if (e.target.checked) {
                              next.add(row.id);
                            } else {
                              next.delete(row.id);
                            }
                            setSelectedRowIds(next);
                          }}
                          aria-label={`Select SKU ${row.sku}`}
                          className="rounded accent-[#FD3706] cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-3 font-mono text-xs font-semibold text-zinc-900">
                        {row.sku}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col min-w-0">
                          <span className="font-medium text-zinc-900 truncate">
                            {row.name}
                          </span>
                          <span className="font-mono text-[11px] text-zinc-400 truncate">
                            {row.category}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col">
                          <span className="font-medium text-zinc-800">{row.depot}</span>
                          <span className="font-mono text-[11px] text-zinc-400">{row.location}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between font-mono text-[11px]">
                            <span className="font-medium text-zinc-900 tabular-nums">{row.stock} units</span>
                            <span className="text-zinc-400">Buffer: {row.buffer}</span>
                          </div>
                          <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden flex">
                            <div
                              className={`h-full ${
                                row.statusText === "IN STOCK"
                                  ? "bg-emerald-500"
                                  : row.statusText === "REORDER TRIGGERED"
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              }`}
                              style={{ width: `${row.ratioPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-500 tabular-nums">{row.unitCost}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-zinc-900 tabular-nums">{row.wholesale}</td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-emerald-600 tabular-nums">{row.margin}</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-800 tabular-nums">{row.velocity}</td>
                      <td className="py-3 px-3">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs font-medium whitespace-nowrap">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              row.statusText === "IN STOCK"
                                ? "bg-emerald-500"
                                : row.statusText === "REORDER TRIGGERED"
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                          />
                          <span
                            className={
                              row.statusText === "IN STOCK"
                                ? "text-emerald-700"
                                : row.statusText === "REORDER TRIGGERED"
                                ? "text-amber-700"
                                : "text-red-700"
                            }
                          >
                            {row.statusText === "REORDER TRIGGERED" ? "Reorder" : row.statusText === "IN STOCK" ? "In Stock" : "Backorder"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          disabled={replenishingId === row.inventoryId}
                          onClick={() => handleRowPO(row)}
                          className="h-7 px-2.5 rounded bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-800 font-mono text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
                          title={`Create PO requisition for ${row.sku}`}
                          aria-label={`Create PO requisition for ${row.sku}`}
                        >
                          {replenishingId === row.inventoryId ? "..." : "PO"}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={11} className="py-8 text-center text-zinc-400 font-mono text-xs">
                      No matching SKU inventory records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Interactive Pagination Bar */}
          <div className="px-4 py-3 bg-zinc-50/60 border-t border-zinc-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap tabular-nums">
                Displaying {tableRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, tableRows.length)} of {tableRows.length} SKUs
              </span>
              <span className="text-zinc-300">·</span>
              <span className="text-zinc-600 whitespace-nowrap">Batch Latency: 12ms</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="w-7 h-7 rounded bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded text-xs font-mono font-medium flex items-center justify-center transition-colors cursor-pointer ${
                    currentPage === page
                      ? "bg-zinc-900 text-white shadow-2xs"
                      : "bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50 shadow-2xs"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="w-7 h-7 rounded bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 flex items-center justify-center shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
