import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/jwt.js";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = verifyAccessToken(authHeader.slice(7));
    req.user = { id: payload.userId };
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
