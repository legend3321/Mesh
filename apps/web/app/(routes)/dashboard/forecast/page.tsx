"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Zap,
  RefreshCw,
  Clock,
  ArrowRight,
  Sliders,
  X,
  Search,
  DollarSign,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
} from "recharts";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useCompany } from "@/app/components/CompanyContext";
import Link from "next/link";
import type {
  StockoutForecastItem,
  ForecastSummary,
  RiskLevel,
  AutoPOResultItem,
} from "@mesh/types";

const FEATURE_LABELS: Record<string, string> = {
  currentStock: "Current stock level",
  dailyVelocity: "Daily burn rate",
  reorderPoint: "Reorder trigger threshold",
  leadTimeDays: "Supplier lead time",
  stockCoverageRatio: "Stock coverage ratio",
  minStockLevel: "Safety buffer level",
  pendingOrdersCount: "Open orders volume",
};

const formatFeatureLabel = (key: string) => {
  if (FEATURE_LABELS[key]) return FEATURE_LABELS[key];
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
};

export default function StockoutForecastPage() {
  const { currentCompany, activeCompanyId, isAllCompanies } = useCompany();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<StockoutForecastItem[]>([]);
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [selectedItem, setSelectedItem] = useState<StockoutForecastItem | null>(null);

  // Filter tab
  const [filterTab, setFilterTab] = useState<"ALL" | "CRITICAL" | "WARNING" | "SAFE">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Auto-PO actions
  const [replenishingAll, setReplenishingAll] = useState(false);
  const [replenishingSingleId, setReplenishingSingleId] = useState<string | null>(null);
  const [recentGeneratedOrders, setRecentGeneratedOrders] = useState<AutoPOResultItem[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const q = params.get("q");
      if (q) setSearchQuery(q);
    }
  }, []);

  useEffect(() => {
    fetchForecast();
  }, [activeCompanyId]);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const res = await api.get("/forecast/stockout-risk");
      if (res.data?.status === "success") {
        setItems(res.data.items || []);
        setSummary(res.data.summary || null);
        if (selectedItem) {
          const found = (res.data.items || []).find(
            (i: StockoutForecastItem) => i.inventoryId === selectedItem.inventoryId
          );
          setSelectedItem(found || null);
        }
      }
    } catch (err: any) {
      console.error("Forecast load error:", err);
      toast({
        title: "Forecaster service notice",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Execute Auto-PO for Single SKU
  const handleSingleAutoPO = async (item: StockoutForecastItem) => {
    try {
      setReplenishingSingleId(item.inventoryId);
      const res = await api.post("/forecast/auto-po", {
        inventoryIds: [item.inventoryId],
      });

      if (res.data?.success && res.data?.orders?.length > 0) {
        toast({
          title: "Purchase order generated",
          description: `Generated PO #${res.data.orders[0].orderId.slice(-6).toUpperCase()} for ${item.productCode} (${item.recommendedReorderQty} units, $${res.data.orders[0].totalCost.toLocaleString()}).`,
        });
        setRecentGeneratedOrders((prev) => [...res.data.orders, ...prev]);
        await fetchForecast();
      } else {
        toast({
          title: "Replenishment status",
          description: res.data?.message || "Item is currently adequately stocked.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Purchase order failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setReplenishingSingleId(null);
    }
  };

  // Execute Batch Auto-Replenishment for All Critical SKUs
  const handleBatchAutoPO = async () => {
    const criticalItems = items.filter((i) => i.riskLevel === "CRITICAL");
    if (criticalItems.length === 0) {
      toast({
        title: "No critical deficits",
        description: "All catalog SKUs currently maintain adequate stock runway.",
      });
      return;
    }

    const estimatedTotal = criticalItems.reduce(
      (sum, i) => sum + i.estimatedReplenishmentCost,
      0
    );

    if (
      !confirm(
        `Execute purchase order batch for ${criticalItems.length} critical items?\nEstimated capital commitment: $${estimatedTotal.toLocaleString()}`
      )
    ) {
      return;
    }

    try {
      setReplenishingAll(true);
      const res = await api.post("/forecast/auto-po", {
        batch: true,
      });

      if (res.data?.success) {
        toast({
          title: "Autonomous replenishment executed",
          description: res.data.message,
        });
        setRecentGeneratedOrders(res.data.orders || []);
        await fetchForecast();
      }
    } catch (err: any) {
      toast({
        title: "Batch auto-PO failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setReplenishingAll(false);
    }
  };

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesTab = filterTab === "ALL" ? true : item.riskLevel === filterTab;
      const matchesSearch =
        searchQuery === "" ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.productCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.warehouseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTab && matchesSearch;
    });
  }, [items, filterTab, searchQuery]);

  // Chart 1: Feature Importances from XGBoost
  const featureImportanceData = useMemo(() => {
    if (!summary?.modelMetadata?.topFeatureImportances) return [];
    return Object.entries(summary.modelMetadata.topFeatureImportances)
      .map(([name, weight]) => ({
        feature: formatFeatureLabel(name),
        weight: Math.round(weight * 1000) / 10,
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [summary]);

  // Chart 2: Inventory Health Distribution
  const healthDistributionData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Critical (< 7d)", value: summary.criticalSkusCount, color: "#f43f5e" },
      { name: "Warning (7-14d)", value: summary.warningSkusCount, color: "#f59e0b" },
      { name: "Sufficient (> 14d)", value: summary.safeSkusCount, color: "#10b981" },
    ].filter((d) => d.value > 0);
  }, [summary]);

  return (
    <div className="space-y-6 max-w-[1720px] mx-auto w-full pb-16">
      <Toaster />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
              Demand &amp; stockout forecaster
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-[11px] tabular-nums">
              XGB-3.4.1 &bull; SKL-1.9.1
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-[11px]">
              {isAllCompanies
                ? "Global tenant scope"
                : currentCompany?.companyName || "Active tenant"}
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Machine learning pipeline predicting SKU stockout probabilities, runway exhaustion, and automated replenishment dispatch.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchForecast}
            disabled={loading}
            className="h-9 px-3 bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 rounded-lg text-xs font-medium shadow-2xs whitespace-nowrap cursor-pointer transition-colors duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
            <span>Re-evaluate telemetry</span>
          </Button>

          <button
            type="button"
            onClick={handleBatchAutoPO}
            disabled={loading || replenishingAll || (summary?.criticalSkusCount ?? 0) === 0}
            className="h-9 px-3.5 rounded-lg bg-[#FD3706] hover:bg-[#E02E00] text-white text-xs font-medium flex items-center gap-1.5 shadow-2xs disabled:opacity-50 whitespace-nowrap cursor-pointer transition-colors duration-150"
          >
            <Zap className={`w-3.5 h-3.5 ${replenishingAll ? "animate-spin" : ""}`} />
            <span>{replenishingAll ? "Generating PO batch..." : "Execute auto-PO (All critical)"}</span>
          </button>
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Deficits */}
        <div className="bg-white rounded-xl p-5 min-h-[148px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              Critical deficits
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] font-medium text-rose-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span>Immediate action</span>
            </span>
          </div>
          <div className="my-1.5 flex flex-col">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
              {summary?.criticalSkusCount ?? 0}{" "}
              <span className="text-sm font-normal text-zinc-400">SKUs</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
              <span>Depletion runway &lt; supplier lead time</span>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Threshold breach</span>
            <span className="text-zinc-600 font-medium">&lt; 7 days runway</span>
          </div>
        </div>

        {/* Card 2: Capital at Risk */}
        <div className="bg-white rounded-xl p-5 min-h-[148px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              Capital at risk
            </span>
            <DollarSign className="w-4 h-4 text-zinc-400 shrink-0" />
          </div>
          <div className="my-1.5 flex flex-col">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
              ${(summary?.projectedStockoutValue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
              <span>Unfulfilled demand exposure</span>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Valuation index</span>
            <span className="text-zinc-600 font-medium">USD base</span>
          </div>
        </div>

        {/* Card 3: Fleet Runway Coverage */}
        <div className="bg-white rounded-xl p-5 min-h-[148px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              Fleet runway coverage
            </span>
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
          </div>
          <div className="my-1.5 flex flex-col">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
              {summary?.averageDaysOfCoverage ?? 0}{" "}
              <span className="text-sm font-normal text-zinc-400">Days</span>
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
              <span>Across {summary?.totalSkusEvaluated ?? 0} catalog SKUs</span>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Burn calculation</span>
            <span className="text-zinc-600 font-medium">Daily velocity</span>
          </div>
        </div>

        {/* Card 4: Model Telemetry */}
        <div className="bg-white rounded-xl p-5 min-h-[148px] flex flex-col justify-between shadow-2xs border border-zinc-200/80">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-500">
              Model telemetry
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="my-1.5 flex flex-col">
            <span className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-900 font-mono tabular-nums">
              {Math.round((summary?.modelMetadata?.confidenceScore ?? 0.94) * 100)}%
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-500">
              <span>Ensemble fit confidence</span>
            </div>
          </div>
          <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400 font-mono">
            <span>Lead time assumed</span>
            <span className="text-zinc-600 font-medium font-mono tabular-nums">
              {summary?.modelMetadata?.leadTimeAssumedDays ?? 5}d standard
            </span>
          </div>
        </div>
      </div>

      {/* Recently Generated Orders Notice (if any) */}
      {recentGeneratedOrders.length > 0 && (
        <div className="bg-white border border-zinc-200/80 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-zinc-900">
                {recentGeneratedOrders.length} automated purchase order(s) dispatched
              </p>
              <p className="text-xs text-zinc-500">
                Generated orders have been transmitted to suppliers and registered in the orders ledger.
              </p>
            </div>
          </div>
          <Link href="/dashboard/order">
            <Button size="sm" variant="outline" className="h-8 text-xs border-zinc-200 text-zinc-800 bg-white hover:bg-zinc-50 gap-1.5 rounded-lg shadow-2xs transition-colors duration-150">
              <span>View orders ledger</span>
              <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
            </Button>
          </Link>
        </div>
      )}

      {/* Visualizations: Feature Attributions & Risk Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* XGBoost Feature Attribution Weights */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-zinc-200/80 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-zinc-500" />
                Model feature attributions
              </h2>
              <p className="text-xs text-zinc-500">
                Relative weight factors driving stockout risk classification
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-600">
              Normalized impurity gain
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureImportanceData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: "#71717a" }} stroke="#e4e4e7" />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={{ fontSize: 11, fill: "#3f3f46" }}
                  stroke="#e4e4e7"
                  width={140}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Attribution weight"]}
                  contentStyle={{
                    backgroundColor: "#18181b",
                    borderColor: "#27272a",
                    borderRadius: "8px",
                    color: "#fafafa",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {featureImportanceData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#FD3706" : "#71717a"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Inventory Health Breakdown */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-zinc-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 mb-0.5">
              Stockout risk breakdown
            </h2>
            <p className="text-xs text-zinc-500 mb-4">
              Catalog split by remaining days of coverage
            </p>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={66}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {healthDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      borderColor: "#27272a",
                      borderRadius: "8px",
                      color: "#fafafa",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-zinc-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                Critical (&lt; 7 days)
              </span>
              <span className="font-mono tabular-nums font-medium text-zinc-900">
                {summary?.criticalSkusCount ?? 0} SKUs
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                Warning (7–14 days)
              </span>
              <span className="font-mono tabular-nums font-medium text-zinc-900">
                {summary?.warningSkusCount ?? 0} SKUs
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-zinc-600">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                Sufficient (&gt; 14 days)
              </span>
              <span className="font-mono tabular-nums font-medium text-zinc-900">
                {summary?.safeSkusCount ?? 0} SKUs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SKU Replenishment Queue & Action Ledger */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 cursor-pointer ${
                filterTab === "ALL"
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70"
              }`}
            >
              All items ({items.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("CRITICAL")}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
                filterTab === "CRITICAL"
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span>Critical ({summary?.criticalSkusCount ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("WARNING")}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
                filterTab === "WARNING"
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Warning ({summary?.warningSkusCount ?? 0})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("SAFE")}
              className={`h-8 px-3 rounded-lg text-xs font-medium transition-colors duration-150 flex items-center gap-1.5 cursor-pointer ${
                filterTab === "SAFE"
                  ? "bg-zinc-900 text-white shadow-2xs"
                  : "bg-zinc-100/80 text-zinc-600 hover:bg-zinc-200/70"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Sufficient ({summary?.safeSkusCount ?? 0})</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU or facility..."
              className="h-8 text-xs pl-8 pr-3 py-1 rounded-lg border border-zinc-200 w-full sm:w-60 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-colors"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-600 font-medium text-xs">
              <tr>
                <th className="py-3 px-3.5 font-medium">SKU / Designation</th>
                <th className="py-3 px-3.5 font-medium">Facility</th>
                <th className="py-3 px-3.5 font-medium">Stock / Buffer</th>
                <th className="py-3 px-3.5 font-medium">Daily burn</th>
                <th className="py-3 px-3.5 font-medium">Runway</th>
                <th className="py-3 px-3.5 font-medium">Risk score</th>
                <th className="py-3 px-3.5 font-medium">Replenishment order</th>
                <th className="py-3 px-3.5 text-right font-medium">Autonomous action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-zinc-400 font-mono text-xs">
                    No SKU records match the selected filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isCritical = item.riskLevel === "CRITICAL";
                  const isWarning = item.riskLevel === "WARNING";
                  const isReplenishing = replenishingSingleId === item.inventoryId;

                  return (
                    <tr
                      key={item.inventoryId}
                      onClick={() => setSelectedItem(item)}
                      className="hover:bg-zinc-50/80 cursor-pointer transition-colors duration-150"
                    >
                      {/* Product Name & Code */}
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-[10px] text-zinc-600 bg-zinc-100 border border-zinc-200 px-1.5 py-0.5 rounded shrink-0">
                            {item.productCode.slice(0, 3)}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 truncate max-w-[200px]">
                              {item.productName}
                            </p>
                            <span className="font-mono text-[10px] text-zinc-400">
                              {item.productCode} &bull; {item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-3.5 text-zinc-700">
                        <span className="font-mono text-xs truncate max-w-[140px] block">
                          {item.warehouseName}
                        </span>
                      </td>

                      {/* Stock Level vs Reorder Point */}
                      <td className="py-3 px-3.5">
                        <div>
                          <div className="flex items-baseline gap-1 font-mono text-xs tabular-nums text-zinc-900">
                            <span className={isCritical ? "font-semibold text-rose-600" : "font-medium"}>
                              {item.currentStock.toLocaleString()}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-normal">
                              / ROP {item.reorderPoint.toLocaleString()}
                            </span>
                          </div>
                          <div className="w-24 bg-zinc-100 rounded-full h-1 mt-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isCritical
                                  ? "bg-[#FD3706]"
                                  : isWarning
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.round((item.currentStock / Math.max(1, item.reorderPoint * 2)) * 100)
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Velocity */}
                      <td className="py-3 px-3.5">
                        <span className="font-mono text-xs tabular-nums font-medium text-zinc-800">
                          {item.dailyVelocity}
                        </span>
                        <span className="font-mono text-[11px] text-zinc-400"> u/day</span>
                      </td>

                      {/* Predicted Days Left */}
                      <td className="py-3 px-3.5">
                        <span
                          className={`font-mono text-xs tabular-nums ${
                            isCritical
                              ? "font-semibold text-rose-600"
                              : isWarning
                              ? "font-semibold text-amber-600"
                              : "font-medium text-zinc-700"
                          }`}
                        >
                          {item.predictedDaysToStockout}d
                        </span>
                      </td>

                      {/* Risk Probability */}
                      <td className="py-3 px-3.5">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs tabular-nums">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              isCritical
                                ? "bg-rose-500"
                                : isWarning
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                            }`}
                          />
                          <span className="font-medium text-zinc-900">
                            {Math.round(item.stockoutRisk * 100)}%
                          </span>
                          <span className="text-[10px] text-zinc-400 uppercase tracking-wider">
                            {item.riskLevel}
                          </span>
                        </div>
                      </td>

                      {/* Recommended Qty & Estimated Cost */}
                      <td className="py-3 px-3.5">
                        <div>
                          <p className="font-mono text-xs tabular-nums font-medium text-zinc-900">
                            +{item.recommendedReorderQty.toLocaleString()}{" "}
                            <span className="text-[11px] font-normal text-zinc-400">units</span>
                          </p>
                          <p className="font-mono text-[11px] tabular-nums text-zinc-400">
                            ${item.estimatedReplenishmentCost.toLocaleString()} est.
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleSingleAutoPO(item)}
                            disabled={isReplenishing}
                            className={`h-7 px-2.5 rounded-md text-xs font-medium gap-1.5 inline-flex items-center shadow-2xs transition-colors duration-150 cursor-pointer disabled:opacity-50 ${
                              isCritical
                                ? "bg-[#FD3706] hover:bg-[#E02E00] text-white"
                                : "bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200"
                            }`}
                          >
                            <Zap className={`w-3 h-3 ${isReplenishing ? "animate-spin" : ""}`} />
                            <span>{isReplenishing ? "Ordering..." : "Auto-PO"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Explainability Right Drawer */}
      {selectedItem && (
        <>
          <div
            className="fixed inset-0 bg-zinc-900/30 backdrop-blur-2xs z-40 transition-opacity"
            onClick={() => setSelectedItem(null)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-xl border-l border-zinc-200 flex flex-col animate-in slide-in-from-right duration-150">
            {/* Drawer Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                  {selectedItem.productCode}
                </span>
                <h2 className="text-base font-semibold text-zinc-900 mt-1.5">
                  {selectedItem.productName}
                </h2>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  Facility: {selectedItem.warehouseName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors duration-150 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Risk Card */}
              <div className="bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        selectedItem.riskLevel === "CRITICAL"
                          ? "bg-rose-500"
                          : selectedItem.riskLevel === "WARNING"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                    />
                    <span className="text-xs font-medium text-zinc-700">
                      Stockout risk index ({selectedItem.riskLevel.toLowerCase()})
                    </span>
                  </div>
                  <span className="font-mono tabular-nums text-lg font-semibold text-zinc-900">
                    {Math.round(selectedItem.stockoutRisk * 100)}%
                  </span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {selectedItem.riskLevel === "CRITICAL"
                    ? `Estimated zero-stockout in ${selectedItem.predictedDaysToStockout} days breaches standard supplier lead time window of ${selectedItem.leadTimeDays} days.`
                    : `Inventory runway covers ${selectedItem.daysOfCoverage} days of expected consumption demand.`}
                </p>
              </div>

              {/* Inventory Telemetry */}
              <div className="bg-white p-4 rounded-xl border border-zinc-200/80 space-y-2.5 shadow-2xs">
                <h3 className="text-xs font-semibold text-zinc-900">
                  Inventory telemetry &amp; buffer parameters
                </h3>
                <div className="flex justify-between py-1.5 border-b border-zinc-100 text-xs">
                  <span className="text-zinc-500">Available stock</span>
                  <span className="font-mono tabular-nums font-medium text-zinc-900">
                    {selectedItem.currentStock.toLocaleString()} units
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100 text-xs">
                  <span className="text-zinc-500">Reorder trigger threshold</span>
                  <span className="font-mono tabular-nums font-medium text-zinc-900">
                    {selectedItem.reorderPoint.toLocaleString()} units
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100 text-xs">
                  <span className="text-zinc-500">Safety buffer level</span>
                  <span className="font-mono tabular-nums font-medium text-zinc-900">
                    {selectedItem.minStockLevel.toLocaleString()} units
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-100 text-xs">
                  <span className="text-zinc-500">Consumption burn rate</span>
                  <span className="font-mono tabular-nums font-medium text-zinc-900">
                    {selectedItem.dailyVelocity} units/day
                  </span>
                </div>
                <div className="flex justify-between py-1.5 text-xs">
                  <span className="text-zinc-500">Supplier lead time</span>
                  <span className="font-mono tabular-nums font-medium text-zinc-900">
                    {selectedItem.leadTimeDays} days
                  </span>
                </div>
              </div>

              {/* Autonomous Replenishment Recommendation */}
              <div className="bg-zinc-50/70 p-4 rounded-xl border border-zinc-200/80 space-y-2.5">
                <h3 className="text-xs font-semibold text-zinc-900 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-[#FD3706]" />
                  <span>Autonomous replenishment parameters</span>
                </h3>
                <div className="flex justify-between py-1.5 border-b border-zinc-200/60 text-xs">
                  <span className="text-zinc-500">Recommended order quantity</span>
                  <span className="font-mono tabular-nums font-semibold text-zinc-900">
                    +{selectedItem.recommendedReorderQty.toLocaleString()} units
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200/60 text-xs">
                  <span className="text-zinc-500">Unit cost price</span>
                  <span className="font-mono tabular-nums font-medium text-zinc-900">
                    ${selectedItem.unitCost.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-zinc-200/60 text-xs">
                  <span className="text-zinc-500">Committed capital</span>
                  <span className="font-mono tabular-nums font-semibold text-zinc-900">
                    ${selectedItem.estimatedReplenishmentCost.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 text-xs">
                  <span className="text-zinc-500">Certified supplier</span>
                  <span className="font-mono text-zinc-800 truncate max-w-[200px]">
                    {selectedItem.preferredProviderName || "Designated Primary Supplier"}
                  </span>
                </div>
              </div>

              {/* Quick Action Button */}
              <button
                type="button"
                onClick={() => handleSingleAutoPO(selectedItem)}
                disabled={replenishingSingleId === selectedItem.inventoryId}
                className="w-full h-10 rounded-lg bg-[#FD3706] hover:bg-[#E02E00] text-white text-xs font-medium flex items-center justify-center gap-2 shadow-2xs transition-colors duration-150 cursor-pointer disabled:opacity-50"
              >
                <Zap className={`w-3.5 h-3.5 ${replenishingSingleId === selectedItem.inventoryId ? "animate-spin" : ""}`} />
                <span>
                  {replenishingSingleId === selectedItem.inventoryId
                    ? "Transmitting purchase order..."
                    : `Dispatch purchase order (+${selectedItem.recommendedReorderQty.toLocaleString()} units)`}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
