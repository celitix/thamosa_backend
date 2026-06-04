import express from "express";
import { validateBody } from "../middleware/schemaValidator";
import { contactEnquiry } from "../schema/enquiry.schema";
import { contact, clearData } from "../controller/enquiry.controller";
const router = express.Router();

router.post("/contact", validateBody(contactEnquiry), contact);

router.delete("/data", clearData);

export default router;
