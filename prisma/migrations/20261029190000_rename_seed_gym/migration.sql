-- Hand-written data migration (#67): no schema change.
-- The seed gym used to carry the name of a real gym we interviewed. Rename
-- that row in place, so a database seeded before #67 (staging) keeps its staff,
-- climbers and check-ins instead of the next seed creating a second gym.
-- The old slug is matched by its md5 so the real name stays out of the repo.
-- Does nothing on a database that never had the old gym.
UPDATE "Gym"
SET "slug" = 'demo-gym', "name" = 'Elevate Demo Gym', "updatedAt" = now()
WHERE md5("slug") = 'aa79550ada3685d61be5502ea14a5828'
  AND NOT EXISTS (SELECT 1 FROM "Gym" WHERE "slug" = 'demo-gym');
