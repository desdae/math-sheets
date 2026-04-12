import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export const validateBody = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      issues: parsed.error.flatten()
    });
  }

  req.body = parsed.data;
  return next();
};

export const validateQuery = (schema: ZodTypeAny) => (req: Request, res: Response, next: NextFunction) => {
  const parsed = schema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      issues: parsed.error.flatten()
    });
  }

  res.locals.validatedQuery = parsed.data;
  return next();
};
