import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";
import type { GoogleProfile } from "../types/auth.js";

const googleClient =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_CALLBACK_URL)
    : null;

export const exchangeCodeForGoogleProfile = async (code: string): Promise<GoogleProfile> => {
  if (!googleClient) {
    throw new Error("Google OAuth is not configured");
  }

  const { tokens } = await googleClient.getToken(code);
  const idToken = tokens.id_token;

  if (!idToken) {
    throw new Error("Google response did not include an ID token");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload.email || !payload.name) {
    throw new Error("Google profile data is incomplete");
  }

  return {
    googleSub: payload.sub,
    email: payload.email,
    displayName: payload.name,
    avatarUrl: payload.picture ?? null
  };
};
