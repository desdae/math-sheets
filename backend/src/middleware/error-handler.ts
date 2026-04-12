import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../lib/http-error.js";

export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({
    message: "Something went wrong",
    detail: process.env.NODE_ENV === "development" ? error.message : undefined
  });
};
