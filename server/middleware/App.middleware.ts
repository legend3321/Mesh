import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";

interface RequestWithUser extends Request {
  user?: string | jwt.JwtPayload;
}

const verifyToken = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  let token = req.headers.authorization;
  if (!token)
    return res.status(401).json("Access Denied / Unauthorised Access");
  const verifiedUser = jwt.verify(token, process.env.SALT || "");
  if (!verifiedUser) return res.status(400).json("Invalid Token");
  req.user = verifiedUser;
  next();
  try {
  } catch (ex) {
    return res.status(400).json("Invalid Token");
  }
};

export default verifyToken;
