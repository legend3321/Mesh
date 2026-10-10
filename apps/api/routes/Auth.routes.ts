import express from "express";
import AuthController from "../controllers/Auth.controller";
import verifyToken from "../middleware/App.middleware";
const authRouter = express.Router();

authRouter.post("/register", AuthController.createUser);
authRouter.post("/login", AuthController.loginUser);
authRouter.post("/update", verifyToken, AuthController.updateUser);

export default authRouter;
