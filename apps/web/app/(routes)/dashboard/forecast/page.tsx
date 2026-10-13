"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import {
  BrainCircuit,
  AlertTriangle,
  Zap,
  TrendingDown,
  RefreshCw,
  Package,
  Warehouse,
  CheckCircle2,
  DollarSign,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Sliders,
  ExternalLink,
  ChevronRight,
  X,
  Layers,
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
  Legend,
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
        title: "Forecaster Service Warning",
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
          title: "Automated Purchase Order Created! 🚀",
          description: `Generated PO #${res.data.orders[0].orderId.slice(-6).toUpperCase()} for ${item.productCode} (${item.recommendedReorderQty} units, $${res.data.orders[0].totalCost.toLocaleString()}).`,
        });
        setRecentGeneratedOrders((prev) => [...res.data.orders, ...prev]);
        await fetchForecast();
      } else {
        toast({
          title: "Replenishment Notice",
          description: res.data?.message || "Item is already adequately stocked.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Failed to generate Purchase Order",
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
        title: "No Critical Risks",
        description: "All SKUs currently have sufficient stock runway.",
      });
      return;
    }

    const estimatedTotal = criticalItems.reduce(
      (sum, i) => sum + i.estimatedReplenishmentCost,
      0
    );

    if (
      !confirm(
        `Execute automated purchase order batch for ${criticalItems.length} critical SKU(s)?\nTotal Estimated Capital: $${estimatedTotal.toLocaleString()}`
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
          title: "AI Auto-Replenishment Executed! ⚡",
          description: res.data.message,
        });
        setRecentGeneratedOrders(res.data.orders || []);
        await fetchForecast();
      }
    } catch (err: any) {
      toast({
        title: "Auto-PO Execution Failed",
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
        feature: name,
        weight: Math.round(weight * 1000) / 10, // percentage
      }))
      .sort((a, b) => b.weight - a.weight);
  }, [summary]);

  // Chart 2: Inventory Health Distribution
  const healthDistributionData = useMemo(() => {
    if (!summary) return [];
    return [
      { name: "Critical (< 7d)", value: summary.criticalSkusCount, color: "#EF4444" },
      { name: "Warning (< 14d)", value: summary.warningSkusCount, color: "#F59E0B" },
      { name: "Safe (> 14d)", value: summary.safeSkusCount, color: "#10B981" },
    ].filter((d) => d.value > 0);
  }, [summary]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <BrainCircuit className="w-6 h-6 text-blue-600" />
              AI Stockout Risk Forecaster &amp; Auto-PO
            </h1>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              XGBoost 3.4.1 &bull; Scikit-Learn 1.9.1
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {isAllCompanies
                ? "Global Tenant Scope"
                : currentCompany?.companyName || "Active Tenant"}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Machine learning pipeline predicting SKU stockout probabilities, runway exhaustion, and automated purchase order dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchForecast}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-slate-700 bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Re-evaluate Telemetry
          </Button>

          <Button
            size="sm"
            onClick={handleBatchAutoPO}
            disabled={loading || replenishingAll || (summary?.criticalSkusCount ?? 0) === 0}
            className="h-9 gap-1.5 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-md shadow-blue-600/20"
          >
            <Zap className={`w-3.5 h-3.5 ${replenishingAll ? "animate-spin" : ""}`} />
            {replenishingAll ? "Generating PO Batch..." : "Execute AI Auto-PO (All Critical)"}
          </Button>
        </div>
      </div>

      {/* Top Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Critical Alerts */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Critical Stockouts
              </span>
              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-600">
                {summary?.criticalSkusCount ?? 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">SKUs &lt; lead time</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-red-600 font-medium pt-2 border-t border-slate-100">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
            <span className="truncate">Immediate procurement required</span>
          </div>
        </div>

        {/* Card 2: Projected Value at Risk */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                At-Risk Capital
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                ${(summary?.projectedStockoutValue ?? 0).toLocaleString()}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 truncate">
            Inventory valuation on critical items
          </p>
        </div>

        {/* Card 3: Average Runway Days */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Average Runway
              </span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {summary?.averageDaysOfCoverage ?? 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">Days</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 truncate">
            Across {summary?.totalSkusEvaluated ?? 0} total tenant SKUs
          </p>
        </div>

        {/* Card 4: Model Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                ML Model Confidence
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">
                {Math.round((summary?.modelMetadata?.confidenceScore ?? 0.94) * 100)}%
              </span>
              <span className="text-xs text-slate-500 font-medium">Ensemble Fit</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 font-mono truncate">
            Lead Time: {summary?.modelMetadata?.leadTimeAssumedDays ?? 5}d
          </p>
        </div>
      </div>

      {/* Recently Generated Orders Banner (if any) */}
      {recentGeneratedOrders.length > 0 && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-900">
                {recentGeneratedOrders.length} Automated Purchase Order(s) Dispatched
              </p>
              <p className="text-xs text-emerald-700">
                Created POs have been sent to suppliers and registered in the Order &amp; Transaction ledgers.
              </p>
            </div>
          </div>
          <Link href="/dashboard/order">
            <Button size="sm" variant="outline" className="text-xs border-emerald-300 text-emerald-800 bg-white gap-1.5">
              <span>View Orders Ledger</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>
      )}

      {/* Charts Section: XGBoost Feature Importance & Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* XGBoost Feature Attribution Weights */}
        <div className="lg:col-span-8 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" />
                XGBoost Model Feature Attributions (Explainability)
              </h2>
              <p className="text-xs text-slate-500">
                Learned relative weight factors driving stockout risk classification
              </p>
            </div>
            <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600">
              Normalized Impurity Gain
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={featureImportanceData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                <XAxis type="number" unit="%" tick={{ fontSize: 11, fill: "#64748B" }} />
                <YAxis
                  type="category"
                  dataKey="feature"
                  tick={{ fontSize: 11, fill: "#334155" }}
                  width={130}
                />
                <Tooltip
                  formatter={(val: any) => [`${val}%`, "Importance Weight"]}
                  contentStyle={{
                    backgroundColor: "#0F172A",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#fff",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="weight" fill="#2563EB" radius={[0, 4, 4, 0]}>
                  {featureImportanceData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#2563EB" : index === 1 ? "#3B82F6" : "#60A5FA"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut Chart: Inventory Health Breakdown */}
        <div className="lg:col-span-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Stockout Risk Breakdown
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Tenant catalog split by days of runway remaining
            </p>
            <div className="h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {healthDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0F172A",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                Critical (&lt; 7 Days)
              </span>
              <span className="font-bold text-slate-900">{summary?.criticalSkusCount ?? 0} SKUs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Warning (7 - 14 Days)
              </span>
              <span className="font-bold text-slate-900">{summary?.warningSkusCount ?? 0} SKUs</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Safe (&gt; 14 Days)
              </span>
              <span className="font-bold text-slate-900">{summary?.safeSkusCount ?? 0} SKUs</span>
            </div>
          </div>
        </div>
      </div>

      {/* SKU Risk Matrix & Action Table */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterTab("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All SKUs ({items.length})
            </button>
            <button
              onClick={() => setFilterTab("CRITICAL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                filterTab === "CRITICAL"
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Critical ({summary?.criticalSkusCount ?? 0})
            </button>
            <button
              onClick={() => setFilterTab("WARNING")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === "WARNING"
                  ? "bg-amber-600 text-white"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              Warning ({summary?.warningSkusCount ?? 0})
            </button>
            <button
              onClick={() => setFilterTab("SAFE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filterTab === "SAFE"
                  ? "bg-emerald-600 text-white"
                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              Safe ({summary?.safeSkusCount ?? 0})
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SKU or facility..."
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 w-full sm:w-60 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">SKU &amp; Product</th>
                <th className="py-3 px-4">Facility</th>
                <th className="py-3 px-4">Available Stock</th>
                <th className="py-3 px-4">Daily Burn</th>
                <th className="py-3 px-4">Runway (Days)</th>
                <th className="py-3 px-4">XGBoost Risk Score</th>
                <th className="py-3 px-4">Recommended Reorder</th>
                <th className="py-3 px-4 text-right">Autonomous Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No items match the selected filter criteria.
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
                      className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                    >
                      {/* Product Name & Code */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                              isCritical
                                ? "bg-red-100 text-red-700 border border-red-200"
                                : isWarning
                                ? "bg-amber-100 text-amber-700 border border-amber-200"
                                : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {item.productCode.slice(0, 3)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 truncate max-w-[180px]">
                              {item.productName}
                            </p>
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.productCode} &bull; {item.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Warehouse */}
                      <td className="py-3 px-4 text-slate-700">
                        <span className="font-medium truncate max-w-[130px] block">
                          {item.warehouseName}
                        </span>
                      </td>

                      {/* Stock Level vs Reorder Point */}
                      <td className="py-3 px-4">
                        <div>
                          <div className="flex items-baseline gap-1 font-bold text-slate-900">
                            <span className={isCritical ? "text-red-600" : ""}>
                              {item.currentStock}
                            </span>
                            <span className="text-[10px] font-normal text-slate-400">
                              / ROP {item.reorderPoint}
                            </span>
                          </div>
                          <div className="w-24 bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                isCritical
                                  ? "bg-red-500"
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
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-800">
                          {item.dailyVelocity}
                        </span>
                        <span className="text-[10px] text-slate-400"> u/day</span>
                      </td>

                      {/* Predicted Days Left */}
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            isCritical
                              ? "text-red-600"
                              : isWarning
                              ? "text-amber-600"
                              : "text-slate-800"
                          }`}
                        >
                          {item.predictedDaysToStockout}d
                        </span>
                      </td>

                      {/* XGBoost Risk Probability */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${
                            isCritical
                              ? "text-rose-600"
                              : isWarning
                              ? "text-amber-600"
                              : "text-teal-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-xs shrink-0 ${
                              isCritical
                                ? "bg-rose-600"
                                : isWarning
                                ? "bg-amber-600"
                                : "bg-teal-600"
                            }`}
                          />
                          {Math.round(item.stockoutRisk * 100)}% {item.riskLevel}
                        </span>
                      </td>

                      {/* Recommended Qty & Estimated Cost */}
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-bold text-slate-900">
                            +{item.recommendedReorderQty} units
                          </p>
                          <p className="text-[10px] text-slate-400">
                            ${item.estimatedReplenishmentCost.toLocaleString()} est.
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSingleAutoPO(item)}
                            disabled={isReplenishing}
                            className={`h-7 px-2.5 text-xs gap-1 font-semibold ${
                              isCritical
                                ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-300"
                                : "text-blue-600 border-blue-200 hover:bg-blue-50"
                            }`}
                          >
                            <Zap className={`w-3 h-3 ${isReplenishing ? "animate-spin" : ""}`} />
                            <span>{isReplenishing ? "Ordering..." : "Auto-PO"}</span>
                          </Button>
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
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                {selectedItem.productCode}
              </span>
              <h2 className="text-base font-bold text-slate-900 mt-1">
                {selectedItem.productName}
              </h2>
              <p className="text-xs text-slate-500">
                Facility: {selectedItem.warehouseName}
              </p>
            </div>
            <button
              onClick={() => setSelectedItem(null)}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-slate-600">
            {/* Risk Card */}
            <div
              className={`p-4 rounded-xl border ${
                selectedItem.riskLevel === "CRITICAL"
                  ? "bg-red-50/60 border-red-200"
                  : selectedItem.riskLevel === "WARNING"
                  ? "bg-amber-50/60 border-amber-200"
                  : "bg-emerald-50/60 border-emerald-200"
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold uppercase tracking-wider text-[11px] text-slate-700">
                  ML Stockout Risk Score
                </span>
                <span className="text-lg font-black text-slate-900">
                  {Math.round(selectedItem.stockoutRisk * 100)}%
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {selectedItem.riskLevel === "CRITICAL"
                  ? `High probability of zero-stockout in ${selectedItem.predictedDaysToStockout} days before standard supplier delivery window (${selectedItem.leadTimeDays} days).`
                  : `Inventory level is within ${selectedItem.daysOfCoverage} days of consumption demand.`}
              </p>
            </div>

            {/* Inventory Telemetry */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2">
                Inventory Telemetry &amp; Parameters
              </h3>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Available Stock</span>
                <span className="font-bold text-slate-900">{selectedItem.currentStock} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Reorder Trigger Point</span>
                <span className="font-medium text-slate-900">{selectedItem.reorderPoint} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Safety Buffer Level</span>
                <span className="font-medium text-slate-900">{selectedItem.minStockLevel} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Historical Consumption Rate</span>
                <span className="font-medium text-slate-900">{selectedItem.dailyVelocity} units/day</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Supplier Lead Time</span>
                <span className="font-medium text-slate-900">{selectedItem.leadTimeDays} days</span>
              </div>
            </div>

            {/* AI Replenishment Recommendation */}
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-200 space-y-2">
              <h3 className="font-bold text-blue-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                Autonomous Replenishment Recommendation
              </h3>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-slate-600">Optimal Order Quantity</span>
                <span className="font-bold text-blue-900">+{selectedItem.recommendedReorderQty} units</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-slate-600">Unit Cost Price</span>
                <span className="font-medium text-slate-800">${selectedItem.unitCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-blue-100">
                <span className="text-slate-600">Committed Capital</span>
                <span className="font-bold text-slate-900">${selectedItem.estimatedReplenishmentCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-600">Preferred Certified Supplier</span>
                <span className="font-medium text-slate-800 truncate max-w-[200px]">
                  {selectedItem.preferredProviderName || "Global Logistics Supplier"}
                </span>
              </div>
            </div>

            {/* Quick Action Button */}
            <Button
              onClick={() => handleSingleAutoPO(selectedItem)}
              disabled={replenishingSingleId === selectedItem.inventoryId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl gap-2 shadow-md shadow-blue-600/20"
            >
              <Zap className={`w-4 h-4 ${replenishingSingleId === selectedItem.inventoryId ? "animate-spin" : ""}`} />
              <span>
                {replenishingSingleId === selectedItem.inventoryId
                  ? "Transmitting Purchase Order..."
                  : `Dispatch Auto-PO (+${selectedItem.recommendedReorderQty} units)`}
              </span>
            </Button>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
