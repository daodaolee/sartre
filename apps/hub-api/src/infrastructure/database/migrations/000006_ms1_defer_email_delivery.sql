DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM email_verification_challenges) THEN
    RAISE EXCEPTION 'email_verification_cleanup_required' USING ERRCODE = '23514';
  END IF;
END
$$;

DROP TABLE email_verification_challenges;

ALTER TABLE auth_rate_limits
  DROP CONSTRAINT auth_rate_limits_scope_check,
  ADD CONSTRAINT auth_rate_limits_scope_check CHECK (scope IN (
    'email_login',
    'refresh'
  ));
