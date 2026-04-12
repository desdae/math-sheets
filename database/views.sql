CREATE OR REPLACE VIEW leaderboard_daily AS
SELECT
  u.id AS user_id,
  u.display_name,
  COALESCE(u.avatar_url, '') AS avatar_url,
  COUNT(DISTINCT w.id) AS worksheets_completed,
  COALESCE(SUM(a.score_total), 0) AS problems_solved,
  COALESCE(SUM(a.score_correct), 0) AS correct_answers,
  COALESCE(ROUND((SUM(a.score_correct)::numeric / NULLIF(SUM(a.score_total), 0)) * 100, 2), 0) AS accuracy_percentage
FROM users u
JOIN worksheets w ON w.user_id = u.id
JOIN worksheet_attempts a ON a.worksheet_id = w.id
WHERE w.status = 'completed'
  AND w.submitted_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.display_name, u.avatar_url;

CREATE OR REPLACE VIEW leaderboard_weekly AS
SELECT
  u.id AS user_id,
  u.display_name,
  COALESCE(u.avatar_url, '') AS avatar_url,
  COUNT(DISTINCT w.id) AS worksheets_completed,
  COALESCE(SUM(a.score_total), 0) AS problems_solved,
  COALESCE(SUM(a.score_correct), 0) AS correct_answers,
  COALESCE(ROUND((SUM(a.score_correct)::numeric / NULLIF(SUM(a.score_total), 0)) * 100, 2), 0) AS accuracy_percentage
FROM users u
JOIN worksheets w ON w.user_id = u.id
JOIN worksheet_attempts a ON a.worksheet_id = w.id
WHERE w.status = 'completed'
  AND w.submitted_at >= date_trunc('week', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.display_name, u.avatar_url;

CREATE OR REPLACE VIEW leaderboard_monthly AS
SELECT
  u.id AS user_id,
  u.display_name,
  COALESCE(u.avatar_url, '') AS avatar_url,
  COUNT(DISTINCT w.id) AS worksheets_completed,
  COALESCE(SUM(a.score_total), 0) AS problems_solved,
  COALESCE(SUM(a.score_correct), 0) AS correct_answers,
  COALESCE(ROUND((SUM(a.score_correct)::numeric / NULLIF(SUM(a.score_total), 0)) * 100, 2), 0) AS accuracy_percentage
FROM users u
JOIN worksheets w ON w.user_id = u.id
JOIN worksheet_attempts a ON a.worksheet_id = w.id
WHERE w.status = 'completed'
  AND w.submitted_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
GROUP BY u.id, u.display_name, u.avatar_url;
