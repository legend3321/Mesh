"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Truck, Calendar, User, Building2, RotateCcw } from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCompany } from "@/app/components/CompanyContext";
import type { Delivery, Customer, Warehouse, RMA, Order, Product, BinLocation } from "@mesh/types";
import RmaSection from "./RmaSection";

export default function DeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentQueryTab = searchParams.get("tab");

  const { activeCompanyId } = useCompany();
  const [activeTab, setActiveTab] = useState<"outbound" | "rma">(
    currentQueryTab === "rma" ? "rma" : "outbound"
  );

  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [rmas, setRmas] = useState<RMA[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [binLocations, setBinLocations] = useState<BinLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Delivery | null>(null);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetItem, setTargetItem] = useState<Delivery | null>(null);

  useEffect(() => {
    if (currentQueryTab === "rma") {
      setActiveTab("rma");
    } else {
      setActiveTab("outbound");
    }
  }, [currentQueryTab]);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [delivRes, custRes, whRes, rmaRes, orderRes, prodRes, binRes] = await Promise.all([
        api.get("/delivery/getAll"),
        api.get("/customer/getAll"),
        api.get("/warehouse/getAll"),
        api.get("/rma/getAll"),
        api.get("/order/getAll"),
        api.get("/product/getAll"),
        api.get("/bin-location/getAll"),
      ]);
      setDeliveries(delivRes.data);
      setCustomers(custRes.data);
      setWarehouses(whRes.data);
      setRmas(rmaRes.data);
      setOrders(orderRes.data);
      setProducts(prodRes.data);
      setBinLocations(binRes.data);

      if (selectedItem) {
        const found = delivRes.data.find((d: Delivery) => d.DeliveryID === selectedItem.DeliveryID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching logistics data",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (newTab: "outbound" | "rma") => {
    setActiveTab(newTab);
    if (newTab === "rma") {
      router.push("/dashboard/delivery?tab=rma");
    } else {
      router.push("/dashboard/delivery");
    }
  };

  const getCustomerName = (custId: string) => {
    const c = customers.find((cust) => cust.CustomerID === custId);
    return c ? c.CustomerName : custId;
  };

  const getWarehouseName = (whId?: string | null) => {
    if (!whId) return "Unassigned Warehouse";
    const w = warehouses.find((wh) => wh.WarehouseID === whId);
    return w ? w.WarehouseName : whId;
  };

  const handleOpenCreate = () => {
    setTargetItem(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (deliv: Delivery) => {
    setTargetItem(deliv);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSave = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      SalesDate: new Date(formData.SalesDate).toISOString(),
    };

    if (modalMode === "create") {
      const res = await api.post("/delivery/add", payload);
      toast({
        title: "Delivery logged",
        description: "Shipment dispatch recorded.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } else {
      const res = await api.patch("/delivery/edit", payload);
      toast({
        title: "Delivery updated",
        description: "Dispatch details saved.",
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    }
  };

  const handleDelete = async (deliv: Delivery) => {
    try {
      await api.delete(`/delivery/delete/${deliv.DeliveryID}`);
      toast({
        title: "Delivery deleted",
        description: "Shipment record removed.",
      });
      if (selectedItem?.DeliveryID === deliv.DeliveryID) {
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

  const tableColumns: ColumnConfig<Delivery>[] = [
    {
      key: "DeliveryID",
      header: "Delivery ID",
      sortable: true,
      render: (d) => (
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <span className="font-mono tabular-nums text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200/80 px-1.5 py-0.5 rounded-md">
            {d.DeliveryID}
          </span>
        </div>
      ),
    },
    {
      key: "CustomerID",
      header: "Recipient customer",
      sortable: true,
      render: (d) => (
        <Link
          href={`/dashboard/customer?id=${d.CustomerID}`}
          className="text-xs font-medium text-zinc-900 hover:text-[#FD3706] transition-colors duration-150 flex items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{getCustomerName(d.CustomerID)}</span>
        </Link>
      ),
    },
    {
      key: "WarehouseID",
      header: "Fulfillment origin",
      sortable: true,
      render: (d) =>
        d.WarehouseID ? (
          <Link
            href={`/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(d.WarehouseID))}`}
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium text-zinc-700 bg-zinc-50 border border-zinc-200/80 hover:bg-zinc-100 hover:text-zinc-900 transition-colors duration-150 w-fit"
            onClick={(e) => e.stopPropagation()}
          >
            <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
            <span>{getWarehouseName(d.WarehouseID)}</span>
          </Link>
        ) : (
          <span className="text-xs text-zinc-400 font-mono">Unassigned</span>
        ),
    },
    {
      key: "SalesDate",
      header: "Dispatch date",
      sortable: true,
      render: (d) => (
        <span className="inline-flex items-center gap-1.5 text-zinc-600 font-mono tabular-nums text-xs">
          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          {d.SalesDate
            ? new Date(d.SalesDate).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "2-digit",
              })
            : "—"}
        </span>
      ),
    },
  ];

  const drawerFields: DrawerField<Delivery>[] = [
    {
      label: "Delivery ID",
      render: (d) => (
        <span className="font-mono tabular-nums text-xs text-zinc-900 font-medium">
          {d.DeliveryID}
        </span>
      ),
    },
    {
      label: "Customer account",
      render: (d) => (
        <span className="text-xs text-zinc-900 font-medium">
          {getCustomerName(d.CustomerID)}
        </span>
      ),
    },
    {
      label: "Fulfillment origin facility",
      render: (d) => (
        <div className="flex items-center gap-1.5 text-xs text-zinc-800">
          <Building2 className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <span>{getWarehouseName(d.WarehouseID)}</span>
        </div>
      ),
    },
    {
      label: "Scheduled dispatch date",
      render: (d) =>
        d.SalesDate ? (
          <span className="font-mono tabular-nums text-xs text-zinc-700">
            {new Date(d.SalesDate).toLocaleString()}
          </span>
        ) : (
          <span className="text-zinc-400 text-xs">—</span>
        ),
    },
  ];

  const modalFields: ModalFormField[] = [
    {
      name: "CustomerID",
      label: "Customer",
      type: "select",
      required: true,
      options: customers.map((c) => ({
        label: `${c.CustomerName} (${c.CustomerAddress})`,
        value: c.CustomerID,
      })),
    },
    {
      name: "WarehouseID",
      label: "Fulfillment warehouse (origin)",
      type: "select",
      options: warehouses.map((w) => ({
        label: w.WarehouseName,
        value: w.WarehouseID,
      })),
    },
    {
      name: "SalesDate",
      label: "Sales / delivery date",
      type: "datetime-local",
      required: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Deliveries & reverse logistics
          </h1>
          <p className="text-xs text-zinc-500 mt-1">
            Outbound dispatch manifests, warehouse fulfillment origins, and return authorizations
          </p>
        </div>
        {activeTab === "outbound" && (
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              disabled={loading}
              className="h-9 px-3 gap-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg transition-colors duration-150"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 px-3.5 gap-1.5 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white rounded-lg shadow-2xs transition-colors duration-150 cursor-pointer"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              Create delivery
            </Button>
          </div>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b border-zinc-200/80 -mb-2">
        <button
          type="button"
          onClick={() => handleTabChange("outbound")}
          className={`group relative flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors duration-150 cursor-pointer ${
            activeTab === "outbound"
              ? "text-zinc-900 font-semibold"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <Truck className="w-4 h-4 text-zinc-500 group-hover:text-zinc-700 shrink-0" strokeWidth={1.5} />
          <span>Outbound dispatch</span>
          <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/80">
            {deliveries.length}
          </span>
          {activeTab === "outbound" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FD3706]" />
          )}
        </button>
        <button
          type="button"
          onClick={() => handleTabChange("rma")}
          className={`group relative flex items-center gap-2 px-3.5 py-2 text-xs font-medium transition-colors duration-150 cursor-pointer ${
            activeTab === "rma"
              ? "text-zinc-900 font-semibold"
              : "text-zinc-500 hover:text-zinc-800"
          }`}
        >
          <RotateCcw className="w-4 h-4 text-zinc-500 group-hover:text-zinc-700 shrink-0" strokeWidth={1.5} />
          <span>Returns & RMA intake</span>
          <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200/80">
            {rmas.length}
          </span>
          {activeTab === "rma" && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FD3706]" />
          )}
        </button>
      </div>

      {activeTab === "outbound" ? (
        <>
          <GenericEntityTable
            data={deliveries}
            columns={tableColumns}
            idKey="DeliveryID"
            searchPlaceholder="Search deliveries..."
            selectedItem={selectedItem}
            onSelect={(item) => setSelectedItem(item)}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
            emptyMessage="No delivery records found. Record your first dispatch."
          />

          <GenericEntityDrawer
            title={selectedItem ? `Delivery ${selectedItem.DeliveryID.slice(-8)}` : "Delivery manifest"}
            subtitle="Dispatch manifest"
            item={selectedItem}
            icon={<Truck className="w-4 h-4 text-zinc-600" strokeWidth={1.5} />}
            fields={drawerFields}
            relatedLinks={[
              {
                label: "Recipient customer account",
                sublabel: "View customer address and order fulfillment profile",
                href: (d) => `/dashboard/customer?id=${d.CustomerID}`,
              },
              ...(selectedItem?.WarehouseID
                ? [
                    {
                      label: "Fulfillment origin facility",
                      sublabel: `Inspect stock warehouse (${getWarehouseName(selectedItem.WarehouseID)})`,
                      href: (d: Delivery) =>
                        `/dashboard/warehouse?q=${encodeURIComponent(getWarehouseName(d.WarehouseID))}`,
                    },
                  ]
                : []),
              {
                label: "Associated payments & invoices",
                sublabel: `Browse payments linked to delivery ${selectedItem?.DeliveryID.slice(-8)}`,
                href: (d) => `/dashboard/payment?q=${encodeURIComponent(d.DeliveryID)}`,
              },
            ]}
            onClose={() => setSelectedItem(null)}
            onEdit={handleOpenEdit}
            onDelete={handleDelete}
          />

          <GenericEntityModal
            isOpen={isModalOpen}
            title="Delivery"
            item={targetItem}
            mode={modalMode}
            fields={modalFields}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleSave}
          />
        </>
      ) : (
        <RmaSection
          rmas={rmas}
          customers={customers}
          orders={orders}
          products={products}
          warehouses={warehouses}
          binLocations={binLocations}
          loading={loading}
          onRefresh={fetchData}
        />
      )}

      <Toaster />
    </div>
  );
}
