-- SentinelIQ schema — Day 1 (Builder B).
-- Idempotent: safe to run repeatedly. Run via `npm run migrate`.

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

-- 1. users -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  tech_literacy_level TEXT NOT NULL DEFAULT 'standard'
                        CHECK (tech_literacy_level IN ('low', 'standard', 'medium', 'high')),
  usual_location      TEXT,
  known_device_id     TEXT,
  known_recipients    UUID[] NOT NULL DEFAULT '{}',
  avg_transaction     NUMERIC(14,2) NOT NULL DEFAULT 0
);

-- 2. accounts --------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance        NUMERIC(14,2) NOT NULL DEFAULT 0,
  account_number TEXT UNIQUE NOT NULL
);

-- 3. transactions ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS transactions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_account   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  amount       NUMERIC(14,2) NOT NULL,
  recipient_id UUID REFERENCES users(id) ON DELETE SET NULL,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now(),
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'completed', 'blocked', 'failed'))
);

-- 4. decoy_fields ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS decoy_fields (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  field_type  TEXT NOT NULL,
  decoy_value TEXT NOT NULL,
  is_decoy    BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. access_logs -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS access_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_id         UUID NOT NULL REFERENCES decoy_fields(id) ON DELETE CASCADE,
  accessed_from_ip INET,
  timestamp        TIMESTAMPTZ NOT NULL DEFAULT now(),
  triggered_alert  BOOLEAN NOT NULL DEFAULT false
);

-- 6. trust_events ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS trust_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  signals_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_taken TEXT NOT NULL DEFAULT 'none'
                 CHECK (action_taken IN ('none', 'soft_step_up', 'hard_step_up', 'breach_alert')),
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. devices — per-device first-seen history. Feeds the DECAY-AWARE device signal:
-- a device's trust grows from its true first contact, so mimicry on a fresh device
-- can't buy instant trust. first_seen is set once and never moved.
CREATE TABLE IF NOT EXISTS devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,
  first_seen  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

-- Indexes on foreign keys / hot lookup columns ------------------------------
CREATE INDEX IF NOT EXISTS idx_accounts_user_id      ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from     ON transactions(from_account);
CREATE INDEX IF NOT EXISTS idx_transactions_to       ON transactions(to_account);
CREATE INDEX IF NOT EXISTS idx_transactions_recip    ON transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_decoy_fields_user_id  ON decoy_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_field_id  ON access_logs(field_id);
CREATE INDEX IF NOT EXISTS idx_trust_events_user_id  ON trust_events(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id       ON devices(user_id);

-- Idempotent migrations for already-created tables ------------------------
-- (CREATE TABLE IF NOT EXISTS won't alter an existing table, so apply here.)
ALTER TABLE users ADD COLUMN IF NOT EXISTS known_recipients UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_tech_literacy_level_check;
ALTER TABLE users ADD CONSTRAINT users_tech_literacy_level_check
  CHECK (tech_literacy_level IN ('low', 'standard', 'medium', 'high'));

-- Persisted activity history — feeds the impossible-travel (velocity) signal:
-- the previous known location + time to compare the current event against.
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_location TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at  TIMESTAMPTZ;

-- Bank name on each account so transaction history reads like a real Nigerian
-- statement (recipient name · bank · masked account) instead of raw UUIDs.
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS bank_name TEXT;
