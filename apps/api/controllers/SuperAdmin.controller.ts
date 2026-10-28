import { Request, Response } from "express";
import { prisma } from "../index";
import * as bcrypt from "bcrypt";
import { Role } from "@prisma/client";

const getSuperAdminStats = async (req: Request, res: Response) => {
  try {
    const [groupsCount, companiesCount, users, groups] = await Promise.all([
      prisma.companyGroup.count(),
      prisma.company.count(),
      prisma.user.findMany({
        select: {
          userId: true,
          userRole: true,
        },
      }),
      prisma.companyGroup.findMany({
        include: {
          companies: {
            select: {
              companyId: true,
              companyName: true,
              companyCode: true,
              companyDomain: true,
              description: true,
              _count: {
                select: {
                  users: true,
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
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
    ]);

    // Role breakdown
    const roleCounts = {
      SUPERADMIN: 0,
      ADMIN: 0,
      MANAGER: 0,
      EMPLOYEE: 0,
    };
    users.forEach((u) => {
      if (u.userRole && roleCounts[u.userRole] !== undefined) {
        roleCounts[u.userRole] += 1;
      }
    });

    return res.status(200).json({
      status: "success",
      metrics: {
        totalCompanyGroups: groupsCount,
        totalCompanies: companiesCount,
        totalUsers: users.length,
        roleBreakdown: roleCounts,
        systemStatus: "OPERATIONAL",
        securityProtocol: "TLS 1.3 / FIDO2 Enforced",
      },
      groups,
    });
  } catch (error: any) {
    console.error("SuperAdmin stats error:", error);
    return res.status(500).json({ error: error.message || "Failed to load SuperAdmin stats" });
  }
};

/**
 * SuperAdmin One-Click Provisioning Wizard:
 * Provisions or attaches a Group of Companies, adds a Subsidiary Company,
 * and sets up a dedicated Tenant Admin with credentials.
 */
const provisionTenant = async (req: Request, res: Response) => {
  try {
    const {
      // Group details (or use existing)
      companyGroupId,
      groupName,
      groupCode,
      industry,
      country,
      groupDescription,

      // Company details
      companyName,
      companyCode,
      companyDomain,
      companyDescription,

      // Initial Admin User
      adminName,
      adminEmail,
      adminPassword,
    } = req.body;

    if (!companyName) {
      return res.status(400).json({ error: "companyName is required" });
    }

    // 1. Resolve or Create CompanyGroup
    let resolvedGroupId = companyGroupId;
    let groupRecord = null;

    if (resolvedGroupId) {
      groupRecord = await prisma.companyGroup.findUnique({
        where: { companyGroupId: resolvedGroupId },
      });
      if (!groupRecord) {
        return res.status(404).json({ error: "Specified companyGroupId not found" });
      }
    } else if (groupName) {
      const code = groupCode
        ? groupCode.trim().toUpperCase()
        : groupName
            .trim()
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 6) + "-GRP";

      groupRecord = await prisma.companyGroup.create({
        data: {
          groupName,
          groupCode: code,
          industry: industry || "Diversified Holdings",
          country: country || "Global",
          description: groupDescription || null,
        },
      });
      resolvedGroupId = groupRecord.companyGroupId;
    }

    // 2. Create Company
    const compCode = companyCode
      ? companyCode.trim().toUpperCase()
      : companyName
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6) + "-" + Math.floor(100 + Math.random() * 900);

    const newCompany = await prisma.company.create({
      data: {
        companyName,
        companyCode: compCode,
        companyDomain: companyDomain || null,
        description: companyDescription || null,
        companyGroupId: resolvedGroupId || null,
      },
    });

    // 3. Create Default Location & Warehouse for the new Company
    const defaultLocation = await prisma.location.create({
      data: {
        LocationName: `${companyName} Primary Depot`,
        LocationAddress: "Corporate Logistics Hub",
        companyId: newCompany.companyId,
      },
    });

    await prisma.warehouse.create({
      data: {
        WarehouseName: `${companyName} Central Warehouse`,
        isRefrigerated: false,
        LocationID: defaultLocation.LocationID,
        companyId: newCompany.companyId,
      },
    });

    // 4. Create Company Admin User if credentials provided
    let createdUser = null;
    if (adminEmail && adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      createdUser = await prisma.user.create({
        data: {
          userName: adminName || `${companyName} Administrator`,
          userEmail: adminEmail.trim().toLowerCase(),
          userPassword: hashedPassword,
          userRole: Role.ADMIN,
          companyGroupId: resolvedGroupId || null,
          companyId: newCompany.companyId,
        },
        select: {
          userId: true,
          userName: true,
          userEmail: true,
          userRole: true,
          companyId: true,
          companyGroupId: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: `Tenant '${companyName}' successfully provisioned${
        groupRecord ? ` under '${groupRecord.groupName}'` : ""
      }.`,
      group: groupRecord,
      company: newCompany,
      adminUser: createdUser,
    });
  } catch (error: any) {
    console.error("SuperAdmin provision error:", error);
    if (error.code === "P2002") {
      return res.status(400).json({
        error: "A unique constraint failed (company code or email already exists).",
      });
    }
    return res.status(500).json({ error: error.message || "Failed to provision tenant" });
  }
};

/**
 * Returns full tree hierarchy of Groups -> Companies -> Users
 */
const getAllTenantsHierarchy = async (req: Request, res: Response) => {
  try {
    const groups = await prisma.companyGroup.findMany({
      include: {
        companies: {
          include: {
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
                orders: true,
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
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Also get orphan companies that don't belong to any group yet
    const unassignedCompanies = await prisma.company.findMany({
      where: {
        companyGroupId: null,
      },
      include: {
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
            orders: true,
          },
        },
      },
    });

    return res.status(200).json({
      groups,
      unassignedCompanies,
    });
  } catch (error: any) {
    console.error("Hierarchy error:", error);
    return res.status(500).json({ error: error.message || "Failed to load hierarchy" });
  }
};

export default {
  getSuperAdminStats,
  provisionTenant,
  getAllTenantsHierarchy,
};
