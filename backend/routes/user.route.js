import  { Router } from "express";
import { login, register, reVerify, verify } from "../controllers/user.controller.js";

const router = Router();

router.post("/register", register);
router.post("/verify", verify);
router.post("/reverify", reVerify);
router.post("/login", login);
// router.post("/logout", logout);

export default router;