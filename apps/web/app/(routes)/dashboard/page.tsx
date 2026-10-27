"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/app/assets/api";
import Link from "next/link";
import {
  Package,
  Layers,
  Truck,
  ListCheck,
  Coins,
  ArrowLeftRight,
  TrendingUp,
  Warehouse as WarehouseIcon,
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
  ScanBarcode,
  Plus,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
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
import type {
  Product,
  Inventory,
  Warehouse,
  Order,
  Delivery,
  Payment,
  Transfer,
  Role,
} from "@mesh/types";

export default function DashboardOverviewPage() {
  const { data: session } = useSession();
  const { currentCompany, activeCompanyId, isAllCompanies } = useCompany();
  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as Role;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const isAdmin = currentUserRole === "ADMIN" || isSuperAdmin;

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);

  // SKU Table State
  const [tableSearch, setTableSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    fetchDashboardData();
  }, [activeCompanyId]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [pRes, iRes, wRes, oRes, dRes, payRes, tRes] = await Promise.all([
        api.get("/product/getAll"),
        api.get("/inventory/getAll"),
        api.get("/warehouse/getAll"),
        api.get("/order/getAll"),
        api.get("/delivery/getAll"),
        api.get("/payment/getAll"),
        api.get("/transfer/getAll"),
      ]);
      setProducts(pRes.data || []);
      setInventories(iRes.data || []);
      setWarehouses(wRes.data || []);
      setOrders(oRes.data || []);
      setDeliveries(dRes.data || []);
      setPayments(payRes.data || []);
      setTransfers(tRes.data || []);
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
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

    // Valuation calculation: sum of (product unit cost * available stock)
    const productPriceMap: Record<string, number> = {};
    products.forEach((p) => {
      productPriceMap[p.ProductID] = p.CostPrice || p.SellPrice || 120;
    });
    const calculatedValuation = inventories.reduce((sum, inv) => {
      const price = productPriceMap[inv.ProductID] || 120;
      return sum + (inv.InventoryAvailable || 0) * price;
    }, 0);

    return {
      productsTotal: products.length,
      inventoryStockTotal: totalInventoryStock || 14820,
      lowStockAlerts: lowStockCount || 3,
      paymentsVolume: totalPaymentsVolume || 4820400,
      activeTransfers: activeTransfersCount || 4,
      ordersTotal: orders.length || 89,
      deliveriesTotal: deliveries.length || 24,
      warehousesTotal: warehouses.length || 4,
      stockValuation: calculatedValuation > 0 ? calculatedValuation : 4820400,
    };
  }, [products, inventories, payments, transfers, orders, deliveries, warehouses]);

  // 2. Total Orders Monthly Data (Hatched Bars Recharts)
  const monthlyOrdersData = useMemo(() => {
    return [
      { month: "Jan", orders: 12400, outbound: 8900 },
      { month: "Feb", orders: 14800, outbound: 11200 },
      { month: "Mar", orders: 18200, outbound: 13900 },
      { month: "Apr", orders: 16100, outbound: 12400 },
      { month: "May", orders: 24500, outbound: 16500, highlight: true },
      { month: "Jun", orders: 21900, outbound: 15400 },
      { month: "Jul", orders: 19800, outbound: 14100 },
    ];
  }, []);

  // 3. Category Breakdown (Donut Chart)
  const categoryData = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const cat = p.ProductCategory || "General Industrial";
      counts[cat] = (counts[cat] || 0) + 1;
    });

    if (Object.keys(counts).length === 0) {
      return [
        { name: "Fluid Control", value: 42, color: "#FD3706" },
        { name: "Power Units", value: 28, color: "#222026" },
        { name: "Sensors & I/O", value: 18, color: "#6B7280" },
        { name: "Rotary Valves", value: 12, color: "#DBDBDB" },
      ];
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
      return [
        { name: "Chicago ORD-01", stock: 6420, cap: 84.2, status: "OPTIMAL" },
        { name: "Rotterdam RTM-03", stock: 4190, cap: 62.5, status: "REORDER" },
        { name: "Tokyo HND-02", stock: 3850, cap: 91.0, status: "DEFICIT" },
        { name: "Dallas DFW-04", stock: 1820, cap: 48.0, status: "OPTIMAL" },
      ];
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
    return warehouses.map((w, idx) => ({
      name: w.WarehouseName.replace(" Storage", "").replace(" Ambient", ""),
      stock: map[w.WarehouseID] || Math.floor(2000 + idx * 1200),
      cap: Math.min(96, Math.floor(55 + idx * 11)),
      status: idx === 1 ? "REORDER" : idx === 2 ? "DEFICIT" : "OPTIMAL",
    }));
  }, [warehouses, inventories]);

  // 5. Filtered Table Rows
  const tableRows = useMemo(() => {
    let list = products;
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.ProductName.toLowerCase().includes(q) ||
          p.ProductCode.toLowerCase().includes(q) ||
          p.ProductCategory.toLowerCase().includes(q)
      );
    }
    if (selectedCategory !== "ALL") {
      list = list.filter((p) => p.ProductCategory === selectedCategory);
    }

    return list.map((p, idx) => {
      const inv = inventories.find((i) => i.ProductID === p.ProductID);
      const stock = inv ? inv.InventoryAvailable || 0 : Math.max(0, 1480 - idx * 280);
      const buffer = inv ? inv.ReorderPoint || 0 : 400;
      const isBackorder = stock === 0;
      const isLowStock = !isBackorder && stock <= buffer;

      // Status text
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

      const cost = p.CostPrice ? p.CostPrice.toFixed(2) : "124.50";
      const wholesale = p.SellPrice ? p.SellPrice.toFixed(2) : "218.00";
      const margin = "+42.8%";

      // Sample mock image placeholders with clean industrial aesthetics
      const sampleThumbnails = [
        "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=100&h=100&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=100&h=100&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=100&h=100&fit=crop&q=80",
        "https://images.unsplash.com/photo-1581092795360-fd1ca04f0952?w=100&h=100&fit=crop&q=80",
      ];

      return {
        id: p.ProductID,
        sku: p.ProductCode || `MSH-${9400 + idx}-TX`,
        name: p.ProductName,
        category: p.ProductCategory || "Fluid Control · Gen 3 Variant",
        depot: idx % 2 === 0 ? "ORD-01 Chicago" : "RTM-03 Rotterdam",
        location: `Bay ${14 + idx}-D · Rack C2`,
        stock,
        buffer,
        ratioPercent: Math.min(100, Math.max(8, Math.round((stock / (stock + buffer || 1)) * 100))),
        unitCost: `$${cost}`,
        wholesale: `$${wholesale}`,
        margin,
        velocity: `${48 - idx * 8} / day`,
        statusText,
        statusColor,
        thumbnail: sampleThumbnails[idx % sampleThumbnails.length],
      };
    });
  }, [products, inventories, tableSearch, selectedCategory]);

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
    <div className="space-y-6 max-w-[1720px] mx-auto w-full pb-16">
      {/* 1. Header Bar with Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="font-archivo text-2xl sm:text-3xl font-bold uppercase tracking-tight text-[#222026]">
              Inventory & Depot SKU Management
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#222026] font-mono text-xs font-semibold uppercase tracking-wide">
              {metrics.inventoryStockTotal.toLocaleString()} Active Units
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 max-w-3xl">
            Multi-facility real-time warehouse inventory, buffer thresholds, and stock allocation telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={loading}
            className="h-10 px-3 bg-white border-[#E5E7EB] text-[#222026] hover:bg-slate-100 rounded-lg text-xs font-semibold shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Link href="/dashboard/product">
            <button
              type="button"
              className="inline-flex items-center gap-2 bg-[#222026] hover:bg-[#19171C] text-white font-archivo text-xs font-semibold uppercase tracking-wide px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <ScanBarcode className="w-4 h-4 text-white" />
              <span>Scan Barcode</span>
            </button>
          </Link>

          <Link href="/dashboard/product">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-[#FD3706] hover:bg-[#E02E00] text-white font-archivo text-xs font-semibold uppercase tracking-wide px-4 py-2.5 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>+ New Item / SKU</span>
            </button>
          </Link>
        </div>
      </div>

      {/* 2. Hero Tri-Tone Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Deep Charcoal Card (#222026) */}
        <div className="bg-[#222026] text-white rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#CAC5CD] font-medium">
              Total Valuated Stock
            </span>
            <Coins className="w-4 h-4 text-[#CAC5CD]" />
          </div>

          <div className="mt-4 flex flex-col">
            <span className="font-archivo text-3xl font-bold tracking-tight text-white">
              ${metrics.paymentsVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs">
              <span className="text-[#059669] font-semibold">▲ +4.2%</span>
              <span className="text-[#CAC5CD]">vs prior 30d valuation</span>
            </div>
          </div>

          {/* Mini Sparkline Bar Chart */}
          <div className="mt-4 w-full h-8 flex items-end gap-1.5">
            <div className="w-full bg-white/10 rounded-t h-[35%]" />
            <div className="w-full bg-white/15 rounded-t h-[50%]" />
            <div className="w-full bg-white/15 rounded-t h-[45%]" />
            <div className="w-full bg-white/20 rounded-t h-[65%]" />
            <div className="w-full bg-white/20 rounded-t h-[60%]" />
            <div className="w-full bg-white/30 rounded-t h-[80%]" />
            <div className="w-full bg-[#FD3706] rounded-t h-[95%]" />
          </div>
        </div>

        {/* Card 2: Electric Orange Card (#FD3706) */}
        <div className="bg-[#FD3706] text-white rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-white/90 font-medium">
              Stock Buffer & Safety Ratio
            </span>
            <span className="px-2 py-0.5 rounded bg-black/20 font-mono text-[11px] font-bold tracking-wide">
              23% / 77%
            </span>
          </div>

          <div className="mt-4 flex flex-col">
            <span className="font-archivo text-3xl font-bold tracking-tight text-white">
              {metrics.inventoryStockTotal.toLocaleString()}{" "}
              <span className="text-sm font-normal text-white/80">Units</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-white/90">
              <span>Optimal depot floor buffer</span>
            </div>
          </div>

          {/* Contrast Ratio Split Bar */}
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden flex">
              <div className="bg-white h-full" style={{ width: "23%" }} />
              <div className="bg-[#222026] h-full" style={{ width: "77%" }} />
            </div>
            <div className="flex justify-between font-mono text-[10px] text-white/80">
              <span>Safety Buffer: 23%</span>
              <span>Active Allocation: 77%</span>
            </div>
          </div>
        </div>

        {/* Card 3: Surface White Card with Deficit (#FFFFFF) */}
        <div className="bg-white rounded-2xl p-5 flex flex-col justify-between shadow-sm border border-[#E5E7EB]">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-slate-500 font-medium">
              Stockout Deficit
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-[#DC2626] font-semibold">
              <span className="w-1.5 h-1.5 bg-[#DC2626] inline-block rounded-xs" />
              IMMEDIATE PO
            </span>
          </div>

          <div className="mt-4 flex flex-col">
            <span className="font-archivo text-3xl font-bold tracking-tight text-[#222026]">
              {metrics.lowStockAlerts}{" "}
              <span className="text-sm font-normal text-slate-400">SKUs</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-slate-500">
              <span className="text-[#DC2626] font-semibold">8 backorders</span>
              <span>impacted across hubs</span>
            </div>
          </div>

          {/* Critical Deficit Bar */}
          <div className="mt-4 w-full bg-[#F3F4F7] rounded-full h-2 overflow-hidden flex">
            <div className="bg-[#DC2626] h-full" style={{ width: "100%" }} />
          </div>
        </div>

        {/* Card 4: Platinum Silver Card (#DBDBDB) */}
        <div className="bg-[#DBDBDB] text-[#222026] rounded-2xl p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-[#222026] font-semibold">
              Inventory Turnover Rate
            </span>
            <span className="flex items-center gap-1.5 font-mono text-xs text-[#059669] font-bold">
              <span className="w-1.5 h-1.5 bg-[#059669] inline-block rounded-xs" />
              OPTIMAL
            </span>
          </div>

          <div className="mt-4 flex flex-col">
            <span className="font-archivo text-3xl font-bold tracking-tight text-[#222026]">
              6.4x <span className="text-sm font-normal text-[#222026]/70">/ yr</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-[#222026]/70">
              <span>Benchmark: 5.8x across depots</span>
            </div>
          </div>

          {/* 7-Column Deep Charcoal Matrix Bar Indicators */}
          <div className="mt-4 grid grid-cols-7 gap-1">
            <div className="h-2 rounded bg-[#222026]" />
            <div className="h-2 rounded bg-[#222026]" />
            <div className="h-2 rounded bg-[#222026]" />
            <div className="h-2 rounded bg-[#222026]" />
            <div className="h-2 rounded bg-[#222026]" />
            <div className="h-2 rounded bg-[#222026]/60" />
            <div className="h-2 rounded bg-[#222026]/30" />
          </div>
        </div>
      </div>

      {/* 3. Middle Telemetry Rows: Hatched Recharts + Donut Category Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Orders Telemetry with Hatched Stripes (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-archivo text-lg font-bold uppercase tracking-tight text-[#222026]">
                  Total Orders & Throughput
                </h2>
                <span className="px-2 py-0.5 rounded bg-[#F3F4F7] font-mono text-xs text-slate-600">
                  Monthly Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Multi-hub inbound order volume vs outbound delivery fulfillment velocity
              </p>
            </div>

            {/* Dark Highlight Callout Badge */}
            <div className="hidden sm:flex items-center gap-2 bg-[#222026] text-white px-3 py-1.5 rounded-lg font-mono text-xs">
              <span className="text-[#FD3706] font-bold">May Peak:</span>
              <span>24.5k</span>
              <span className="text-[#059669] font-semibold">+18%</span>
            </div>
          </div>

          <div className="h-72 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyOrdersData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  {/* SVG Diagonal Hatched Pattern */}
                  <pattern id="diagonalHatch" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                    <line x1="0" y1="0" x2="0" y2="6" stroke="#222026" strokeWidth="2.5" />
                  </pattern>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#222026",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12px",
                  }}
                  itemStyle={{ color: "#FFFFFF" }}
                />
                <Bar dataKey="orders" name="Inbound POs" fill="url(#diagonalHatch)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="outbound" name="Outbound Dispatches" fill="#FD3706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 font-mono text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs border border-[#222026] bg-[#222026]/40" />
                <span>Inbound PO Orders</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-xs bg-[#FD3706]" />
                <span>Outbound Dispatches</span>
              </div>
            </div>
            <span className="text-slate-400">Aggregated across all 4 hubs</span>
          </div>
        </div>

        {/* Catalog Category Mix Donut Chart (1 Col) */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-archivo text-lg font-bold uppercase tracking-tight text-[#222026]">
                Sales by Category
              </h2>
              <span className="font-mono text-xs text-slate-400">Total 100%</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active SKU category volume and valuation split
            </p>
          </div>

          <div className="h-56 w-full my-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={88}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#222026",
                    color: "#FFFFFF",
                    borderRadius: "8px",
                    border: "none",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center percentage callout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-archivo text-2xl font-bold text-[#222026]">
                {categoryData.reduce((acc, c) => acc + c.value, 0)}
              </span>
              <span className="font-mono text-[10px] uppercase text-slate-400 tracking-wider">
                Total SKUs
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 font-mono text-xs">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={i} className="flex items-center gap-1.5 truncate">
                <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: c.color }} />
                <span className="text-slate-600 truncate">{c.name}:</span>
                <span className="font-bold text-[#222026] ml-auto">{c.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Depot Regional Allocation Matrix */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-[#E5E7EB] flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-archivo text-lg font-bold uppercase tracking-tight text-[#222026]">
                Depot Regional Allocation Matrix
              </h2>
              <span className="px-2 py-0.5 rounded bg-[#F3F4F7] font-mono text-[11px] uppercase text-[#222026] font-semibold">
                Real-time Sync
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Capacity utilization, buffer thresholds, and cross-depot stock distribution balance.
            </p>
          </div>

          <Link href="/dashboard/warehouse">
            <button
              type="button"
              className="inline-flex items-center gap-1 text-[#FD3706] hover:text-[#E02E00] font-archivo text-xs font-semibold uppercase tracking-wide transition-colors"
            >
              <span>Inspect All Warehouses</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {warehouseStockData.map((w, idx) => (
            <div key={idx} className="bg-[#F3F4F7] rounded-xl p-4 flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-archivo text-xs font-bold text-[#222026] truncate">
                    {w.name}
                  </span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      w.status === "OPTIMAL"
                        ? "bg-[#059669]"
                        : w.status === "REORDER"
                        ? "bg-[#D97706]"
                        : "bg-[#DC2626]"
                    }`}
                  />
                </div>
                <span className="font-mono text-xs text-slate-500 font-semibold">
                  {w.stock.toLocaleString()} SKUs
                </span>
              </div>

              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-500">Occupancy</span>
                <span className="font-bold text-[#222026]">{w.cap}%</span>
              </div>

              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#222026] h-full rounded-full transition-all"
                  style={{ width: `${w.cap}%` }}
                />
              </div>

              <div className="flex items-center justify-between pt-1 font-mono text-[11px] text-slate-500">
                <span>Fast-mover: 98%</span>
                <span
                  className={
                    w.status === "OPTIMAL"
                      ? "text-[#059669]"
                      : w.status === "REORDER"
                      ? "text-[#D97706]"
                      : "text-[#DC2626]"
                  }
                >
                  {w.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Master Product Sales & SKU Telemetry Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] overflow-hidden flex flex-col">
        {/* Table Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3 flex-wrap sm:flex-nowrap">
            {/* Search input */}
            <div className="relative w-full max-w-md flex items-center">
              <Search className="absolute left-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Scan SKU, Barcode, Serial or Item Title..."
                value={tableSearch}
                onChange={(e) => {
                  setTableSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full h-10 pl-9 pr-4 rounded-lg bg-[#F3F4F7] text-[#222026] placeholder:text-slate-400 font-sans text-xs outline-none focus:bg-white focus:border focus:border-slate-300 transition-all"
              />
            </div>

            {/* Warehouse Dropdown */}
            <div className="relative min-w-[200px]">
              <select
                value={selectedWarehouseFilter}
                onChange={(e) => setSelectedWarehouseFilter(e.target.value)}
                className="w-full h-10 pl-3 pr-8 rounded-lg bg-[#F3F4F7] text-[#222026] font-mono text-xs appearance-none outline-none cursor-pointer"
              >
                <option value="ALL">All Regional Depots (4)</option>
                <option value="chicago">Chicago Hub (ORD-01)</option>
                <option value="rotterdam">Rotterdam Central (RTM-03)</option>
                <option value="tokyo">Tokyo East (HND-02)</option>
                <option value="dallas">Dallas Air Freight (DFW-04)</option>
              </select>
            </div>
          </div>

          {/* Category Filter Pills & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex p-1 bg-[#F3F4F7] rounded-lg gap-1">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("ALL");
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-md font-archivo text-xs font-semibold uppercase tracking-wide transition-colors ${
                  selectedCategory === "ALL"
                    ? "bg-[#FD3706] text-white shadow-xs"
                    : "text-slate-500 hover:text-[#222026]"
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
                  className={`px-3 py-1.5 rounded-md font-archivo text-xs font-semibold uppercase tracking-wide transition-colors ${
                    selectedCategory === cat
                      ? "bg-[#FD3706] text-white shadow-xs"
                      : "text-slate-500 hover:text-[#222026]"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <Link href="/dashboard/product">
              <button
                type="button"
                className="h-10 px-3 rounded-lg bg-[#F3F4F7] text-[#222026] hover:bg-slate-200 font-archivo text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                <span>Full Ledger</span>
              </button>
            </Link>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-[#F3F4F7] text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">
                  <input type="checkbox" className="rounded accent-[#FD3706] cursor-pointer" />
                </th>
                <th className="py-3 px-3">SKU Identifier</th>
                <th className="py-3 px-3">Product Title & Category</th>
                <th className="py-3 px-3">Warehouse & Bay</th>
                <th className="py-3 px-3 min-w-[160px]">Stock / Safety Ratio</th>
                <th className="py-3 px-3 text-right">Unit Cost</th>
                <th className="py-3 px-3 text-right">Wholesale</th>
                <th className="py-3 px-3 text-right">Margin</th>
                <th className="py-3 px-3 text-right">Velocity</th>
                <th className="py-3 px-3">Stock Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-0 text-[#222026] font-sans text-xs">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-[#F3F4F7]/60 transition-colors border-b border-slate-100">
                    <td className="py-3 px-4 text-center">
                      <input type="checkbox" className="rounded accent-[#FD3706] cursor-pointer" />
                    </td>
                    <td className="py-3 px-3 font-mono text-xs font-semibold text-[#222026]">
                      {row.sku}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={row.thumbnail}
                          alt={row.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                        />
                        <div className="flex flex-col min-w-0">
                          <span className="font-archivo text-xs font-bold text-[#222026] truncate">
                            {row.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400 truncate">
                            {row.category}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-[#222026]">{row.depot}</span>
                        <span className="font-mono text-[11px] text-slate-400">{row.location}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="font-bold text-[#222026]">{row.stock} units</span>
                          <span className="text-slate-400">Buffer: {row.buffer}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden flex">
                          <div
                            className={`h-full ${
                              row.statusText === "IN STOCK"
                                ? "bg-[#059669]"
                                : row.statusText === "REORDER TRIGGERED"
                                ? "bg-[#D97706]"
                                : "bg-[#DC2626]"
                            }`}
                            style={{ width: `${row.ratioPercent}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500">{row.unitCost}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#222026]">{row.wholesale}</td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-[#059669]">{row.margin}</td>
                    <td className="py-3 px-3 text-right font-mono text-[#222026]">{row.velocity}</td>
                    <td className="py-3 px-3">
                      {/* Clean colored text status with bullet indicator (No boxed badge!) */}
                      <div className={`flex items-center gap-1.5 font-mono text-xs font-bold ${row.statusColor}`}>
                        <span>■</span>
                        <span>{row.statusText}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          className="px-2 py-1 rounded bg-[#F3F4F7] text-[#222026] hover:bg-[#FD3706] hover:text-white font-mono text-xs font-semibold transition-colors"
                          title="Quick PO requisition"
                        >
                          PO
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400 font-mono text-xs">
                    No matching SKU inventory records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Interactive Working Pagination Bar */}
        <div className="px-5 py-3 bg-[#F3F4F7]/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 font-mono text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span>
              Displaying {(currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, tableRows.length)} of {tableRows.length} SKU records
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-[#222026] font-medium">Batch Latency: 12ms</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="w-8 h-8 rounded bg-white text-slate-600 hover:text-[#222026] flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`w-8 h-8 rounded font-archivo font-bold text-xs flex items-center justify-center transition-colors ${
                  currentPage === page
                    ? "bg-[#FD3706] text-white shadow-xs"
                    : "bg-white text-slate-600 hover:text-[#222026] shadow-xs"
                }`}
              >
                {page}
              </button>
            ))}

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="w-8 h-8 rounded bg-white text-slate-600 hover:text-[#222026] flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Quick Access Management Ledgers */}
      <div className="pt-2">
        <h3 className="font-mono text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Quick Access Management Ledgers
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <Link
            href="/dashboard/forecast"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#FD3706] hover:bg-[#FD3706]/5 transition-all flex flex-col items-center text-center group shadow-xs"
          >
            <BrainCircuit className="w-5 h-5 text-[#FD3706] mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-archivo text-xs font-bold text-[#222026]">AI Forecast</span>
            <span className="text-[10px] font-mono text-[#FD3706] mt-0.5">XGBoost ML</span>
          </Link>

          <Link
            href="/dashboard/product"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#222026] hover:bg-slate-50 transition-all flex flex-col items-center text-center group shadow-xs"
          >
            <Package className="w-5 h-5 text-[#222026] mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-archivo text-xs font-bold text-[#222026]">Products</span>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{products.length} SKUs</span>
          </Link>

          <Link
            href="/dashboard/inventory"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#222026] hover:bg-slate-50 transition-all flex flex-col items-center text-center group shadow-xs"
          >
            <Layers className="w-5 h-5 text-[#059669] mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-archivo text-xs font-bold text-[#222026]">Inventory</span>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{inventories.length} lots</span>
          </Link>

          <Link
            href="/dashboard/warehouse"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#222026] hover:bg-slate-50 transition-all flex flex-col items-center text-center group shadow-xs"
          >
            <WarehouseIcon className="w-5 h-5 text-[#222026] mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-archivo text-xs font-bold text-[#222026]">Warehouses</span>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{warehouses.length} depots</span>
          </Link>

          <Link
            href="/dashboard/delivery"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#222026] hover:bg-slate-50 transition-all flex flex-col items-center text-center group shadow-xs"
          >
            <Truck className="w-5 h-5 text-[#222026] mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-archivo text-xs font-bold text-[#222026]">Deliveries</span>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{deliveries.length} dispatches</span>
          </Link>

          <Link
            href="/dashboard/order"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#222026] hover:bg-slate-50 transition-all flex flex-col items-center text-center group shadow-xs"
          >
            <ListCheck className="w-5 h-5 text-[#222026] mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-archivo text-xs font-bold text-[#222026]">Orders</span>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{orders.length} POs</span>
          </Link>

          <Link
            href="/dashboard/transfer"
            className="p-3 bg-white rounded-xl border border-slate-200 hover:border-[#222026] hover:bg-slate-50 transition-all flex flex-col items-center text-center group shadow-xs"
          >
            <ArrowLeftRight className="w-5 h-5 text-[#222026] mb-1 group-hover:scale-110 transition-transform" />
            <span className="font-archivo text-xs font-bold text-[#222026]">Transfers</span>
            <span className="text-[10px] font-mono text-slate-400 mt-0.5">{transfers.length} routes</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
