"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Search,
  Package,
  Warehouse as WarehouseIcon,
  ListCheck,
  ArrowLeftRight,
  Truck,
  X,
  Layers,
  ArrowRight,
  Command,
  LayoutDashboard,
  CornerDownLeft,
} from "lucide-react";
import api from "@/app/assets/api";
import { useCompany } from "./CompanyContext";

interface GlobalSearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalSearchModal({
  open,
  onOpenChange,
}: GlobalSearchModalProps) {
  const router = useRouter();
  const { activeCompanyId } = useCompany();
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 1. Listen for Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // 2. Focus input whenever modal opens
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);

      // Fetch search data if not fetched yet
      const fetchSearchData = async () => {
        try {
          setLoading(true);
          const [prodRes, whRes, orderRes] = await Promise.allSettled([
            api.get("/product/getAll"),
            api.get("/warehouse/getAll"),
            api.get("/order/getAll"),
          ]);

          if (prodRes.status === "fulfilled") setProducts(prodRes.value.data || []);
          if (whRes.status === "fulfilled") setWarehouses(whRes.value.data || []);
          if (orderRes.status === "fulfilled") setOrders(orderRes.value.data || []);
        } catch (err) {
          console.error("Search data fetch error:", err);
        } finally {
          setLoading(false);
        }
      };

      fetchSearchData();
    }
  }, [open, activeCompanyId]);

  // 3. Quick Nav items for empty state
  const quickNav = useMemo(
    () => [
      {
        id: "nav-overview",
        type: "NAV",
        title: "Overview & Telemetry Grid",
        subtitle: "Real-time stock valuation & KPI dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        color: "text-[#FD3706] bg-[#FD3706]/10",
      },
      {
        id: "nav-products",
        type: "NAV",
        title: "Products & SKU Master",
        subtitle: "Catalog definitions, pricing, barcodes",
        href: "/dashboard/product",
        icon: Package,
        color: "text-blue-600 bg-blue-50",
      },
      {
        id: "nav-inventory",
        type: "NAV",
        title: "Inventory Stock Ledger",
        subtitle: "Depot lot quantities, reorder points",
        href: "/dashboard/inventory",
        icon: Layers,
        color: "text-emerald-600 bg-emerald-50",
      },
      {
        id: "nav-orders",
        type: "NAV",
        title: "Orders & Requisitions",
        subtitle: "Purchase orders and supplier replenishments",
        href: "/dashboard/order",
        icon: ListCheck,
        color: "text-indigo-600 bg-indigo-50",
      },
      {
        id: "nav-warehouses",
        type: "NAV",
        title: "Warehouses & Depots",
        subtitle: "Storage capacity and facility zones",
        href: "/dashboard/warehouse",
        icon: WarehouseIcon,
        color: "text-amber-600 bg-amber-50",
      },
      {
        id: "nav-transfers",
        type: "NAV",
        title: "Inter-Depot Transfers",
        subtitle: "Stock routing between hubs",
        href: "/dashboard/transfer",
        icon: ArrowLeftRight,
        color: "text-purple-600 bg-purple-50",
      },
      {
        id: "nav-deliveries",
        type: "NAV",
        title: "Delivery Dispatches",
        subtitle: "Outbound logistics and carriers",
        href: "/dashboard/delivery",
        icon: Truck,
        color: "text-cyan-600 bg-cyan-50",
      },
    ],
    []
  );

  // 4. Live Search Results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: any[] = [];

    // Filter Products
    products.forEach((p) => {
      const matchName = p.ProductName?.toLowerCase().includes(q);
      const matchCode = p.ProductCode?.toLowerCase().includes(q);
      const matchCat = p.ProductCategory?.toLowerCase().includes(q);

      if (matchName || matchCode || matchCat) {
        items.push({
          id: `prod-${p.ProductID}`,
          type: "PRODUCT",
          title: p.ProductName,
          badge: p.ProductCode || "SKU",
          subtitle: p.ProductCategory || "Catalog Product",
          href: `/dashboard/product?q=${encodeURIComponent(p.ProductCode || p.ProductName)}`,
          icon: Package,
          color: "text-[#FD3706] bg-[#FD3706]/10",
        });
      }
    });

    // Filter Warehouses
    warehouses.forEach((w) => {
      const matchName = w.WarehouseName?.toLowerCase().includes(q);
      const matchCity = w.WarehouseCity?.toLowerCase().includes(q);

      if (matchName || matchCity) {
        items.push({
          id: `wh-${w.WarehouseID}`,
          type: "DEPOT",
          title: w.WarehouseName,
          badge: w.WarehouseCity || "Depot",
          subtitle: `Facility Cap: ${w.WarehouseCapacity?.toLocaleString() || "Standard"}`,
          href: `/dashboard/warehouse?q=${encodeURIComponent(w.WarehouseName)}`,
          icon: WarehouseIcon,
          color: "text-amber-600 bg-amber-50",
        });
      }
    });

    // Filter Orders
    orders.forEach((o) => {
      const matchId = o.OrderID?.toLowerCase().includes(q);
      const matchStatus = o.OrderStatus?.toLowerCase().includes(q);

      if (matchId || matchStatus) {
        items.push({
          id: `order-${o.OrderID}`,
          type: "ORDER",
          title: `Purchase Order #${o.OrderID?.slice(-6).toUpperCase()}`,
          badge: o.OrderStatus || "ACTIVE",
          subtitle: `Created: ${new Date(o.createdAt || Date.now()).toLocaleDateString()}`,
          href: `/dashboard/order?q=${encodeURIComponent(o.OrderID)}`,
          icon: ListCheck,
          color: "text-indigo-600 bg-indigo-50",
        });
      }
    });

    return items;
  }, [query, products, warehouses, orders]);

  const activeList = query.trim() ? results : quickNav;

  // 5. Handle Keyboard Navigation (Up/Down/Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (activeList.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % activeList.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + activeList.length) % activeList.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = activeList[selectedIndex];
      if (selected?.href) {
        router.push(selected.href);
        onOpenChange(false);
      }
    }
  };

  const handleSelect = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center pt-16 sm:pt-24 px-4">
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette Modal Box */}
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 flex flex-col max-h-[75vh] animate-in fade-in-0 zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Header Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-[#F3F4F7]/40">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search SKUs, products, facilities, POs, routes..."
            className="w-full bg-transparent border-0 outline-none text-sm text-[#222026] placeholder:text-slate-400 font-sans"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="flex-1 overflow-y-auto p-2">
          {query.trim() && results.length === 0 ? (
            <div className="py-12 text-center">
              <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No matching telemetry records</p>
              <p className="text-xs text-slate-400 mt-1">
                No SKUs, facilities, or orders matching &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
                {query.trim() ? `Search Results (${results.length})` : "Quick Navigation & Telemetry Views"}
              </div>

              {activeList.map((item, idx) => {
                const Icon = item.icon;
                const isSelected = selectedIndex === idx;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelect(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-colors cursor-pointer group ${
                      isSelected
                        ? "bg-[#222026] text-white shadow-xs"
                        : "hover:bg-slate-100/80 text-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "bg-white/10 text-white" : item.color
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected ? "text-white" : "text-[#222026]"
                            }`}
                          >
                            {item.title}
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p
                          className={`text-[11px] truncate mt-0.5 ${
                            isSelected ? "text-slate-300" : "text-slate-400"
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <ArrowRight
                        className={`w-4 h-4 transition-transform group-hover:translate-x-0.5 ${
                          isSelected ? "text-[#FD3706]" : "text-slate-300"
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-[#F3F4F7]/60 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px]">↑↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px]">↵</kbd>
              <span>to select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px]">ESC</kbd>
              <span>to dismiss</span>
            </span>
          </div>

          <span className="hidden sm:inline font-sans text-xs text-slate-400">
            Mesh Global Telemetry Index
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
