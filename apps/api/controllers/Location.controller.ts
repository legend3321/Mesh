import { Request, Response } from "express";
import { prisma } from "../index";

const addLocation = async (req: Request, res: Response) => {
  try {
    const newLocation = await prisma.location.create({
      data: req.body,
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
    });

    res.status(200).json(updatedLocation);
  } catch (exception) {
    console.log(exception);
    res.status(500).json({ error: exception });
  }
};

const getAllLocations = async (req: Request, res: Response) => {
  try {
    const Locations = await prisma.location.findMany();

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
    const Location = prisma.location.delete({
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
