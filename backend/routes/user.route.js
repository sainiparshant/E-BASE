import  { Router } from "express";
import { register, reVerify, verify } from "../controllers/user.controller.js";

const router = Router();

router.post("/register", register);
router.post("/verify", verify);
router.post("/reverify", reVerify);

export default router;