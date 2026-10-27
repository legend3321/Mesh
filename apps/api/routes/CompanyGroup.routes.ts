import { Router } from "express";
import CompanyGroupController from "../controllers/CompanyGroup.controller";
import verifyToken, { requireSuperAdmin } from "../middleware/App.middleware";

const companyGroupRouter = Router();

// Routes for Group of Companies
companyGroupRouter.get("/getAll", verifyToken, CompanyGroupController.getAllCompanyGroups);
companyGroupRouter.get("/get/:companyGroupId", verifyToken, CompanyGroupController.getCompanyGroup);
companyGroupRouter.post("/add", verifyToken, requireSuperAdmin, CompanyGroupController.createCompanyGroup);
companyGroupRouter.patch("/edit", verifyToken, requireSuperAdmin, CompanyGroupController.updateCompanyGroup);
companyGroupRouter.patch("/edit/:companyGroupId", verifyToken, requireSuperAdmin, CompanyGroupController.updateCompanyGroup);
companyGroupRouter.delete("/delete/:companyGroupId", verifyToken, requireSuperAdmin, CompanyGroupController.deleteCompanyGroup);
companyGroupRouter.post("/add-company", verifyToken, requireSuperAdmin, CompanyGroupController.addCompanyToGroup);
companyGroupRouter.post("/remove-company", verifyToken, requireSuperAdmin, CompanyGroupController.removeCompanyFromGroup);

export default companyGroupRouter;
