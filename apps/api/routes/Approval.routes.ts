import express from "express";
import verifyToken, { requireAdminOrSuperAdmin } from "../middleware/App.middleware";
import ApprovalController from "../controllers/Approval.controller";

const approvalRouter = express.Router();

approvalRouter.get("/queue", verifyToken, ApprovalController.getApprovalQueue);
approvalRouter.post(
  "/approve/:id",
  verifyToken,
  requireAdminOrSuperAdmin,
  ApprovalController.approveRequisition
);
approvalRouter.post(
  "/reject/:id",
  verifyToken,
  requireAdminOrSuperAdmin,
  ApprovalController.rejectRequisition
);

export default approvalRouter;
