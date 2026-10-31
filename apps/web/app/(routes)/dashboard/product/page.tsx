"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, Layers, ArrowUp, ArrowDown } from "lucide-react";
import ProductTable from "@/app/components/ProductTable";
import ProductDrawer from "@/app/components/ProductDrawer";
import ProductModal from "@/app/components/ProductModal";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "@/components/ui/use-toast";
import { useCompany } from "@/app/components/CompanyContext";
import type { Product } from "@mesh/types";

export default function ProductDashboardPage() {
  const { activeCompanyId } = useCompany();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Product for right side detail drawer
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Create / Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, [activeCompanyId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get("/product/getAll");
      setProducts(response.data);

      // Keep selected product in sync if it was edited
      if (selectedProduct) {
        const updated = response.data.find(
          (p: Product) => p.ProductID === selectedProduct.ProductID
        );
        setSelectedProduct(updated || null);
      }
    } catch (error: any) {
      console.error(error);
      toast({
        title: "Error fetching catalog",
        description: error.message || "Failed to load products from server.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setTargetProduct(null);
    setModalMode("create");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setTargetProduct(product);
    setModalMode("edit");
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (formData: Partial<Product>) => {
    if (modalMode === "create") {
      const response = await api.post("/product/add", formData);
      toast({
        title: "Product created",
        description: `Successfully added ${formData.ProductName} to the catalog.`,
      });
      await fetchProducts();
      // Select the newly created product in drawer
      if (response.data) {
        setSelectedProduct(response.data);
      }
    } else {
      const response = await api.patch("/product/edit", formData);
      toast({
        title: "Product updated",
        description: `Changes to ${formData.ProductName} have been saved.`,
      });
      if (response.data) {
        setSelectedProduct(response.data);
      }
      await fetchProducts();
    }
  };

  const handleDeleteProduct = async (product: Product) => {
    try {
      await api.delete(`/product/delete/${product.ProductID}`);
      toast({
        title: "Product deleted",
        description: `Removed ${product.ProductName} from database.`,
      });
      if (selectedProduct?.ProductID === product.ProductID) {
        setSelectedProduct(null);
      }
      await fetchProducts();
    } catch (err: any) {
      toast({
        title: "Failed to delete product",
        description: err.response?.data?.message || err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b border-zinc-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">
              Product Catalog
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700 font-mono text-xs tabular-nums">
              {products.length} items
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-1">
            Manage SKU definitions, dimensional logistics, pricing, and storage compliance. Click any item to inspect its details.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={loading}
            className="h-9 px-3 bg-white border-zinc-200 text-zinc-800 hover:bg-zinc-50 rounded-lg text-xs font-medium shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-zinc-500 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreateModal}
            className="h-9 px-3.5 bg-[#FD3706] hover:bg-[#E02E00] text-white text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-white shrink-0" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <ProductTable
        products={products}
        selectedProduct={selectedProduct}
        onSelectProduct={(p) => setSelectedProduct(p)}
        onEditProduct={handleOpenEditModal}
        onDeleteProduct={handleDeleteProduct}
      />

      {/* Right-side Detail Drawer Panel */}
      <ProductDrawer
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onEdit={handleOpenEditModal}
        onDelete={handleDeleteProduct}
      />

      {/* Create / Edit Modal Form */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveProduct}
        product={targetProduct}
        mode={modalMode}
      />

      <Toaster />
    </div>
  );
}
