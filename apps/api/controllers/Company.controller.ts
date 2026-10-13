import { Request, Response } from "express";
import { prisma } from "../index";

const getAllCompanies = async (req: Request, res: Response) => {
  try {
    const companies = await prisma.company.findMany({
      include: {
        companyGroup: true,
        _count: {
          select: {
            users: true,
            products: true,
            warehouses: true,
            orders: true,
            deliveries: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.status(200).json(companies);
  } catch (error: any) {
    console.error("Error fetching companies:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch companies" });
  }
};

const getCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const company = await prisma.company.findUnique({
      where: { companyId },
      include: {
        companyGroup: true,
        users: {
          select: {
            userId: true,
            userName: true,
            userEmail: true,
            userRole: true,
          },
        },
        _count: {
          select: {
            products: true,
            warehouses: true,
            locations: true,
            customers: true,
            orders: true,
            deliveries: true,
          },
        },
      },
    });

    if (!company) {
      return res.status(404).json({ error: "Company not found" });
    }

    return res.status(200).json(company);
  } catch (error: any) {
    console.error("Error fetching company:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch company" });
  }
};

const createCompany = async (req: Request, res: Response) => {
  try {
    const { companyName, companyCode, companyDomain, logoUrl, description, companyGroupId } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: "companyName is required" });
    }

    // Generate code if not supplied
    const code = companyCode
      ? companyCode.trim().toUpperCase()
      : companyName
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6) + "-" + Math.floor(100 + Math.random() * 900);

    const newCompany = await prisma.company.create({
      data: {
        companyName,
        companyCode: code,
        companyDomain: companyDomain || null,
        logoUrl: logoUrl || null,
        description: description || null,
        companyGroupId: companyGroupId || null,
      },
      include: {
        companyGroup: true,
      },
    });

    return res.status(201).json(newCompany);
  } catch (error: any) {
    console.error("Error creating company:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "A company with this code already exists." });
    }
    return res.status(500).json({ error: error.message || "Failed to create company" });
  }
};

const updateCompany = async (req: Request, res: Response) => {
  try {
    const companyId = req.params.companyId || req.body.companyId;
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const { companyName, companyCode, companyDomain, logoUrl, description, companyGroupId } = req.body;

    const updated = await prisma.company.update({
      where: { companyId },
      data: {
        ...(companyName && { companyName }),
        ...(companyCode && { companyCode: companyCode.trim().toUpperCase() }),
        ...(companyDomain !== undefined && { companyDomain }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(description !== undefined && { description }),
        ...(companyGroupId !== undefined && { companyGroupId: companyGroupId || null }),
      },
      include: {
        companyGroup: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error("Error updating company:", error);
    return res.status(500).json({ error: error.message || "Failed to update company" });
  }
};

const deleteCompany = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.params;
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    // Unlink users before deleting
    await prisma.user.updateMany({
      where: { companyId },
      data: { companyId: null },
    });

    await prisma.company.delete({
      where: { companyId },
    });

    return res.status(200).json({ success: true, message: "Company deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting company:", error);
    return res.status(500).json({ error: error.message || "Failed to delete company" });
  }
};

export default {
  getAllCompanies,
  getCompany,
  createCompany,
  updateCompany,
  deleteCompany,
};
