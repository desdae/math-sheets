import type { Request } from "express";
import { createHash } from "node:crypto";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../lib/jwt.js";
import {
  createRefreshToken,
  revokeRefreshToken,
  findActiveRefreshToken,
  revokeRefreshTokenByHash
} from "../repositories/token.repository.js";

const cookieName = "mathsheets_refresh_token";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const persistRefreshToken = async (userId: string, refreshToken: string) => {
  await createRefreshToken(userId, hashToken(refreshToken), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
};

export const issueSessionTokens = async (userId: string) => {
  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);
  await persistRefreshToken(userId, refreshToken);
  return { accessToken, refreshToken };
};

export const readRefreshTokenCookie = (req: Request) => req.cookies?.[cookieName] as string | undefined;

export const rotateRefreshToken = async (refreshToken: string | undefined) => {
  if (!refreshToken) {
    throw new Error("Missing refresh token");
  }

  const payload = verifyRefreshToken(refreshToken);
  const tokenHash = hashToken(refreshToken);
  const existing = await findActiveRefreshToken(payload.userId, tokenHash);

  if (!existing) {
    throw new Error("Refresh token is invalid");
  }

  await revokeRefreshToken(existing.id);
  return issueSessionTokens(payload.userId);
};

export const revokeRefreshTokenFromCookie = async (refreshToken: string | undefined) => {
  if (!refreshToken) {
    return;
  }

  const payload = verifyRefreshToken(refreshToken);
  await revokeRefreshTokenByHash(payload.userId, hashToken(refreshToken));
};

export const refreshCookieName = cookieName;
