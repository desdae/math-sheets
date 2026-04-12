import { pool } from "../db/pool.js";

export const createRefreshToken = async (userId: string, tokenHash: string, expiresAt: Date) => {
  const result = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt]
  );

  return result.rows[0];
};

export const findActiveRefreshToken = async (userId: string, tokenHash: string) => {
  const result = await pool.query(
    `SELECT * FROM refresh_tokens
     WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [userId, tokenHash]
  );

  return result.rows[0];
};

export const revokeRefreshToken = async (tokenId: string) => {
  await pool.query(`UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1`, [tokenId]);
};
