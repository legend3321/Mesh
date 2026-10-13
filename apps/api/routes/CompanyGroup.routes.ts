import { Router } from "express";
import CompanyGroupController from "../controllers/CompanyGroup.controller";
import verifyToken from "../middleware/App.middleware";

const companyGroupRouter = Router();

// Routes for Group of Companies
companyGroupRouter.get("/getAll", verifyToken, CompanyGroupController.getAllCompanyGroups);
companyGroupRouter.get("/get/:companyGroupId", verifyToken, CompanyGroupController.getCompanyGroup);
companyGroupRouter.post("/add", verifyToken, CompanyGroupController.createCompanyGroup);
companyGroupRouter.patch("/edit", verifyToken, CompanyGroupController.updateCompanyGroup);
companyGroupRouter.patch("/edit/:companyGroupId", verifyToken, CompanyGroupController.updateCompanyGroup);
companyGroupRouter.delete("/delete/:companyGroupId", verifyToken, CompanyGroupController.deleteCompanyGroup);
companyGroupRouter.post("/add-company", verifyToken, CompanyGroupController.addCompanyToGroup);
companyGroupRouter.post("/remove-company", verifyToken, CompanyGroupController.removeCompanyFromGroup);

export default companyGroupRouter;
