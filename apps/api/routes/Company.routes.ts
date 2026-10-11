import express from "express";
import verifyToken from "../middleware/App.middleware";
import CompanyController from "../controllers/Company.controller";

const companyRouter = express.Router();

companyRouter.get("/getAll", CompanyController.getAllCompanies);
companyRouter.get("/get/:companyId", CompanyController.getCompany);
companyRouter.post("/add", verifyToken, CompanyController.createCompany);
companyRouter.patch("/edit/:companyId?", verifyToken, CompanyController.updateCompany);
companyRouter.delete("/delete/:companyId", verifyToken, CompanyController.deleteCompany);

export default companyRouter;
