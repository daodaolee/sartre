DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM auth_identities
     WHERE provider <> 'company_email'
        OR provider_tenant_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'feishu_identity_cleanup_required' USING ERRCODE = '23514';
  END IF;
END
$$;

DROP TABLE oauth_login_attempts;

ALTER TABLE auth_rate_limits
  DROP CONSTRAINT auth_rate_limits_scope_check,
  ADD CONSTRAINT auth_rate_limits_scope_check CHECK (scope IN (
    'email_login',
    'email_register',
    'email_verification',
    'refresh'
  ));

ALTER TABLE auth_identities
  DROP CONSTRAINT auth_identities_provider_check,
  DROP CONSTRAINT auth_identities_provider_shape_check,
  DROP COLUMN provider_tenant_id,
  ALTER COLUMN verified_email SET NOT NULL,
  ADD CONSTRAINT auth_identities_provider_check CHECK (provider = 'company_email'),
  ADD CONSTRAINT auth_identities_provider_shape_check CHECK (
    provider = 'company_email' AND verified_email = provider_subject
  );
