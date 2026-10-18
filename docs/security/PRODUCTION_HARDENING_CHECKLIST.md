# ARAM BTS Production Hardening Checklist

This checklist is for an authorized deployment owner. No production settings were inspected or changed during this review.

## Phase 6 verification status (2026-10-17)

- [x] Re-ran `npm run test:import`, `npm run test:security`, `npm run test:auth`, `npm run test:plans`, and `npm run test:super-admin`: **125 passed, 0 failed**.
- [x] Re-ran `npx tsc --noEmit`: passed.
- [x] Re-ran targeted ESLint on the attendee-import service, its tests, the import modal, and ESLint config: exit 0, 0 errors, 1 warning.
- [ ] Full lint remains failing: `npm run lint` exits 1 with 51 errors and 356 warnings; unrelated low-risk errors were not automatically rewritten.
- [ ] `npm audit --audit-level=low` exits 1 with five High affected dependency entries for GHSA-vfj7-8cjw-p6xm / CVE-2026-93687; affected `braces@3.0.3` has no patched version listed.
- [ ] XLSX decompression remains unbounded. Existing 5 MB file, ZIP metadata, declared-entry, declared-expanded-size, row, and column checks are not an actual decompression-output/CPU/memory limit.
- [ ] SQL security tests were not run. `psql`, Docker, Podman, and the Supabase CLI are unavailable; an unidentified process listens on local port 5432. No connection, migration, or reset was attempted.
- [ ] Production configuration was not checked. The production build was not run because port 3000 is active and shares `.next`.

**Production readiness: NOT READY.** Do not accept untrusted XLSX files for production attendee imports until a parser/runtime design with enforceable resource limits is approved and verified. Keep database authorization findings open until all three SQL tests execute on a confirmed disposable local Supabase-compatible database.

### Approval required for XLSX remediation

The installed browser parser exposes no supported actual decompression ceiling. Safe next steps require approval for one of these material changes:

- Evaluate a streaming ZIP dependency such as `fflate@0.8.3`, whose per-entry callbacks expose actual decompressed chunks and whose asynchronous worker APIs can be terminated. A counting/abort layer could cap actual aggregate bytes before SheetJS parses the workbook, but it adds a dependency, decompresses the archive twice, and does not impose a hard memory ceiling on browser-side SheetJS parsing. This is a potential byte-ceiling mitigation, not yet a complete resource-isolation fix.
- Parse in an isolated server-side worker/process with enforced memory and CPU/time limits. This is the stronger option for a complete resource ceiling but requires a backend upload/parse path, data-handling controls, operational limits, and integration tests.
- A bounded streaming ZIP/decompression implementation could avoid another parser dependency, but it would require implementing and independently testing ZIP structure handling; it is not a safe small patch and must not be improvised.

`@zip.js/zip.js@2.24.0` was also reviewed: it supports writing decompressed entries to a stream, but its documentation explicitly states that total uncompressed size and entry count are not capped. Any app-level count/abort logic would require regression testing. No candidate was installed or implemented; the XLSX finding remains unresolved pending approval of a design and its trade-offs.

## Database and access control

- [ ] Run the full migration history, including the follow-up event RLS, integration-job RPC ACL, and public-storage object-owner migrations, against a disposable local Supabase database first.
- [ ] Execute `supabase/tests/events_rls.sql`, `supabase/tests/integration_jobs_rpc_acl.sql`, and `supabase/tests/event_flyers_storage_rls.sql`; retain test output with the release record.
- [ ] For the rollback-only SQL checks, use `.\scripts\run-security-sql-tests.ps1 -ConfirmDisposableLocalDatabase` only after verifying the database is disposable and local.
- [ ] Apply reviewed migrations through the approved database release process; do not use `db reset` on a developer or production database.
- [ ] Verify deployed event INSERT/UPDATE/DELETE policies call `has_permission` with `events.create`, `events.update`, and `events.delete`; verify UPDATE has both `USING` and `WITH CHECK`.
- [ ] Verify `anon` and `authenticated` lack EXECUTE on both integration-job claim RPCs, and `service_role` retains it.
- [ ] Verify storage INSERT and UPDATE `WITH CHECK` policies require the authenticated user's path prefix; verify legacy owner-ID access cannot move objects into another user's namespace. Keep public SELECT only if public media is intended.
- [ ] Decide how to handle existing unprefixed media paths. They remain publicly readable and owner-deletable, but browser updates require migration to an owner-prefixed path; perform any migration or cleanup through a bounded, privileged, audited process.
- [ ] Review the complete deployed policy catalog and function grants for drift from repository migrations.
- [ ] Keep the service-role key server-side; rotate it if exposure is suspected. Never send it to browser bundles or logs.

