import { decodeToken, errorHandler, validateToken } from "../lib/helper";
import { prisma } from "../lib/prisma";
import { Request, Response, NextFunction } from "express";

interface AuthRequest extends Request {
  user?: string;
}
export const checkIsAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader)
      return errorHandler("Please include bearer token in header", 401);

    let token = "";
    const parts = authHeader.split(" ");
    if (!authHeader.startsWith("Bearer "))
      return errorHandler("Please include bearer token in header", 401);

    if (parts.length === 2 && parts[0] === "Bearer") {
      token = parts[1];
    }
    try {
      const isValid = await validateToken(token);
      if (!isValid) return errorHandler("Invalid token", 401);

      const decodedTokenPayload: any = await decodeToken(token);
      req.user = decodedTokenPayload?.mobile as string;
      next();
    } catch (e) {
      errorHandler("Invalid token", 401);
    }
  } catch (e: any) {
    errorHandler(e.message, 401);
  }
};
