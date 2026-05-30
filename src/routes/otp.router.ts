import express from "express";
import { validateBody } from "../middleware/schemaValidator";

import { sendOtp, verifyOtp } from "../controller/enquiry.controller";
import { sendOtpSchema, verifyOtpSchema } from "../schema/otp.schema";
const router = express.Router();


router.post("/sendOtp", validateBody(sendOtpSchema), sendOtp);
router.post("/verifyOtp", validateBody(verifyOtpSchema), verifyOtp);

export default router;
