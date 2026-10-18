# Super Admin Phase 2: Customer Directory

Phase 2 adds read-only customer discovery and Customer 360 pages under `/super-admin/customers`. The pages require the existing `console.view` permission at the Super Admin layout and independently require `customers.read` before each data request. The SQL read functions repeat that permission check before accessing cross-workspace data.

## Schema relationships used

- `workspaces.owner_id` references `profiles.id`; `profiles.id` references `auth.users.id`.
- `workspace_members.workspace_id` references `workspaces.id`; `workspace_members.user_id` references `profiles.id`; `workspace_members.role_id` references `roles.id`.
- `events.workspace_id` references `workspaces.id`.
- `workspace_subscriptions.workspace_id` references `workspaces.id` and is unique, but a workspace may have no subscription row.
- Workspace creation date is `workspaces.created_at`. Member join date is `workspace_members.created_at`. Event start and creation dates are `events.start_date` and `events.created_at`.
- Profiles have no email column, so the permission-checked read functions join `auth.users` only to provide user emails. Workspaces have no account-status field; the interface intentionally provides no account-status filter.

## Database and access design

Apply `supabase/migrations/20261018000000_platform_customer_read.sql` after the Phase 1 platform foundation migration. It creates two `SECURITY DEFINER` read functions with a fixed `search_path`. Both require `public.has_platform_permission('customers.read')`; callers only receive access through `authenticated` execute grants. The functions return the minimal fields used by the directory and detail UI. They perform counts and filtering in PostgreSQL, cap page sizes at 100, cap page numbers at 10,000, and do not alter workspace RLS.

Super Admin has the platform permission under the Phase 1 permission function. Support currently has only `console.view`, so it cannot retrieve customer data and does not see the Customers navigation item. A future explicit `customers.read` permission can be granted separately if required.

Search matches organization names or an exact workspace UUID. Plan filters use the stored subscription plan, with no-row workspaces grouped under the existing Free default. Directory totals distinguish stored subscription state from that default. Customer 360 distinguishes a missing subscription row from a stored Free row and displays stored interval, period dates, trial end, cancellation flag, and entitlement overrides only when present.

## Verification

`supabase/tests/platform_admin_rls.sql` covers the Phase 1 authorization foundation. The Phase 2 database checks are in `supabase/tests/platform_customer_read.sql`; they cover Super Admin list/detail access, support and workspace-role denial, permission checks, exact-ID and plan filtering, sorting, database-side pagination bounds, missing subscription data, and invalid UUID handling. Run both SQL tests only on a disposable local Supabase/Postgres database; each test transaction rolls back.

App-level search, sort, filter, pagination parsing, payload handling, missing profile/subscription behavior, and UUID validation tests run with `npm run test:super-admin`.
