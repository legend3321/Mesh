import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      ...(tenantId && { companyId: tenantId }),
    };

    const newCustomer = await prisma.customer.create({
      data,
      include: { company: true },
    });

    res.status(200).json(newCustomer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editCustomer = async (req: Request, res: Response) => {
  try {
    const { CustomerID, ...updateData } = req.body;
    const updatedCustomer = await prisma.customer.update({
      where: {
        CustomerID: CustomerID,
      },
      data: updateData,
      include: { company: true },
    });

    res.status(200).json(updatedCustomer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllCustomers = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const Customers = await prisma.customer.findMany({
      where: tenantId ? { companyId: tenantId } : {},
      include: { company: true },
    });

    res.status(200).json(Customers);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getCustomer = async (
  req: Request<{ CustomerID: string }>,
  res: Response
) => {
  try {
    const Customer = await prisma.customer.findMany({
      where: { CustomerID: req.params.CustomerID },
      include: { company: true },
    });

    res.status(200).json(Customer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteCustomer = async (
  req: Request<{ CustomerID: string }>,
  res: Response
) => {
  try {
    const Customer = await prisma.customer.delete({
      where: {
        CustomerID: req.params.CustomerID,
      },
    });

    res.status(200).json(Customer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addCustomer,
  editCustomer,
  getAllCustomers,
  getCustomer,
  deleteCustomer,
};
