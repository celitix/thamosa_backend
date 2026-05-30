import express from "express";
import { validateBody } from "../middleware/schemaValidator";
import { carreerEnquiry, contactEnquiry } from "../schema/enquiry.schema";
import {
  career,
  contact,
  turnstileVerify,
  clearData,
  clearBookDemo,
} from "../controller/enquiry.controller";
import { upload } from "../middleware/upload";
import { clearBookDemoFBEnquiries } from "../lib/sendOtp";
const router = express.Router();

router.post("/contact", validateBody(contactEnquiry), contact);
router.post(
  "/carrer",
  upload.single("resume"),
  validateBody(carreerEnquiry),
  career,
);

router.post("/turnstile-verify", turnstileVerify);
router.delete("/data", clearData);
router.delete("/data/bookDemo", clearBookDemo);
router.delete("/data/bookDemofb", clearBookDemoFBEnquiries);

export default router;