## Authentication, registration, and abuse controls

- [ ] Confirm Supabase recovery and redirect allowlists use exact trusted production origins; do not derive redirects from untrusted request values.
- [ ] Verify password recovery and email/OTP workflows end-to-end using synthetic accounts and a controlled test inbox; do not claim email delivery is verified until observed.
- [ ] Confirm public registration settings are enabled only by an authorized organizer action. A public GET must never mutate registration settings.
- [ ] Decide explicitly whether standalone registration pages may be public before the event website is published.
- [ ] Verify authentication, OTP, password reset, login, and public registration rate limits in the deployed configuration.
- [ ] Confirm cron processing fails closed when `CRON_SECRET` is absent and that the intended secret is present in the correct deployment environment; never print the secret.
- [ ] Test QR credential issuance with synthetic identities and prove that knowing another registration ID alone cannot mint or retrieve its credential.
- [ ] Preserve the attendee-import checks: 5 MB upload, ZIP signature/local/central metadata preflight, at most 256 declared entries, 20 MB summed declared uncompressed content, 5,000 rows, and 100 columns. Confirm representative exports from supported spreadsheet producers do not rely on data-descriptor/streamed ZIP entries, which the current parser rejects.
- [ ] Do not treat ZIP-declared sizes as an actual decompression ceiling: local and central sizes are attacker-controlled and can both be understated as zero, causing the installed pure-JavaScript inflater to dynamically grow output buffers without an output limit. Before accepting untrusted XLSX uploads, approve and implement a bounded inflater/verified parser or resource-isolated worker/process with enforceable limits. Browser CPU/memory behavior is not measured.

## HTTPS, headers, and browser security

- [ ] Identify the actual TLS termination point (hosting platform, CDN, or load balancer) and verify the deployed certificate, renewal, and HTTP-to-HTTPS redirect.
- [ ] Verify sensitive authentication cookies are `Secure`, `HttpOnly` where applicable, and use an appropriate `SameSite` policy.
- [ ] Verify responses—including errors and redirects—contain an application-compatible CSP. Begin with report-only if required; avoid broad wildcards and `unsafe-eval`.
- [ ] Verify `X-Content-Type-Options: nosniff`, `Referrer-Policy`, and frame protection through CSP `frame-ancestors`.
- [ ] Enable HSTS only after confirming HTTPS works reliably for all affected hosts; do not add `includeSubDomains` or preload without validating every subdomain.
- [ ] Review `Permissions-Policy`, mixed-content resources, analytics, fonts, image hosts, and Supabase endpoint requirements.
- [ ] Validate headers at the deployed endpoint, not just in Next.js configuration. Hosting-layer behavior was not checked in this review.

## Secrets, operations, and monitoring

- [ ] Confirm production environment values are held in the hosting provider’s secret store; never paste them into reports, source, or logs.
- [ ] Verify `NEXT_PUBLIC_SUPABASE_URL` and the anon/publishable key are the only Supabase credentials exposed to browser code.
- [ ] Confirm migration history and environment linkage before any database operation; do not run local SQL tests against a linked remote project.
- [ ] Monitor denied authorization attempts, job processing, registration abuse, storage usage, and privileged Super Admin operations without recording passwords, OTPs, tokens, or session credentials.
- [ ] Establish a retention and access policy for attendee data, integration payloads, and operational audit events.
- [ ] Schedule dependency audits against current registry advisory data in an approved CI environment. The online audit reports CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm for `braces@3.0.3` across five dependency entries in the development-only ESLint chain. Deeply nested attacker-provided brace patterns can exhaust the Node stack; protect CI that lints untrusted branches. Track a patched `braces` or compatible Next ESLint release; do not use npm's forced downgrade to `eslint-config-next@14.2.35` on the Next 16 line.
- [ ] Review the third-party `@e965/xlsx` publisher and source updates separately: npm audit does not map its advisories under the `xlsx` package name. npm publishes an artifact provenance attestation, but the publisher downloads a CDN tarball at build time and the available evidence does not pin the upstream source commit/digest. Verify maintainer/release cadence before relying on this parser.
- [ ] Resolve the 51 repository lint errors and 356 warnings after triage. The ESLint config loads with the Next 16 line; do not disable rules globally. Run the production build only in a workspace that will not disrupt an active Next dev server or overwrite shared output.

## Release gate

- [ ] Keep the event RLS, integration RPC, and storage findings open until their PostgreSQL regression tests pass.
- [ ] Keep the XLSX decompression/resource-exhaustion and `braces` advisories open until evidence-backed mitigations are implemented and tested.
- [ ] Record the exact migration versions and test outputs before release.
- [ ] Verify production configuration separately after deployment; this source review is not production penetration-test evidence.
