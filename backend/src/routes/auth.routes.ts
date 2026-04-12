import { Router } from "express";
import { env } from "../config/env.js";
import { asyncHandler } from "../lib/async-handler.js";
import { authenticate } from "../middleware/authenticate.js";
import { findOrCreateUserFromGoogleProfile, findUserById } from "../repositories/user.repository.js";
import { exchangeCodeForGoogleProfile, isGoogleOAuthConfigured } from "../services/google-oauth.service.js";
import {
  issueSessionTokens,
  readRefreshTokenCookie,
  refreshCookieName,
  rotateRefreshToken
} from "../services/token.service.js";

export const authRouter = Router();

authRouter.get("/google", (_req, res) => {
  if (!isGoogleOAuthConfigured()) {
    return res.status(503).send("Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET, then restart the backend.");
  }

  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent"
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

authRouter.get(
  "/google/callback",
  asyncHandler(async (req, res) => {
    const code = String(req.query.code ?? "");
    const profile = await exchangeCodeForGoogleProfile(code);
    const user = await findOrCreateUserFromGoogleProfile(profile);
    const { accessToken, refreshToken } = await issueSessionTokens(user.id);

    res.cookie(refreshCookieName, refreshToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
      path: "/api/auth"
    });

    res.redirect(`${env.APP_BASE_URL}/auth/callback?access_token=${encodeURIComponent(accessToken)}`);
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
        displayName: user.display_name,
        avatarUrl: user.avatar_url
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

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(refreshCookieName, { path: "/api/auth" });
  res.status(204).send();
});
