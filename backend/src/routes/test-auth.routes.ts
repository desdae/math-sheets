import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { ensureUserForTesting } from "../repositories/user.repository.js";
import { issueSessionTokens, refreshCookieName } from "../services/token.service.js";

const loginSchema = z.object({
  email: z.string().email().default("e2e@example.com"),
  publicNickname: z.string().trim().min(1).nullable().optional()
});

const isE2EAuthEnabled = () => process.env.ENABLE_E2E_AUTH === "true" || env.ENABLE_E2E_AUTH;

export const testAuthRouter = Router();

testAuthRouter.use((_req, _res, next) => {
  if (!isE2EAuthEnabled()) {
    return next(new HttpError(404, "Not found"));
  }

  return next();
});

testAuthRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = loginSchema.parse(req.body);
    const user = await ensureUserForTesting(body);
    const { accessToken, refreshToken } = await issueSessionTokens(user.id);

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/api/auth"
    });

    res.json({
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        publicNickname: user.public_nickname ?? null
      }
    });
  })
);
