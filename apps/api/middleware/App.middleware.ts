import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { prisma } from "../index";

export interface RequestWithUser extends Request {
  user?: any;
  companyId?: any;
  allowedCompanyIds?: string[];
  companyGroupId?: string;
}

export const getTenantId = (req: Request, forWrite = false): any => {
  const reqWithUser = req as RequestWithUser;
  const user = reqWithUser.user?.user || reqWithUser.user;
  const isSuperAdmin = user?.userRole === "SUPERADMIN";
  const headerTenant = req.headers["x-company-id"] as string;

  // 1. SuperAdmin: can access any company or platform-wide (undefined)
  if (isSuperAdmin) {
    if (
      headerTenant &&
      headerTenant !== "all" &&
      headerTenant !== "undefined" &&
      headerTenant !== "null"
    ) {
      return headerTenant;
    }
    if (
      req.query?.companyId &&
      typeof req.query.companyId === "string" &&
      req.query.companyId !== "all"
    ) {
      return req.query.companyId;
    }
    if (forWrite) {
      return user?.companyId || undefined;
    }
    return undefined; // Global platform query across all companies
  }

  // 2. Non-SuperAdmin: Strictly scoped to user's CompanyGroup or single Company
  const allowedCompanyIds: string[] =
    reqWithUser.allowedCompanyIds || (user?.companyId ? [user.companyId] : []);
  const defaultCompanyId = user?.companyId || allowedCompanyIds[0];

  // Specific company requested in header
  if (
    headerTenant &&
    headerTenant !== "all" &&
    headerTenant !== "undefined" &&
    headerTenant !== "null"
  ) {
    if (allowedCompanyIds.includes(headerTenant)) {
      return headerTenant;
    }
    // Security fallback: header requests a company outside user's company group!
    return defaultCompanyId;
  }

  // Specific company requested in query
  if (
    req.query?.companyId &&
    typeof req.query.companyId === "string" &&
    req.query.companyId !== "all"
  ) {
    if (allowedCompanyIds.includes(req.query.companyId)) {
      return req.query.companyId;
    }
    return defaultCompanyId;
  }

  // "all" or omitted header:
  if (forWrite) {
    return defaultCompanyId;
  }

  // Multi-company read query inside the company group:
  if (allowedCompanyIds.length === 1) {
    return allowedCompanyIds[0];
  }
  if (allowedCompanyIds.length > 1) {
    return { in: allowedCompanyIds };
  }

  return defaultCompanyId;
};

const verifyToken = async (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  let authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Access Denied / Unauthorised Access" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : authHeader;

  try {
    const verifiedUser: any = jwt.verify(token, process.env.SALT || "");
    req.user = verifiedUser;

    const user = verifiedUser?.user || verifiedUser;
    if (user && user.userRole !== "SUPERADMIN") {
      let allowedIds: string[] = [];
      const userGroupId = user.companyGroupId;

      if (userGroupId) {
        const groupCompanies = await prisma.company.findMany({
          where: { companyGroupId: userGroupId },
          select: { companyId: true },
        });
        allowedIds = groupCompanies.map((c) => c.companyId);
        req.companyGroupId = userGroupId;
      } else if (user.companyId) {
        allowedIds = [user.companyId];
      }

      req.allowedCompanyIds = allowedIds;
    }

    req.companyId = getTenantId(req);
    next();
  } catch (ex: any) {
    console.error("verifyToken failed:", ex.message);
    return res.status(401).json({ error: "Invalid or Expired Token", details: ex.message });
  }
};

export const requireSuperAdmin = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const user = req.user?.user || req.user;
  if (!user || user.userRole !== "SUPERADMIN") {
    return res.status(403).json({ error: "Access Denied: SuperAdmin privileges required." });
  }
  next();
};

export default verifyToken;
