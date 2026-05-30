import { ZodType } from "zod";
import { Request, Response, NextFunction } from "express";

export const validateBody =
  <T>(schema: ZodType<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
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
