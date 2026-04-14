import { pool } from "../db/pool.js";

const periodViewMap = {
  daily: "leaderboard_daily",
  weekly: "leaderboard_weekly",
  monthly: "leaderboard_monthly"
} as const;

const metricOrderMap = {
  worksheets: "worksheets_completed DESC, problems_solved DESC, public_nickname ASC",
  problems: "problems_solved DESC, worksheets_completed DESC, public_nickname ASC",
  accuracy: "accuracy_percentage DESC, problems_solved DESC, public_nickname ASC"
} as const;

export const getLeaderboard = async ({
  period,
  metric
}: {
  period: "daily" | "weekly" | "monthly";
  metric: "worksheets" | "problems" | "accuracy";
}) => {
  const sql = `
    SELECT
      public_nickname,
      worksheets_completed,
      problems_solved,
      correct_answers,
      accuracy_percentage
    FROM ${periodViewMap[period]}
    WHERE problems_solved >= CASE WHEN $1 = 'accuracy' THEN 10 ELSE 0 END
    ORDER BY ${metricOrderMap[metric]}
    LIMIT 50
  `;

  const result = await pool.query(sql, [metric]);
  return result.rows.map((row) => ({
    public_nickname: row.public_nickname,
    worksheets_completed: row.worksheets_completed,
    problems_solved: row.problems_solved,
    correct_answers: row.correct_answers,
    accuracy_percentage: row.accuracy_percentage
  }));
};
