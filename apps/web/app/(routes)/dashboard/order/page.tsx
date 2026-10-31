"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import {
  Plus,
  RefreshCw,
  ListCheck,
  Calendar,
  Building,
  DollarSign,
  Package,
  Layers,
  CheckCircle,
  Clock,
  XCircle,
  Truck,
  ShieldAlert,
  ArrowUpRight,
} from "lucide-react";
import GenericEntityTable, { ColumnConfig } from "@/app/components/crud/GenericEntityTable";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import GenericEntityModal, { ModalFormField } from "@/app/components/crud/GenericEntityModal";
import DualPaneContainer from "@/app/components/crud/DualPaneContainer";
import CompoundOrderModal from "@/app/components/crud/CompoundOrderModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import Link from "next/link";
import { useCompany } from "@/app/components/CompanyContext";
import type { Order, Provider, Product } from "@mesh/types";

export default function OrderPage() {
  const { activeCompanyId } = useCompany();
  const [orders, setOrders] = useState<Order[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<Order | null>(null);

  // Modals
  const [isCompoundModalOpen, setIsCompoundModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState<Order | null>(null);

  useEffect(() => {
    fetchData();
  }, [activeCompanyId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [ordRes, provRes, prodRes] = await Promise.all([
        api.get("/order/getAll"),
        api.get("/provider/getAll"),
        api.get("/product/getAll"),
      ]);
      setOrders(ordRes.data);
      setProviders(provRes.data);
      setProducts(prodRes.data);

      if (selectedItem) {
        const found = ordRes.data.find((o: Order) => o.OrderID === selectedItem.OrderID);
        setSelectedItem(found || null);
      }
    } catch (err: any) {
      toast({
        title: "Error fetching orders",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProviderName = (provId: string) => {
    const p = providers.find((prov) => prov.ProviderID === provId);
    return p ? p.ProviderName : provId;
  };

  // Create compound purchase order
  const handleCreateCompoundOrder = async (payload: any) => {
    try {
      const res = await api.post("/order/add", payload);
      toast({
        title: "Purchase Order Placed",
        description: `Order #${res.data?.OrderID?.slice(-6).toUpperCase()} created with ${payload.items?.length || 0} line item(s).`,
      });
      await fetchData();
      if (res.data) setSelectedItem(res.data);
    } catch (err: any) {
      toast({
        title: "Order Placement Failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
      throw err;
    }
  };

  // Edit existing order header
  const handleOpenEdit = (order: Order) => {
    setTargetItem(order);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (formData: Record<string, any>) => {
    const payload = {
      ...formData,
      OrderDate: new Date(formData.OrderDate).toISOString(),
    };

    const res = await api.patch("/order/edit", payload);
    toast({
      title: "Order Updated",
      description: "Purchase order specifications saved successfully.",
    });
    await fetchData();
    if (res.data) setSelectedItem(res.data);
  };

  const handleDelete = async (order: Order) => {
    try {
      await api.delete(`/order/delete/${order.OrderID}`);
      toast({
        title: "Order Deleted",
        description: "Purchase order removed from registry.",
      });
      if (selectedItem?.OrderID === order.OrderID) {
        setSelectedItem(null);
      }
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Delete Failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  // Inline Cell Editing handler
  const handleCellEdit = async (order: Order, field: string, newValue: any) => {
    try {
      const payload: Record<string, any> = { OrderID: order.OrderID };
      if (field === "TotalAmount" || field === "TotalNet" || field === "TotalTax") {
        payload[field] = parseFloat(newValue) || 0;
      } else if (field === "Status" || field === "OrderStatus") {
        payload.Status = newValue;
      }

      await api.patch("/order/edit", payload);
      toast({
        title: "Cell Updated",
        description: `Updated ${field} on order PO-${order.OrderID.slice(-6).toUpperCase()}`,
      });
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Cell Update Failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  // Bulk operations handler
  const handleBulkAction = async (action: string, selectedIds: string[], selectedOrders: Order[]) => {
    if (selectedIds.length === 0) return;

    try {
      if (action === "approve") {
        await api.post("/order/batch-status", {
          orderIds: selectedIds,
          status: "COMPLETED",
        });
        toast({
          title: "Orders Approved",
          description: `Successfully marked ${selectedIds.length} order(s) as COMPLETED.`,
        });
        await fetchData();
      } else if (action === "mark_shipped") {
        await api.post("/order/batch-status", {
          orderIds: selectedIds,
          status: "PROCESSING",
        });
        toast({
          title: "Orders Dispatched",
          description: `Successfully marked ${selectedIds.length} order(s) as PROCESSING / IN TRANSIT.`,
        });
        await fetchData();
      } else if (action === "cancel") {
        await api.post("/order/batch-status", {
          orderIds: selectedIds,
          status: "CANCELLED",
        });
        toast({
          title: "Orders Cancelled",
          description: `Successfully marked ${selectedIds.length} order(s) as CANCELLED.`,
        });
        await fetchData();
      } else if (action === "requisition") {
        toast({
          title: "Batch Requisition Generated",
          description: `Requisition packets queued for ${selectedIds.length} purchase order(s).`,
        });
      }
    } catch (err: any) {
      toast({
        title: "Bulk Operation Failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  // Quick single status transition from inspector
  const handleTransitionStatus = async (order: Order, newStatus: string) => {
    try {
      await api.patch("/order/edit", {
        OrderID: order.OrderID,
        Status: newStatus,
      });
      toast({
        title: "Status Transitioned",
        description: `Order PO-${order.OrderID.slice(-6).toUpperCase()} transitioned to ${newStatus}.`,
      });
      await fetchData();
    } catch (err: any) {
      toast({
        title: "Transition Failed",
        description: err?.response?.data?.error || err.message,
        variant: "destructive",
      });
    }
  };

  const tableColumns: ColumnConfig<Order>[] = [
    {
      key: "OrderID",
      header: "PO Reference",
      sortable: true,
      render: (o) => (
        <div className="font-medium text-zinc-900 flex items-center gap-2">
          <ListCheck className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <code className="text-xs font-mono tabular-nums text-zinc-800 bg-zinc-100/90 px-1.5 py-0.5 rounded-[6px] border border-zinc-200/80 tracking-tight">
            PO-{o.OrderID.slice(-6).toUpperCase()}
          </code>
        </div>
      ),
    },
    {
      key: "Status",
      header: "Status",
      sortable: true,
      editable: true,
      render: (o) => {
        const s = String(o.Status || o.OrderStatus || "INITIATED").toUpperCase();
        if (s === "COMPLETED") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Completed
            </span>
          );
        }
        if (s === "PENDING_APPROVAL") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-[6px] border border-amber-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Pending approval
            </span>
          );
        }
        if (s === "PROCESSING") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-sky-700">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              Processing
            </span>
          );
        }
        if (s === "CANCELLED") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              Cancelled
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-600">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Initiated
          </span>
        );
      },
    },
    {
      key: "ProviderID",
      header: "Vendor / Provider",
      sortable: true,
      render: (o) => (
        <Link
          href={`/dashboard/provider?id=${o.ProviderID}`}
          className="font-medium text-zinc-900 hover:text-zinc-600 hover:underline flex items-center gap-1.5 truncate text-xs transition-colors duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          <Building className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          <span className="truncate">{getProviderName(o.ProviderID)}</span>
        </Link>
      ),
    },
    {
      key: "TotalAmount",
      header: "Total Valuation",
      sortable: true,
      sortType: "numeric",
      editable: true,
      render: (o) => {
        let amt = Number(o.TotalAmount);
        if (isNaN(amt) || amt === 0) {
          const lines = o.Orderdetail || [];
          amt = lines.reduce((acc, l) => acc + (Number(l.LineTotal) || 0), 0);
        }
        const isHighValue = amt >= 10000;
        return (
          <div className="flex flex-col gap-1 items-start">
            <span className="font-mono tabular-nums font-semibold text-xs text-zinc-900">
              ${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            {isHighValue && (
              <Link
                href="/dashboard/approval"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[6px] text-[10px] font-mono font-medium text-amber-800 bg-amber-50/80 border border-amber-200/80 hover:bg-amber-100/70 transition-colors duration-150"
                title="Transaction amount exceeds $10,000 limit. Dual-control approval required."
              >
                <ShieldAlert className="w-3 h-3 text-amber-600 shrink-0" strokeWidth={1.5} />
                <span>Dual-control review →</span>
              </Link>
            )}
          </div>
        );
      },
    },
    {
      key: "OrderDate",
      header: "Purchase Date",
      sortable: true,
      sortType: "date",
      render: (o) => (
        <span className="inline-flex items-center gap-1.5 text-zinc-500 text-xs font-mono tabular-nums">
          <Calendar className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
          {o.OrderDate ? new Date(o.OrderDate).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ];

  const drawerFields: DrawerField<Order>[] = [
    { label: "Purchase order reference", render: (o) => `PO-${o.OrderID.slice(-6).toUpperCase()}` },
    {
      label: "Selected vendor",
      render: (o) => getProviderName(o.ProviderID),
    },
    {
      label: "Lifecycle state",
      render: (o) => {
        const s = String(o.Status || o.OrderStatus || "INITIATED").toUpperCase();
        if (s === "PENDING_APPROVAL") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded-[6px] border border-amber-200/80">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              Pending approval
            </span>
          );
        }
        if (s === "COMPLETED") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Completed
            </span>
          );
        }
        if (s === "PROCESSING") {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-sky-700">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              Processing
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-zinc-600">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            {s === "CANCELLED" ? "Cancelled" : "Initiated"}
          </span>
        );
      },
    },
    {
      label: "Total valuation",
      render: (o) => {
        let amt = Number(o.TotalAmount) || 0;
        if (amt === 0) {
          amt = (o.Orderdetail || []).reduce((acc, l) => acc + (Number(l.LineTotal) || 0), 0);
        }
        const isHighValue = amt >= 10000;
        return (
          <div className="space-y-2">
            <span className="font-mono tabular-nums font-semibold text-sm text-zinc-900 block">
              ${amt.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
            {isHighValue && (
              <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200/80 text-xs text-amber-900 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 font-medium text-amber-800">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.5} />
                  <span>Dual-control approval required</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Purchase orders valued at or above $10,000 require dual-control verification prior to fulfillment.
                </p>
                <Link
                  href="/dashboard/approval"
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 underline hover:text-amber-950 mt-0.5 transition-colors duration-150"
                >
                  Review approval queue <ArrowUpRight className="w-3 h-3" strokeWidth={1.5} />
                </Link>
              </div>
            )}
          </div>
        );
      },
    },
    {
      label: "Net and tax breakdown",
      render: (o) => (
        <span className="text-xs text-zinc-600 font-mono tabular-nums">
          Net: <strong className="font-mono text-zinc-800">${Number(o.TotalNet || 0).toFixed(2)}</strong> | Tax:{" "}
          <strong className="font-mono text-zinc-800">${Number(o.TotalTax || 0).toFixed(2)}</strong>
        </span>
      ),
    },
    {
      label: "Execution date",
      render: (o) => (
        <span className="text-xs text-zinc-600 font-mono tabular-nums">
          {o.OrderDate ? new Date(o.OrderDate).toLocaleString() : "—"}
        </span>
      ),
    },
  ];

  // Line items breakdown rendered inside the inspector
  const renderLineItemsInspector = (order: Order) => {
    const lines = order.Orderdetail || [];

    return (
      <div className="space-y-3 pt-3 border-t border-zinc-200/80">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-medium text-zinc-900 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
            <span>Line items ({lines.length})</span>
          </h4>
          <span className="text-[11px] text-zinc-500 font-mono tabular-nums">
            PO-{order.OrderID.slice(-6).toUpperCase()}
          </span>
        </div>

        {lines.length > 0 ? (
          <div className="rounded-lg border border-zinc-200/80 bg-white overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-500 font-mono text-[11px]">
                <tr>
                  <th className="py-2 px-3 font-medium">Product</th>
                  <th className="py-2 px-2 text-center font-medium">Qty</th>
                  <th className="py-2 px-2 text-right font-medium">Price</th>
                  <th className="py-2 px-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {lines.map((line, idx) => {
                  const prod = line.Products;
                  const prodName = prod?.ProductName || `Item ${idx + 1}`;
                  const prodCode = prod?.ProductCode || "";
                  const qty = line.OrderQuantity || 1;
                  const price = Number(line.UnitPrice) || Number(prod?.CostPrice) || 0;
                  const total = Number(line.LineTotal) || qty * price;

                  return (
                    <tr key={line.OrderDetailID || idx} className="hover:bg-zinc-50/50 transition-colors duration-150">
                      <td className="py-2 px-3">
                        <span className="font-medium text-zinc-900 block truncate max-w-[150px]">
                          {prodName}
                        </span>
                        {prodCode && (
                          <span className="text-[10px] font-mono tabular-nums text-zinc-400">
                            {prodCode}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center font-mono tabular-nums text-zinc-700">
                        {qty}
                      </td>
                      <td className="py-2 px-2 text-right font-mono tabular-nums text-zinc-500">
                        ${price.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-mono tabular-nums font-medium text-zinc-900">
                        ${total.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-zinc-400 italic">No line items attached to this order.</p>
        )}

        {/* Status Transition Action Buttons */}
        <div className="pt-2">
          <span className="text-[11px] font-medium text-zinc-500 block mb-1.5">
            Stage order transition
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTransitionStatus(order, "PROCESSING")}
              className="h-8 text-xs gap-1.5 text-zinc-700 bg-white hover:bg-zinc-50 border-zinc-200/80 rounded-lg transition-colors duration-150"
            >
              <Truck className="w-3.5 h-3.5 text-zinc-500" strokeWidth={1.5} />
              Process
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTransitionStatus(order, "COMPLETED")}
              className="h-8 text-xs gap-1.5 text-emerald-800 bg-emerald-50/60 hover:bg-emerald-100/60 border-emerald-200/80 rounded-lg transition-colors duration-150"
            >
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600" strokeWidth={1.5} />
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleTransitionStatus(order, "CANCELLED")}
              className="h-8 text-xs gap-1.5 text-zinc-600 bg-white hover:bg-zinc-50 border-zinc-200/80 hover:text-rose-600 rounded-lg transition-colors duration-150"
            >
              <XCircle className="w-3.5 h-3.5 text-zinc-400" strokeWidth={1.5} />
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const editModalFields: ModalFormField[] = [
    {
      name: "ProviderID",
      label: "Vendor / provider",
      type: "select",
      required: true,
      options: providers.map((p) => ({
        label: `${p.ProviderName} (${p.ProviderAddress})`,
        value: p.ProviderID,
      })),
    },
    {
      name: "Status",
      label: "Order status",
      type: "select",
      required: true,
      options: [
        { label: "Initiated", value: "INITIATED" },
        { label: "Processing", value: "PROCESSING" },
        { label: "Completed", value: "COMPLETED" },
        { label: "Cancelled", value: "CANCELLED" },
      ],
    },
    {
      name: "OrderDate",
      label: "Order date",
      type: "datetime-local",
      required: true,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            Purchase orders
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Enterprise procurement requisition, multi-line drafting, and maker-checker validation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8 px-3 gap-1.5 text-xs text-zinc-700 bg-white hover:bg-zinc-50 border-zinc-200/80 rounded-lg shadow-none font-medium transition-colors duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setIsCompoundModalOpen(true)}
            className="h-8 px-3 gap-1.5 text-xs bg-[#FD3706] hover:bg-[#E02E00] text-white rounded-lg shadow-none font-medium transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
            New purchase order
          </Button>
        </div>
      </div>

      {/* High-Value / Dual-Control Governance Alert Banner */}
      {orders.some((o) => (Number(o.TotalAmount) || 0) >= 10000 || o.OrderStatus === "PENDING_APPROVAL" || o.Status === "PENDING_APPROVAL") && (
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 px-4 flex items-center justify-between gap-3 text-amber-900 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" strokeWidth={1.5} />
            <span>
              <strong>Dual-control review active:</strong> High-value orders (≥ $10,000) and pending requests require secondary sign-off prior to fulfillment.
            </span>
          </div>
          <Link
            href="/dashboard/approval"
            className="inline-flex items-center gap-1 font-medium text-amber-800 hover:text-amber-950 underline shrink-0 whitespace-nowrap transition-colors duration-150"
          >
            Review approval queue <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={1.5} />
          </Link>
        </div>
      )}

      {/* In-Flow Dual-Pane Resizable Master-Detail Container */}
      <DualPaneContainer
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        detailContent={
          selectedItem ? (
            <GenericEntityDrawer
              title={`PO-${selectedItem.OrderID.slice(-6).toUpperCase()}`}
              subtitle="Purchase order requisition"
              item={selectedItem}
              icon={<ListCheck className="w-4 h-4 text-zinc-700" strokeWidth={1.5} />}
              fields={drawerFields}
              relatedLinks={[
                {
                  label: "Supplying Vendor Profile",
                  sublabel: "Inspect vendor manufacturing facility and contacts",
                  href: (o) => `/dashboard/provider?id=${o.ProviderID}`,
                },
                {
                  label: "Linked Invoices & Settlements",
                  sublabel: `Browse payments booked for purchase order #${selectedItem.OrderID.slice(-6).toUpperCase()}`,
                  href: (o) => `/dashboard/payment?q=${encodeURIComponent(o.OrderID)}`,
                },
              ]}
              extraContent={renderLineItemsInspector(selectedItem)}
              onClose={() => setSelectedItem(null)}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              mode="docked"
            />
          ) : null
        }
      >
        <GenericEntityTable
          data={orders}
          columns={tableColumns}
          idKey="OrderID"
          searchPlaceholder="Search orders by vendor, reference, or amount..."
          selectedItem={selectedItem}
          onSelect={(item) => setSelectedItem(item)}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onCellEdit={handleCellEdit}
          onBulkAction={handleBulkAction}
          exportFileName="mesh_purchase_orders"
          emptyMessage="No orders found. Generate your first compound procurement requisition."
        />
      </DualPaneContainer>

      {/* Compound Document Creation Modal */}
      <CompoundOrderModal
        isOpen={isCompoundModalOpen}
        onClose={() => setIsCompoundModalOpen(false)}
        onSubmit={handleCreateCompoundOrder}
        providers={providers}
        products={products}
      />

      {/* Standard Edit Modal */}
      <GenericEntityModal
        isOpen={isEditModalOpen}
        title="Edit purchase order"
        item={targetItem}
        mode="edit"
        fields={editModalFields}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveEdit}
      />

      <Toaster />
    </div>
  );
}
