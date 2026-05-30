import express from "express";
import { validateBody } from "../middleware/schemaValidator";
import {
  all,
  byId,
  create,
  deleteB,
  update,
} from "../controller/blog.controller";
import { blogCreate, blogUpdate } from "../schema/blog.schema";
import { upload } from "../middleware/upload";
import { checkIsAuth } from "../middleware/checkIsAuth";

const router = express.Router();

router.post(
  "/create",
  checkIsAuth,
  upload.single("image"),
  validateBody(blogCreate),
  create,
);
router.get("/", all);
router.get("/:id", byId);
router.put("/update", checkIsAuth, upload.single("image"), validateBody(blogUpdate), update);
router.delete("/delete/:id", checkIsAuth, deleteB);

export default router;
