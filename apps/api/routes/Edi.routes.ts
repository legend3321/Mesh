import express from "express";
import EdiController from "../controllers/Edi.controller";

const ediRouter = express.Router();

ediRouter.get("/templates", EdiController.getTemplates);
ediRouter.post("/parse", EdiController.parseEdi);
ediRouter.post("/generate/:type/:id", EdiController.generateEdi);

export default ediRouter;
