"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, UserCheck, Shield, Key, Mail, Lock, Crown } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { useCompany } from "@/app/components/CompanyContext";
import type { User, Role } from "@mesh/types";

export default function UserManagementPage() {
  const { data: session } = useSession();
  const { companies, activeCompanyId } = useCompany();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<User | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<User | null>(null);

  const currentUserRole = ((session?.user as any)?.userRole || "EMPLOYEE") as Role;
  const isSuperAdmin = currentUserRole === "SUPERADMIN";
  const isAdmin = currentUserRole === "ADMIN" || isSuperAdmin;

  useEffect(() => {
    fetchUsers();
  }, [activeCompanyId]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get("/auth/users/getAll");
      // Filter out SUPERADMIN users for non-superadmin views
      const visibleUsers = isSuperAdmin
        ? res.data
        : (res.data || []).filter((u: User) => u.userRole !== "SUPERADMIN");
      setUsers(visibleUsers);
      if (selectedItem) {
        const found = visibleUsers.find((u: User) => u.userId === selectedItem.userId);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching system users",
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

  const handleOpenEdit = (user: User) => {
    setTargetItem(user);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    if (modalMode === "create") {
      const res = await api.post("/auth/users/add", formData);
      toast({
        title: "User created",
        description: `Successfully provisioned ${formData.userName} (${formData.userRole}).`,
      });
      await fetchUsers();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/auth/users/edit", formData);
      toast({
        title: "User updated",
        description: `Updated profile & permissions for ${formData.userName}.`,
      });
      await fetchUsers();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (user: User) => {
    if ((session?.user as any)?.id === user.userId) {
      toast({
        title: "Action Prohibited",
        description: "You cannot delete your own active administrative account.",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.delete(`/auth/users/delete/${user.userId}`);
      toast({
        title: "User deleted",
        description: `Removed account for ${user.userName}.`,
      });
      if (selectedItem?.userId === user.userId) {
        setSelectedItem(null);
      }
      await fetchUsers();
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role?: Role | null) => {
    switch (role) {
      case "SUPERADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-amber-600 shrink-0" />
            SUPERADMIN
          </span>
        );
      case "ADMIN":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-purple-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-purple-600 shrink-0" />
            ADMIN
          </span>
        );
      case "MANAGER":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600">
            <span className="w-1.5 h-1.5 rounded-xs bg-blue-600 shrink-0" />
            MANAGER
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span className="w-1.5 h-1.5 rounded-xs bg-slate-400 shrink-0" />
            EMPLOYEE
          </span>
        );
    }
  };

  const tableColumns: ColumnConfig<User>[] = [
    {
      key: "userName",
      header: "User Full Name",
      sortable: true,
      render: (u) => (
        <div className="font-semibold text-slate-900 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
            {u.userName.charAt(0).toUpperCase()}
          </div>
          <span>{u.userName}</span>
        </div>
      ),
    },
    {
      key: "userEmail",
      header: "Email Address",
      sortable: true,
      render: (u) => (
        <span className="inline-flex items-center gap-1.5 text-slate-600 text-xs">
          <Mail className="w-3.5 h-3.5 text-slate-400" />
          {u.userEmail}
        </span>
      ),
    },
    {
      key: "userRole",
      header: "Assigned Role (RBAC)",
      sortable: true,
      render: (u) => getRoleBadge(u.userRole),
    },
    {
      key: "companyId",
      header: "Organization (Tenant)",
      render: (u: any) => {
        const comp = u.company;
        if (!comp) {
          return <span className="text-xs text-slate-400 italic">Unassigned</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-800">{comp.companyName}</span>
            <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {comp.companyCode}
            </span>
          </div>
        );
      },
    },
    {
      key: "userId",
      header: "Account ID",
      render: (u) => (
        <code className="text-xs font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {u.userId}
        </code>
      ),
    },
  ];

  const drawerFields: DrawerField<User>[] = [
    { label: "Display Name", key: "userName" },
    { label: "Corporate Email", key: "userEmail" },
    {
      label: "Access Tier (Role-Based Access Control)",
      render: (u) => getRoleBadge(u.userRole),
    },
    {
      label: "Assigned Company (Tenant)",
      render: (u: any) =>
        u.company ? `${u.company.companyName} (${u.company.companyCode})` : "Unassigned",
    },
    {
      label: "Role Capabilities",
      render: (u) => {
        if (u.userRole === "ADMIN") {
          return "Full system access: Manage user accounts, role allocations, system transactions, and operational ledgers.";
        }
        if (u.userRole === "MANAGER") {
          return "Operational leadership: Authorize purchases, review shipments, oversee warehouses and inventory.";
        }
        return "Standard operations: View inventory catalogs, track logistics, and record transactional logs.";
      },
    },
    { label: "User ID", key: "userId" },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "userName",
      label: "Full Name",
      type: "text",
      required: true,
      placeholder: "e.g. Sarah Connor",
      defaultValue: targetItem?.userName || "",
    },
    {
      name: "userEmail",
      label: "Corporate Email",
      type: "text",
      required: true,
      placeholder: "s.connor@mesh.com",
      defaultValue: targetItem?.userEmail || "",
    },
    {
      name: "companyId",
      label: "Company / Organization",
      type: "select",
      defaultValue: (targetItem as any)?.companyId || (companies[0]?.companyId || ""),
      options: companies.map((c) => ({
        label: `${c.companyName} (${c.companyCode})`,
        value: c.companyId,
      })),
    },
    {
      name: "userRole",
      label: "Role (RBAC Privilege Level)",
      type: "select",
      required: true,
      defaultValue: targetItem?.userRole || "EMPLOYEE",
      options: [
        ...(isSuperAdmin
          ? [{ label: "SUPERADMIN (Global Multi-Tenant Platform Control)", value: "SUPERADMIN" }]
          : []),
        { label: "ADMIN (Company Admin & User Management)", value: "ADMIN" },
        { label: "MANAGER (Operational & Inventory Control)", value: "MANAGER" },
        { label: "EMPLOYEE (Standard Staff & Logistics Access)", value: "EMPLOYEE" },
      ],
    },
    {
      name: "userPassword",
      label: modalMode === "create" ? "Initial Password" : "New Password (leave empty to keep current)",
      type: "text",
      placeholder: modalMode === "create" ? "Enter temporary password" : "Leave blank to preserve password",
      required: modalMode === "create",
    },
  ];

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-xl border border-slate-200">
        <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Restricted Administration Zone</h2>
        <p className="text-sm text-slate-500 max-w-md mt-1 mb-4">
          You are currently signed in with role <strong className="text-slate-800">{currentUserRole}</strong>. 
          User account administration and role provisioning is reserved exclusively for system administrators.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            User Administration & RBAC
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Provision user credentials, assign role-based permissions, and audit corporate team access.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-slate-700 bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 gap-1.5 text-xs bg-[#FD3706] hover:bg-[#E02E00] text-white shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            Add User Account
          </Button>
        </div>
      </div>

      <GenericEntityTable
        data={users}
        columns={tableColumns}
        idKey="userId"
        searchKey="userName"
        searchPlaceholder="Search users by name or email..."
        selectedItem={selectedItem}
        onSelect={(item) => setSelectedItem(item)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
        emptyMessage="No users found."
      />

      <GenericEntityDrawer
        title={selectedItem?.userName || "User"}
        subtitle="Identity & Role"
        item={selectedItem}
        icon={<UserCheck className="w-5 h-5 text-blue-600" />}
        fields={drawerFields}
        relatedLinks={[
          {
            label: "User Transaction Audit Trail",
            sublabel: `Browse ledger events executed by ${selectedItem?.userName || "this user"}`,
            href: (u) => `/dashboard/transaction?q=${encodeURIComponent(u.userId)}`,
          },
        ]}
        onClose={() => setSelectedItem(null)}
        onEdit={handleOpenEdit}
        onDelete={handleDelete}
      />

      <GenericEntityModal
        isOpen={isModalOpen}
        title="User Account"
        item={targetItem}
        mode={modalMode}
        fields={modalFields}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSave}
      />

      <Toaster />
    </div>
  );
}
