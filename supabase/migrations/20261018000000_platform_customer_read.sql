-- Customer reads are exposed only through permission-checked functions.
-- The functions run with the migration owner so they can join auth.users
-- without weakening any workspace RLS policies or exposing auth schema access.

CREATE OR REPLACE FUNCTION public.list_platform_customers(
  p_search TEXT DEFAULT NULL,
  p_plan TEXT DEFAULT NULL,
  p_sort TEXT DEFAULT 'created_at',
  p_sort_direction TEXT DEFAULT 'desc',
  p_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  result JSONB;
  normalized_search TEXT := NULLIF(btrim(p_search), '');
  normalized_plan TEXT := NULLIF(btrim(p_plan), '');
  safe_sort TEXT := CASE WHEN p_sort IN ('name', 'created_at', 'event_count') THEN p_sort ELSE 'created_at' END;
  safe_direction TEXT := CASE WHEN lower(p_sort_direction) = 'asc' THEN 'asc' ELSE 'desc' END;
  safe_page INT := LEAST(GREATEST(COALESCE(p_page, 1), 1), 10000);
  safe_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
BEGIN
  IF NOT public.has_platform_permission('customers.read') THEN
    RAISE EXCEPTION 'Platform permission required' USING ERRCODE = '42501';
  END IF;

  IF normalized_plan IS NOT NULL AND normalized_plan NOT IN ('free', 'professional', 'enterprise') THEN
    RAISE EXCEPTION 'Invalid subscription plan filter' USING ERRCODE = '22023';
  END IF;

  WITH workspace_counts AS (
    SELECT
      w.id,
      w.name,
      w.owner_id,
      w.created_at,
      owner_profile.full_name AS owner_name,
      owner_auth.email AS owner_email,
      member_counts.member_count,
      event_counts.event_count,
      subscription.plan_id,
      subscription.status AS subscription_status,
      subscription.billing_interval,
      subscription.current_period_end,
      subscription.cancel_at_period_end,
      (subscription.workspace_id IS NOT NULL) AS has_subscription
    FROM public.workspaces w
    LEFT JOIN public.profiles owner_profile ON owner_profile.id = w.owner_id
    LEFT JOIN auth.users owner_auth ON owner_auth.id = w.owner_id
    LEFT JOIN LATERAL (
      SELECT count(*)::BIGINT AS member_count
      FROM public.workspace_members wm
      WHERE wm.workspace_id = w.id
    ) member_counts ON TRUE
    LEFT JOIN LATERAL (
      SELECT count(*)::BIGINT AS event_count
      FROM public.events e
      WHERE e.workspace_id = w.id
    ) event_counts ON TRUE
    LEFT JOIN public.workspace_subscriptions subscription ON subscription.workspace_id = w.id
  ),
  filtered AS (
    SELECT *
    FROM workspace_counts wc
    WHERE (
      normalized_search IS NULL
      OR position(lower(normalized_search) IN lower(wc.name)) > 0
      OR wc.id::TEXT = lower(normalized_search)
    )
    AND (
      normalized_plan IS NULL
      OR COALESCE(wc.plan_id, 'free') = normalized_plan
    )
  ),
  page_rows AS (
    SELECT *
    FROM filtered f
    ORDER BY
      CASE WHEN safe_sort = 'name' AND safe_direction = 'asc' THEN f.name END ASC,
      CASE WHEN safe_sort = 'name' AND safe_direction = 'desc' THEN f.name END DESC,
      CASE WHEN safe_sort = 'created_at' AND safe_direction = 'asc' THEN f.created_at END ASC,
      CASE WHEN safe_sort = 'created_at' AND safe_direction = 'desc' THEN f.created_at END DESC,
      CASE WHEN safe_sort = 'event_count' AND safe_direction = 'asc' THEN f.event_count END ASC,
      CASE WHEN safe_sort = 'event_count' AND safe_direction = 'desc' THEN f.event_count END DESC,
      f.id ASC
    LIMIT safe_page_size
    OFFSET (safe_page - 1) * safe_page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', pr.id,
        'name', pr.name,
        'ownerId', pr.owner_id,
        'ownerName', pr.owner_name,
        'ownerEmail', pr.owner_email,
        'memberCount', pr.member_count,
        'eventCount', pr.event_count,
        'createdAt', pr.created_at,
        'planId', COALESCE(pr.plan_id, 'free'),
        'subscriptionStatus', pr.subscription_status,
        'billingInterval', pr.billing_interval,
        'currentPeriodEnd', pr.current_period_end,
        'cancelAtPeriodEnd', pr.cancel_at_period_end,
        'hasSubscription', pr.has_subscription
      ))
      FROM page_rows pr
    ), '[]'::JSONB),
    'totalCount', (SELECT count(*) FROM filtered),
    'page', safe_page,
    'pageSize', safe_page_size,
    'summary', jsonb_build_object(
      'organizationCount', (SELECT count(*) FROM public.workspaces),
      'activeSubscriptionCount', (
        SELECT count(*)
        FROM public.workspace_subscriptions
        WHERE status IN ('active', 'trialing')
      ),
      'eventCount', (SELECT count(*) FROM public.events)
    )
  )
  INTO result;

  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_customer_detail(
  p_workspace_id UUID,
  p_member_page INT DEFAULT 1,
  p_event_page INT DEFAULT 1,
  p_page_size INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, auth
STABLE
AS $$
DECLARE
  result JSONB;
  safe_member_page INT := LEAST(GREATEST(COALESCE(p_member_page, 1), 1), 10000);
  safe_event_page INT := LEAST(GREATEST(COALESCE(p_event_page, 1), 1), 10000);
  safe_page_size INT := LEAST(GREATEST(COALESCE(p_page_size, 20), 1), 100);
BEGIN
  IF NOT public.has_platform_permission('customers.read') THEN
    RAISE EXCEPTION 'Platform permission required' USING ERRCODE = '42501';
  END IF;

  WITH selected_workspace AS (
    SELECT
      w.id,
      w.name,
      w.owner_id,
      w.created_at,
      owner_profile.full_name AS owner_name,
      owner_auth.email AS owner_email,
      subscription.plan_id,
      subscription.status AS subscription_status,
      subscription.billing_interval,
      subscription.current_period_start,
      subscription.current_period_end,
      subscription.trial_ends_at,
      subscription.cancel_at_period_end,
      subscription.entitlement_overrides,
      (subscription.workspace_id IS NOT NULL) AS has_subscription
    FROM public.workspaces w
    LEFT JOIN public.profiles owner_profile ON owner_profile.id = w.owner_id
    LEFT JOIN auth.users owner_auth ON owner_auth.id = w.owner_id
    LEFT JOIN public.workspace_subscriptions subscription ON subscription.workspace_id = w.id
    WHERE w.id = p_workspace_id
  ),
  member_page AS (
    SELECT
      wm.user_id,
      profile.full_name,
      auth_user.email,
      role.name AS workspace_role,
      wm.created_at AS joined_at
    FROM public.workspace_members wm
    LEFT JOIN public.profiles profile ON profile.id = wm.user_id
    LEFT JOIN auth.users auth_user ON auth_user.id = wm.user_id
    LEFT JOIN public.roles role ON role.id = wm.role_id
    WHERE wm.workspace_id = p_workspace_id
    ORDER BY profile.full_name NULLS LAST, wm.user_id
    LIMIT safe_page_size
    OFFSET (safe_member_page - 1) * safe_page_size
  ),
  event_page AS (
    SELECT e.id, e.name, e.start_date, e.status, e.created_at
    FROM public.events e
    WHERE e.workspace_id = p_workspace_id
    ORDER BY e.start_date DESC, e.created_at DESC, e.id
    LIMIT safe_page_size
    OFFSET (safe_event_page - 1) * safe_page_size
  )
  SELECT CASE WHEN EXISTS (SELECT 1 FROM selected_workspace) THEN
    jsonb_build_object(
      'organization', (
        SELECT jsonb_build_object(
          'id', sw.id,
          'name', sw.name,
          'ownerId', sw.owner_id,
          'ownerName', sw.owner_name,
          'ownerEmail', sw.owner_email,
          'createdAt', sw.created_at,
          'memberCount', (SELECT count(*) FROM public.workspace_members WHERE workspace_id = sw.id),
          'eventCount', (SELECT count(*) FROM public.events WHERE workspace_id = sw.id),
          'planId', COALESCE(sw.plan_id, 'free'),
          'subscriptionStatus', sw.subscription_status,
          'billingInterval', sw.billing_interval,
          'currentPeriodStart', sw.current_period_start,
          'currentPeriodEnd', sw.current_period_end,
          'trialEndsAt', sw.trial_ends_at,
          'cancelAtPeriodEnd', sw.cancel_at_period_end,
          'entitlementOverrides', CASE WHEN sw.has_subscription THEN sw.entitlement_overrides ELSE NULL END,
          'hasSubscription', sw.has_subscription
        )
        FROM selected_workspace sw
      ),
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'userId', mp.user_id,
          'name', mp.full_name,
          'email', mp.email,
          'role', mp.workspace_role,
          'joinedAt', mp.joined_at
        ))
        FROM member_page mp
      ), '[]'::JSONB),
      'membersTotal', (SELECT count(*) FROM public.workspace_members WHERE workspace_id = p_workspace_id),
      'memberPage', safe_member_page,
      'events', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', ep.id,
          'name', ep.name,
          'startDate', ep.start_date,
          'status', ep.status,
          'createdAt', ep.created_at
        ))
        FROM event_page ep
      ), '[]'::JSONB),
      'eventsTotal', (SELECT count(*) FROM public.events WHERE workspace_id = p_workspace_id),
      'eventPage', safe_event_page,
      'pageSize', safe_page_size
    )
  ELSE NULL END
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.list_platform_customers(TEXT, TEXT, TEXT, TEXT, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_platform_customer_detail(UUID, INT, INT, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_platform_customers(TEXT, TEXT, TEXT, TEXT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_platform_customer_detail(UUID, INT, INT, INT) TO authenticated;
