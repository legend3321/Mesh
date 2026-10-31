import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { handleError } from "../middleware/Error.middleware";

const addPayment = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const { DeliveryID, DeileveryID } = req.body;
    const resolvedDeliveryId = DeliveryID || DeileveryID || null;

    if (req.body.OrderID) {
      const order = await prisma.order.findFirst({
        where: { OrderID: req.body.OrderID, companyId: tenantId },
      });
      if (!order) {
        return res.status(400).json({ error: "Invalid OrderID: Order not found in caller company." });
      }
    }

    if (resolvedDeliveryId) {
      const delivery = await prisma.delivery.findFirst({
        where: { DeliveryID: resolvedDeliveryId, companyId: tenantId },
      });
      if (!delivery) {
        return res.status(400).json({ error: "Invalid DeliveryID: Delivery not found in caller company." });
      }
    }

    const user = (req as any).user?.user || (req as any).user;
    const actorUserId = user?.userId || (req as any).user?.userId || user?.userEmail || "SYSTEM_USER";

    const paymentAmount = parseFloat(req.body.PaymentAmount) || 0;
    const requiresApproval = paymentAmount >= 10000;
    const resolvedStatus = requiresApproval
      ? "PENDING_APPROVAL"
      : (req.body.PaymentStatus || "INITIATED");

    const data: any = {
      PaymentAmount: paymentAmount,
      PaymentStatus: resolvedStatus,
      PaymentMode: req.body.PaymentMode || null,
      PaymentDescription: req.body.PaymentDescription ? String(req.body.PaymentDescription) : null,
      CreatedBy: actorUserId,
      OrderID: req.body.OrderID || null,
      DeliveryID: resolvedDeliveryId,
      companyId: tenantId,
    };

    const newPayment = await prisma.payment.create({
      data,
      include: {
        Order: true,
        Delivery: true,
        company: true,
      },
    });

    // Automatic Maker-Checker Approval routing for payments >= $10,000
    if (requiresApproval) {
      await prisma.approvalQueue.create({
        data: {
          EntityType: "PAYMENT",
          EntityID: newPayment.PaymentID,
          RequestedAmount: paymentAmount,
          RequestedBy: actorUserId,
          Status: "PENDING",
          ApprovalNotes: `Spend threshold triggered: Disbursement ($${paymentAmount.toLocaleString()}) >= $10,000 requires Dual-Control Maker-Checker authorization.`,
          companyId: tenantId,
        },
      });
    }

    res.status(200).json(newPayment);
  } catch (exception) {
    return handleError(res, exception, "Failed to add payment");
  }
};

const editPayment = async (req: Request, res: Response) => {
  try {
    const PaymentID = req.body.PaymentID || req.params?.PaymentID;
    if (!PaymentID) {
      return res.status(400).json({ error: "PaymentID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.payment.findFirst({
      where: {
        PaymentID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Payment not found or unauthorized" });
    }

    const { DeliveryID, DeileveryID } = req.body;
    const resolvedDeliveryId = DeliveryID !== undefined || DeileveryID !== undefined ? (DeliveryID || DeileveryID || null) : undefined;
    const updateData: any = {};

    if (req.body.PaymentAmount !== undefined) {
      updateData.PaymentAmount = parseFloat(req.body.PaymentAmount) || 0;
    }
    if (req.body.PaymentStatus !== undefined) {
      updateData.PaymentStatus = req.body.PaymentStatus;
    }
    if (req.body.PaymentMode !== undefined) {
      updateData.PaymentMode = req.body.PaymentMode;
    }
    if (req.body.PaymentDescription !== undefined) {
      updateData.PaymentDescription = req.body.PaymentDescription ? String(req.body.PaymentDescription) : null;
    }
    if (req.body.OrderID !== undefined) {
      if (req.body.OrderID) {
        const order = await prisma.order.findFirst({
          where: { OrderID: req.body.OrderID, ...(tenantId ? { companyId: tenantId } : {}) },
        });
        if (!order) {
          return res.status(400).json({ error: "Invalid OrderID: Order not found or unauthorized." });
        }
      }
      updateData.OrderID = req.body.OrderID || null;
    }
    if (resolvedDeliveryId !== undefined) {
      if (resolvedDeliveryId) {
        const delivery = await prisma.delivery.findFirst({
          where: { DeliveryID: resolvedDeliveryId, ...(tenantId ? { companyId: tenantId } : {}) },
        });
        if (!delivery) {
          return res.status(400).json({ error: "Invalid DeliveryID: Delivery not found or unauthorized." });
        }
      }
      updateData.DeliveryID = resolvedDeliveryId;
    }
    delete updateData.companyId;

    const updatedPayment = await prisma.payment.update({
      where: {
        PaymentID: PaymentID,
      },
      data: updateData,
      include: {
        Order: true,
        Delivery: true,
        company: true,
      },
    });

    res.status(200).json(updatedPayment);
  } catch (exception) {
    return handleError(res, exception, "Failed to update payment");
  }
};

const getAllPayments = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Payments = await prisma.payment.findMany({
      where: { companyId: tenantId },
      include: {
        Order: true,
        Delivery: true,
        company: true,
      },
    });

    res.status(200).json(Payments);
  } catch (exception) {
    return handleError(res, exception, "Failed to fetch payments");
  }
};

const getPayment = async (
  req: Request<{ PaymentID: string }>,
  res: Response
) => {
  try {
    const tenantId = getTenantId(req);
    const Payment = await prisma.payment.findFirst({
      where: {
        PaymentID: req.params.PaymentID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        Order: true,
        Delivery: true,
        company: true,
      },
    });

    if (!Payment) {
      return res.status(404).json({ error: "Payment not found or unauthorized" });
    }

    res.status(200).json(Payment);
  } catch (exception) {
    return handleError(res, exception, "Failed to fetch payment details");
  }
};

const deletePayment = async (
  req: Request<{ PaymentID: string }>,
  res: Response
) => {
  try {
    const PaymentID = req.params.PaymentID;
    if (!PaymentID) {
      return res.status(400).json({ error: "PaymentID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.payment.findFirst({
      where: {
        PaymentID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Payment not found or unauthorized" });
    }

    const Payment = await prisma.payment.delete({
      where: {
        PaymentID,
      },
    });

    res.status(200).json(Payment);
  } catch (exception) {
    return handleError(res, exception, "Failed to delete payment");
  }
};

export default {
  addPayment,
  editPayment,
  getAllPayments,
  getPayment,
  deletePayment,
};
