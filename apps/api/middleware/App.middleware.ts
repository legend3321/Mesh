import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

export interface RequestWithUser extends Request {
  user?: any;
  companyId?: string;
}

export const getTenantId = (req: Request): string | undefined => {
  const headerTenant = req.headers["x-company-id"] as string;
  if (headerTenant && headerTenant !== "all" && headerTenant !== "undefined" && headerTenant !== "null") {
    return headerTenant;
  }
  const user = (req as any).user;
  const userCompanyId = user?.user?.companyId || user?.companyId;
  if (userCompanyId) return userCompanyId;

  if (req.query?.companyId && typeof req.query.companyId === "string" && req.query.companyId !== "all") {
    return req.query.companyId;
  }
  return undefined;
};

const verifyToken = (
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
    const verifiedUser = jwt.verify(token, process.env.SALT || "");
    req.user = verifiedUser;
    req.companyId = getTenantId(req);
    next();
  } catch (ex: any) {
    console.error("verifyToken failed:", ex.message);
    return res.status(401).json({ error: "Invalid or Expired Token", details: ex.message });
  }
};

export default verifyToken;
