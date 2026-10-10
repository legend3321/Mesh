import { Request, Response } from "express";
import { prisma } from "../index";

const addProduct = async (req: Request, res: Response) => {
  try {
    const newProduct = await prisma.product.create({
      data: req.body,
    });

    res.status(200).json(newProduct);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editProduct = async (req: Request, res: Response) => {
  try {
    const { ProductID, ...updateData } = req.body;

    const updatedProduct = await prisma.product.update({
      where: {
        ProductID: ProductID,
      },
      data: updateData,
    });

    res.status(200).json(updatedProduct);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllProducts = async (req: Request, res: Response) => {
  try {
    console.log("Getting all products");
    const products = await prisma.product.findMany({});

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
