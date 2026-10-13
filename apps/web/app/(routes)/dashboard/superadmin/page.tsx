"use client";

import React, { useEffect, useState, useMemo } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Crown,
  Network,
  Building2,
  Users,
  ShieldCheck,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Package,
  Layers,
  ArrowRight,
  Globe,
  Briefcase,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  SlidersHorizontal,
  ChevronRight,
  X,
} from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { useCompany } from "@/app/components/CompanyContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { CompanyGroup, Company, User, Role } from "@mesh/types";

export default function SuperAdminDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCurrentCompanyId } = useCompany();

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as string;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";

  // Data states
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // Navigation tab
  const initialTab = (searchParams?.get("tab") as "groups" | "companies" | "users" | "switcher") || "groups";
  const [activeTab, setActiveTab] = useState<"groups" | "companies" | "users" | "switcher">(initialTab);

  // Search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Modals
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CompanyGroup | null>(null);
  const [groupFormData, setGroupFormData] = useState({
    groupName: "",
    groupCode: "",
    industry: "",
    country: "",
    description: "",
  });

  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [provisionFormData, setProvisionFormData] = useState({
    useExistingGroup: false,
    companyGroupId: "",
    groupName: "",
    groupCode: "",
    industry: "Logistics & Supply Chain",
    country: "Global",
    groupDescription: "",
    companyName: "",
    companyCode: "",
    companyDomain: "",
    companyDescription: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "admin123",
  });

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userFormData, setUserFormData] = useState({
    userName: "",
    userEmail: "",
    userPassword: "user1234",
    userRole: "ADMIN" as Role,
    companyGroupId: "",
    companyId: "",
  });

  useEffect(() => {
    fetchSuperAdminData();
  }, []);

  const fetchSuperAdminData = async () => {
    try {
      setLoading(true);
      const [statsRes, groupsRes, companiesRes, usersRes] = await Promise.all([
        api.get("/superadmin/stats"),
        api.get("/company-group/getAll"),
        api.get("/company/getAll"),
        api.get("/auth/users/getAll?all=true"),
      ]);

      setStats(statsRes.data?.metrics || null);
      setGroups(groupsRes.data || []);
      setCompanies(companiesRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err: any) {
      console.error("SuperAdmin load error:", err);
      toast({
        title: "SuperAdmin API Notice",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Group Handlers
  const handleOpenCreateGroup = () => {
    setEditingGroup(null);
    setGroupFormData({
      groupName: "",
      groupCode: "",
      industry: "Logistics & Manufacturing",
      country: "United States",
      description: "",
    });
    setIsGroupModalOpen(true);
  };

  const handleOpenEditGroup = (g: CompanyGroup) => {
    setEditingGroup(g);
    setGroupFormData({
      groupName: g.groupName,
      groupCode: g.groupCode,
      industry: g.industry || "",
      country: g.country || "",
      description: g.description || "",
    });
    setIsGroupModalOpen(true);
  };

  const handleSaveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingGroup) {
        await api.patch(`/company-group/edit/${editingGroup.companyGroupId}`, groupFormData);
        toast({ title: "Group Updated", description: `Updated ${groupFormData.groupName}.` });
      } else {
        await api.post("/company-group/add", groupFormData);
        toast({ title: "Group Created", description: `Created new group ${groupFormData.groupName}.` });
      }
      setIsGroupModalOpen(false);
      await fetchSuperAdminData();
    } catch (err: any) {
      toast({
        title: "Failed to save group",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (g: CompanyGroup) => {
    if (!confirm(`Are you sure you want to delete Group '${g.groupName}'? This will unlink all its companies.`)) {
      return;
    }
    try {
      await api.delete(`/company-group/delete/${g.companyGroupId}`);
      toast({ title: "Group Deleted", description: `Deleted ${g.groupName}.` });
      await fetchSuperAdminData();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  // Provisioning Wizard Handler
  const handleExecuteProvisioning = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        companyName: provisionFormData.companyName,
        companyCode: provisionFormData.companyCode,
        companyDomain: provisionFormData.companyDomain,
        companyDescription: provisionFormData.companyDescription,
        adminName: provisionFormData.adminName,
        adminEmail: provisionFormData.adminEmail,
        adminPassword: provisionFormData.adminPassword,
      };

      if (provisionFormData.useExistingGroup) {
        payload.companyGroupId = provisionFormData.companyGroupId;
      } else {
        payload.groupName = provisionFormData.groupName;
        payload.groupCode = provisionFormData.groupCode;
        payload.industry = provisionFormData.industry;
        payload.country = provisionFormData.country;
        payload.groupDescription = provisionFormData.groupDescription;
      }

      const res = await api.post("/superadmin/provision", payload);
      toast({
        title: "Tenant Provisioned Successfully! 🎉",
        description: res.data?.message || "Group, company, and admin user created.",
      });
      setIsProvisionModalOpen(false);
      await fetchSuperAdminData();
    } catch (err: any) {
      toast({
        title: "Provisioning Failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  // User Provisioning Handler
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/auth/users/add", userFormData);
      toast({
        title: "User Provisioned",
        description: `Created user ${userFormData.userEmail} with role ${userFormData.userRole}.`,
      });
      setIsUserModalOpen(false);
      await fetchSuperAdminData();
    } catch (err: any) {
      toast({
        title: "User creation failed",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  // Tenant Workspace Jump (Impersonation)
  const handleJumpToCompany = (company: Company) => {
    setCurrentCompanyId(company.companyId);
    toast({
      title: "Switched Tenant Context",
      description: `Now viewing workspace as ${company.companyName} (${company.companyCode}).`,
    });
    router.push("/dashboard");
  };

  // Filtered lists
  const filteredGroups = useMemo(() => {
    if (!searchQuery) return groups;
    const q = searchQuery.toLowerCase();
    return groups.filter(
      (g) =>
        g.groupName.toLowerCase().includes(q) ||
        g.groupCode.toLowerCase().includes(q) ||
        (g.industry && g.industry.toLowerCase().includes(q)) ||
        (g.country && g.country.toLowerCase().includes(q))
    );
  }, [groups, searchQuery]);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    const q = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.companyName.toLowerCase().includes(q) ||
        c.companyCode.toLowerCase().includes(q) ||
        (c.companyGroup?.groupName && c.companyGroup.groupName.toLowerCase().includes(q))
    );
  }, [companies, searchQuery]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchRole = roleFilter === "ALL" ? true : u.userRole === roleFilter;
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !searchQuery ||
        u.userName.toLowerCase().includes(q) ||
        u.userEmail.toLowerCase().includes(q) ||
        (u.company?.companyName && u.company.companyName.toLowerCase().includes(q)) ||
        (u.companyGroup?.groupName && u.companyGroup.groupName.toLowerCase().includes(q));
      return matchRole && matchSearch;
    });
  }, [users, searchQuery, roleFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top SuperAdmin Hero Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 border border-amber-500/30 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-amber-500/20 to-purple-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-sm">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                Platform SuperAdmin Control Plane
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Signed in as: <strong className="text-white">{session?.user?.name || "SuperAdmin (Ujjwal)"}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Multi-Tenant Group & User Orchestrator
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Create and manage corporate conglomerates, establish isolated subsidiary companies, and provision dedicated users with granular RBAC permissions.
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={handleOpenCreateGroup}
              className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5 text-xs font-semibold shadow-md"
            >
              <Network className="w-4 h-4" />
              New Group of Companies
            </Button>
            <Button
              size="sm"
              onClick={() => setIsProvisionModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5 text-xs font-semibold shadow-md"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              1-Click Tenant Provisioner
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={fetchSuperAdminData}
              disabled={loading}
              className="bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>
        </div>
      </div>

      {/* Global Telemetry KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Groups */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-amber-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Company Groups
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Network className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.totalCompanyGroups ?? groups.length}
            </span>
            <span className="text-xs text-slate-400">conglomerates</span>
          </div>
        </div>

        {/* Total Companies */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-blue-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Subsidiaries
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.totalCompanies ?? companies.length}
            </span>
            <span className="text-xs text-slate-400">isolated tenants</span>
          </div>
        </div>

        {/* Total Users */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-purple-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Users
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.totalUsers ?? users.length}
            </span>
            <span className="text-xs text-slate-400">accounts</span>
          </div>
        </div>

        {/* Total Inventory Units */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-emerald-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Global Stock
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {stats?.totalInventoryUnits?.toLocaleString() ?? "—"}
            </span>
            <span className="text-xs text-slate-400">units in ledger</span>
          </div>
        </div>

        {/* Global Valuation */}
        <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-xs hover:border-indigo-400 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Settled Capital
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              ${stats?.totalSettledVolume?.toLocaleString(undefined, { maximumFractionDigits: 0 }) ?? "—"}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab("groups")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "groups"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Network className="w-4 h-4" />
            Groups of Companies ({groups.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "companies"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Subsidiary Companies ({companies.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "users"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Users className="w-4 h-4" />
            Cross-Tenant Users ({users.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("switcher")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "switcher"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Workspace Switcher
          </button>
        </div>

        {/* Global Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter records..."
            className="pl-9 h-9 text-xs bg-white border-slate-200 rounded-lg"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: GROUPS OF COMPANIES */}
      {activeTab === "groups" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Registered Conglomerates & Corporate Groups
              </h2>
              <p className="text-xs text-slate-500">
                Top-level holding companies that organize subsidiaries, regional operations, and user groups.
              </p>
            </div>
            <Button
              size="sm"
              onClick={handleOpenCreateGroup}
              className="bg-amber-600 hover:bg-amber-500 text-white gap-1.5 text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Group
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredGroups.map((group) => {
              const childCompanies = companies.filter((c) => c.companyGroupId === group.companyGroupId);
              const groupUsers = users.filter((u) => u.companyGroupId === group.companyGroupId);

              return (
                <div
                  key={group.companyGroupId}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-base">
                            {group.groupName}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            {group.groupCode}
                          </span>
                          {group.country && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Globe className="w-3 h-3 text-slate-400" />
                              {group.country}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditGroup(group)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Edit Group"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteGroup(group)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors"
                          title="Delete Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {group.industry && (
                      <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5 mb-2">
                        <Briefcase className="w-3.5 h-3.5 text-amber-600" />
                        {group.industry}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                      {group.description || "No description provided."}
                    </p>

                    {/* Child Companies Section */}
                    <div className="pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-slate-700">
                          Subsidiaries ({childCompanies.length})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {groupUsers.length} users
                        </span>
                      </div>

                      {childCompanies.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">
                          No companies assigned yet.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {childCompanies.map((c) => (
                            <button
                              key={c.companyId}
                              type="button"
                              onClick={() => handleJumpToCompany(c)}
                              className="text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium transition-colors flex items-center gap-1"
                              title="Jump to this company workspace"
                            >
                              <span>{c.companyName}</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setProvisionFormData((prev) => ({
                          ...prev,
                          useExistingGroup: true,
                          companyGroupId: group.companyGroupId,
                        }));
                        setIsProvisionModalOpen(true);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add Subsidiary to Group
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserFormData((prev) => ({
                          ...prev,
                          companyGroupId: group.companyGroupId,
                        }));
                        setIsUserModalOpen(true);
                      }}
                      className="text-xs font-medium text-slate-500 hover:text-purple-600 flex items-center gap-1"
                    >
                      <Users className="w-3 h-3" />
                      Add User
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: SUBSIDIARY COMPANIES */}
      {activeTab === "companies" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                All Subsidiary Companies & Operating Units
              </h2>
              <p className="text-xs text-slate-500">
                Multi-tenant organizations with isolated catalog ledgers, inventory depots, and purchase order flows.
              </p>
            </div>
            <Link href="/dashboard/companies">
              <Button size="sm" variant="outline" className="text-xs gap-1.5 bg-white">
                Open Full Companies Ledger <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Company Name</th>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Parent Group</th>
                    <th className="px-4 py-3">Domain</th>
                    <th className="px-4 py-3">Users</th>
                    <th className="px-4 py-3">Catalog / Warehouses</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCompanies.map((comp) => {
                    return (
                      <tr key={comp.companyId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {comp.companyName}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">
                          {comp.companyCode}
                        </td>
                        <td className="px-4 py-3">
                          {comp.companyGroup ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <Network className="w-3 h-3" />
                              {comp.companyGroup.groupName}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Standalone</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {comp.companyDomain || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {comp._count?.users || 0} user(s)
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {comp._count?.products || 0} SKUs &bull; {comp._count?.warehouses || 0} depots
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleJumpToCompany(comp)}
                            className="h-7 text-[11px] gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 bg-white"
                          >
                            <span>Enter Workspace</span>
                            <ArrowRight className="w-3 h-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: CROSS-TENANT USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Cross-Tenant User Directory & RBAC Roles
              </h2>
              <p className="text-xs text-slate-500">
                Platform users across all groups, subsidiaries, and administrative tiers.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Roles</option>
                <option value="SUPERADMIN">SuperAdmin Only</option>
                <option value="ADMIN">Admin Only</option>
                <option value="MANAGER">Manager Only</option>
                <option value="EMPLOYEE">Employee Only</option>
              </select>

              <Button
                size="sm"
                onClick={() => setIsUserModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5 text-xs shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Add User
              </Button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-3">User Name</th>
                    <th className="px-4 py-3">Corporate Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Company Group</th>
                    <th className="px-4 py-3">Assigned Company</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((u) => {
                    return (
                      <tr key={u.userId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {u.userName.charAt(0).toUpperCase()}
                          </div>
                          <span>{u.userName}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {u.userEmail}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              u.userRole === "SUPERADMIN"
                                ? "bg-amber-50 text-amber-700 border-amber-300 font-mono"
                                : u.userRole === "ADMIN"
                                ? "bg-purple-50 text-purple-700 border-purple-200 font-mono"
                                : u.userRole === "MANAGER"
                                ? "bg-blue-50 text-blue-700 border-blue-200 font-mono"
                                : "bg-slate-100 text-slate-700 border-slate-200 font-mono"
                            }`}
                          >
                            {u.userRole || "EMPLOYEE"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {u.companyGroup?.groupName || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {u.company ? (
                            <span>
                              {u.company.companyName} ({u.company.companyCode})
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: WORKSPACE SWITCHER */}
      {activeTab === "switcher" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Direct Tenant Workspace Navigator
            </h2>
            <p className="text-xs text-slate-500">
              As SuperAdmin, click any company below to seamlessly switch your active context and inspect their operational data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {companies.map((c) => (
              <div
                key={c.companyId}
                className="p-4 bg-white rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {c.companyCode}
                    </span>
                    {c.companyGroup && (
                      <span className="text-[10px] text-amber-700 font-semibold">
                        {c.companyGroup.groupName}
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{c.companyName}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {c.description || "Supply chain operating unit."}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {c._count?.products || 0} Products
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleJumpToCompany(c)}
                    className="h-8 text-xs bg-blue-600 hover:bg-blue-500 text-white gap-1"
                  >
                    <span>Launch</span>
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: CREATE / EDIT GROUP */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Network className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingGroup ? "Edit Group of Companies" : "Create New Group of Companies"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsGroupModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveGroup} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Group Name *
                </label>
                <Input
                  required
                  value={groupFormData.groupName}
                  onChange={(e) => setGroupFormData({ ...groupFormData, groupName: e.target.value })}
                  placeholder="e.g. Apex Global Conglomerate"
                  className="h-9 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Group Identifier Code
                  </label>
                  <Input
                    value={groupFormData.groupCode}
                    onChange={(e) => setGroupFormData({ ...groupFormData, groupCode: e.target.value })}
                    placeholder="e.g. APEX-GRP"
                    className="h-9 text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Country / Region
                  </label>
                  <Input
                    value={groupFormData.country}
                    onChange={(e) => setGroupFormData({ ...groupFormData, country: e.target.value })}
                    placeholder="e.g. United States"
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Industry / Sector
                </label>
                <Input
                  value={groupFormData.industry}
                  onChange={(e) => setGroupFormData({ ...groupFormData, industry: e.target.value })}
                  placeholder="e.g. Cold Chain, Maritime Freight, Technology"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={groupFormData.description}
                  onChange={(e) => setGroupFormData({ ...groupFormData, description: e.target.value })}
                  placeholder="Brief description of the corporate group..."
                  className="w-full text-xs p-2 rounded-lg border border-slate-200 focus:outline-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold"
                >
                  {editingGroup ? "Save Changes" : "Create Group"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: 1-CLICK TENANT PROVISIONING WIZARD */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 relative my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">
                  1-Click Multi-Tenant Provisioning Wizard
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteProvisioning} className="space-y-4">
              {/* Step 1: Corporate Group Selection */}
              <div className="p-3.5 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Network className="w-3.5 h-3.5 text-amber-700" />
                    1. Group of Companies (Parent Conglomerate)
                  </h4>
                  <label className="text-[11px] font-medium text-slate-600 flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={provisionFormData.useExistingGroup}
                      onChange={(e) =>
                        setProvisionFormData({ ...provisionFormData, useExistingGroup: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span>Attach to Existing Group</span>
                  </label>
                </div>

                {provisionFormData.useExistingGroup ? (
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Select Existing Group *
                    </label>
                    <select
                      required
                      value={provisionFormData.companyGroupId}
                      onChange={(e) =>
                        setProvisionFormData({ ...provisionFormData, companyGroupId: e.target.value })
                      }
                      className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white"
                    >
                      <option value="">-- Choose Corporate Group --</option>
                      {groups.map((g) => (
                        <option key={g.companyGroupId} value={g.companyGroupId}>
                          {g.groupName} ({g.groupCode})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        New Group Name *
                      </label>
                      <Input
                        required={!provisionFormData.useExistingGroup}
                        value={provisionFormData.groupName}
                        onChange={(e) =>
                          setProvisionFormData({ ...provisionFormData, groupName: e.target.value })
                        }
                        placeholder="e.g. Titan Industries Holding"
                        className="h-8 text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                        Group Code
                      </label>
                      <Input
                        value={provisionFormData.groupCode}
                        onChange={(e) =>
                          setProvisionFormData({ ...provisionFormData, groupCode: e.target.value })
                        }
                        placeholder="e.g. TITAN-GRP"
                        className="h-8 text-xs bg-white uppercase font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Subsidiary Company Details */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2.5">
                <h4 className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-blue-700" />
                  2. Subsidiary Operating Company (Tenant)
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Company Name *
                    </label>
                    <Input
                      required
                      value={provisionFormData.companyName}
                      onChange={(e) =>
                        setProvisionFormData({ ...provisionFormData, companyName: e.target.value })
                      }
                      placeholder="e.g. Titan Robotics Corp"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Company Code
                    </label>
                    <Input
                      value={provisionFormData.companyCode}
                      onChange={(e) =>
                        setProvisionFormData({ ...provisionFormData, companyCode: e.target.value })
                      }
                      placeholder="e.g. TITAN-01"
                      className="h-8 text-xs bg-white uppercase font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Corporate Domain
                  </label>
                  <Input
                    value={provisionFormData.companyDomain}
                    onChange={(e) =>
                      setProvisionFormData({ ...provisionFormData, companyDomain: e.target.value })
                    }
                    placeholder="e.g. titanrobotics.com"
                    className="h-8 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Step 3: Company Administrator */}
              <div className="p-3.5 bg-purple-50/50 rounded-xl border border-purple-200/80 space-y-2.5">
                <h4 className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                  3. Dedicated Company Administrator Credentials
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Admin Full Name *
                    </label>
                    <Input
                      required
                      value={provisionFormData.adminName}
                      onChange={(e) =>
                        setProvisionFormData({ ...provisionFormData, adminName: e.target.value })
                      }
                      placeholder="e.g. Daniel Vance"
                      className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                      Admin Corporate Email *
                    </label>
                    <Input
                      required
                      type="email"
                      value={provisionFormData.adminEmail}
                      onChange={(e) =>
                        setProvisionFormData({ ...provisionFormData, adminEmail: e.target.value })
                      }
                      placeholder="e.g. admin@titanrobotics.com"
                      className="h-8 text-xs bg-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                    Initial Password *
                  </label>
                  <Input
                    required
                    value={provisionFormData.adminPassword}
                    onChange={(e) =>
                      setProvisionFormData({ ...provisionFormData, adminPassword: e.target.value })
                    }
                    placeholder="Initial login password"
                    className="h-8 text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-xs"
                >
                  Provision Entire Tenant
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: ADD USER TO GROUP / COMPANY */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Provision User for Tenant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Full Name *
                </label>
                <Input
                  required
                  value={userFormData.userName}
                  onChange={(e) => setUserFormData({ ...userFormData, userName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Corporate Email *
                </label>
                <Input
                  required
                  type="email"
                  value={userFormData.userEmail}
                  onChange={(e) => setUserFormData({ ...userFormData, userEmail: e.target.value })}
                  placeholder="e.g. john@company.com"
                  className="h-9 text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Password *
                  </label>
                  <Input
                    required
                    value={userFormData.userPassword}
                    onChange={(e) => setUserFormData({ ...userFormData, userPassword: e.target.value })}
                    className="h-9 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    RBAC Role *
                  </label>
                  <select
                    value={userFormData.userRole}
                    onChange={(e) => setUserFormData({ ...userFormData, userRole: e.target.value as Role })}
                    className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white"
                  >
                    <option value="ADMIN">ADMIN (Tenant Lead)</option>
                    <option value="MANAGER">MANAGER (Operations)</option>
                    <option value="EMPLOYEE">EMPLOYEE (Staff)</option>
                    <option value="SUPERADMIN">SUPERADMIN (Platform)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Target Company Group
                </label>
                <select
                  value={userFormData.companyGroupId}
                  onChange={(e) => setUserFormData({ ...userFormData, companyGroupId: e.target.value })}
                  className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Optional Group --</option>
                  {groups.map((g) => (
                    <option key={g.companyGroupId} value={g.companyGroupId}>
                      {g.groupName} ({g.groupCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Assigned Subsidiary Company
                </label>
                <select
                  value={userFormData.companyId}
                  onChange={(e) => setUserFormData({ ...userFormData, companyId: e.target.value })}
                  className="w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">-- Standalone / Unassigned --</option>
                  {companies.map((c) => (
                    <option key={c.companyId} value={c.companyId}>
                      {c.companyName} ({c.companyCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsUserModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-xs"
                >
                  Create User
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Toaster />
    </div>
  );
}
