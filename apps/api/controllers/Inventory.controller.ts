import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId, RequestWithUser } from "../middleware/App.middleware";

const addInventory = async (req: Request, res: Response) => {
  try {
    const reqWithUser = req as RequestWithUser;
    const currentUser = (reqWithUser.user as any)?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    // SuperAdmin is a platform backend operator and does not participate in company inventory
    if (isSuperAdmin && !currentUser?.companyId) {
      return res.status(403).json({ error: "Access denied. Only company members can manage company inventory." });
    }

    const tenantId = req.body.companyId || getTenantId(req, true);
    if (!tenantId) {
      return res.status(400).json({ error: "Company association required to provision inventory." });
    }

    const data = {
      ...req.body,
      companyId: tenantId,
    };

    const newInventory = await prisma.inventory.create({
      data,
      include: {
        Product: true,
        Warehouse: true,
        company: true,
      },
    });

    res.status(200).json(newInventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editInventory = async (req: Request, res: Response) => {
  try {
    const reqWithUser = req as RequestWithUser;
    const currentUser = (reqWithUser.user as any)?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    if (isSuperAdmin && !currentUser?.companyId) {
      return res.status(403).json({ error: "Access denied. Only company members can modify company inventory." });
    }

    const tenantId = getTenantId(req);
    const { InventoryID, ...updateData } = req.body;

    const existing = await prisma.inventory.findFirst({
      where: {
        InventoryID: InventoryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Inventory item not found in your company records." });
    }

    const updatedInventory = await prisma.inventory.update({
      where: {
        InventoryID: InventoryID,
      },
      data: updateData,
      include: {
        Product: true,
        Warehouse: true,
        company: true,
      },
    });

    res.status(200).json(updatedInventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllInventorys = async (req: Request, res: Response) => {
  try {
    const reqWithUser = req as RequestWithUser;
    const currentUser = (reqWithUser.user as any)?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    // SuperAdmin does not own or participate in company operational data.
    // Only authenticated Company members can see their company's inventory.
    if (isSuperAdmin && !currentUser?.companyId) {
      return res.status(200).json([]);
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Inventorys = await prisma.inventory.findMany({
      where: { companyId: tenantId },
      include: {
        Product: true,
        Warehouse: true,
        company: true,
      },
    });

    res.status(200).json(Inventorys);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getInventory = async (
  req: Request<{ InventoryID: string }>,
  res: Response
) => {
  try {
    const reqWithUser = req as RequestWithUser;
    const currentUser = (reqWithUser.user as any)?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    if (isSuperAdmin && !currentUser?.companyId) {
      return res.status(403).json({ error: "Access denied. Only company members can inspect inventory." });
    }

    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(403).json({ error: "Company membership required to inspect inventory." });
    }

    const inventory = await prisma.inventory.findFirst({
      where: {
        InventoryID: req.params.InventoryID,
        companyId: tenantId,
      },
      include: {
        Product: true,
        Warehouse: true,
        company: true,
      },
    });

    if (!inventory) {
      return res.status(404).json({ error: "Inventory item not found." });
    }

    res.status(200).json(inventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteInventory = async (
  req: Request<{ InventoryID: string }>,
  res: Response
) => {
  try {
    const reqWithUser = req as RequestWithUser;
    const currentUser = (reqWithUser.user as any)?.user || reqWithUser.user;
    const isSuperAdmin = currentUser?.userRole === "SUPERADMIN";

    if (isSuperAdmin && !currentUser?.companyId) {
      return res.status(403).json({ error: "Access denied. SuperAdmin cannot delete company inventory." });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.inventory.findFirst({
      where: {
        InventoryID: req.params.InventoryID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Inventory item not found in your company records." });
    }

    const Inventory = await prisma.inventory.delete({
      where: {
        InventoryID: req.params.InventoryID,
      },
    });

    res.status(200).json(Inventory);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addInventory,
  editInventory,
  getAllInventorys,
  getInventory,
  deleteInventory,
};
