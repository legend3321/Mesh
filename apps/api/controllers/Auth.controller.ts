import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId, RequestWithUser } from "../middleware/App.middleware";
import { getJwtSecret } from "../config/jwt";
import { handleError } from "../middleware/Error.middleware";

import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import * as crypto from "crypto";
import { Prisma } from "@prisma/client";

const createUser = async (req: Request, res: Response) => {
  try {
    const reqWithUser = req as RequestWithUser;
    const currentUser = reqWithUser.user?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";
    const isPublicRegistration = !currentUser || req.path === "/register" || req.originalUrl?.endsWith("/register");

    const { userEmail, userPassword, userName, userRole, companyId, companyGroupId } = req.body;

    // 1. Validate required basic fields
    if (!userEmail || typeof userEmail !== "string" || !userEmail.trim()) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (!userName || typeof userName !== "string" || !userName.trim()) {
      return res.status(400).json({ error: "A valid user name is required." });
    }

    // 2. Validate password (SEC-15: Disallow fallback to "mesh1234", require >= 8 chars)
    if (!userPassword || typeof userPassword !== "string" || userPassword.length < 8) {
      return res.status(400).json({
        error: "Password is required and must be at least 8 characters long.",
      });
    }

    const normalizedEmail = userEmail.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { userEmail: normalizedEmail },
    });
    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists." });
    }

    let finalRole: "SUPERADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE" = "EMPLOYEE";
    let targetCompanyId: string | null = null;
    let targetCompanyGroupId: string | null = null;

    if (isPublicRegistration) {
      // SEC-01: Disallow public registration of ADMIN or SUPERADMIN. Force userRole = "EMPLOYEE".
      if (userRole && (userRole === "ADMIN" || userRole === "SUPERADMIN")) {
        return res.status(403).json({
          error: "Access Denied: Public registration cannot create administrative roles.",
        });
      }
      finalRole = "EMPLOYEE";

      // Disallow public registration from attaching arbitrary companyGroupId
      if (companyGroupId) {
        return res.status(400).json({
          error: "Public registration cannot attach a companyGroupId.",
        });
      }

      // Disallow unverified companyId: if companyId is provided, verify it exists in the database
      if (companyId) {
        const verifiedCompany = await prisma.company.findUnique({
          where: { companyId },
        });
        if (!verifiedCompany) {
          return res.status(400).json({ error: "Invalid companyId: company does not exist." });
        }
        targetCompanyId = verifiedCompany.companyId;
        targetCompanyGroupId = verifiedCompany.companyGroupId || null;
      }
    } else {
      // Administrative user creation (/api/auth/add, /api/auth/users/add)
      // Only authenticated ADMIN or SUPERADMIN should reach here
      const requestedRole = userRole || "EMPLOYEE";
      const validRoles = ["SUPERADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];
      if (!validRoles.includes(requestedRole)) {
        return res.status(400).json({ error: `Invalid userRole: ${requestedRole}` });
      }

      // Ensure that only SUPERADMIN can create other SUPERADMIN or ADMIN roles
      if ((requestedRole === "SUPERADMIN" || requestedRole === "ADMIN") && !isSuperAdmin) {
        return res.status(403).json({
          error: "Access Denied: Only SuperAdmin can create Admin or SuperAdmin accounts.",
        });
      }
      finalRole = requestedRole as any;

      // Tenant boundary enforcement for Admin creating a user:
      if (!isSuperAdmin) {
        const allowedCompanyIds = reqWithUser.allowedCompanyIds || (currentUser?.companyId ? [currentUser.companyId] : []);
        const requestedCompanyId = companyId || currentUser?.companyId;

        if (requestedCompanyId && !allowedCompanyIds.includes(requestedCompanyId)) {
          return res.status(403).json({
            error: "Access Denied: Cannot create user in a company outside your authorized company domain.",
          });
        }
        targetCompanyId = requestedCompanyId || null;
        targetCompanyGroupId = currentUser?.companyGroupId || null;
      } else {
        targetCompanyId = companyId || null;
        targetCompanyGroupId = companyGroupId || null;
      }
    }

    // 3. SEC-15: Increase bcrypt salt rounds to 12
    const hashedPassword = await bcrypt.hash(userPassword, 12);

    const userCreateData: Prisma.UserCreateInput = {
      userEmail: normalizedEmail,
      userPassword: hashedPassword,
      userName: userName.trim(),
      userRole: finalRole,
      ...(targetCompanyId && { company: { connect: { companyId: targetCompanyId } } }),
      ...(targetCompanyGroupId && { companyGroup: { connect: { companyGroupId: targetCompanyGroupId } } }),
    };

    const newUser = await prisma.user.create({
      data: userCreateData,
      select: {
        userId: true,
        userEmail: true,
        userName: true,
        userRole: true,
        companyId: true,
        company: true,
        companyGroupId: true,
        companyGroup: true,
      },
    });

    return res.status(201).json(newUser);
  } catch (exception: any) {
    return handleError(res, exception, "Failed to create user");
  }
};

