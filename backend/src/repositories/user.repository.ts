import { pool } from "../db/pool.js";
import type { GoogleProfile } from "../types/auth.js";

export const findOrCreateUserFromGoogleProfile = async (profile: GoogleProfile) => {
  const result = await pool.query(
    `INSERT INTO users (google_sub, email, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
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

export const ensureUserForTesting = async (input: { email: string; displayName: string }) => {
  const googleSub = `e2e-${input.email}`;
  const result = await pool.query(
    `INSERT INTO users (google_sub, email, display_name, avatar_url)
     VALUES ($1, $2, $3, NULL)
     ON CONFLICT (email)
     DO UPDATE SET
       display_name = EXCLUDED.display_name,
       updated_at = NOW(),
       last_login_at = NOW()
     RETURNING *`,
    [googleSub, input.email, input.displayName]
  );

  await pool.query(
    `INSERT INTO user_statistics (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [result.rows[0].id]
  );

  return result.rows[0];
};
