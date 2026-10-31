import { Request, Response } from "express";
import { prisma } from "../db";
import { getTenantId, RequestWithUser } from "../middleware/App.middleware";

class TransactionError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const addTransfer = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const { ProductID, OutWarehouseID, InWarehouseID } = req.body;
    if (!ProductID || !OutWarehouseID || !InWarehouseID) {
      return res.status(400).json({ error: "ProductID, OutWarehouseID, and InWarehouseID are required." });
    }

    if (OutWarehouseID === InWarehouseID) {
      return res.status(400).json({ error: "Source and destination warehouses cannot be the same." });
    }

    const transferQty = parseInt(req.body.TransferQuantity, 10);
    if (isNaN(transferQty) || transferQty <= 0) {
      return res.status(400).json({ error: "TransferQuantity must be a positive integer." });
    }

    const reqWithUser = req as RequestWithUser;
    const allowedIds: string[] = reqWithUser.allowedCompanyIds?.length
      ? reqWithUser.allowedCompanyIds
      : [tenantId];
    const companyFilter = { companyId: { in: allowedIds } };

    const product = await prisma.product.findFirst({
      where: {
        ProductID,
        ...companyFilter,
      },
    });
    if (!product) {
      return res.status(400).json({ error: "Invalid ProductID: Product not found in allowed company records." });
    }

    const outWarehouse = await prisma.warehouse.findFirst({
      where: {
        WarehouseID: OutWarehouseID,
        ...companyFilter,
      },
    });
    if (!outWarehouse) {
      return res.status(400).json({ error: "Invalid OutWarehouseID: Source warehouse not found in allowed company records." });
    }

    const inWarehouse = await prisma.warehouse.findFirst({
      where: {
        WarehouseID: InWarehouseID,
        ...companyFilter,
      },
    });
    if (!inWarehouse) {
      return res.status(400).json({ error: "Invalid InWarehouseID: Destination warehouse not found in allowed company records." });
    }

    // Atomic Two-Phase Transfer Movement - Phase 1: Goods Issue / Shipment Dispatch
    const newTransfer = await prisma.$transaction(async (tx) => {
      // 1. Check if an Inventory record exists for ProductID in OutWarehouseID for the caller's tenant
      const sourceInventory = await tx.inventory.findFirst({
        where: {
          ProductID,
          WarehouseID: OutWarehouseID,
          companyId: tenantId,
        },
      });

      // 2. Verify that InventoryAvailable >= TransferQuantity. If insufficient, return HTTP 400
      if (!sourceInventory || sourceInventory.InventoryAvailable < transferQty) {
        const available = sourceInventory ? sourceInventory.InventoryAvailable : 0;
        throw new TransactionError(
          `Insufficient stock in source warehouse. Available: ${available}, Requested: ${transferQty}`,
          400
        );
      }

      // 3. Atomically decrement InventoryAvailable by TransferQuantity in the origin warehouse inventory record
      await tx.inventory.update({
        where: {
          InventoryID: sourceInventory.InventoryID,
        },
        data: {
          InventoryAvailable: {
            decrement: transferQty,
          },
        },
      });

      // 4. Create Transfer with status "IN_TRANSIT"
      return await tx.transfer.create({
        data: {
          TransferQuantity: transferQty,
          SentDate: req.body.SentDate ? new Date(req.body.SentDate) : new Date(),
          RecievedDate: null,
          TransferStatus: "IN_TRANSIT",
          ProductID,
          OutWarehouseID,
          InWarehouseID,
          companyId: tenantId,
        },
        include: {
          Product: true,
          OutWarehouse: true,
          InWarehouse: true,
          company: true,
        },
      });
    });

    res.status(200).json(newTransfer);
  } catch (exception: any) {
    if (exception instanceof TransactionError) {
      return res.status(exception.statusCode).json({ error: exception.message });
    }
    res.status(500).json({ error: exception?.message || exception });
  }
};

// Phase 2: Goods Receipt / Destination Intake
const receiveTransfer = async (req: Request, res: Response) => {
  try {
    const TransferID = req.params?.TransferID || req.body?.TransferID;
    if (!TransferID) {
      return res.status(400).json({ error: "TransferID is required" });
    }

    const tenantId = getTenantId(req);
    const reqWithUser = req as RequestWithUser;
    const allowedIds: string[] = reqWithUser.allowedCompanyIds?.length
      ? reqWithUser.allowedCompanyIds
      : (typeof tenantId === "string" ? [tenantId] : []);

    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // 1. Verify transfer exists, belongs to tenant
      const transfer = await tx.transfer.findFirst({
        where: {
          TransferID,
          ...(allowedIds.length > 0 ? { companyId: { in: allowedIds } } : (tenantId ? { companyId: tenantId } : {})),
        },
      });

      if (!transfer) {
        throw new TransactionError("Transfer not found or unauthorized", 404);
      }

      // 2. Verify transfer is not already completed
      if (transfer.RecievedDate || transfer.TransferStatus === "COMPLETED") {
        throw new TransactionError("Transfer has already been received and completed", 400);
      }

      const receivedQty =
        req.body?.ReceivedQuantity !== undefined
          ? parseInt(req.body.ReceivedQuantity, 10)
          : transfer.TransferQuantity;

      if (isNaN(receivedQty) || receivedQty < 0) {
        throw new TransactionError("ReceivedQuantity must be a non-negative integer", 400);
      }

      const companyIdForInventory = transfer.companyId || (typeof tenantId === "string" ? tenantId : undefined);

      // 3. Find or create an Inventory record for ProductID in InWarehouseID for the company
      let destInventory = await tx.inventory.findFirst({
        where: {
          ProductID: transfer.ProductID,
          WarehouseID: transfer.InWarehouseID,
          ...(companyIdForInventory ? { companyId: companyIdForInventory } : {}),
        },
      });

      if (destInventory) {
        // Atomically increment InventoryAvailable by TransferQuantity (or ReceivedQuantity)
        await tx.inventory.update({
          where: {
            InventoryID: destInventory.InventoryID,
          },
          data: {
            InventoryAvailable: {
              increment: receivedQty,
            },
          },
        });
      } else {
        await tx.inventory.create({
          data: {
            ProductID: transfer.ProductID,
            WarehouseID: transfer.InWarehouseID,
            InventoryAvailable: receivedQty,
            MinStockLevel: 0,
            MaxStockLevel: 1000,
            ReorderPoint: 10,
            companyId: companyIdForInventory,
          },
        });
      }

      // 4. Update RecievedDate = new Date() and mark status "COMPLETED"
      return await tx.transfer.update({
        where: {
          TransferID: transfer.TransferID,
        },
        data: {
          RecievedDate: new Date(),
          TransferStatus: "COMPLETED",
        },
        include: {
          Product: true,
          OutWarehouse: true,
          InWarehouse: true,
          company: true,
        },
      });
    });

    res.status(200).json(updatedTransfer);
  } catch (exception: any) {
    if (exception instanceof TransactionError) {
      return res.status(exception.statusCode).json({ error: exception.message });
    }
    res.status(500).json({ error: exception?.message || exception });
  }
};

