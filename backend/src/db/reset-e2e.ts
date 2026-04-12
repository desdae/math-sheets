import { pool } from "./pool.js";

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

console.log("e2e database reset");
