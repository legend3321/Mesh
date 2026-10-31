import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addCustomer = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const data: any = {
      CustomerName: req.body.CustomerName ? String(req.body.CustomerName) : "",
      CustomerAddress: req.body.CustomerAddress ? String(req.body.CustomerAddress) : "",
      companyId: tenantId,
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
    const CustomerID = req.body.CustomerID || req.params?.CustomerID;
    if (!CustomerID) {
      return res.status(400).json({ error: "CustomerID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.customer.findFirst({
      where: {
        CustomerID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Customer not found or unauthorized" });
    }

    const updateData: any = {};
    if (req.body.CustomerName !== undefined) updateData.CustomerName = String(req.body.CustomerName);
    if (req.body.CustomerAddress !== undefined) updateData.CustomerAddress = String(req.body.CustomerAddress);
    delete updateData.companyId;

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
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Customers = await prisma.customer.findMany({
      where: { companyId: tenantId },
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
    const tenantId = getTenantId(req);
    const Customer = await prisma.customer.findFirst({
      where: {
        CustomerID: req.params.CustomerID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: { company: true },
    });

    if (!Customer) {
      return res.status(404).json({ error: "Customer not found or unauthorized" });
    }

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
    const CustomerID = req.params.CustomerID;
    if (!CustomerID) {
      return res.status(400).json({ error: "CustomerID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.customer.findFirst({
      where: {
        CustomerID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Customer not found or unauthorized" });
    }

    const Customer = await prisma.customer.delete({
      where: {
        CustomerID,
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
