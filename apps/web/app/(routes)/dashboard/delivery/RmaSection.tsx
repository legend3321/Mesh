"use client";

import React, { useState } from "react";
import {
  RotateCcw,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Package,
  Boxes,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import GenericEntityDrawer, { DrawerField } from "@/app/components/crud/GenericEntityDrawer";
import type { RMA, Customer, Order, Product, Warehouse, BinLocation, RMAStatus } from "@mesh/types";
import NewRmaModal from "./NewRmaModal";
import ProcessIntakeModal from "./ProcessIntakeModal";

interface RmaSectionProps {
  rmas: RMA[];
  customers: Customer[];
  orders: Order[];
  products: Product[];
  warehouses: Warehouse[];
  binLocations: BinLocation[];
  loading: boolean;
  onRefresh: () => Promise<void>;
}

export default function RmaSection({
  rmas,
  customers,
  orders,
  products,
  warehouses,
  binLocations,
  loading,
  onRefresh,
}: RmaSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedRma, setSelectedRma] = useState<RMA | null>(null);

  // Modals
  const [isNewRmaOpen, setIsNewRmaOpen] = useState(false);
  const [isIntakeOpen, setIsIntakeOpen] = useState(false);
  const [intakeTargetRma, setIntakeTargetRma] = useState<RMA | null>(null);

  const getCustomerName = (custId: string) => {
    const c = customers.find((cust) => cust.CustomerID === custId);
    return c ? c.CustomerName : custId;
  };

  const getProductName = (prodId: string) => {
    const p = products.find((prod) => prod.ProductID === prodId);
    return p ? `${p.ProductName} (${p.ProductCode})` : prodId;
  };

  const getWarehouseName = (whId?: string | null) => {
    if (!whId) return "Unassigned";
    const w = warehouses.find((wh) => wh.WarehouseID === whId);
    return w ? w.WarehouseName : whId;
  };

  const getRmaTotalCredit = (rma: RMA) => {
    return (rma.RMADetails || []).reduce((sum, d) => sum + (d.CreditAmount || 0), 0);
  };

  const getRmaTotalItems = (rma: RMA) => {
    return (rma.RMADetails || []).reduce((sum, d) => sum + (d.QuantityReturned || 0), 0);
  };

  const getStatusConfig = (status: RMAStatus | string) => {
    switch (status) {
      case "REQUESTED":
        return {
          label: "Requested",
          dotColor: "bg-amber-500",
        };
      case "RECEIVED":
        return {
          label: "Received",
          dotColor: "bg-blue-500",
        };
      case "INSPECTED":
        return {
          label: "Inspected",
          dotColor: "bg-purple-500",
        };
      case "SETTLED":
        return {
          label: "Settled",
          dotColor: "bg-emerald-500",
        };
      default:
        return {
          label: status,
          dotColor: "bg-zinc-400",
        };
    }
  };

  // Filtered RMAs
  const filteredRmas = rmas.filter((rma) => {
    const matchesSearch =
      rma.RMANumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCustomerName(rma.CustomerID).toLowerCase().includes(searchQuery.toLowerCase()) ||
      rma.Reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (rma.OrderID && rma.OrderID.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "ALL" || rma.Status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Metrics
  const totalRmasCount = rmas.length;
  const requestedCount = rmas.filter((r) => r.Status === "REQUESTED").length;
  const receivedCount = rmas.filter((r) => r.Status === "RECEIVED" || r.Status === "INSPECTED").length;
  const settledCount = rmas.filter((r) => r.Status === "SETTLED").length;
  const totalCreditIssued = rmas.reduce((sum, r) => sum + getRmaTotalCredit(r), 0);

  const drawerFields: DrawerField<RMA>[] = [
    {
      label: "RMA number",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs font-medium text-zinc-900">
          {r.RMANumber}
        </span>
      ),
    },
    {
      label: "Customer account",
      render: (r) => (
        <Link
          href={`/dashboard/customer?id=${r.CustomerID}`}
          className="text-xs font-medium text-zinc-900 hover:text-[#FD3706] transition-colors duration-150"
        >
          {getCustomerName(r.CustomerID)}
        </Link>
      ),
    },
    {
      label: "Linked outbound order",
      render: (r) =>
        r.OrderID ? (
          <span className="font-mono tabular-nums text-xs font-medium text-zinc-700 bg-zinc-50 border border-zinc-200/80 px-2 py-0.5 rounded-md">
            Order #{r.OrderID.slice(-6)}
          </span>
        ) : (
          <span className="text-zinc-400 text-xs font-mono">No linked order</span>
        ),
    },
    {
      label: "Lifecycle status",
      render: (r) => {
        const config = getStatusConfig(r.Status);
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-50 border border-zinc-200/80 text-zinc-700">
            <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} shrink-0`} />
            <span>{config.label}</span>
          </span>
        );
      },
    },
    {
      label: "Return justification",
      render: (r) => <span className="text-xs text-zinc-700">{r.Reason}</span>,
    },
    {
      label: "Total units returned",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs text-zinc-900 font-medium">
          {getRmaTotalItems(r)} {getRmaTotalItems(r) === 1 ? "unit" : "units"} ({r.RMADetails?.length || 0} line items)
        </span>
      ),
    },
    {
      label: "Authorized credit amount",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs font-medium text-zinc-900">
          ${getRmaTotalCredit(r).toFixed(2)}
        </span>
      ),
    },
    {
      label: "Authorized timestamp",
      render: (r) =>
        r.createdAt ? (
          <span className="font-mono tabular-nums text-xs text-zinc-600">
            {new Date(r.createdAt).toLocaleString()}
          </span>
        ) : (
          <span className="text-zinc-400 text-xs">—</span>
        ),
    },
    {
      label: "Internal record ID",
      render: (r) => (
        <span className="font-mono tabular-nums text-xs text-zinc-500">
          {r.RMAID}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Total RMAs</span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-semibold font-mono tabular-nums text-zinc-900">{totalRmasCount}</span>
            <span className="text-[11px] text-zinc-400">cases</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Requested</span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-semibold font-mono tabular-nums text-zinc-900">{requestedCount}</span>
            <span className="text-[11px] text-zinc-400">pending dock</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Intake & QC</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-semibold font-mono tabular-nums text-zinc-900">{receivedCount}</span>
            <span className="text-[11px] text-zinc-400">in inspection</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Settled & restocked</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-semibold font-mono tabular-nums text-zinc-900">{settledCount}</span>
            <span className="text-[11px] text-zinc-400">completed</span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-xl p-3.5 shadow-2xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500">Authorized credit</span>
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-lg font-semibold font-mono tabular-nums text-zinc-900">${totalCreditIssued.toFixed(2)}</span>
            <span className="text-[11px] text-zinc-400">settled</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 border border-zinc-200/80 rounded-xl shadow-2xs">
        <div className="flex flex-1 items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" strokeWidth={1.5} />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by RMA, customer, reason, order..."
              className="h-9 pl-9 pr-3 text-xs bg-white border border-zinc-200/80 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus-visible:ring-1 focus-visible:ring-zinc-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 rounded-lg border border-zinc-200/80 bg-white text-xs font-medium text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer"
            >
              <option value="ALL">All statuses</option>
              <option value="REQUESTED">Requested</option>
              <option value="RECEIVED">Received</option>
              <option value="INSPECTED">Inspected</option>
              <option value="SETTLED">Settled</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="h-9 px-3 gap-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg transition-colors duration-150"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} strokeWidth={1.5} />
            Refresh
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setIntakeTargetRma(selectedRma || (filteredRmas.length > 0 ? filteredRmas[0] : null));
              setIsIntakeOpen(true);
            }}
            className="h-9 px-3 gap-1.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 rounded-lg transition-colors duration-150"
          >
            <Boxes className="w-4 h-4 text-zinc-500" strokeWidth={1.5} />
            Process intake
          </Button>

          <Button
            size="sm"
            onClick={() => setIsNewRmaOpen(true)}
            className="h-9 px-3.5 gap-1.5 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white rounded-lg shadow-2xs transition-colors duration-150 cursor-pointer"
          >
            <Plus className="w-4 h-4" strokeWidth={1.5} />
            New RMA request
          </Button>
        </div>
      </div>

      {/* RMAs Table */}
      <div className="border border-zinc-200/80 rounded-xl overflow-hidden bg-white shadow-2xs">
        {filteredRmas.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw className="w-8 h-8 text-zinc-300 mx-auto mb-2.5" strokeWidth={1.5} />
            <h4 className="text-xs font-semibold text-zinc-900">No return authorizations found</h4>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
              No reverse logistics requests match the current filters. Initiate a new RMA request to log customer returns.
            </p>
            <Button
              size="sm"
              onClick={() => setIsNewRmaOpen(true)}
              className="h-8 px-3 text-xs font-medium bg-[#FD3706] hover:bg-[#E02E00] text-white rounded-lg gap-1.5 shadow-2xs transition-colors duration-150"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={1.5} />
              New RMA request
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-zinc-50/80 text-zinc-500 font-medium border-b border-zinc-200/80">
                  <th className="py-2.5 px-3.5 font-medium">RMA number</th>
                  <th className="py-2.5 px-3.5 font-medium">Customer</th>
                  <th className="py-2.5 px-3.5 font-medium">Linked order</th>
                  <th className="py-2.5 px-3.5 font-medium">Return reason</th>
                  <th className="py-2.5 px-3.5 font-medium">Status</th>
                  <th className="py-2.5 px-3.5 font-medium">Items</th>
                  <th className="py-2.5 px-3.5 font-medium">Total credit</th>
                  <th className="py-2.5 px-3.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRmas.map((rma) => {
                  const statusCfg = getStatusConfig(rma.Status);
                  const credit = getRmaTotalCredit(rma);
                  const itemsCount = getRmaTotalItems(rma);

                  return (
                    <tr
                      key={rma.RMAID}
                      onClick={() => setSelectedRma(rma)}
                      className={`hover:bg-zinc-50/80 transition-colors duration-150 cursor-pointer ${
                        selectedRma?.RMAID === rma.RMAID ? "bg-zinc-50/90" : ""
                      }`}
                    >
                      <td className="py-3 px-3.5">
                        <div className="flex items-center gap-2">
                          <RotateCcw className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                          <span className="font-mono tabular-nums text-xs font-medium text-zinc-900 bg-zinc-50 border border-zinc-200/80 px-1.5 py-0.5 rounded-md">
                            {rma.RMANumber}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-zinc-900">
                        {getCustomerName(rma.CustomerID)}
                      </td>
                      <td className="py-3 px-3.5">
                        {rma.OrderID ? (
                          <span className="font-mono tabular-nums text-xs text-zinc-600 bg-zinc-50 border border-zinc-200/80 px-1.5 py-0.5 rounded-md">
                            #{rma.OrderID.slice(-6)}
                          </span>
                        ) : (
                          <span className="text-zinc-400 font-mono text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 max-w-xs truncate text-zinc-600" title={rma.Reason}>
                        {rma.Reason}
                      </td>
                      <td className="py-3 px-3.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-zinc-50 border border-zinc-200/80 text-zinc-700">
                          <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor} shrink-0`} />
                          <span>{statusCfg.label}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-xs text-zinc-700">
                        {itemsCount} {itemsCount === 1 ? "unit" : "units"}
                      </td>
                      <td className="py-3 px-3.5 font-mono tabular-nums text-xs font-medium text-zinc-900">
                        ${credit.toFixed(2)}
                      </td>
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIntakeTargetRma(rma);
                              setIsIntakeOpen(true);
                            }}
                            className="h-7 px-2.5 text-xs font-medium text-zinc-700 bg-white border border-zinc-200/80 hover:bg-zinc-50 hover:text-zinc-900 rounded-md transition-colors duration-150"
                          >
                            <Boxes className="w-3.5 h-3.5 text-zinc-500 mr-1.5" strokeWidth={1.5} />
                            Process intake
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Selected RMA Inspector Drawer */}
      <GenericEntityDrawer
        title={selectedRma ? selectedRma.RMANumber : "RMA details"}
        subtitle="Reverse logistics authorization"
        item={selectedRma}
        icon={<RotateCcw className="w-4 h-4 text-zinc-600" strokeWidth={1.5} />}
        fields={drawerFields}
        customActions={(rma) => (
          <Button
            size="sm"
            onClick={() => {
              setIntakeTargetRma(rma);
              setIsIntakeOpen(true);
            }}
            className="h-8 px-3 gap-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg shadow-2xs transition-colors duration-150 cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5" strokeWidth={1.5} />
            Process return intake
          </Button>
        )}
        extraContent={
          selectedRma && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-zinc-200/80 pb-2">
                <h4 className="text-xs font-semibold text-zinc-900">
                  Returned line items ({selectedRma.RMADetails?.length || 0})
                </h4>
                <span className="text-xs font-mono tabular-nums font-medium text-zinc-900">
                  Total credit: ${getRmaTotalCredit(selectedRma).toFixed(2)}
                </span>
              </div>

              {!selectedRma.RMADetails || selectedRma.RMADetails.length === 0 ? (
                <div className="p-4 text-center text-zinc-400 text-xs bg-zinc-50 rounded-lg border border-zinc-200/80">
                  No line items attached to this RMA record
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedRma.RMADetails.map((detail, idx) => (
                    <div
                      key={detail.RMADetailID || idx}
                      className="p-3 rounded-lg border border-zinc-200/80 bg-white space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <Package className="w-3.5 h-3.5 text-zinc-400 shrink-0" strokeWidth={1.5} />
                          <span className="font-medium text-zinc-900 truncate">
                            {getProductName(detail.ProductID)}
                          </span>
                        </div>
                        <span className="font-mono tabular-nums text-xs font-medium bg-zinc-50 border border-zinc-200/80 text-zinc-800 px-2 py-0.5 rounded-md shrink-0">
                          {detail.QuantityReturned} {detail.QuantityReturned === 1 ? "unit" : "units"}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 text-xs text-zinc-600 border-t border-zinc-100">
                        <div>
                          <span className="text-zinc-400 block text-[10px]">Disposition</span>
                          <span className="font-mono tabular-nums font-medium text-zinc-900 text-xs">
                            {detail.Disposition || "PENDING"}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px]">Restock warehouse</span>
                          <span className="font-medium text-zinc-700 text-xs truncate block">
                            {getWarehouseName(detail.WarehouseID)}
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-400 block text-[10px]">Credit issued</span>
                          <span className="font-mono tabular-nums font-medium text-zinc-900 text-xs">
                            ${(detail.CreditAmount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        }
        relatedLinks={[
          {
            label: "Customer account profile",
            sublabel: "View customer address, contact details and order history",
            href: (r) => `/dashboard/customer?id=${r.CustomerID}`,
          },
          ...(selectedRma?.OrderID
            ? [
                {
                  label: "Associated sales order",
                  sublabel: `Inspect original order #${selectedRma.OrderID.slice(-6)}`,
                  href: (r: RMA) => `/dashboard/order?id=${r.OrderID}`,
                },
              ]
            : []),
          {
            label: "Inventory master ledger",
            sublabel: "Review current stock counts across warehouse bins",
            href: () => `/dashboard/inventory`,
          },
        ]}
        onClose={() => setSelectedRma(null)}
      />

      {/* New RMA Modal */}
      <NewRmaModal
        isOpen={isNewRmaOpen}
        onClose={() => setIsNewRmaOpen(false)}
        customers={customers}
        orders={orders}
        products={products}
        onSuccess={onRefresh}
      />

      {/* Process Return Intake Modal */}
      <ProcessIntakeModal
        isOpen={isIntakeOpen}
        onClose={() => setIsIntakeOpen(false)}
        rma={intakeTargetRma}
        allRmas={rmas}
        warehouses={warehouses}
        binLocations={binLocations}
        products={products}
        onSuccess={onRefresh}
      />
    </div>
  );
}
