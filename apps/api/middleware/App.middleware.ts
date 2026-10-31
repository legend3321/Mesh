import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { prisma } from "../db";
import { getJwtSecret } from "../config/jwt";

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

  // 1. SuperAdmin is for backend-level platform control and does not own or access company operational data
  if (isSuperAdmin) {
    if (forWrite && req.body?.companyId && typeof req.body.companyId === "string" && req.body.companyId !== "all") {
      return req.body.companyId;
    }
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
    if (user?.companyId) {
      return user.companyId;
    }
    return undefined;
  }

  // 2. Non-SuperAdmin: Strictly scoped to user's CompanyGroup or single Company
  const allowedCompanyIds: string[] =
    reqWithUser.allowedCompanyIds || (user?.companyId ? [user.companyId] : []);
  const defaultCompanyId = user?.companyId || allowedCompanyIds[0];

  // Specific company requested in body (for write operations)
  if (
    forWrite &&
    req.body?.companyId &&
    typeof req.body.companyId === "string" &&
    req.body.companyId !== "all"
  ) {
    if (allowedCompanyIds.includes(req.body.companyId)) {
      return req.body.companyId;
    }
    // Security fallback: requested companyId is outside user's allowed companies!
    return null;
  }

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
    return forWrite ? null : defaultCompanyId;
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
    return forWrite ? null : defaultCompanyId;
  }

  // "all" or omitted header:
  if (forWrite) {
    return defaultCompanyId || null;
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
    const verifiedUser: any = jwt.verify(token, getJwtSecret());
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

export const requireAdminOrSuperAdmin = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const user = req.user?.user || req.user;
  if (!user) {
    return res.status(401).json({ error: "Access Denied: Authentication required." });
  }
  if (user.userRole !== "ADMIN" && user.userRole !== "SUPERADMIN") {
    return res.status(403).json({ error: "Access Denied: Admin or SuperAdmin privileges required." });
  }
  next();
};

export const requireSuperAdmin = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const user = req.user?.user || req.user;
  if (!user) {
    return res.status(401).json({ error: "Access Denied: Authentication required." });
  }
  if (user.userRole !== "SUPERADMIN") {
    return res.status(403).json({ error: "Access Denied: SuperAdmin privileges required." });
  }
  next();
};

export default verifyToken;