const getAllUsers = async (req: Request, res: Response) => {
  try {
    const reqWithUser = req as RequestWithUser;
    const currentUser = (reqWithUser.user as any)?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    const tenantId = getTenantId(req);
    const showAll = (req.query.all === "true" || tenantId === "all") && isSuperAdmin;

    // SuperAdmin is a platform-internal administrative role.
    // Tenant users (Customers, Company Admins, Managers, Employees) must NEVER see SUPERADMIN accounts in their user lists.
    const whereClause: any = {
      ...(showAll ? {} : tenantId ? { companyId: tenantId } : {}),
      ...(!isSuperAdmin && {
        userRole: { not: "SUPERADMIN" },
      }),
    };

    const users = await prisma.user.findMany({
      where: whereClause,
      select: {
        userId: true,
        userEmail: true,
        userName: true,
        userRole: true,
        companyId: true,
        company: true,
        companyGroupId: true,
        companyGroup: true,
      },
      orderBy: {
        userName: "asc",
      },
    });
    return res.status(200).json(users);
  } catch (exception: any) {
    return handleError(res, exception, "Failed to fetch users");
  }
};

const deleteUser = async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "userId parameter is required." });
    }

    const reqWithUser = req as RequestWithUser;
    const currentUser = reqWithUser.user?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    const targetUser = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        userEmail: true,
        userName: true,
        userRole: true,
        companyId: true,
        companyGroupId: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    // Block self-deletion of active administrative account
    if (currentUser?.userId === targetUser.userId || currentUser?.userEmail === targetUser.userEmail) {
      return res.status(400).json({ error: "You cannot delete your own active administrative account." });
    }

    // Only SUPERADMIN can delete SUPERADMIN
    if (targetUser.userRole === "SUPERADMIN" && !isSuperAdmin) {
      return res.status(403).json({ error: "Access Denied: Only SuperAdmin can delete SuperAdmin accounts." });
    }

    // Tenant boundary check: Admins can only delete users in their allowed company domain
    if (!isSuperAdmin) {
      const allowedCompanyIds = reqWithUser.allowedCompanyIds || (currentUser?.companyId ? [currentUser.companyId] : []);
      const isCompanyAllowed = targetUser.companyId && allowedCompanyIds.includes(targetUser.companyId);
      const isGroupAllowed = currentUser?.companyGroupId && targetUser.companyGroupId === currentUser.companyGroupId;

      if (!isCompanyAllowed && !isGroupAllowed) {
        return res.status(403).json({
          error: "Access Denied: You cannot delete users outside your authorized company domain.",
        });
      }
    }

    await prisma.user.delete({
      where: { userId },
    });

    return res.status(200).json({ success: true, message: "User deleted" });
  } catch (exception: any) {
    return handleError(res, exception, "Failed to delete user");
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const credentials = req.body.credentials || req.body;
    const { userEmail, userPassword } = credentials;

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        userEmail: userEmail,
      },
      include: {
        company: true,
        companyGroup: true,
      },
    });

    const passwordMatch = await bcrypt.compare(userPassword, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ error: { name: "Password Didn't Match" } });

    const {
      ["userPassword"]: removedpass,
      ["userRefreshToken"]: removedToken,
      ...newUser
    } = user;

    // SEC-07: Use validated cryptographic secret, eliminate empty string fallback
    const jwtSecret = getJwtSecret();
    const authToken = jwt.sign({ user: newUser }, jwtSecret, {
      expiresIn: "4h",
    });

    const refreshToken = jwt.sign({ user: newUser }, jwtSecret);

    if (!user.userRefreshToken) {
      await prisma.user.update({
        where: {
          userEmail: newUser.userEmail,
        },
        data: {
          userRefreshToken: refreshToken,
        },
      });
    }

    return res.status(200).json({ user: newUser, authToken });
  } catch (exception) {
    console.error("Login failed:", exception);
    return res.status(401).json({ error: { name: "User Does Nor exist" } });
  }
};

