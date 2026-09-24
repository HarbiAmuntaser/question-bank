BEGIN;

-- Google-only students do not have a local credential until they explicitly
-- create one through the existing password-reset flow. Administrative access
-- remains credentials-only.
ALTER TABLE users
  ALTER COLUMN password DROP NOT NULL,
  ADD CONSTRAINT users_administrative_password_required
    CHECK (role = 'student' OR password IS NOT NULL);

COMMIT;
