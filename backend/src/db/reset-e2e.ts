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

console.log("e2e database reset");
