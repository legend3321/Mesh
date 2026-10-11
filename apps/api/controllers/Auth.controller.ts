import { Request, Response } from "express";
import { prisma } from "../index";
import { getTenantId } from "../middleware/App.middleware";

import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

interface RequestWithUser extends Request {
  user?: string | jwt.JwtPayload;
}

const createUser = async (req: Request, res: Response) => {
  try {
    const { userEmail, userPassword, userName, userRole, companyId } = req.body;
    const hashedPassword = await bcrypt.hash(userPassword || "mesh1234", 10);
    const tenantId = companyId || getTenantId(req);

    const user: Prisma.UserCreateInput = {
      userEmail: userEmail,
      userPassword: hashedPassword,
      userName: userName,
      userRole: userRole || "EMPLOYEE",
      ...(tenantId && { company: { connect: { companyId: tenantId } } }),
    };
    const newUser = await prisma.user.create({
      data: user,
      select: {
        userId: true,
        userEmail: true,
        userName: true,
        userRole: true,
        companyId: true,
        company: true,
      },
    });

    res.status(200).json(newUser);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const getAllUsers = async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const users = await prisma.user.findMany({
      where: tenantId ? { companyId: tenantId } : {},
      select: {
        userId: true,
        userEmail: true,
        userName: true,
        userRole: true,
        companyId: true,
        company: true,
      },
    });
    res.status(200).json(users);
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const deleteUser = async (req: Request<{ userId: string }>, res: Response) => {
  try {
    const { userId } = req.params;
    await prisma.user.delete({
      where: { userId: userId },
    });
    res.status(200).json({ success: true, message: "User deleted" });
  } catch (exception) {
    res.status(500).json({ error: exception });
  }
};

const loginUser = async (req: Request, res: Response) => {
  try {
    const { userEmail, userPassword } = req.body.credentials;

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        userEmail: userEmail,
      },
      include: {
        company: true,
      },
    });

    const passwordMatch = await bcrypt.compare(userPassword, user.userPassword);
    if (!passwordMatch)
      return res.status(401).json({ error: { name: "Password Didn't Match" } });

    const {
      ["userPassword"]: removedpass,
      ["userRefreshToken"]: removedToken,
      ...newUser
    } = user;
    const authToken = jwt.sign({ user: newUser }, process.env.SALT || "", {
      expiresIn: "4h",
    });

    const refreshToken = jwt.sign({ user: newUser }, process.env.SALT || "");

    if (!user.userRefreshToken) {
      await prisma.user.update({
        where: {
          userEmail: newUser.userEmail,
        },
        data: {
          userRefreshToken: refreshToken,
        },
      });
    }

    return res.status(200).json({ user: newUser, authToken });
  } catch (exception) {
    console.log(exception);
    return res.status(401).json({ error: { name: "User Does Nor exist" } });
  }
};

const updateUser = async (req: RequestWithUser, res: Response) => {
  try {
    const { userId, userPassword, companyId, ...updateData } = req.body;

    if (!userId && !req.body.userEmail) {
      return res.status(400).json({ error: "userId or userEmail is required" });
    }

    const dataToUpdate: any = { ...updateData };
    if (userPassword && userPassword.trim() !== "") {
      dataToUpdate.userPassword = await bcrypt.hash(userPassword, 10);
    }
    if (companyId !== undefined) {
      dataToUpdate.companyId = companyId || null;
    }

    const updatedUser = await prisma.user.update({
      where: userId ? { userId: userId } : { userEmail: req.body.userEmail },
      data: dataToUpdate,
      select: {
        userId: true,
        userEmail: true,
        userName: true,
        userRole: true,
        companyId: true,
        company: true,
      },
    });

    return res.status(200).json(updatedUser);
  } catch (exception) {
    return res.status(500).json({ error: exception });
  }
};

export default { createUser, getAllUsers, deleteUser, loginUser, updateUser };
