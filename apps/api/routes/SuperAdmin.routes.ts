import { Router } from "express";
import SuperAdminController from "../controllers/SuperAdmin.controller";
import verifyToken, { requireSuperAdmin } from "../middleware/App.middleware";

const superAdminRouter = Router();

// Routes protected by both verifyToken and requireSuperAdmin
superAdminRouter.get("/stats", verifyToken, requireSuperAdmin, SuperAdminController.getSuperAdminStats);
superAdminRouter.post("/provision", verifyToken, requireSuperAdmin, SuperAdminController.provisionTenant);
superAdminRouter.get("/hierarchy", verifyToken, requireSuperAdmin, SuperAdminController.getAllTenantsHierarchy);

export default superAdminRouter;
