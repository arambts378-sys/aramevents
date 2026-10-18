# Super Admin Phase 3: Activity Tracking & Diagnostics

Phase 3 adds a bounded, read-only `/super-admin/activity` diagnostics page and a separate append-only `platform_activity_events` stream. The Phase 1 `platform_audit_logs` table remains dedicated to privileged administrative actions.

## Audit findings and scope

- Existing application logs were `console.error`/`console.warn` calls without a shared structured event model.
- Event changes, public registrations, QR credentials, check-ins, and integration jobs are stored in PostgreSQL; database triggers capture successful persisted transitions.
- Organizer registration and OTP verification run in server routes and emit sanitized success/failure events. Passwords, OTPs, email addresses, and raw errors are excluded.
- Email delivery is supported through integration jobs. There is no SMS provider/delivery flow or payment webhook in the current project source; neither is fabricated or instrumented.
- Login uses Supabase Auth directly from the browser. This phase does not introduce an alternate credential endpoint or trust client-reported login results; login attempts are therefore not represented in the structured activity stream.
- Activity capture is best-effort. Trigger failures produce a fixed database warning and do not abort the business transaction. Server-side logger failures similarly emit a generic warning without changing the customer operation.

## Data and access design

Apply `supabase/migrations/20261019000000_platform_activity_events.sql` after the Phase 1 and Phase 2 migrations. Do not apply it automatically or to a remote database.

The event record includes timestamp, workspace/actor IDs where available, category/action, resource type/ID, outcome, severity, a fixed safe message and code, UUID correlation ID, and allowlisted metadata. It deliberately excludes raw request bodies and raw error strings. Activities created by public registration can have no actor ID; check-in and workspace events use the authenticated actor when available.

Database triggers capture event creation/publication and website saves/publication, registration inserts, QR credential generation, check-in decisions recorded in `check_ins`, and terminal integration-job delivery results. Server actions/API routes add best-effort entries for selected event/website, registration/ticket, check-in, and organizer registration/verification failures.

`platform_activity_events` has RLS enabled and no `PUBLIC`, `anon`, or `authenticated` table access. The service role can insert only; platform reads use a `SECURITY DEFINER` RPC with a fixed search path and an in-function `has_platform_permission('activity.read')` check. Execution is granted only to authenticated callers. The table has an append-only update/delete trigger. `super_admin` has all platform permissions; support currently has only `console.view`, so it cannot view the activity page or query the RPC. Workspace policies are unchanged.

The diagnostics RPC applies filters and pagination in PostgreSQL, caps pages at 100 rows, and returns only sanitized event columns. Correlation lookup is exact; workspace/category/action/outcome/severity/date filters are bounded and validated by the server parser and database function.

## Redaction

- Never capture passwords, OTPs, cookies, authorization headers, access/refresh tokens, payment credentials, raw request bodies, attendee contact details, or raw provider error messages.
- Application-generated message text and error codes come from fixed allowlists.
- Metadata keys are restricted to provider, integration event type, source, and known check-in reason codes, with enumerated values.
- Resource and actor IDs are identifiers only; no names, email addresses, phone numbers, or event titles are included.
- Database integration-job triggers never read `last_error` or `payload`.

## Retention and deletion

No cleanup or deletion job is implemented. The activity data can contain user/workspace identifiers and should be treated as restricted operational data. Establish a retention schedule and any legal-hold/deletion exception with the data owner and applicable privacy requirements before enabling cleanup. A proposed 12-month operational retention window is a decision for approval, not an enforced policy. Any future purge must be privileged, documented, bounded, auditable, and preserve legally required records.

## Verification

- Application tests: `npm run test:super-admin`.
- Database tests: first apply all migrations to a disposable local PostgreSQL/Supabase database, then run `supabase/tests/platform_activity_events.sql` with `psql`. It checks trigger capture, Super Admin reads, support/ordinary-user denial, direct table denial, and append-only behavior. It rolls back fixtures.
- Phase 3 migration and SQL tests are not applied automatically. Do not run the database test against production.
