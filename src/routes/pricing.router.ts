import express from "express";
import { getByCountry } from "../controller/pricing.controller";
const router = express.Router();

router.get("/", getByCountry);
export default router;
