import express from "express";
import AuthController from "../controllers/Auth.controller";
import verifyToken from "../middleware/App.middleware";
const authRouter = express.Router();

authRouter.post("/register", AuthController.createUser);
authRouter.post("/login", AuthController.loginUser);
authRouter.post("/update", verifyToken, AuthController.updateUser);

// User administration routes (support both /getAll and /users/getAll conventions)
authRouter.get("/getAll", verifyToken, AuthController.getAllUsers);
authRouter.get("/users/getAll", verifyToken, AuthController.getAllUsers);
authRouter.post("/add", verifyToken, AuthController.createUser);
authRouter.post("/users/add", verifyToken, AuthController.createUser);
authRouter.patch("/edit", verifyToken, AuthController.updateUser);
authRouter.patch("/users/edit", verifyToken, AuthController.updateUser);
authRouter.delete("/delete/:userId", verifyToken, AuthController.deleteUser);
authRouter.delete("/users/delete/:userId", verifyToken, AuthController.deleteUser);

export default authRouter;
