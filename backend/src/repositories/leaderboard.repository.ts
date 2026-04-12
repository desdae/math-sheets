import { pool } from "../db/pool.js";

const periodViewMap = {
  daily: "leaderboard_daily",
  weekly: "leaderboard_weekly",
  monthly: "leaderboard_monthly"
} as const;

const metricOrderMap = {
  worksheets: "worksheets_completed DESC, problems_solved DESC, display_name ASC",
  problems: "problems_solved DESC, worksheets_completed DESC, display_name ASC",
  accuracy: "accuracy_percentage DESC, problems_solved DESC, display_name ASC"
} as const;

export const getLeaderboard = async ({
  period,
  metric
}: {
  period: "daily" | "weekly" | "monthly";
  metric: "worksheets" | "problems" | "accuracy";
}) => {
  const sql = `
    SELECT *
    FROM ${periodViewMap[period]}
    WHERE problems_solved >= CASE WHEN $1 = 'accuracy' THEN 10 ELSE 0 END
    ORDER BY ${metricOrderMap[metric]}
    LIMIT 50
  `;

  const result = await pool.query(sql, [metric]);
  return result.rows;
};
