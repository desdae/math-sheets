import type { NextFunction, Request, Response } from "express";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyPrefix?: string;
};

export const createRateLimiter = ({ windowMs, max, keyPrefix = "global" }: RateLimitOptions) => {
  const buckets = new Map<string, RateLimitBucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const identity = req.headers.authorization ? `auth:${req.headers.authorization}` : `ip:${req.ip ?? "unknown"}`;
    const key = `${keyPrefix}:${identity}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      return next();
    }

    if (existing.count >= max) {
      res.setHeader("Retry-After", Math.ceil((existing.resetAt - now) / 1000));
      return res.status(429).json({ message: "Too many requests. Please try again later." });
    }

    existing.count += 1;
    buckets.set(key, existing);
    return next();
  };
};
