-- Platform administration is intentionally independent of workspace RBAC.
CREATE TABLE public.platform_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'support')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX platform_roles_role_idx ON public.platform_roles (role);

CREATE TABLE public.platform_role_permissions (
  role TEXT NOT NULL CHECK (role = 'support'),
  permission TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (role, permission)
);

INSERT INTO public.platform_role_permissions (role, permission)
VALUES ('support', 'console.view')
ON CONFLICT DO NOTHING;

CREATE TABLE public.platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (length(action) BETWEEN 1 AND 160),
  target_type TEXT CHECK (target_type IS NULL OR length(target_type) <= 120),
  target_id TEXT CHECK (target_id IS NULL OR length(target_id) <= 200),
  reason TEXT CHECK (reason IS NULL OR length(reason) <= 2000),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(metadata) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX platform_audit_logs_created_at_idx
  ON public.platform_audit_logs (created_at DESC);
CREATE INDEX platform_audit_logs_actor_created_at_idx
  ON public.platform_audit_logs (actor_user_id, created_at DESC);
CREATE INDEX platform_audit_logs_target_idx
  ON public.platform_audit_logs (target_type, target_id)
  WHERE target_type IS NOT NULL AND target_id IS NOT NULL;

ALTER TABLE public.platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

-- Platform role assignment and permission configuration are only accessible
-- through the narrowly scoped functions below, never through the Data API.
REVOKE ALL ON public.platform_roles FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.platform_role_permissions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.platform_audit_logs FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.has_platform_permission(p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
STABLE
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      WHERE pr.user_id = auth.uid()
        AND pr.role = 'super_admin'
    )
    OR EXISTS (
      SELECT 1
      FROM public.platform_roles pr
      JOIN public.platform_role_permissions pp ON pp.role = pr.role
      WHERE pr.user_id = auth.uid()
        AND pr.role = 'support'
        AND pp.permission = p_permission
    ),
    FALSE
  );
$$;

REVOKE ALL ON FUNCTION public.has_platform_permission(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_platform_permission(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.prevent_platform_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'Platform audit logs are append-only';
END;
$$;

REVOKE ALL ON FUNCTION public.prevent_platform_audit_log_mutation() FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER platform_audit_logs_append_only
  BEFORE UPDATE OR DELETE ON public.platform_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_platform_audit_log_mutation();

CREATE OR REPLACE FUNCTION public.provision_initial_super_admin(
  p_actor_user_id UUID,
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing_role TEXT;
BEGIN
  IF p_actor_user_id IS NULL OR p_target_user_id IS NULL THEN
    RAISE EXCEPTION 'Operator and target user IDs are required';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('platform.initial_super_admin', 0));

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_actor_user_id
      AND email_confirmed_at IS NOT NULL
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Operator must be an existing confirmed account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = p_target_user_id
      AND email_confirmed_at IS NOT NULL
      AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Target must be an existing confirmed account';
  END IF;

  SELECT role INTO existing_role
  FROM public.platform_roles
  WHERE user_id = p_target_user_id
  FOR UPDATE;

  IF existing_role = 'super_admin' THEN
    RETURN FALSE;
  ELSIF existing_role IS NOT NULL THEN
    RAISE EXCEPTION 'Target already has a conflicting platform role';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.platform_roles WHERE role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Initial Super Admin has already been provisioned';
  END IF;

  INSERT INTO public.platform_roles (user_id, role)
  VALUES (p_target_user_id, 'super_admin');

  INSERT INTO public.platform_audit_logs (
    actor_user_id,
    action,
    target_type,
    target_id,
    reason,
    metadata
  )
  VALUES (
    p_actor_user_id,
    'platform.super_admin.provisioned',
    'platform_role',
    p_target_user_id::TEXT,
    'Initial Super Admin provisioned by a platform operator.',
    jsonb_build_object('role', 'super_admin')
  );

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.provision_initial_super_admin(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.provision_initial_super_admin(UUID, UUID) TO service_role;
