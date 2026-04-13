import { config } from "dotenv";
import pg from "pg";
import { resolve } from "node:path";

config({ path: resolve(process.cwd(), ".env.e2e") });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for E2E database reset");
}

export const resetE2EDatabase = async () => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  await pool.query(`
    TRUNCATE TABLE
      worksheet_answers,
      worksheet_attempts,
      worksheet_questions,
      worksheets,
      refresh_tokens,
      user_statistics,
      users
    RESTART IDENTITY CASCADE
  `);

  await pool.end();
};

export const setWorksheetCreatedAt = async (worksheetId: string, isoDate: string) => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
  });

  await pool.query(
    `
      UPDATE worksheets
      SET created_at = $2, updated_at = $2, started_at = $2
      WHERE id = $1
    `,
    [worksheetId, isoDate]
  );

  await pool.end();
};
