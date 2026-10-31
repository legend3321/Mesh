import express from "express";
import AuthController from "../controllers/Auth.controller";
import verifyToken, { requireAdminOrSuperAdmin } from "../middleware/App.middleware";
import { ssoLimiter } from "../middleware/RateLimit.middleware";
import { validateBody, ssoProvisionSchema } from "../middleware/Validation.middleware";

const authRouter = express.Router();

// Public Authentication Endpoints
authRouter.post("/register", AuthController.createUser);
authRouter.post("/login", AuthController.loginUser);
authRouter.post("/sso/provision", ssoLimiter, validateBody(ssoProvisionSchema), AuthController.ssoProvisionUser);

// User Administration & RBAC Endpoints (protected with verifyToken and requireAdminOrSuperAdmin)
authRouter.get("/getAll", verifyToken, AuthController.getAllUsers);
authRouter.get("/users/getAll", verifyToken, AuthController.getAllUsers);
authRouter.post("/add", verifyToken, requireAdminOrSuperAdmin, AuthController.createUser);
authRouter.post("/users/add", verifyToken, requireAdminOrSuperAdmin, AuthController.createUser);
authRouter.patch("/edit", verifyToken, requireAdminOrSuperAdmin, AuthController.updateUser);
authRouter.patch("/users/edit", verifyToken, requireAdminOrSuperAdmin, AuthController.updateUser);
authRouter.post("/edit", verifyToken, requireAdminOrSuperAdmin, AuthController.updateUser);
authRouter.post("/users/edit", verifyToken, requireAdminOrSuperAdmin, AuthController.updateUser);
authRouter.post("/update", verifyToken, requireAdminOrSuperAdmin, AuthController.updateUser);
authRouter.delete("/delete/:userId", verifyToken, requireAdminOrSuperAdmin, AuthController.deleteUser);
authRouter.delete("/users/delete/:userId", verifyToken, requireAdminOrSuperAdmin, AuthController.deleteUser);

export default authRouter;
