import express from "express";
import verifyToken, {
  requireAdminOrSuperAdmin,
  requireSuperAdmin,
} from "../middleware/App.middleware";
import CompanyController from "../controllers/Company.controller";

const companyRouter = express.Router();

companyRouter.get("/getAll", verifyToken, CompanyController.getAllCompanies);
companyRouter.get("/get/:companyId", verifyToken, CompanyController.getCompany);
companyRouter.post(
  "/add",
  verifyToken,
  requireAdminOrSuperAdmin,
  CompanyController.createCompany
);
companyRouter.patch(
  "/edit/:companyId?",
  verifyToken,
  requireAdminOrSuperAdmin,
  CompanyController.updateCompany
);
companyRouter.post(
  "/edit/:companyId?",
  verifyToken,
  requireAdminOrSuperAdmin,
  CompanyController.updateCompany
);
companyRouter.delete(
  "/delete/:companyId",
  verifyToken,
  requireSuperAdmin,
  CompanyController.deleteCompany
);

export default companyRouter;