const editTransfer = async (req: Request, res: Response) => {
  try {
    const TransferID = req.body.TransferID || req.params?.TransferID;
    if (!TransferID) {
      return res.status(400).json({ error: "TransferID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.transfer.findFirst({
      where: {
        TransferID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Transfer not found or unauthorized" });
    }

    const reqWithUser = req as RequestWithUser;
    const allowedIds: string[] = reqWithUser.allowedCompanyIds?.length
      ? reqWithUser.allowedCompanyIds
      : (typeof tenantId === "string" ? [tenantId] : []);
    const companyFilter = allowedIds.length > 0 ? { companyId: { in: allowedIds } } : (tenantId ? { companyId: tenantId } : {});

    const updateData: any = {};
    if (req.body.TransferQuantity !== undefined) {
      updateData.TransferQuantity = parseInt(req.body.TransferQuantity, 10) || 0;
    }
    if (req.body.SentDate) {
      updateData.SentDate = new Date(req.body.SentDate);
    }
    if (req.body.RecievedDate !== undefined) {
      updateData.RecievedDate = req.body.RecievedDate ? new Date(req.body.RecievedDate) : null;
    }
    if (req.body.ProductID !== undefined) {
      const product = await prisma.product.findFirst({
        where: {
          ProductID: req.body.ProductID,
          ...companyFilter,
        },
      });
      if (!product) {
        return res.status(400).json({ error: "Invalid ProductID: Product not found or unauthorized." });
      }
      updateData.ProductID = req.body.ProductID;
    }
    if (req.body.OutWarehouseID !== undefined) {
      const outWarehouse = await prisma.warehouse.findFirst({
        where: {
          WarehouseID: req.body.OutWarehouseID,
          ...companyFilter,
        },
      });
      if (!outWarehouse) {
        return res.status(400).json({ error: "Invalid OutWarehouseID: Source warehouse not found or unauthorized." });
      }
      updateData.OutWarehouseID = req.body.OutWarehouseID;
    }
    if (req.body.InWarehouseID !== undefined) {
      const inWarehouse = await prisma.warehouse.findFirst({
        where: {
          WarehouseID: req.body.InWarehouseID,
          ...companyFilter,
        },
      });
      if (!inWarehouse) {
        return res.status(400).json({ error: "Invalid InWarehouseID: Destination warehouse not found or unauthorized." });
      }
      updateData.InWarehouseID = req.body.InWarehouseID;
    }
    delete updateData.companyId;

    const updatedTransfer = await prisma.transfer.update({
      where: {
        TransferID: TransferID,
      },
      data: updateData,
      include: {
        Product: true,
        OutWarehouse: true,
        InWarehouse: true,
        company: true,
      },
    });

    res.status(200).json(updatedTransfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllTransfers = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Transfers = await prisma.transfer.findMany({
      where: { companyId: tenantId },
      include: {
        Product: true,
        OutWarehouse: true,
        InWarehouse: true,
        company: true,
      },
    });

    res.status(200).json(Transfers);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getTransfer = async (
  req: Request<{ TransferID: string }>,
  res: Response
) => {
  try {
    const tenantId = getTenantId(req);
    const Transfer = await prisma.transfer.findFirst({
      where: {
        TransferID: req.params.TransferID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: {
        Product: true,
        OutWarehouse: true,
        InWarehouse: true,
        company: true,
      },
    });

    if (!Transfer) {
      return res.status(404).json({ error: "Transfer not found or unauthorized" });
    }

    res.status(200).json(Transfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteTransfer = async (
  req: Request<{ TransferID: string }>,
  res: Response
) => {
  try {
    const TransferID = req.params.TransferID;
    if (!TransferID) {
      return res.status(400).json({ error: "TransferID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.transfer.findFirst({
      where: {
        TransferID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Transfer not found or unauthorized" });
    }

    const Transfer = await prisma.transfer.delete({
      where: {
        TransferID,
      },
    });

    res.status(200).json(Transfer);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addTransfer,
  receiveTransfer,
  editTransfer,
  getAllTransfers,
  getTransfer,
  deleteTransfer,
};
