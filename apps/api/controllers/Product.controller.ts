import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const sanitizeProductData = (data: any) => {
  const sanitized: any = { ...data };
  delete sanitized.ProductID;

  if (sanitized.CostPrice !== undefined) sanitized.CostPrice = parseFloat(sanitized.CostPrice) || 0;
  if (sanitized.SellPrice !== undefined) sanitized.SellPrice = parseFloat(sanitized.SellPrice) || 0;
  if (sanitized.MaxretailPrice !== undefined) sanitized.MaxretailPrice = parseFloat(sanitized.MaxretailPrice) || 0;
  if (sanitized.ReorderQuantity !== undefined && sanitized.ReorderQuantity !== null && sanitized.ReorderQuantity !== "") {
    sanitized.ReorderQuantity = parseInt(sanitized.ReorderQuantity, 10);
  } else {
    delete sanitized.ReorderQuantity;
  }
  if (sanitized.PackedWeight !== undefined && sanitized.PackedWeight !== null && sanitized.PackedWeight !== "") {
    sanitized.PackedWeight = parseFloat(sanitized.PackedWeight);
  } else {
    delete sanitized.PackedWeight;
  }
  if (sanitized.PackedHeight !== undefined && sanitized.PackedHeight !== null && sanitized.PackedHeight !== "") {
    sanitized.PackedHeight = parseFloat(sanitized.PackedHeight);
  } else {
    delete sanitized.PackedHeight;
  }
  if (sanitized.PackedWidth !== undefined && sanitized.PackedWidth !== null && sanitized.PackedWidth !== "") {
    sanitized.PackedWidth = parseFloat(sanitized.PackedWidth);
  } else {
    delete sanitized.PackedWidth;
  }
  if (sanitized.PackedDepth !== undefined && sanitized.PackedDepth !== null && sanitized.PackedDepth !== "") {
    sanitized.PackedDepth = parseFloat(sanitized.PackedDepth);
  } else {
    delete sanitized.PackedDepth;
  }
  const result: any = {};
  if (sanitized.ProductCode !== undefined) result.ProductCode = String(sanitized.ProductCode);
  if (sanitized.BarCode !== undefined) result.BarCode = String(sanitized.BarCode);
  if (sanitized.ProductName !== undefined) result.ProductName = String(sanitized.ProductName);
  if (sanitized.ProductDescription !== undefined) result.ProductDescription = String(sanitized.ProductDescription);
  if (sanitized.ProductCategory !== undefined) result.ProductCategory = String(sanitized.ProductCategory);
  if (sanitized.CostPrice !== undefined) result.CostPrice = parseFloat(sanitized.CostPrice) || 0;
  if (sanitized.SellPrice !== undefined) result.SellPrice = parseFloat(sanitized.SellPrice) || 0;
  if (sanitized.MaxretailPrice !== undefined) result.MaxretailPrice = parseFloat(sanitized.MaxretailPrice) || 0;
  if (sanitized.ReorderQuantity !== undefined && sanitized.ReorderQuantity !== null && sanitized.ReorderQuantity !== "") {
    result.ReorderQuantity = parseInt(sanitized.ReorderQuantity, 10);
  }
  if (sanitized.PackedWeight !== undefined && sanitized.PackedWeight !== null && sanitized.PackedWeight !== "") {
    result.PackedWeight = parseFloat(sanitized.PackedWeight);
  }
  if (sanitized.PackedHeight !== undefined && sanitized.PackedHeight !== null && sanitized.PackedHeight !== "") {
    result.PackedHeight = parseFloat(sanitized.PackedHeight);
  }
  if (sanitized.PackedWidth !== undefined && sanitized.PackedWidth !== null && sanitized.PackedWidth !== "") {
    result.PackedWidth = parseFloat(sanitized.PackedWidth);
  }
  if (sanitized.PackedDepth !== undefined && sanitized.PackedDepth !== null && sanitized.PackedDepth !== "") {
    result.PackedDepth = parseFloat(sanitized.PackedDepth);
  }
  if (sanitized.Refrigerated !== undefined) {
    result.Refrigerated = Boolean(sanitized.Refrigerated);
  }

  return result;
};

const addProduct = async (req: Request, res: Response) => {
  try {
    const data = sanitizeProductData(req.body);
    const tenantId = req.body.companyId || getTenantId(req);
    if (tenantId) {
      data.companyId = tenantId;
    }
    const newProduct = await prisma.product.create({
      data,
      include: { company: true },
    });

    res.status(200).json(newProduct);
  } catch (exception) {
    console.error("Error creating product:", exception);
    res.status(500).json({ error: exception });
  }
};

const editProduct = async (req: Request, res: Response) => {
  try {
    const ProductID = req.body.ProductID || req.params?.ProductID;
    if (!ProductID) {
      return res.status(400).json({ error: "ProductID is required" });
    }
    const updateData = sanitizeProductData(req.body);
    if (req.body.companyId !== undefined) {
      updateData.companyId = req.body.companyId || null;
    }

    const updatedProduct = await prisma.product.update({
      where: {
        ProductID: ProductID,
      },
      data: updateData,
      include: { company: true },
    });

    res.status(200).json(updatedProduct);
  } catch (exception) {
    console.error("Error updating product:", exception);
    res.status(500).json({ error: exception });
  }
};

const getAllProducts = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const products = await prisma.product.findMany({
      where: { companyId: tenantId },
      include: { company: true },
    });

    res.status(200).json(products);
  } catch (exception) {
    console.log(exception);
    res.status(500).json({ error: exception, message: "Error getting products" });
  }
};

const getProduct = async (
  req: Request<{ ProductID: string }>,
  res: Response
) => {
  try {
    const product = await prisma.product.findMany({
      where: { ProductID: req.params.ProductID },
    });

    res.status(200).json(product);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteProduct = async (
  req: Request<{ ProductID: string }>,
  res: Response
) => {
  try {
    const product = await prisma.product.delete({
      where: {
        ProductID: req.params.ProductID,
      },
    });

    res.status(200).json(product);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addProduct,
  editProduct,
  getAllProducts,
  getProduct,
  deleteProduct,
};
