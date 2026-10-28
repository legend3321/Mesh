import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addLocation = async (req: Request, res: Response) => {
  try {
    const tenantId = req.body.companyId || getTenantId(req);
    const data = {
      ...req.body,
      ...(tenantId && { companyId: tenantId }),
    };

    const newLocation = await prisma.location.create({
      data,
      include: { company: true },
    });

    res.status(200).json(newLocation);
  } catch (exception) {
    console.log(exception);
    res.status(500).json({ error: exception });
  }
};

const editLocation = async (req: Request, res: Response) => {
  try {
    const { LocationID, ...updateData } = req.body;

    if (!LocationID) {
      return res.status(400).json({ error: "LocationID is required" });
    }

    const updatedLocation = await prisma.location.update({
      where: {
        LocationID: LocationID,
      },
      data: updateData,
      include: { company: true },
    });

    res.status(200).json(updatedLocation);
  } catch (exception) {
    console.log(exception);
    res.status(500).json({ error: exception });
  }
};

const getAllLocations = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    if (!tenantId) {
      return res.status(200).json([]);
    }

    const Locations = await prisma.location.findMany({
      where: { companyId: tenantId },
      include: { company: true },
    });

    res.status(200).json(Locations);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getLocation = async (
  req: Request<{ LocationID: string }>,
  res: Response
) => {
  try {
    const Location = await prisma.location.findMany({
      where: { LocationID: req.params.LocationID },
      include: { company: true },
    });

    res.status(200).json(Location);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteLocation = async (
  req: Request<{ LocationID: string }>,
  res: Response
) => {
  try {
    const Location = await prisma.location.delete({
      where: {
        LocationID: req.params.LocationID,
      },
    });

    res.status(200).json(Location);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

export default {
  addLocation,
  editLocation,
  getAllLocations,
  getLocation,
  deleteLocation,
};
