"use client";

import React, { useEffect, useState } from "react";
import api from "@/app/assets/api";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import ProductTable from "@/app/components/ProductTable";

interface Product {
  ProductID: string;
  ProductCode: string;
  BarCode: string;
  ProductName: string;
  ProductDescription: string;
  ProductCategory: string;
  ReorderQuantity?: number;
  PackedWeight?: number;
  PackedHeight?: number;
  PackedWidth?: number;
  PackedDepth?: number;
  Refrigerated?: boolean;
  CostPrice: number;
  SellPrice: number;
  MaxretailPrice: number;
}

const Page: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [newProduct, setNewProduct] = useState<Product>({
    ProductID: "",
    ProductCode: "",
    BarCode: "",
    ProductName: "",
    ProductDescription: "",
    ProductCategory: "",
    CostPrice: 0,
    SellPrice: 0,
    MaxretailPrice: 0,
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await api.get("/product/getAll");

      setProducts(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const createProduct = async () => {
    try {
      await api.post("/api/products", newProduct);
      setNewProduct({
        ProductID: "",
        ProductCode: "",
        BarCode: "",
        ProductName: "",
        ProductDescription: "",
        ProductCategory: "",
        CostPrice: 0,
        SellPrice: 0,
        MaxretailPrice: 0,
      });
      fetchProducts();
    } catch (error) {
      console.error(error);
    }
  };

  const editProduct = async (product: Product) => {
    try {
      await api.put(`/api/products/${product.ProductID}`, product);
      fetchProducts();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="w-full">
      <div className="flex justify-between">
        <h1 className="text-3xl">Product List</h1>
        <div className="">
          <Button className="mr-4">
            <ArrowUp className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant={"outline"}>
            <ArrowDown className="mr-2 h-4 w-4" />
            Import
          </Button>
        </div>
      </div>

      <div className="my-4">
        <ProductTable products={products} />
      </div>

      <form>
        <input
          type="text"
          placeholder="Product Code"
          value={newProduct.ProductCode}
          onChange={(e) =>
            setNewProduct({ ...newProduct, ProductCode: e.target.value })
          }
        />
        {/* ...other input fields... */}
        <button onClick={createProduct}>Create</button>
      </form>
    </div>
  );
};

export default Page;
