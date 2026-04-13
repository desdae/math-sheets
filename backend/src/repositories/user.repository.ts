import type { DatabaseError } from "pg";
import { pool } from "../db/pool.js";
import { HttpError } from "../lib/http-error.js";
import type { GoogleProfile } from "../types/auth.js";

export const findOrCreateUserFromGoogleProfile = async (profile: GoogleProfile) => {
  const result = await pool.query(
    `INSERT INTO users (google_sub, email, display_name, public_nickname, avatar_url)
     VALUES ($1, $2, $3, $3, $4)
     ON CONFLICT (google_sub)
     DO UPDATE SET
       email = EXCLUDED.email,
       display_name = EXCLUDED.display_name,
       avatar_url = EXCLUDED.avatar_url,
       updated_at = NOW(),
       last_login_at = NOW()
     RETURNING *`,
    [profile.googleSub, profile.email, profile.displayName, profile.avatarUrl]
  );

  await pool.query(
    `INSERT INTO user_statistics (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [result.rows[0].id]
  );

  return result.rows[0];
};

export const findUserById = async (userId: string) => {
  const result = await pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
  return result.rows[0];
};

export const ensureUserForTesting = async (input: { email: string; publicNickname?: string | null }) => {
  const googleSub = `e2e-${input.email}`;
  const result = await pool.query(
    `INSERT INTO users (google_sub, email, display_name, public_nickname, avatar_url)
     VALUES ($1, $2, $3, $4, NULL)
     ON CONFLICT (email)
     DO UPDATE SET
       display_name = EXCLUDED.display_name,
       public_nickname = COALESCE(EXCLUDED.public_nickname, users.public_nickname),
       updated_at = NOW(),
       last_login_at = NOW()
     RETURNING *`,
    [googleSub, input.email, input.publicNickname ?? "E2E User", input.publicNickname ?? null]
  );

  await pool.query(
    `INSERT INTO user_statistics (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [result.rows[0].id]
  );

  return result.rows[0];
};

const isUniqueViolation = (error: unknown): error is DatabaseError => {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
};

export const updatePublicNickname = async (userId: string, publicNickname: string) => {
  try {
    const result = await pool.query(
      `UPDATE users
       SET public_nickname = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, public_nickname`,
      [userId, publicNickname]
    );

    return result.rows[0];
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new HttpError(409, "Nickname is already taken");
    }

    throw error;
  }
};
