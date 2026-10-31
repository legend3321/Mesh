import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { handleError } from "../middleware/Error.middleware";

/**
 * Get all approval queue records for tenant, enriched with maker and checker details.
 * GET /api/approval/queue
 */
const getApprovalQueue = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);

    const queueRecords = await prisma.approvalQueue.findMany({
      where: {
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Collect user IDs for maker and checker enrichment
    const userIds = new Set<string>();
    queueRecords.forEach((r) => {
      if (r.RequestedBy) userIds.add(r.RequestedBy);
      if (r.ApprovedBy) userIds.add(r.ApprovedBy);
    });

    const userMap = new Map<string, { userId: string; userName: string; userEmail: string; userRole: any }>();
    if (userIds.size > 0) {
      const users = await prisma.user.findMany({
        where: {
          userId: { in: Array.from(userIds) },
        },
        select: {
          userId: true,
          userName: true,
          userEmail: true,
          userRole: true,
        },
      });
      users.forEach((u) => userMap.set(u.userId, u));
    }

    const enrichedQueue = queueRecords.map((item) => ({
      ...item,
      maker: userMap.get(item.RequestedBy) || {
        userId: item.RequestedBy,
        userName: item.RequestedBy,
        userEmail: "",
        userRole: null,
      },
      checker: item.ApprovedBy ? userMap.get(item.ApprovedBy) || {
        userId: item.ApprovedBy,
        userName: item.ApprovedBy,
        userEmail: "",
        userRole: null,
      } : null,
    }));

    return res.status(200).json(enrichedQueue);
  } catch (error) {
    return handleError(res, error, "Failed to retrieve approval queue.");
  }
};

/**
 * Approve a pending requisition enforcing Maker-Checker Dual Control & Segregation of Duties (SoD).
 * POST /api/approval/approve/:id
 */
const approveRequisition = async (req: Request, res: Response) => {
  try {
    const approvalId = req.params.id || req.body.ApprovalID || req.body.approvalId;
    if (!approvalId) {
      return res.status(400).json({ error: "Approval record ID is required." });
    }

    const user = (req as any).user?.user || (req as any).user;
    const approverUserId = user?.userId;
    const approverRole = user?.userRole;

    if (!approverUserId) {
      return res.status(401).json({ error: "Access Denied: Approver identity could not be verified." });
    }

    const tenantId = getTenantId(req);
    const approvalRecord = await prisma.approvalQueue.findFirst({
      where: {
        ApprovalID: approvalId,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!approvalRecord) {
      return res.status(404).json({ error: "Approval record not found or unauthorized." });
    }

    if (approvalRecord.Status !== "PENDING") {
      return res.status(400).json({
        error: `Invalid state: Requisition is already ${approvalRecord.Status}.`,
      });
    }

    // Maker-Checker Segregation of Duties (SoD) Enforcement:
    // The requester CANNOT approve their own requisition.
    if (
      approvalRecord.RequestedBy &&
      approverUserId.toString().trim() === approvalRecord.RequestedBy.toString().trim()
    ) {
      return res.status(403).json({
        error: "Segregation of Duties Violation: Requester cannot approve their own requisition",
      });
    }

    // Role check: Approver role must be ADMIN or SUPERADMIN
    if (approverRole !== "ADMIN" && approverRole !== "SUPERADMIN") {
      return res.status(403).json({
        error: "Access Denied: Only users with ADMIN or SUPERADMIN role can approve requisitions.",
      });
    }

    const approvalNotes =
      req.body.notes ||
      req.body.ApprovalNotes ||
      `Approved under Maker-Checker dual control by ${user?.userName || approverUserId}`;

    // 1. Update ApprovalQueue record
    const updatedApproval = await prisma.approvalQueue.update({
      where: { ApprovalID: approvalRecord.ApprovalID },
      data: {
        Status: "APPROVED",
        ApprovedBy: approverUserId,
        ApprovalNotes: approvalNotes,
      },
    });

    // 2. Transition underlying entity
    let transitionSummary = "";
    if (approvalRecord.EntityType === "ORDER") {
      await prisma.order.update({
        where: { OrderID: approvalRecord.EntityID },
        data: {
          OrderStatus: "COMPLETED",
          Status: "COMPLETED",
        },
      });
      transitionSummary = `Order #${approvalRecord.EntityID} transitioned to COMPLETED.`;
    } else if (approvalRecord.EntityType === "PAYMENT") {
      await prisma.payment.update({
        where: { PaymentID: approvalRecord.EntityID },
        data: {
          PaymentStatus: "COMPLETED",
        },
      });
      transitionSummary = `Payment #${approvalRecord.EntityID} transitioned to COMPLETED.`;
    } else if (approvalRecord.EntityType === "INVOICE") {
      await prisma.vendorInvoice.update({
        where: { InvoiceID: approvalRecord.EntityID },
        data: {
          MatchStatus: "MATCH_CLEARED",
          MatchNotes: approvalNotes,
        },
      });
      transitionSummary = `VendorInvoice #${approvalRecord.EntityID} transitioned to MATCH_CLEARED.`;
    }

    return res.status(200).json({
      success: true,
      approval: updatedApproval,
      transition: transitionSummary,
    });
  } catch (error) {
    return handleError(res, error, "Failed to approve requisition.");
  }
};

/**
 * Reject a pending requisition enforcing Maker-Checker Dual Control & Segregation of Duties (SoD).
 * POST /api/approval/reject/:id
 */
const rejectRequisition = async (req: Request, res: Response) => {
  try {
    const approvalId = req.params.id || req.body.ApprovalID || req.body.approvalId;
    if (!approvalId) {
      return res.status(400).json({ error: "Approval record ID is required." });
    }

    const user = (req as any).user?.user || (req as any).user;
    const approverUserId = user?.userId;
    const approverRole = user?.userRole;

    if (!approverUserId) {
      return res.status(401).json({ error: "Access Denied: Reviewer identity could not be verified." });
    }

    const tenantId = getTenantId(req);
    const approvalRecord = await prisma.approvalQueue.findFirst({
      where: {
        ApprovalID: approvalId,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!approvalRecord) {
      return res.status(404).json({ error: "Approval record not found or unauthorized." });
    }

    if (approvalRecord.Status !== "PENDING") {
      return res.status(400).json({
        error: `Invalid state: Requisition is already ${approvalRecord.Status}.`,
      });
    }

    // Dual-control Segregation of Duties check
    if (
      approvalRecord.RequestedBy &&
      approverUserId.toString().trim() === approvalRecord.RequestedBy.toString().trim()
    ) {
      return res.status(403).json({
        error: "Segregation of Duties Violation: Requester cannot reject their own requisition",
      });
    }

    // Role check: Must be ADMIN or SUPERADMIN
    if (approverRole !== "ADMIN" && approverRole !== "SUPERADMIN") {
      return res.status(403).json({
        error: "Access Denied: Only users with ADMIN or SUPERADMIN role can reject requisitions.",
      });
    }

    const notes =
      req.body.notes ||
      req.body.ApprovalNotes ||
      `Rejected under Maker-Checker dual control review by ${user?.userName || approverUserId}`;

    // 1. Update ApprovalQueue record
    const updatedApproval = await prisma.approvalQueue.update({
      where: { ApprovalID: approvalRecord.ApprovalID },
      data: {
        Status: "REJECTED",
        ApprovedBy: approverUserId,
        ApprovalNotes: notes,
      },
    });

    // 2. Transition underlying entity
    let transitionSummary = "";
    if (approvalRecord.EntityType === "ORDER") {
      await prisma.order.update({
        where: { OrderID: approvalRecord.EntityID },
        data: {
          OrderStatus: "CANCELLED",
          Status: "CANCELLED",
        },
      });
      transitionSummary = `Order #${approvalRecord.EntityID} transitioned to CANCELLED.`;
    } else if (approvalRecord.EntityType === "PAYMENT") {
      await prisma.payment.update({
        where: { PaymentID: approvalRecord.EntityID },
        data: {
          PaymentStatus: "CANCELLED",
        },
      });
      transitionSummary = `Payment #${approvalRecord.EntityID} transitioned to CANCELLED.`;
    } else if (approvalRecord.EntityType === "INVOICE") {
      await prisma.vendorInvoice.update({
        where: { InvoiceID: approvalRecord.EntityID },
        data: {
          MatchStatus: "MATCH_VARIANCE_HOLD",
          MatchNotes: notes,
        },
      });
      transitionSummary = `VendorInvoice #${approvalRecord.EntityID} transitioned to MATCH_VARIANCE_HOLD.`;
    }

    return res.status(200).json({
      success: true,
      approval: updatedApproval,
      transition: transitionSummary,
    });
  } catch (error) {
    return handleError(res, error, "Failed to reject requisition.");
  }
};

export default {
  getApprovalQueue,
  approveRequisition,
  rejectRequisition,
};
