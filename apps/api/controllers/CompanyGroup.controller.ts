import { Request, Response } from "express";
import { prisma } from "../index";

const getAllCompanyGroups = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.companyGroup.findMany({
      include: {
        companies: {
          select: {
            companyId: true,
            companyName: true,
            companyCode: true,
            companyDomain: true,
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
        },
        users: {
          select: {
            userId: true,
            userName: true,
            userEmail: true,
            userRole: true,
            companyId: true,
          },
        },
        _count: {
          select: {
            companies: true,
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(groups);
  } catch (error: any) {
    console.error("Error fetching company groups:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch company groups" });
  }
};

const getCompanyGroup = async (req: Request, res: Response) => {
  try {
    const { companyGroupId } = req.params;
    if (!companyGroupId) {
      return res.status(400).json({ error: "companyGroupId is required" });
    }

    const group = await prisma.companyGroup.findUnique({
      where: { companyGroupId },
      include: {
        companies: {
          include: {
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
        },
        users: {
          select: {
            userId: true,
            userName: true,
            userEmail: true,
            userRole: true,
            companyId: true,
            company: {
              select: {
                companyName: true,
                companyCode: true,
              },
            },
          },
        },
        _count: {
          select: {
            companies: true,
            users: true,
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ error: "Company group not found" });
    }

    return res.status(200).json(group);
  } catch (error: any) {
    console.error("Error fetching company group:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch company group" });
  }
};

const createCompanyGroup = async (req: Request, res: Response) => {
  try {
    const { groupName, groupCode, description, logoUrl, industry, country } = req.body;

    if (!groupName) {
      return res.status(400).json({ error: "groupName is required" });
    }

    const code = groupCode
      ? groupCode.trim().toUpperCase()
      : groupName
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6) + "-GRP";

    const newGroup = await prisma.companyGroup.create({
      data: {
        groupName,
        groupCode: code,
        description: description || null,
        logoUrl: logoUrl || null,
        industry: industry || "Diversified Holdings",
        country: country || "Global",
      },
      include: {
        companies: true,
        users: true,
        _count: true,
      },
    });

    return res.status(201).json(newGroup);
  } catch (error: any) {
    console.error("Error creating company group:", error);
    if (error.code === "P2002") {
      return res.status(400).json({ error: "A company group with this code already exists." });
    }
    return res.status(500).json({ error: error.message || "Failed to create company group" });
  }
};

const updateCompanyGroup = async (req: Request, res: Response) => {
  try {
    const companyGroupId = req.params.companyGroupId || req.body.companyGroupId;
    if (!companyGroupId) {
      return res.status(400).json({ error: "companyGroupId is required" });
    }

    const { groupName, groupCode, description, logoUrl, industry, country } = req.body;

    const updated = await prisma.companyGroup.update({
      where: { companyGroupId },
      data: {
        ...(groupName && { groupName }),
        ...(groupCode && { groupCode: groupCode.trim().toUpperCase() }),
        ...(description !== undefined && { description }),
        ...(logoUrl !== undefined && { logoUrl }),
        ...(industry !== undefined && { industry }),
        ...(country !== undefined && { country }),
      },
      include: {
        companies: true,
        users: true,
        _count: true,
      },
    });

    return res.status(200).json(updated);
  } catch (error: any) {
    console.error("Error updating company group:", error);
    return res.status(500).json({ error: error.message || "Failed to update company group" });
  }
};

const deleteCompanyGroup = async (req: Request, res: Response) => {
  try {
    const { companyGroupId } = req.params;
    if (!companyGroupId) {
      return res.status(400).json({ error: "companyGroupId is required" });
    }

    // Unlink companies and users first
    await prisma.company.updateMany({
      where: { companyGroupId },
      data: { companyGroupId: null },
    });

    await prisma.user.updateMany({
      where: { companyGroupId },
      data: { companyGroupId: null },
    });

    await prisma.companyGroup.delete({
      where: { companyGroupId },
    });

    return res.status(200).json({ success: true, message: "Company group deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting company group:", error);
    return res.status(500).json({ error: error.message || "Failed to delete company group" });
  }
};

const addCompanyToGroup = async (req: Request, res: Response) => {
  try {
    const { companyGroupId, companyId } = req.body;
    if (!companyGroupId || !companyId) {
      return res.status(400).json({ error: "companyGroupId and companyId are required" });
    }

    const updatedCompany = await prisma.company.update({
      where: { companyId },
      data: { companyGroupId },
      include: { companyGroup: true },
    });

    return res.status(200).json(updatedCompany);
  } catch (error: any) {
    console.error("Error adding company to group:", error);
    return res.status(500).json({ error: error.message || "Failed to add company to group" });
  }
};

const removeCompanyFromGroup = async (req: Request, res: Response) => {
  try {
    const { companyId } = req.body;
    if (!companyId) {
      return res.status(400).json({ error: "companyId is required" });
    }

    const updatedCompany = await prisma.company.update({
      where: { companyId },
      data: { companyGroupId: null },
    });

    return res.status(200).json(updatedCompany);
  } catch (error: any) {
    console.error("Error removing company from group:", error);
    return res.status(500).json({ error: error.message || "Failed to remove company from group" });
  }
};

export default {
  getAllCompanyGroups,
  getCompanyGroup,
  createCompanyGroup,
  updateCompanyGroup,
  deleteCompanyGroup,
  addCompanyToGroup,
  removeCompanyFromGroup,
};
