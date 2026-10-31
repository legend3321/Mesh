"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Building,
  Warehouse as WarehouseIcon,
  Factory,
  Snowflake,
  ArrowLeftRight,
  Star,
  Clock,
  X,
  Check,
  Globe,
  Pin,
  ExternalLink,
} from "lucide-react";
import { useCompany } from "./CompanyContext";
import {
  Facility,
  FacilityRegion,
  FacilityType,
  enrichFacilitiesCatalog,
  getStoredFacilityIds,
  savePinnedFacilityIds,
  addRecentFacilityId,
  togglePinnedFacilityId,
  PINNED_STORAGE_KEY,
  RECENT_STORAGE_KEY,
  ACTIVE_FACILITY_STORAGE_KEY,
} from "./facilitiesData";

interface FacilityCommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function FacilityCommandPalette({
  open,
  onOpenChange,
}: FacilityCommandPaletteProps) {
  const { companies, currentCompany, isAllCompanies, setCurrentCompanyId } = useCompany();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<FacilityRegion | "All">("All");
  const [selectedType, setSelectedType] = useState<FacilityType | "All">("All");
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [activeFacilityId, setActiveFacilityId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // 1. Initial mounting & storage sync
  useEffect(() => {
    setMounted(true);
    setPinnedIds(getStoredFacilityIds(PINNED_STORAGE_KEY));
    setRecentIds(getStoredFacilityIds(RECENT_STORAGE_KEY));

    // Read stored active facility
    try {
      const activeRaw = localStorage.getItem(ACTIVE_FACILITY_STORAGE_KEY);
      if (activeRaw) {
        const parsed = JSON.parse(activeRaw);
        setActiveFacilityId(parsed.id || null);
      }
    } catch {
      // ignore
    }
  }, []);

  // Listen for storage / custom events to update state
  useEffect(() => {
    const handleFacilityChange = () => {
      try {
        const activeRaw = localStorage.getItem(ACTIVE_FACILITY_STORAGE_KEY);
        if (activeRaw) {
          const parsed = JSON.parse(activeRaw);
          setActiveFacilityId(parsed.id || null);
        } else {
          setActiveFacilityId(null);
        }
      } catch {
        setActiveFacilityId(null);
      }
      setRecentIds(getStoredFacilityIds(RECENT_STORAGE_KEY));
      setPinnedIds(getStoredFacilityIds(PINNED_STORAGE_KEY));
    };

    window.addEventListener("mesh-facility-changed", handleFacilityChange);
    window.addEventListener("mesh-company-changed", handleFacilityChange);
    return () => {
      window.removeEventListener("mesh-facility-changed", handleFacilityChange);
      window.removeEventListener("mesh-company-changed", handleFacilityChange);
    };
  }, []);

  // 2. Global shortcut Cmd+K / Ctrl+K and Esc listener
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

  // 3. Reset filters & auto-focus input when modal opens
  useEffect(() => {
    if (open) {
      setSearchQuery("");
      setSelectedRegion("All");
      setSelectedType("All");
      setSelectedIndex(0);
      setPinnedIds(getStoredFacilityIds(PINNED_STORAGE_KEY));
      setRecentIds(getStoredFacilityIds(RECENT_STORAGE_KEY));
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [open]);

  // 4. Enriched Catalog with real database companies + 115 worldwide facilities
  const allFacilities = useMemo(() => {
    return enrichFacilitiesCatalog(companies);
  }, [companies]);

  // Lookup map for fast retrieval
  const facilityMap = useMemo(() => {
    const map = new Map<string, Facility>();
    allFacilities.forEach((f) => map.set(f.id, f));
    return map;
  }, [allFacilities]);

  // Pinned facility objects
  const pinnedFacilities = useMemo(() => {
    return pinnedIds
      .map((id) => facilityMap.get(id))
      .filter((f): f is Facility => Boolean(f));
  }, [pinnedIds, facilityMap]);

  // Recent facility objects
  const recentFacilities = useMemo(() => {
    return recentIds
      .map((id) => facilityMap.get(id))
      .filter((f): f is Facility => Boolean(f));
  }, [recentIds, facilityMap]);

  // 5. Regional Counts (dynamically calculated based on current search query)
  const regionalCounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const baseList = q
      ? allFacilities.filter(
          (f) =>
            f.name.toLowerCase().includes(q) ||
            f.code.toLowerCase().includes(q) ||
            f.country.toLowerCase().includes(q) ||
            f.countryCode.toLowerCase().includes(q) ||
            f.city.toLowerCase().includes(q) ||
            f.type.toLowerCase().includes(q)
        )
      : allFacilities;

    return {
      all: baseList.length,
      americas: baseList.filter((f) => f.region === "Americas").length,
      emea: baseList.filter((f) => f.region === "EMEA").length,
      apac: baseList.filter((f) => f.region === "APAC").length,
    };
  }, [allFacilities, searchQuery]);

  // 6. Filtered Facilities List
  const filteredFacilities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return allFacilities.filter((f) => {
      // Region filter
      if (selectedRegion !== "All" && f.region !== selectedRegion) {
        return false;
      }

      // Type filter
      if (selectedType !== "All" && f.type !== selectedType) {
        return false;
      }

      // Search query filter
      if (q) {
        const matchName = f.name.toLowerCase().includes(q);
        const matchCode = f.code.toLowerCase().includes(q);
        const matchCountry = f.country.toLowerCase().includes(q);
        const matchCountryCode = f.countryCode.toLowerCase().includes(q);
        const matchCity = f.city.toLowerCase().includes(q);
        const matchType = f.type.toLowerCase().includes(q);
        return (
          matchName ||
          matchCode ||
          matchCountry ||
          matchCountryCode ||
          matchCity ||
          matchType
        );
      }

      return true;
    });
  }, [allFacilities, searchQuery, selectedRegion, selectedType]);

  // 7. Interactive List for Arrow Navigation
  // When search is empty and region is "All", we include "All Group Entities" as item 0
  interface NavigationItem {
    id: string;
    isAllEntitiesOption?: boolean;
    facility?: Facility;
  }

  const navigableItems: NavigationItem[] = useMemo(() => {
    const items: NavigationItem[] = [];

    // If query is empty or matches "all", include the Global Group Entities aggregator option
    const q = searchQuery.trim().toLowerCase();
    if (!q || "all facilities group entities aggregated".includes(q)) {
      items.push({ id: "action-all-entities", isAllEntitiesOption: true });
    }

    filteredFacilities.forEach((f) => {
      items.push({ id: f.id, facility: f });
    });

    return items;
  }, [searchQuery, filteredFacilities]);

  // Reset selected index when query or filters change
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedRegion, selectedType]);

  // Scroll active item into view when selectedIndex changes
  useEffect(() => {
    if (navigableItems.length > 0 && itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex, navigableItems.length]);

  // 8. Select Handlers
  const handleSelectAllEntities = () => {
    setCurrentCompanyId("all");
    setActiveFacilityId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(ACTIVE_FACILITY_STORAGE_KEY);
      window.dispatchEvent(new Event("mesh-facility-changed"));
    }
    onOpenChange(false);
  };

  const handleSelectFacility = (facility: Facility) => {
    // 1. Update Recent in localStorage
    const updatedRecents = addRecentFacilityId(facility.id);
    setRecentIds(updatedRecents);

    // 2. Persist active facility descriptor
    setActiveFacilityId(facility.id);
    if (typeof window !== "undefined") {
      localStorage.setItem(
        ACTIVE_FACILITY_STORAGE_KEY,
        JSON.stringify({
          id: facility.id,
          name: facility.name,
          code: facility.code,
          flag: facility.flag,
          countryCode: facility.countryCode,
          type: facility.type,
          city: facility.city,
        })
      );
      window.dispatchEvent(new Event("mesh-facility-changed"));
    }

    // 3. Establish company context (passes valid companyId)
    const targetCompanyId =
      facility.companyId || (companies.length > 0 ? companies[0].companyId : "all");
    setCurrentCompanyId(targetCompanyId);

    // 4. Close Palette
    onOpenChange(false);
  };

  const handleTogglePin = (e: React.MouseEvent, facilityId: string) => {
    e.stopPropagation();
    const updated = togglePinnedFacilityId(facilityId);
    setPinnedIds(updated);
  };

  // 9. Keyboard Navigation Handler (Up, Down, Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (navigableItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % navigableItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + navigableItems.length) % navigableItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const current = navigableItems[selectedIndex];
      if (!current) return;
      if (current.isAllEntitiesOption) {
        handleSelectAllEntities();
      } else if (current.facility) {
        handleSelectFacility(current.facility);
      }
    }
  };

  // Render Type Badge Icon & Color
  const renderTypeBadge = (type: FacilityType) => {
    switch (type) {
      case "Distribution Center (DC)":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200/80">
            <WarehouseIcon className="w-3 h-3 text-blue-600" />
            <span>DC</span>
          </span>
        );
      case "Assembly Plant":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
            <Factory className="w-3 h-3 text-purple-600" />
            <span>Assembly Plant</span>
          </span>
        );
      case "Cold Storage":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
            <Snowflake className="w-3 h-3 text-cyan-600" />
            <span>Cold Storage</span>
          </span>
        );
      case "Cross-Dock":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
            <ArrowLeftRight className="w-3 h-3 text-amber-600" />
            <span>Cross-Dock</span>
          </span>
        );
    }
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Global Facility Command Palette"
    >
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Command Palette Modal Box */}
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 flex flex-col max-h-[85vh] animate-in fade-in-0 zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Header Search Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-[#F3F4F7]/60">
          <div className="w-7 h-7 rounded-lg bg-[#222026] text-white flex items-center justify-center shrink-0">
            <Building className="w-4 h-4 text-[#FD3706]" />
          </div>
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-0 shrink-0 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search 100+ global facilities by name, code (ORD-DC1), country, or city..."
              className="w-full bg-transparent pl-6 pr-6 border-0 outline-none text-sm font-sans text-[#222026] placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-200/60 transition-colors"
                title="Clear query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white rounded border border-slate-200 shadow-2xs">
            ESC
          </kbd>
        </div>

        {/* Regional Filter Tabs & Quick Type Badges */}
        <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Regional Tabs */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-200/60 text-slate-600 font-medium">
            <button
              type="button"
              onClick={() => setSelectedRegion("All")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${
                selectedRegion === "All"
                  ? "bg-[#222026] text-white shadow-xs font-semibold"
                  : "hover:text-[#222026] hover:bg-white/40"
              }`}
            >
              All Regions{" "}
              <span className="font-mono text-[10px] opacity-80">({regionalCounts.all})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegion("Americas")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${
                selectedRegion === "Americas"
                  ? "bg-[#222026] text-white shadow-xs font-semibold"
                  : "hover:text-[#222026] hover:bg-white/40"
              }`}
            >
              Americas{" "}
              <span className="font-mono text-[10px] opacity-80">({regionalCounts.americas})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegion("EMEA")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${
                selectedRegion === "EMEA"
                  ? "bg-[#222026] text-white shadow-xs font-semibold"
                  : "hover:text-[#222026] hover:bg-white/40"
              }`}
            >
              EMEA{" "}
              <span className="font-mono text-[10px] opacity-80">({regionalCounts.emea})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedRegion("APAC")}
              className={`px-2.5 py-1 rounded-md text-xs transition-all font-medium ${
                selectedRegion === "APAC"
                  ? "bg-[#222026] text-white shadow-xs font-semibold"
                  : "hover:text-[#222026] hover:bg-white/40"
              }`}
            >
              APAC{" "}
              <span className="font-mono text-[10px] opacity-80">({regionalCounts.apac})</span>
            </button>
          </div>

          {/* Type Filter Quick Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase hidden md:inline mr-1">
              Type:
            </span>
            {(
              [
                "All",
                "Distribution Center (DC)",
                "Assembly Plant",
                "Cold Storage",
                "Cross-Dock",
              ] as const
            ).map((t) => {
              const isSelected = selectedType === t;
              const shortLabel =
                t === "Distribution Center (DC)"
                  ? "DC"
                  : t === "Assembly Plant"
                  ? "Assembly"
                  : t;

              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedType(t)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? "bg-[#FD3706] text-white font-semibold shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {shortLabel}
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Catalog Body */}
        <div ref={listContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-3">
          {/* Top Section: Pinned & Recent Facilities (shown when not searching) */}
          {!searchQuery.trim() && selectedRegion === "All" && selectedType === "All" && (
            <div className="space-y-3 pb-2 border-b border-slate-100">
              {/* Pinned Facilities */}
              {pinnedFacilities.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>Pinned Facilities ({pinnedFacilities.length})</span>
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">Quick Access</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5">
                    {pinnedFacilities.map((f) => (
                      <div
                        key={`pinned-${f.id}`}
                        onClick={() => handleSelectFacility(f)}
                        className={`group p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                          activeFacilityId === f.id
                            ? "bg-slate-900 text-white border-slate-800 shadow-xs"
                            : "bg-[#F3F4F7]/70 hover:bg-[#F3F4F7] border-slate-200/80 text-[#222026]"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-base shrink-0">{f.flag}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-[10px] font-bold px-1 rounded bg-black/5 text-[#FD3706]">
                                {f.code}
                              </span>
                              <span className="text-xs font-semibold truncate">{f.city}</span>
                            </div>
                            <p className="text-[10px] truncate opacity-70 mt-0.5">{f.name}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(e, f.id)}
                          className="p-1 rounded hover:bg-black/10 text-amber-400 transition-colors"
                          title="Unpin facility"
                        >
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Facilities */}
              {recentFacilities.length > 0 && (
                <div>
                  <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Recent Facilities ({recentFacilities.length})</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                    {recentFacilities.map((f) => (
                      <button
                        key={`recent-${f.id}`}
                        type="button"
                        onClick={() => handleSelectFacility(f)}
                        className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 flex items-center gap-1.5 transition-all cursor-pointer ${
                          activeFacilityId === f.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-white hover:bg-slate-100 border-slate-200 text-slate-700"
                        }`}
                      >
                        <span>{f.flag}</span>
                        <span className="font-mono text-[11px] font-semibold">{f.code}</span>
                        <span className="text-slate-400 truncate max-w-[100px]">{f.city}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Facilities List Section */}
          <div>
            <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
              <span>
                {searchQuery.trim()
                  ? `Search Results (${filteredFacilities.length})`
                  : `Global Facilities Catalog (${filteredFacilities.length})`}
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                {selectedRegion === "All" ? "Worldwide" : selectedRegion} ·{" "}
                {selectedType === "All" ? "All Types" : selectedType}
              </span>
            </div>

            {navigableItems.length === 0 ? (
              <div className="py-12 text-center">
                <Building className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No matching facilities</p>
                <p className="text-xs text-slate-400 mt-1">
                  Try adjusting your keywords, region, or facility type filter
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {navigableItems.map((item, idx) => {
                  const isSelected = selectedIndex === idx;

                  // 1. Aggregated Operations View Option
                  if (item.isAllEntitiesOption) {
                    const isCurrentAggregated = isAllCompanies && !activeFacilityId;
                    return (
                      <button
                        key="all-entities-item"
                        ref={(el) => {
                          itemRefs.current[idx] = el;
                        }}
                        type="button"
                        onClick={handleSelectAllEntities}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition-all cursor-pointer group ${
                          isSelected
                            ? "bg-[#222026] text-white shadow-md"
                            : "bg-slate-50/70 hover:bg-slate-100/90 text-slate-800 border border-slate-200/60"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "bg-white/10 text-white"
                                : "bg-[#FD3706]/10 text-[#FD3706]"
                            }`}
                          >
                            <Globe className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-bold ${
                                  isSelected ? "text-white" : "text-[#222026]"
                                }`}
                              >
                                All Facilities / Group Entities
                              </span>
                              <span
                                className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isSelected
                                    ? "bg-white/20 text-white"
                                    : "bg-slate-200/70 text-slate-700"
                                }`}
                              >
                                AGGREGATED
                              </span>
                              {isCurrentAggregated && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                  <Check className="w-3 h-3" />
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <p
                              className={`text-[11px] truncate mt-0.5 ${
                                isSelected ? "text-slate-300" : "text-slate-500"
                              }`}
                            >
                              Consolidated multi-tenant overview across all global supply chain depots
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 ml-2">
                          <span
                            className={`text-xs font-mono font-semibold ${
                              isSelected ? "text-[#FD3706]" : "text-slate-400"
                            }`}
                          >
                            ↵ Enter
                          </span>
                        </div>
                      </button>
                    );
                  }

                  const f = item.facility!;
                  const isPinned = pinnedIds.includes(f.id);
                  const isCurrentActive = activeFacilityId === f.id;

                  return (
                    <button
                      key={f.id}
                      ref={(el) => {
                        itemRefs.current[idx] = el;
                      }}
                      type="button"
                      onClick={() => handleSelectFacility(f)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer group ${
                        isSelected
                          ? "bg-[#222026] text-white shadow-md"
                          : "hover:bg-slate-100/90 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Flag & Country Badge */}
                        <div className="flex flex-col items-center justify-center shrink-0 w-8 text-center">
                          <span className="text-xl leading-none">{f.flag}</span>
                          <span
                            className={`text-[9px] font-mono font-bold uppercase mt-0.5 ${
                              isSelected ? "text-slate-300" : "text-slate-400"
                            }`}
                          >
                            {f.countryCode}
                          </span>
                        </div>

                        {/* Facility Information */}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            {/* Facility Code */}
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                isSelected
                                  ? "bg-white/20 text-white"
                                  : "bg-[#FD3706]/10 text-[#FD3706] border border-[#FD3706]/20"
                              }`}
                            >
                              {f.code}
                            </span>

                            {/* Facility Name */}
                            <span
                              className={`text-xs font-bold truncate ${
                                isSelected ? "text-white" : "text-[#222026]"
                              }`}
                            >
                              {f.name}
                            </span>

                            {/* Real Registered Company Badge */}
                            {f.isRealCompany && (
                              <span
                                className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-semibold ${
                                  isSelected
                                    ? "bg-amber-400/20 text-amber-300"
                                    : "bg-amber-500/10 text-amber-700 border border-amber-300"
                                }`}
                              >
                                Registered Entity
                              </span>
                            )}

                            {/* Active Facility Indicator */}
                            {isCurrentActive && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                                <Check className="w-2.5 h-2.5" />
                                ACTIVE
                              </span>
                            )}
                          </div>

                          {/* Subtitle: City, Country, Region, and Capacity */}
                          <div
                            className={`flex flex-wrap items-center gap-2 text-[11px] mt-1 ${
                              isSelected ? "text-slate-300" : "text-slate-500"
                            }`}
                          >
                            <span>
                              {f.city}, {f.country}
                            </span>
                            <span className="opacity-40">•</span>
                            <span className="font-mono text-[10px]">{f.region}</span>
                            <span className="opacity-40">•</span>
                            <span className="font-mono text-[10px]">{f.capacity}</span>
                            {f.throughput && (
                              <>
                                <span className="opacity-40">•</span>
                                <span className="font-mono text-[10px] opacity-80">
                                  {f.throughput}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Controls: Type Badge & Pin Button */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <div className="hidden sm:block">{renderTypeBadge(f.type)}</div>

                        {/* Star / Pin Button */}
                        <button
                          type="button"
                          onClick={(e) => handleTogglePin(e, f.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isPinned
                              ? "text-amber-400 hover:text-amber-500"
                              : isSelected
                              ? "text-slate-400 hover:text-amber-400"
                              : "text-slate-300 hover:text-amber-500"
                          }`}
                          title={isPinned ? "Unpin facility" : "Pin facility to top"}
                          aria-label={isPinned ? "Unpin facility" : "Pin facility to top"}
                        >
                          <Star
                            className={`w-4 h-4 ${isPinned ? "fill-amber-400" : ""}`}
                          />
                        </button>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer Shortcut Reference Bar */}
        <div className="px-4 py-2.5 bg-[#F3F4F7]/80 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] shadow-2xs font-semibold">
                ↑↓
              </kbd>
              <span className="text-slate-400">navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] shadow-2xs font-semibold">
                ↵
              </kbd>
              <span className="text-slate-400">select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] shadow-2xs font-semibold">
                ★
              </kbd>
              <span className="text-slate-400">pin</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] shadow-2xs font-semibold">
                ESC
              </kbd>
              <span className="text-slate-400">dismiss</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-2 text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="font-sans text-[11px]">
              {allFacilities.length} Global Nodes Active
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
