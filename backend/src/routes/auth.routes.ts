import { randomBytes } from "node:crypto";
import { Router } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/async-handler.js";
import { HttpError } from "../lib/http-error.js";
import { authenticate } from "../middleware/authenticate.js";
import { findOrCreateUserFromGoogleProfile, findUserById } from "../repositories/user.repository.js";
import { exchangeCodeForGoogleProfile, isGoogleOAuthConfigured } from "../services/google-oauth.service.js";
import {
  issueSessionTokens,
  readRefreshTokenCookie,
  refreshCookieName,
  revokeRefreshTokenFromCookie,
  rotateRefreshToken
} from "../services/token.service.js";

export const authRouter = Router();
const oauthStateCookieName = "mathsheets_oauth_state";

authRouter.get("/google", (_req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).send("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the backend.");
  }

  const state = randomBytes(24).toString("hex");

  res.cookie(oauthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/api/auth"
  });

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    state
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code ?? "");
    const callbackState = String(req.query.state ?? "");
    const cookieState = String(req.cookies?.[oauthStateCookieName] ?? "");

    if (!callbackState || !cookieState || callbackState !== cookieState) {
      throw new HttpError(401, "Invalid oauth state");
    }

    res.clearCookie(oauthStateCookieName, { path: "/api/auth" });
    const profile = await exchangeCodeForGoogleProfile(code);
    const user = await findOrCreateUserFromGoogleProfile(profile);
    const { refreshToken } = await issueSessionTokens(user.id);

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/api/auth"
    });

    res.redirect(`${env.APP_BASE_URL}/auth/callback`);
  })
);

authRouter.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await findUserById(req.user!.id);
    res.json({
      user: {
        id: user.id,
        email: user.email,
        publicNickname: user.public_nickname
      }
    });
  })
);

authRouter.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const tokens = await rotateRefreshToken(readRefreshTokenCookie(req));

    res.cookie(refreshCookieName, tokens.refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/api/auth"
    });

    res.json({ accessToken: tokens.accessToken });
  })
);

authRouter.post("/logout", asyncHandler(async (req, res) => {
  await revokeRefreshTokenFromCookie(readRefreshTokenCookie(req));
  res.clearCookie(refreshCookieName, { path: "/api/auth" });
  res.status(204).send();
}));
