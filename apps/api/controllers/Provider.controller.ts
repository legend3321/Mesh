import { Request, Response } from "express";
import { prisma } from "../index";

const addProvider = async (req: Request, res: Response) => {
  try {
    const newProvider = await prisma.provider.create({
      data: req.body,
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
    });

    res.status(200).json(updatedProvider);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllProviders = async (req: Request, res: Response) => {
  try {
    const Providers = await prisma.provider.findMany();

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
