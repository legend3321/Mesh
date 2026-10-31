"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  Building2,
  Globe,
  CheckCircle2,
  ArrowRight,
  Network,
} from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { useCompany } from "@/app/components/CompanyContext";
import type { Company, Role } from "@mesh/types";

export default function CompanyManagementPage() {
  const { data: session } = useSession();
  const {
    companies,
    currentCompany,
    activeCompanyId,
    setCurrentCompanyId,
    refreshCompanies,
  } = useCompany();

  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Company | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Company | null>(null);

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as Role;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const isAdmin = currentUserRole === "ADMIN" || isSuperAdmin;

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      await refreshCompanies();
    } catch (err: any) {
      toast({
        title: "Error fetching companies",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (company: Company) => {
    setTargetItem(company);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (formData: Record<string, any>) => {
    try {
      if (modalMode === "create") {
        await api.post("/company/add", formData);
        toast({
          title: "Company Registered",
          description: `Company ${formData.companyName} has been created successfully.`,
        });
      } else {
        await api.patch(`/company/edit/${targetItem?.companyId}`, {
          companyId: targetItem?.companyId,
          ...formData,
        });
        toast({
          title: "Company Updated",
          description: `Company details updated successfully.`,
        });
      }
      setIsModalOpen(false);
      await refreshCompanies();
    } catch (err: any) {
      toast({
        title: `Failed to ${modalMode} company`,
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (company: Company) => {
    if (
      !confirm(
        `Are you sure you want to delete company "${company.companyName}"? This will unlink affiliated users.`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/company/delete/${company.companyId}`);
      toast({
        title: "Company Deleted",
        description: `${company.companyName} was removed from the system.`,
      });
      if (activeCompanyId === company.companyId) {
        setCurrentCompanyId("all");
      }
      await refreshCompanies();
      if (selectedItem?.companyId === company.companyId) {
        setSelectedItem(null);
      }
    } catch (err: any) {
      toast({
        title: "Failed to delete company",
        description: err.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const handleSwitchTenant = (company: Company) => {
    setCurrentCompanyId(company.companyId);
    toast({
      title: "Active Tenant Switched",
      description: `Switched context to ${company.companyName} (${company.companyCode}). All telemetry and records are now scoped to this organization.`,
    });
  };

  // Table Columns
  const columns: ColumnConfig<Company>[] = [
    {
      key: "companyName",
      header: "Organization Name",
      sortable: true,
      render: (row) => {
        const isCurrent = activeCompanyId === row.companyId;
        return (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {row.companyCode ? row.companyCode.slice(0, 2) : "CO"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-900">{row.companyName}</span>
                {isCurrent && (
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-xs bg-emerald-600 shrink-0" />
                    Active
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-500">{row.companyDomain || "Internal Organization"}</span>
            </div>
          </div>
        );
      },
    },
    {
      key: "companyCode",
      header: "Tenant Code",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          {row.companyCode}
        </span>
      ),
    },
    {
      key: "companyGroupId",
      header: "Corporate Group",
      render: (row) =>
        row.companyGroup ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Network className="w-3 h-3 text-amber-600" />
            {row.companyGroup.groupName}
          </span>
        ) : (
          <span className="text-xs text-slate-400 italic">Independent</span>
        ),
    },
    {
      key: "description",
      header: "Domain / Description",
      render: (row) => (
        <span className="text-xs text-slate-600 line-clamp-1 max-w-xs">
          {row.description || row.companyDomain || "—"}
        </span>
      ),
    },
    {
      key: "companyId",
      header: "Switch Tenant",
      render: (row) => {
        const isCurrent = activeCompanyId === row.companyId;
        if (isCurrent) {
          return (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Active Tenant
            </span>
          );
        }
        return (
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              handleSwitchTenant(row);
            }}
            className="h-7 text-xs gap-1 border-blue-200 text-blue-600 hover:bg-blue-50"
          >
            <span>Switch</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        );
      },
    },
  ];

  // Drawer Fields
  const drawerFields: DrawerField<Company>[] = [
    {
      label: "Tenant ID",
      render: (item) => (
        <code className="text-xs font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
          {item.companyId}
        </code>
      ),
    },
    { label: "Company Name", key: "companyName" },
    {
      label: "Tenant Code",
      render: (item) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
          {item.companyCode}
        </span>
      ),
    },
    { label: "Domain", key: "companyDomain" },
    { label: "Description", key: "description" },
    {
      label: "Registered At",
      render: (item) =>
        item.createdAt ? new Date(item.createdAt).toLocaleString() : "—",
    },
  ];

  // Modal Form Fields
  const modalFields: ModalFormField[] = [
    {
      name: "companyName",
      label: "Company / Organization Name",
      type: "text",
      required: true,
      placeholder: "e.g. Apex Logistics Corp",
      defaultValue: targetItem?.companyName || "",
    },
    {
      name: "companyCode",
      label: "Tenant Identifier Code",
      type: "text",
      required: true,
      placeholder: "e.g. APEX-01 (uppercase unique code)",
      defaultValue: targetItem?.companyCode || "",
    },
    {
      name: "companyDomain",
      label: "Company Domain (Optional)",
      type: "text",
      placeholder: "e.g. apexlogistics.com",
      defaultValue: targetItem?.companyDomain || "",
    },
    {
      name: "description",
      label: "Organization Description",
      type: "text",
      placeholder: "Freight distribution, cold chain, retail...",
      defaultValue: targetItem?.description || "",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Multi-Tenancy Organizations
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full border bg-blue-50 text-blue-700 border-blue-200">
              Tenant Management
            </span>
          </div>
          <p className="text-sm text-slate-500">
            Provision, inspect, and isolate distinct enterprise companies, departments, and client tenants.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCompanies}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-slate-700 bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 gap-1.5 text-xs bg-[#FD3706] hover:bg-[#E02E00] text-white font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Company
            </Button>
          )}
        </div>
      </div>

      {/* Tenancy Overview Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Registered Companies</p>
            <p className="text-xl font-bold text-slate-900">{companies.length}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Active Tenant Scope</p>
            <p className="text-base font-bold text-slate-900 truncate">
              {activeCompanyId === "all"
                ? "Global (All Tenants)"
                : currentCompany?.companyName || "Default Tenant"}
            </p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Multi-Tenancy Mode</p>
            <p className="text-sm font-bold text-slate-900">
              Shared DB &bull; Scoped Isolation
            </p>
          </div>
        </div>
      </div>

      {/* Companies Table */}
      <GenericEntityTable
        data={companies}
        columns={columns}
        idKey="companyId"
        searchKey="companyName"
        searchPlaceholder="Search companies by name, code, domain..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No companies registered yet."
      />

      {/* Detail Drawer */}
      <GenericEntityDrawer
        title={selectedItem?.companyName || "Company Details"}
        subtitle={`Tenant Code: ${selectedItem?.companyCode || ""}`}
        item={selectedItem}
        icon={<Building2 className="w-6 h-6 text-blue-600" />}
        fields={drawerFields}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      {/* Create / Edit Modal */}
      <GenericEntityModal
        isOpen={isModalOpen}
        title={modalMode === "create" ? "Register New Company" : "Edit Company Profile"}
        item={targetItem}
        mode={modalMode}
        fields={modalFields}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleFormSubmit}
      />

      <Toaster />
    </div>
  );
}
