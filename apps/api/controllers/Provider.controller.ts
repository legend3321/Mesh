import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addProvider = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      ...(tenantId && { companyId: tenantId }),
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
    const { ProviderID, ...updateData } = req.body;
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
    const Provider = await prisma.provider.findMany({
      where: { ProviderID: req.params.ProviderID },
      include: { company: true },
    });

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
    const Provider = await prisma.provider.delete({
      where: {
        ProviderID: req.params.ProviderID,
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
