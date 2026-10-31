import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId } from "../middleware/App.middleware";
import { RMAStatus, RMADisposition } from "@prisma/client";

const addRMA = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const {
      RMANumber: rmaNumberInput,
      CustomerID,
      OrderID,
      Reason,
      Status: statusInput,
      RMADetails: detailsInput,
    } = req.body;

    if (!CustomerID || !Reason) {
      return res.status(400).json({ error: "CustomerID and Reason are required." });
    }

    // Verify Customer belongs to caller company
    const customer = await prisma.customer.findFirst({
      where: {
        CustomerID,
        companyId: tenantId,
      },
    });
    if (!customer) {
      return res.status(400).json({ error: "Invalid CustomerID: Customer not found in caller company." });
    }

    // If OrderID provided, verify Order belongs to caller company
    if (OrderID) {
      const order = await prisma.order.findFirst({
        where: {
          OrderID,
          companyId: tenantId,
        },
      });
      if (!order) {
        return res.status(400).json({ error: "Invalid OrderID: Order not found in caller company." });
      }
    }

    const rmaNumber = rmaNumberInput
      ? String(rmaNumberInput).trim().toUpperCase()
      : `RMA-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const status: RMAStatus = statusInput && Object.values(RMAStatus).includes(statusInput)
      ? statusInput
      : RMAStatus.REQUESTED;

    // Verify items in RMADetails if provided
    let detailsCreate: any[] = [];
    if (Array.isArray(detailsInput) && detailsInput.length > 0) {
      for (const item of detailsInput) {
        if (!item.ProductID || !item.QuantityReturned) {
          return res.status(400).json({ error: "Each RMADetail must include ProductID and QuantityReturned." });
        }
        const product = await prisma.product.findFirst({
          where: {
            ProductID: item.ProductID,
            companyId: tenantId,
          },
        });
        if (!product) {
          return res.status(400).json({
            error: `Invalid ProductID: Product ${item.ProductID} not found in caller company.`,
          });
        }

        detailsCreate.push({
          ProductID: item.ProductID,
          QuantityReturned: parseInt(item.QuantityReturned, 10),
          Disposition: item.Disposition && Object.values(RMADisposition).includes(item.Disposition)
            ? (item.Disposition as RMADisposition)
            : null,
          CreditAmount: item.CreditAmount !== undefined && item.CreditAmount !== null
            ? parseFloat(item.CreditAmount)
            : null,
          WarehouseID: item.WarehouseID || null,
        });
      }
    }

    const newRMA = await prisma.rMA.create({
      data: {
        RMANumber: rmaNumber,
        CustomerID,
        OrderID: OrderID || null,
        Reason: String(Reason).trim(),
        Status: status,
        companyId: tenantId,
        ...(detailsCreate.length > 0
          ? {
              RMADetails: {
                create: detailsCreate,
              },
            }
          : {}),
      },
      include: {
        Customer: true,
        Order: true,
        RMADetails: {
          include: { Product: true },
        },
      },
    });

    res.status(201).json(newRMA);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const editRMA = async (req: Request, res: Response) => {
  try {
    const RMAID = req.body.RMAID || req.params?.RMAID;
    if (!RMAID) {
      return res.status(400).json({ error: "RMAID is required." });
    }

    const tenantId = getTenantId(req, true);
    const existing = await prisma.rMA.findFirst({
      where: {
        RMAID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "RMA not found or unauthorized." });
    }

    const updateData: any = {};
    if (req.body.Reason !== undefined) updateData.Reason = String(req.body.Reason).trim();
    if (req.body.Status !== undefined) {
      if (!Object.values(RMAStatus).includes(req.body.Status)) {
        return res.status(400).json({
          error: `Invalid Status. Must be one of: ${Object.values(RMAStatus).join(", ")}.`,
        });
      }
      updateData.Status = req.body.Status as RMAStatus;
    }
    if (req.body.CustomerID !== undefined) {
      const customer = await prisma.customer.findFirst({
        where: {
          CustomerID: req.body.CustomerID,
          ...(tenantId ? { companyId: tenantId } : {}),
        },
      });
      if (!customer) {
        return res.status(400).json({ error: "Invalid CustomerID: Customer not found or unauthorized." });
      }
      updateData.CustomerID = req.body.CustomerID;
    }
    if (req.body.OrderID !== undefined) {
      if (req.body.OrderID) {
        const order = await prisma.order.findFirst({
          where: {
            OrderID: req.body.OrderID,
            ...(tenantId ? { companyId: tenantId } : {}),
          },
        });
        if (!order) {
          return res.status(400).json({ error: "Invalid OrderID: Order not found or unauthorized." });
        }
      }
      updateData.OrderID = req.body.OrderID || null;
    }

    const updatedRMA = await prisma.rMA.update({
      where: { RMAID },
      data: updateData,
      include: {
        Customer: true,
        Order: true,
        RMADetails: {
          include: { Product: true },
        },
      },
    });

    res.status(200).json(updatedRMA);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getAllRMAs = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const rmas = await prisma.rMA.findMany({
      where: { companyId: tenantId },
      include: {
        Customer: true,
        Order: true,
        RMADetails: {
          include: { Product: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(rmas);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const getSingleRMA = async (req: Request<{ RMAID: string }>, res: Response) => {
  try {
    const RMAID = req.params.RMAID;
    if (!RMAID) {
      return res.status(400).json({ error: "RMAID is required." });
    }

    const tenantId = getTenantId(req);
    const rma = await prisma.rMA.findFirst({
      where: {
        RMAID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        Customer: true,
        Order: true,
        RMADetails: {
          include: { Product: true },
        },
      },
    });

    if (!rma) {
      return res.status(404).json({ error: "RMA not found or unauthorized." });
    }

    res.status(200).json(rma);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

const deleteRMA = async (req: Request<{ RMAID: string }>, res: Response) => {
  try {
    const RMAID = req.params.RMAID;
    if (!RMAID) {
      return res.status(400).json({ error: "RMAID is required." });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.rMA.findFirst({
      where: {
        RMAID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "RMA not found or unauthorized." });
    }

    // Delete RMADetails first
    await prisma.rMADetail.deleteMany({
      where: { RMAID },
    });

    const deletedRMA = await prisma.rMA.delete({
      where: { RMAID },
    });

    res.status(200).json(deletedRMA);
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

/**
 * Process Return Intake (Reverse Logistics Engine)
 * Handles physical inspection, stock incrementing for RESTOCK items,
 * quarantine isolation for QUARANTINE items, disposition updates,
 * credit issuance, and state machine advancement.
 */
const processRMAIntake = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for return intake processing.",
      });
    }

    const { rmaId, RMAID: rmaIdAlt, status: targetStatus, items, intakeNotes } = req.body;
    const targetRmaId = rmaId || rmaIdAlt;

    if (!targetRmaId) {
      return res.status(400).json({ error: "rmaId is required." });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "At least one item is required for RMA intake processing." });
    }

    // Verify RMA exists in company
    const rma = await prisma.rMA.findFirst({
      where: {
        RMAID: targetRmaId,
        companyId: tenantId,
      },
      include: {
        Customer: true,
        RMADetails: true,
      },
    });

    if (!rma) {
      return res.status(404).json({ error: "RMA record not found or unauthorized." });
    }

    let restockedCount = 0;
    let quarantinedCount = 0;
    let scrappedCount = 0;
    let reworkedCount = 0;
    let totalCreditIssued = 0;

    for (const item of items) {
      const {
        rmaDetailId,
        productId,
        quantity,
        disposition,
        warehouseId,
        binId,
        creditAmount,
      } = item;

      if (!productId || !quantity || !disposition || !warehouseId) {
        return res.status(400).json({
          error: "Each intake item must have productId, quantity, disposition, and warehouseId.",
        });
      }

      if (!Object.values(RMADisposition).includes(disposition)) {
        return res.status(400).json({
          error: `Invalid disposition '${disposition}'. Must be RESTOCK, REWORK, SCRAP, or QUARANTINE.`,
        });
      }

      const qty = parseInt(quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        return res.status(400).json({ error: `Invalid quantity '${quantity}'. Must be positive integer.` });
      }

      // Verify Warehouse belongs to tenant
      const warehouse = await prisma.warehouse.findFirst({
        where: {
          WarehouseID: warehouseId,
          companyId: tenantId,
        },
      });
      if (!warehouse) {
        return res.status(400).json({
          error: `Invalid warehouseId '${warehouseId}' for product ${productId}.`,
        });
      }

      // If binId provided, verify it belongs to warehouse
      if (binId) {
        const bin = await prisma.binLocation.findFirst({
          where: {
            BinID: binId,
            WarehouseID: warehouseId,
            companyId: tenantId,
          },
        });
        if (!bin) {
          return res.status(400).json({
            error: `Invalid binId '${binId}' for warehouse ${warehouseId}.`,
          });
        }
      }

      // Handle RESTOCK: increment inventory
      if (disposition === RMADisposition.RESTOCK) {
        const existingInventory = await prisma.inventory.findFirst({
          where: {
            ProductID: productId,
            WarehouseID: warehouseId,
            ...(binId ? { BinID: binId } : {}),
            companyId: tenantId,
          },
        });

        if (existingInventory) {
          await prisma.inventory.update({
            where: { InventoryID: existingInventory.InventoryID },
            data: {
              InventoryAvailable: existingInventory.InventoryAvailable + qty,
            },
          });
        } else {
          await prisma.inventory.create({
            data: {
              ProductID: productId,
              WarehouseID: warehouseId,
              BinID: binId || null,
              InventoryAvailable: qty,
              MinStockLevel: 5,
              MaxStockLevel: 100,
              ReorderPoint: 10,
              companyId: tenantId,
            },
          });
        }
        restockedCount += qty;
      }

      // Handle QUARANTINE: record isolated stock
      if (disposition === RMADisposition.QUARANTINE) {
        quarantinedCount += qty;
        // Check if quarantine bin exists or store with quarantine notice
        const existingInv = await prisma.inventory.findFirst({
          where: {
            ProductID: productId,
            WarehouseID: warehouseId,
            ...(binId ? { BinID: binId } : {}),
            companyId: tenantId,
          },
        });

        if (existingInv) {
          // If quarantining in separate bin:
          if (binId && binId !== existingInv.BinID) {
            await prisma.inventory.create({
              data: {
                ProductID: productId,
                WarehouseID: warehouseId,
                BinID: binId,
                InventoryAvailable: qty,
                MinStockLevel: 0,
                MaxStockLevel: 50,
                ReorderPoint: 0,
                companyId: tenantId,
              },
            });
          }
        }
      }

      if (disposition === RMADisposition.SCRAP) {
        scrappedCount += qty;
      }
      if (disposition === RMADisposition.REWORK) {
        reworkedCount += qty;
      }

      const credit = creditAmount !== undefined && creditAmount !== null ? parseFloat(creditAmount) : 0;
      totalCreditIssued += credit;

      // Update or create RMADetail
      if (rmaDetailId) {
        const existingDetail = rma.RMADetails.find((d) => d.RMADetailID === rmaDetailId);
        if (existingDetail) {
          await prisma.rMADetail.update({
            where: { RMADetailID: rmaDetailId },
            data: {
              QuantityReturned: qty,
              Disposition: disposition as RMADisposition,
              CreditAmount: credit,
              WarehouseID: warehouseId,
            },
          });
        }
      } else {
        await prisma.rMADetail.create({
          data: {
            RMAID: targetRmaId,
            ProductID: productId,
            QuantityReturned: qty,
            Disposition: disposition as RMADisposition,
            CreditAmount: credit,
            WarehouseID: warehouseId,
          },
        });
      }
    }

    // Determine new RMA status: SETTLED if requested or all completed, else INSPECTED
    const newStatus: RMAStatus = targetStatus && Object.values(RMAStatus).includes(targetStatus)
      ? (targetStatus as RMAStatus)
      : RMAStatus.INSPECTED;

    const updatedRMA = await prisma.rMA.update({
      where: { RMAID: targetRmaId },
      data: {
        Status: newStatus,
      },
      include: {
        Customer: true,
        Order: true,
        RMADetails: {
          include: { Product: true },
        },
      },
    });

    // Audit transaction log if authenticated user exists
    const reqWithUser = req as any;
    const userId = reqWithUser?.user?.user?.userId || reqWithUser?.user?.userId;
    if (userId) {
      try {
        await prisma.transaction.create({
          data: {
            TransactionDetail: `RMA Return Intake processed for ${updatedRMA.RMANumber}: Status advanced to ${newStatus}. Credit issued: $${totalCreditIssued.toFixed(2)}. ${restockedCount} units restocked, ${quarantinedCount} quarantined, ${scrappedCount} scrapped, ${reworkedCount} reworked.${intakeNotes ? ` Note: ${intakeNotes}` : ""}`,
            UserID: userId,
            companyId: tenantId,
          },
        });
      } catch (err) {
        console.warn("Could not log audit transaction for RMA intake:", err);
      }
    }

    res.status(200).json({
      success: true,
      message: `RMA intake successfully processed. RMA status updated to ${newStatus}.`,
      rma: updatedRMA,
      totalCreditIssued,
      restockedItemsCount: restockedCount,
      quarantinedItemsCount: quarantinedCount,
      scrappedItemsCount: scrappedCount,
      reworkedItemsCount: reworkedCount,
    });
  } catch (exception) {
    res.status(500).json({ error: exception instanceof Error ? exception.message : exception });
  }
};

export default {
  addRMA,
  editRMA,
  getAllRMAs,
  getSingleRMA,
  deleteRMA,
  processRMAIntake,
};
