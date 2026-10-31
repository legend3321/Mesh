import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

const addLocation = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req, true);
    if (!tenantId || typeof tenantId !== "string") {
      return res.status(400).json({
        error: "A valid companyId is required for this operation. Please specify a specific companyId.",
      });
    }

    const data: any = {
      LocationName: req.body.LocationName ? String(req.body.LocationName) : "",
      LocationAddress: req.body.LocationAddress ? String(req.body.LocationAddress) : "",
      companyId: tenantId,
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
    const LocationID = req.body.LocationID || req.params?.LocationID;
    if (!LocationID) {
      return res.status(400).json({ error: "LocationID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.location.findFirst({
      where: {
        LocationID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Location not found or unauthorized" });
    }

    const updateData: any = {};
    if (req.body.LocationName !== undefined) updateData.LocationName = String(req.body.LocationName);
    if (req.body.LocationAddress !== undefined) updateData.LocationAddress = String(req.body.LocationAddress);
    delete updateData.companyId;

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
    const tenantId = getTenantId(req);
    const Location = await prisma.location.findFirst({
      where: {
        LocationID: req.params.LocationID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
      include: { company: true },
    });

    if (!Location) {
      return res.status(404).json({ error: "Location not found or unauthorized" });
    }

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
    const LocationID = req.params.LocationID;
    if (!LocationID) {
      return res.status(400).json({ error: "LocationID is required" });
    }

    const tenantId = getTenantId(req);
    const existing = await prisma.location.findFirst({
      where: {
        LocationID,
        ...(tenantId ? { companyId: tenantId } : {}),
      },
    });

    if (!existing) {
      return res.status(404).json({ error: "Location not found or unauthorized" });
    }

    const Location = await prisma.location.delete({
      where: {
        LocationID,
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
