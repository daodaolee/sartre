CREATE TABLE oauth_login_attempts (
  oauth_attempt_id uuid PRIMARY KEY,
  state_hash character(64) NOT NULL UNIQUE CHECK (state_hash ~ '^[0-9a-f]{64}$'),
  code_challenge text NOT NULL CHECK (
    length(code_challenge) BETWEEN 43 AND 128
    AND code_challenge ~ '^[A-Za-z0-9_-]+$'
  ),
  redirect_uri text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'consumed')),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT oauth_login_attempts_expiry_check CHECK (created_at < expires_at),
  CONSTRAINT oauth_login_attempts_https_redirect_check CHECK (
    length(redirect_uri) BETWEEN 1 AND 2048
    AND redirect_uri LIKE 'https://%'
  ),
  CONSTRAINT oauth_login_attempts_consumed_state_check CHECK (
    (status = 'pending' AND consumed_at IS NULL)
    OR
    (status = 'consumed' AND consumed_at IS NOT NULL)
  ),
  CONSTRAINT oauth_login_attempts_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE company_email_credentials (
  auth_identity_id uuid PRIMARY KEY REFERENCES auth_identities (auth_identity_id),
  password_hash text NOT NULL CHECK (
    length(password_hash) BETWEEN 64 AND 512
    AND password_hash LIKE '$argon2id$%'
  ),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT company_email_credentials_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE TABLE email_verification_challenges (
  challenge_id uuid PRIMARY KEY,
  email text NOT NULL CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 320),
  code_hash character(64) NOT NULL CHECK (code_hash ~ '^[0-9a-f]{64}$'),
  status text NOT NULL CHECK (status IN ('pending', 'consumed', 'delivery_failed', 'superseded')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 10),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  CONSTRAINT email_verification_challenges_expiry_check CHECK (created_at < expires_at),
  CONSTRAINT email_verification_challenges_consumed_state_check CHECK (
    (status = 'pending' AND consumed_at IS NULL)
    OR
    (status = 'consumed' AND consumed_at IS NOT NULL)
    OR
    (status IN ('delivery_failed', 'superseded') AND consumed_at IS NULL)
  ),
  CONSTRAINT email_verification_challenges_timestamp_order_check CHECK (updated_at >= created_at)
);

CREATE INDEX email_verification_challenges_pending_email_idx
  ON email_verification_challenges (email, created_at DESC)
  WHERE status = 'pending';

CREATE TABLE auth_rate_limits (
  scope text NOT NULL CHECK (scope IN (
    'email_login',
    'email_register',
    'email_verification',
    'oauth_callback',
    'oauth_start',
    'refresh'
  )),
  key_hash character(64) NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  window_started_at timestamptz NOT NULL,
  attempt_count integer NOT NULL CHECK (attempt_count BETWEEN 1 AND 100000),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (scope, key_hash),
  CONSTRAINT auth_rate_limits_block_check CHECK (
    blocked_until IS NULL OR blocked_until >= window_started_at
  ),
  CONSTRAINT auth_rate_limits_timestamp_order_check CHECK (updated_at >= window_started_at)
);

CREATE UNIQUE INDEX refresh_tokens_token_hash_key ON refresh_tokens (token_hash);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'auth_rate_limits',
    'company_email_credentials',
    'email_verification_challenges',
    'oauth_login_attempts'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I OWNER TO sartre_migration', table_name);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', table_name);
  END LOOP;
END
$$;

GRANT SELECT, INSERT, UPDATE ON
  auth_rate_limits,
  company_email_credentials,
  email_verification_challenges,
  oauth_login_attempts
TO sartre_app;
