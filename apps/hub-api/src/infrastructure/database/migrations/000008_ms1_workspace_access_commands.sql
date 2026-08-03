DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM invitations) THEN
    RAISE EXCEPTION USING
      ERRCODE = '55000',
      MESSAGE = 'existing_invitation_requires_inviter_backfill';
  END IF;
END
$$;

ALTER TABLE invitations
  ADD COLUMN inviter_user_id uuid NOT NULL REFERENCES users (user_id);

ALTER TABLE workspace_command_receipts
  DROP CONSTRAINT workspace_command_receipts_command_type_check;

ALTER TABLE workspace_command_receipts
  ADD CONSTRAINT workspace_command_receipts_command_type_check CHECK (
    command_type IN (
      'invitation.accept',
      'invitation.create',
      'invitation.revoke',
      'membership.remove',
      'membership.role.change',
      'project.access.grant',
      'project.create',
      'workspace.create'
    )
  );
