import { ZodType } from "zod";
import { Request, Response, NextFunction } from "express";
import { unlink } from "node:fs/promises";

const cleanupUploadedFile = async (filePath?: string) => {
  if (!filePath) {
    return;
  }

  try {
    await unlink(filePath);
  } catch (e: any) {
    if (e?.code !== "ENOENT") {
      console.error("Failed to delete invalid upload:", e.message);
    }
  }
};

export const validateBody =
  <T>(schema: ZodType<T>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      await cleanupUploadedFile(req.file?.path);
      return res.status(400).json({
        error: "Invalid request body",
        details: result.error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
        status: false,
      });
    }

    req.body = result.data;
    return next();
  };
