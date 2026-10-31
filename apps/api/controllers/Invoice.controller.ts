import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { handleError } from "../middleware/Error.middleware";
import MatchingEngineService from "../services/MatchingEngine.service";

/**
 * Trigger 3-Way Matching for a Vendor Invoice against PO and Goods Receipts.
 * POST /api/invoice/match/:InvoiceID
 */
const matchInvoice = async (req: Request, res: Response) => {
  try {
    const InvoiceID = req.params.InvoiceID;
    if (!InvoiceID) {
      return res.status(400).json({ error: "InvoiceID is required." });
    }

    const tenantId = getTenantId(req);
    const matchResult = await MatchingEngineService.matchInvoice(InvoiceID, tenantId);

    return res.status(200).json(matchResult);
  } catch (error: any) {
    if (error?.message?.includes("not found")) {
      return res.status(404).json({ error: error.message });
    }
    return handleError(res, error, "Failed to execute 3-way match on invoice.");
  }
};

/**
 * Get all Vendor Invoices scoped to tenant.
 * GET /api/invoice/getAll
 */
const getAllInvoices = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const invoices = await prisma.vendorInvoice.findMany({
      where: {
        companyId: tenantId,
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        Order: true,
        Provider: true,
        company: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(invoices);
  } catch (error) {
    return handleError(res, error, "Failed to retrieve vendor invoices.");
  }
};

/**
 * Get single Vendor Invoice with items.
 * GET /api/invoice/:InvoiceID
 */
const getInvoice = async (req: Request, res: Response) => {
  try {
    const InvoiceID = req.params.InvoiceID;
    if (!InvoiceID) {
      return res.status(400).json({ error: "InvoiceID is required." });
    }

    const tenantId = getTenantId(req);
    const invoice = await prisma.vendorInvoice.findFirst({
      where: {
        InvoiceID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        Order: {
          include: {
            Orderdetail: true,
          },
        },
        Provider: true,
        company: true,
      },
    });

    if (!invoice) {
      return res.status(404).json({ error: "Vendor invoice not found or unauthorized." });
    }

    return res.status(200).json(invoice);
  } catch (error) {
    return handleError(res, error, "Failed to retrieve vendor invoice.");
  }
};

/**
 * Create a new Vendor Invoice with line items and optionally run initial 3-way match.
 * POST /api/invoice/add
 */
const addInvoice = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const {
      InvoiceNumber,
      OrderID,
      ProviderID,
      InvoiceDate,
      DueDate,
      Subtotal,
      Tax,
      TotalAmount,
      MatchStatus,
      MatchNotes,
      items,
      runMatch,
    } = req.body;

    if (!InvoiceNumber) {
      return res.status(400).json({ error: "InvoiceNumber is required." });
    }

    // Validate OrderID if provided
    if (OrderID) {
      const order = await prisma.order.findFirst({
        where: { OrderID, companyId: tenantId },
      });
      if (!order) {
        return res.status(400).json({ error: "Invalid OrderID: Order not found in caller company." });
      }
    }

    // Validate ProviderID if provided
    if (ProviderID) {
      const provider = await prisma.provider.findFirst({
        where: { ProviderID, companyId: tenantId },
      });
      if (!provider) {
        return res.status(400).json({ error: "Invalid ProviderID: Provider not found in caller company." });
      }
    }

    // Calculate financial subtotals
    const rawItems: any[] = Array.isArray(items) ? items : [];
    const computedSubtotal = rawItems.reduce((acc, it) => {
      const lineTotal =
        it.LineTotal !== undefined && it.LineTotal !== null
          ? Number(it.LineTotal)
          : (Number(it.QuantityBilled || 0) * Number(it.UnitPrice || 0));
      return acc + (isNaN(lineTotal) ? 0 : lineTotal);
    }, 0);

    const parsedSubtotal =
      Subtotal !== undefined && Subtotal !== null
        ? parseFloat(Subtotal) || 0
        : computedSubtotal;
    const parsedTax = Tax !== undefined && Tax !== null ? parseFloat(Tax) || 0 : 0;
    const parsedTotal =
      TotalAmount !== undefined && TotalAmount !== null
        ? parseFloat(TotalAmount) || 0
        : Math.round((parsedSubtotal + parsedTax) * 100) / 100;

    const newInvoice = await prisma.vendorInvoice.create({
      data: {
        InvoiceNumber: String(InvoiceNumber).trim(),
        OrderID: OrderID || null,
        ProviderID: ProviderID || null,
        InvoiceDate: InvoiceDate ? new Date(InvoiceDate) : new Date(),
        DueDate: DueDate ? new Date(DueDate) : null,
        Subtotal: parsedSubtotal,
        Tax: parsedTax,
        TotalAmount: parsedTotal,
        MatchStatus: MatchStatus || "MATCH_PENDING",
        MatchNotes: MatchNotes || null,
        companyId: tenantId,
        items:
          rawItems.length > 0
            ? {
                create: rawItems.map((it: any) => ({
                  ProductID: it.ProductID,
                  QuantityBilled: parseInt(it.QuantityBilled, 10) || 0,
                  UnitPrice: parseFloat(it.UnitPrice) || 0,
                  LineTotal:
                    it.LineTotal !== undefined && it.LineTotal !== null
                      ? parseFloat(it.LineTotal) || 0
                      : Math.round((parseInt(it.QuantityBilled, 10) || 0) * (parseFloat(it.UnitPrice) || 0) * 100) / 100,
                })),
              }
            : undefined,
      },
      include: {
        items: {
          include: {
            Product: true,
          },
        },
        Order: true,
        Provider: true,
      },
    });

    // Optionally trigger initial 3-way match if linked to an Order
    if (newInvoice.OrderID && runMatch !== false) {
      const matchResult = await MatchingEngineService.matchInvoice(newInvoice.InvoiceID, tenantId);
      const updatedInvoice = await prisma.vendorInvoice.findUnique({
        where: { InvoiceID: newInvoice.InvoiceID },
        include: {
          items: {
            include: {
              Product: true,
            },
          },
          Order: true,
          Provider: true,
        },
      });

      return res.status(200).json({
        ...updatedInvoice,
        matchResult,
      });
    }

    return res.status(200).json(newInvoice);
  } catch (error) {
    return handleError(res, error, "Failed to create vendor invoice.");
  }
};

export default {
  matchInvoice,
  getAllInvoices,
  getInvoice,
  addInvoice,
};
