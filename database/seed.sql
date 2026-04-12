INSERT INTO users (google_sub, email, display_name, avatar_url)
VALUES
  ('seed-google-1', 'ava@example.com', 'Ava Carter', 'https://api.dicebear.com/9.x/initials/svg?seed=Ava'),
  ('seed-google-2', 'leo@example.com', 'Leo Young', 'https://api.dicebear.com/9.x/initials/svg?seed=Leo')
ON CONFLICT (email) DO NOTHING;
