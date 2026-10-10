import { Request, Response } from "express";
import { prisma } from "../index";

import * as jwt from "jsonwebtoken";
import * as bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

interface RequestWithUser extends Request {
  user?: string | jwt.JwtPayload;
}

const createUser = async (req: Request, res: Response) => {
  try {
    const { userEmail, userPassword, userName } = req.body;
    const hashedPassword = await bcrypt.hash(userPassword, 10);
    const user: Prisma.UserCreateInput = {
      userEmail: userEmail,
      userPassword: hashedPassword,
      userName: userName,
    };
    const newUser = await prisma.user.create({
      data: user,
    });

    res.status(200).json(newUser);
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
      const updateUser = await prisma.user.update({
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
    const { userEmail } = req.body;

    const user = await prisma.user.findUniqueOrThrow({
      where: {
        userEmail: userEmail,
      },
    });

    const updateUser = await prisma.user.update({
      where: {
        userEmail: userEmail,
      },
      data: req.body,
    });

    return res.status(200).json(updateUser);
  } catch (exception) {
    return res.status(500).json({ error: exception });
  }
};

export default { createUser, loginUser, updateUser };