const updateUser = async (req: RequestWithUser, res: Response) => {
  try {
    const { userId, userPassword, companyId, companyGroupId, userRole, ...updateData } = req.body;

    if (!userId && !req.body.userEmail) {
      return res.status(400).json({ error: "userId or userEmail is required" });
    }

    const currentUser = req.user?.user || req.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    // 1. Find target user
    const targetUser = await prisma.user.findUnique({
      where: userId ? { userId } : { userEmail: req.body.userEmail },
    });

    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    const isSelf = currentUser && (currentUser.userId === targetUser.userId || currentUser.userEmail === targetUser.userEmail);

    // 2. Tenant boundary: Admins can only update users in their allowed company domain (req.allowedCompanyIds)
    if (!isSuperAdmin) {
      const allowedCompanyIds = req.allowedCompanyIds || (currentUser?.companyId ? [currentUser.companyId] : []);
      const isCompanyAllowed = targetUser.companyId && allowedCompanyIds.includes(targetUser.companyId);
      const isGroupAllowed = currentUser?.companyGroupId && targetUser.companyGroupId === currentUser.companyGroupId;

      // Allow if updating themselves or within their allowed company domain
      if (!isCompanyAllowed && !isGroupAllowed && !isSelf) {
        return res.status(403).json({
          error: "Access Denied: You cannot update users outside your authorized company domain.",
        });
      }

      // Check if trying to move user to an unauthorized company
      if (companyId !== undefined && companyId !== null && companyId !== "") {
        if (!allowedCompanyIds.includes(companyId)) {
          return res.status(403).json({
            error: "Access Denied: Cannot assign user to a company outside your authorized company domain.",
          });
        }
      }

      // Disallow arbitrary companyGroupId change for non-superadmin
      if (companyGroupId !== undefined && companyGroupId !== (currentUser?.companyGroupId || null)) {
        return res.status(403).json({
          error: "Access Denied: Only SuperAdmin can change company group assignments.",
        });
      }
    }

    // 3. Block privilege escalation: Users cannot escalate their own role. Only SUPERADMIN can change roles to ADMIN or SUPERADMIN.
    const dataToUpdate: any = { ...updateData };

    if (userRole !== undefined && userRole !== targetUser.userRole) {
      const validRoles = ["SUPERADMIN", "ADMIN", "MANAGER", "EMPLOYEE"];
      if (!validRoles.includes(userRole)) {
        return res.status(400).json({ error: `Invalid userRole: ${userRole}` });
      }

      // Users cannot escalate their own role
      if (isSelf && !isSuperAdmin) {
        return res.status(403).json({
          error: "Access Denied: You cannot change or escalate your own role.",
        });
      }

      // Only SUPERADMIN can change roles to ADMIN or SUPERADMIN
      if ((userRole === "ADMIN" || userRole === "SUPERADMIN") && !isSuperAdmin) {
        return res.status(403).json({
          error: "Access Denied: Only SuperAdmin can assign Admin or SuperAdmin roles.",
        });
      }

      // Target user is SUPERADMIN: only SUPERADMIN can alter their role
      if (targetUser.userRole === "SUPERADMIN" && !isSuperAdmin) {
        return res.status(403).json({
          error: "Access Denied: Only SuperAdmin can modify SuperAdmin roles.",
        });
      }

      dataToUpdate.userRole = userRole;
    }

    // Disallow non-superadmins from modifying a SUPERADMIN account
    if (targetUser.userRole === "SUPERADMIN" && !isSuperAdmin && !isSelf) {
      return res.status(403).json({
        error: "Access Denied: Only SuperAdmin can modify SuperAdmin accounts.",
      });
    }

    // Password update validation (require >= 8 chars, hash with 12 rounds)
    if (userPassword && userPassword.trim() !== "") {
      if (userPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long." });
      }
      dataToUpdate.userPassword = await bcrypt.hash(userPassword, 12);
    }

    if (companyId !== undefined) {
      dataToUpdate.companyId = companyId || null;
    }
    if (companyGroupId !== undefined && isSuperAdmin) {
      dataToUpdate.companyGroupId = companyGroupId || null;
    }

    const updatedUser = await prisma.user.update({
      where: { userId: targetUser.userId },
      data: dataToUpdate,
      select: {
        userId: true,
        userEmail: true,
        userName: true,
        userRole: true,
        companyId: true,
        company: true,
        companyGroupId: true,
        companyGroup: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (exception: any) {
    return handleError(res, exception, "Failed to update user");
  }
};

/**
 * Enterprise Group to Mesh Role Mapping:
 * - If groups include "Mesh-SuperAdmins" or "Global-Admins" -> role = "SUPERADMIN"
 * - If groups include "Mesh-Admins", "SupplyChain-Directors", or "Plant-Managers" -> role = "ADMIN"
 * - If groups include "Mesh-Managers", "Warehouse-Supervisors", or "Logistics-Leads" -> role = "MANAGER"
 * - Otherwise -> role = "EMPLOYEE"
 */
export const mapEnterpriseGroupsToRole = (
  groups: string[] = []
): "SUPERADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE" => {
  if (!Array.isArray(groups) || groups.length === 0) {
    return "EMPLOYEE";
  }

  const normalized = groups.map((g) => (typeof g === "string" ? g.trim().toLowerCase() : ""));

  const superAdminKeywords = ["mesh-superadmins", "global-admins"];
  const adminKeywords = ["mesh-admins", "supplychain-directors", "plant-managers"];
  const managerKeywords = ["mesh-managers", "warehouse-supervisors", "logistics-leads"];

  if (normalized.some((g) => superAdminKeywords.includes(g))) {
    return "SUPERADMIN";
  }
  if (normalized.some((g) => adminKeywords.includes(g))) {
    return "ADMIN";
  }
  if (normalized.some((g) => managerKeywords.includes(g))) {
    return "MANAGER";
  }

  return "EMPLOYEE";
};

/**
 * Enterprise SSO Just-In-Time (JIT) Provisioning Controller
 * Accepts { email, name, provider, providerAccountId, groups, corporateDomain }
 * - Validates input
 * - Looks up existing user by userEmail. If exists, updates userName, userRole (based on groups mapping), and last login timestamp.
 * - If new user, performs JIT provisioning:
 *   - Finds matching company by companyDomain or companyName or falls back to first company.
 *   - Generates a secure random password hash or marks as SSO user.
 *   - Creates User record in Prisma with mapped userRole, companyId, companyGroupId.
 * - Generates a signed JWT authToken using the application's JWT secret.
 * - Returns { user, authToken, isNewUser: boolean }.
 */
export const ssoProvisionUser = async (req: Request, res: Response) => {
  try {
    const { email, name, provider, providerAccountId, groups, corporateDomain } = req.body;

    // 1. Validate required email input
    if (!email || typeof email !== "string" || !email.trim() || !email.includes("@")) {
      return res.status(400).json({ error: "A valid corporate email address is required." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const resolvedName =
      name && typeof name === "string" && name.trim()
        ? name.trim()
        : normalizedEmail.split("@")[0];
    const resolvedProvider =
      provider && typeof provider === "string" && provider.trim()
        ? provider.trim()
        : "sso";

    // Normalize enterprise groups claims
    const parsedGroups: string[] = Array.isArray(groups)
      ? groups.filter((g) => typeof g === "string")
      : typeof groups === "string"
      ? [groups]
      : [];

    // Map enterprise groups to Mesh platform RBAC role
    const mappedRole = mapEnterpriseGroupsToRole(parsedGroups);

    const jwtSecret = getJwtSecret();

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { userEmail: normalizedEmail },
      include: {
        company: true,
        companyGroup: true,
      },
    });

    if (existingUser) {
      // Update existing user: userName, userRole (from groups mapping), lastLogin timestamp
      const updatedUser = await prisma.user.update({
        where: { userId: existingUser.userId },
        data: {
          userName: resolvedName,
          userRole: mappedRole,
          lastLogin: new Date(),
          ssoProvider: resolvedProvider,
        },
        include: {
          company: true,
          companyGroup: true,
        },
      });

      const {
        userPassword: _p,
        userRefreshToken: _rt,
        ...safeUser
      } = updatedUser;

      const authToken = jwt.sign({ user: safeUser }, jwtSecret, {
        expiresIn: "4h",
      });

      return res.status(200).json({
        user: safeUser,
        authToken,
        isNewUser: false,
      });
    }

    // 3. JIT Provisioning for New Corporate User
    const derivedDomain =
      corporateDomain && typeof corporateDomain === "string" && corporateDomain.trim()
        ? corporateDomain.trim().toLowerCase()
        : normalizedEmail.split("@")[1].toLowerCase();

    let targetCompany = null;
    if (derivedDomain) {
      const domainRoot = derivedDomain.split(".")[0];

      targetCompany = await prisma.company.findFirst({
        where: {
          OR: [
            { companyDomain: { equals: derivedDomain, mode: "insensitive" } },
            { companyDomain: { contains: derivedDomain, mode: "insensitive" } },
            { companyDomain: { contains: domainRoot, mode: "insensitive" } },
            { companyName: { contains: domainRoot, mode: "insensitive" } },
          ],
        },
        include: {
          companyGroup: true,
        },
      });
    }

    // Fallback to first company in database if domain did not match any tenant
    if (!targetCompany) {
      targetCompany = await prisma.company.findFirst({
        orderBy: { createdAt: "asc" },
        include: {
          companyGroup: true,
        },
      });
    }

    const targetCompanyId = targetCompany?.companyId || null;
    const targetCompanyGroupId = targetCompany?.companyGroupId || null;

    // Generate a secure random password hash (bcrypt with 12 rounds)
    const randomPassword = crypto.randomBytes(32).toString("hex");
    const hashedPassword = await bcrypt.hash(randomPassword, 12);

    // Create User record in Prisma with mapped userRole, companyId, companyGroupId
    const newUser = await prisma.user.create({
      data: {
        userEmail: normalizedEmail,
        userName: resolvedName,
        userPassword: hashedPassword,
        userRole: mappedRole,
        lastLogin: new Date(),
        ssoProvider: resolvedProvider,
        ...(targetCompanyId && { company: { connect: { companyId: targetCompanyId } } }),
        ...(targetCompanyGroupId && { companyGroup: { connect: { companyGroupId: targetCompanyGroupId } } }),
      },
      include: {
        company: true,
        companyGroup: true,
      },
    });

    const {
      userPassword: _p,
      userRefreshToken: _rt,
      ...safeUser
    } = newUser;

    const authToken = jwt.sign({ user: safeUser }, jwtSecret, {
      expiresIn: "4h",
    });

    return res.status(201).json({
      user: safeUser,
      authToken,
      isNewUser: true,
    });
  } catch (exception: any) {
    return handleError(res, exception, "Failed to provision SSO corporate user");
  }
};

export default { createUser, getAllUsers, deleteUser, loginUser, updateUser, ssoProvisionUser };

