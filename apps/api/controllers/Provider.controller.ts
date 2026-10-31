import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addProvider = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const data: any = {
      ProviderName: req.body.ProviderName ? String(req.body.ProviderName) : "",
      ProviderAddress: req.body.ProviderAddress ? String(req.body.ProviderAddress) : "",
      companyId: tenantId,
    };

    const newProvider = await prisma.provider.create({
      data,
      include: { company: true },
    });

    res.status(200).json(newProvider);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const editProvider = async (req: Request, res: Response) => {
  try {
    const ProviderID = req.body.ProviderID || req.params?.ProviderID;
    if (!ProviderID) {
      return res.status(400).json({ error: "ProviderID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.provider.findFirst({
      where: {
        ProviderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Provider not found or unauthorized" });
    }

    const updateData: any = {};
    if (req.body.ProviderName !== undefined) updateData.ProviderName = String(req.body.ProviderName);
    if (req.body.ProviderAddress !== undefined) updateData.ProviderAddress = String(req.body.ProviderAddress);
    delete updateData.companyId;

    const updatedProvider = await prisma.provider.update({
      where: {
        ProviderID: ProviderID,
      },
      data: updateData,
      include: { company: true },
    });

    res.status(200).json(updatedProvider);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllProviders = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Providers = await prisma.provider.findMany({
      where: { companyId: tenantId },
      include: { company: true },
    });

    res.status(200).json(Providers);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getProvider = async (
  req: Request<{ ProviderID: string }>,
  res: Response
) => {
  try {
    const tenantId = getTenantId(req);
    const Provider = await prisma.provider.findFirst({
      where: {
        ProviderID: req.params.ProviderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: { company: true },
    });

    if (!Provider) {
      return res.status(404).json({ error: "Provider not found or unauthorized" });
    }

    res.status(200).json(Provider);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteProvider = async (
  req: Request<{ ProviderID: string }>,
  res: Response
) => {
  try {
    const ProviderID = req.params.ProviderID;
    if (!ProviderID) {
      return res.status(400).json({ error: "ProviderID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.provider.findFirst({
      where: {
        ProviderID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Provider not found or unauthorized" });
    }

    const Provider = await prisma.provider.delete({
      where: {
        ProviderID,
      },
    });

    res.status(200).json(Provider);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addProvider,
  editProvider,
  getAllProviders,
  getProvider,
  deleteProvider,
};
