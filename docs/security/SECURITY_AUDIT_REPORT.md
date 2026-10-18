# ARAM BTS Security Audit Report

**Assessment date:** 2026-10-17; Phase 6 verification  
**Assessment type:** Repository source, migration, configuration, and local-test review  
**Environment:** Windows development workspace; no production access or remote database tests

## Executive summary

Phase 6 re-ran the five requested JavaScript suites: **125 passed, 0 failed**; `npx tsc --noEmit` passed. Full lint still exits 1 with **51 errors and 356 warnings**. `npm audit --audit-level=low` still exits 1 with five High dependency entries, all from one `braces@3.0.3` advisory in the development-only Next ESLint chain.

No safe actual decompression-output limit is supported by the installed `@e965/xlsx@0.20.3` parser. It parses in the browser before import submission; preflight ZIP metadata is attacker-controlled, and the inflater dynamically reallocates output when the declared size is zero. `sheetRows` and row/column checks occur too late to bound decompression. No parser, dependency, worker, or backend architecture change was made without approval; the finding remains unresolved.

The event RLS, integration-job RPC ACL, and storage-policy migrations/tests were statically reviewed, but **no SQL tests were executed** and no migration was applied. `psql`, Docker, Podman, and the Supabase CLI are unavailable; no `supabase/config.toml` exists. A PostgreSQL listener is present on port 5432 (PID 6640), but its database identity and disposability are unknown. No connection was attempted. The SQL runner's explicit local/disposable confirmation requirement remains in place.

The `braces` advisory was checked against the GitHub-reviewed advisory and current npm registry metadata: affected versions are `<=3.0.3`, no first patched version is listed, and npm's forced fix proposes the incompatible `eslint-config-next@14.2.35` downgrade. Current Next 16 ESLint packages remain on `16.4.2`; no override or downgrade was applied.

The separate `@e965/xlsx@0.20.3` supply-chain review confirmed npm's artifact integrity and SLSA provenance metadata. Its publisher workflow fetches the latest versioned SheetJS tarball from `cdn.sheetjs.com`, repackages it, and publishes it; the attestation does not pin/identify an upstream source commit or source-tarball digest. The signature was not independently verified. No compromise is established.

### Phase 6 classification

| Finding or verification | Classification | Evidence / remaining condition |
|---|---|---|
| Event write permissions | **Fixed in source but not integration-tested** | Permission-based migration and rollback SQL tests reviewed; PostgreSQL tests not run. |
| Integration-job RPC ACL | **Fixed in source but not integration-tested** | ACL migration and SQL test reviewed; database grants not executed/verified. |
| Public registration GET behavior | **Fixed and verified** | Source reviewed; `npm run test:security` passes. Database behavior remains outside test coverage. |
| Flyer/logo storage ownership | **Fixed in source but not integration-tested** | Owner-prefix migration and tests reviewed; SQL tests not run. |
| Cron secret fail-closed behavior | **Fixed and verified** | Source reviewed; `npm run test:security` passes. Production secret configuration is not verified. |
| `braces` GHSA-vfj7-8cjw-p6xm | **Unresolved** | Registry latest is 3.0.3; advisory has no first patched version; Next 16-compatible fix not found. |
| XLSX decompression resource exhaustion | **Unresolved** | Actual output/CPU/memory ceiling not supported by the current parser; metadata limits are bypassable. |
| `@e965/xlsx` provenance/update risk | **Unresolved** | Artifact attestation metadata exists, but upstream source lineage and signature verification remain incomplete. |
| SQL security test execution | **Not tested** | No confirmed disposable local Supabase-compatible database or `psql`; no connection or migration application. |
| Production configuration and deployment | **Not tested** | No production access or deployment checks. |

### Phase 6 command results

| Command | Result |
|---|---|
| `npm run test:import` | Exit 0; 8 passed, 0 failed. |
| `npm run test:security` | Exit 0; 2 passed, 0 failed. |
| `npm run test:auth` | Exit 0; 55 passed, 0 failed. |
| `npm run test:plans` | Exit 0; 40 passed, 0 failed. |
| `npm run test:super-admin` | Exit 0; 20 passed, 0 failed. |
| `npx tsc --noEmit` | Exit 0. |
| `npx eslint src\services\attendeeImport.ts src\services\__tests__\attendeeImport.test.ts src\components\people\AttendeeImportModal.tsx eslint.config.mjs` | Exit 0; 0 errors, 1 warning. |
| `npm run lint` | Exit 1; 51 errors, 356 warnings. |
| `npm audit --audit-level=low` | Exit 1; 5 High entries from the single `braces` advisory. |
| `npm ls braces micromatch fast-glob @next/eslint-plugin-next eslint-config-next next --all` | Exit 0; confirms `eslint-config-next@16.4.2` → `@next/eslint-plugin-next@16.4.2` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`; `next@16.4.0`. |
| `scripts/run-security-sql-tests.ps1 -ConfirmDisposableLocalDatabase` | Not run; no `psql` or confirmed disposable local database. |
| `npm run build` | Not run; port 3000 is active and shares `.next`. |

The five test suites total **125 passing tests**. No source code, dependency, migration, or SQL-test files were changed during Phase 6.

**Production readiness: NOT READY.** The XLSX decompression risk and required database verification remain unresolved; the `braces` advisory and repository lint failures also remain open.

### XLSX parser-option evaluation (after approval to evaluate)

No ZIP streaming/decompression package is installed in this workspace (`npm ls fflate pako yauzl yazl unzipper @zip.js/zip.js jszip exceljs --all` reports an empty tree; module resolution found none). Two maintained browser-capable candidates have promising streaming APIs, but neither was installed or treated as a verified fix:

- `fflate@0.8.3` documents ZIP `Unzip` streaming that exposes actual decompressed chunks through per-entry callbacks. Its asynchronous APIs use workers and can be terminated. This could meter actual output bytes and abort before retaining output over the budget while retaining SheetJS for workbook interpretation. It is a new dependency; the app would need to count actual output across entries and enforce the entry cap itself. SheetJS would then parse the same archive a second time, and browser worker memory is not a hard resource limit.
- `@zip.js/zip.js@2.24.0` documents extraction to `WritableStream` and entry enumeration. Its own untrusted-ZIP documentation explicitly says total uncompressed size and entry count are not capped. An application could count bytes accepted by a streaming sink and bound entry iteration, but those controls are custom application logic and need adversarial verification. It is also a new dependency.

Neither candidate advertises an end-to-end hard memory ceiling for the complete SheetJS workbook parse. A streaming preflight with fflate is the least invasive way to establish an actual decompressed-byte cap, but does not by itself guarantee bounded memory or CPU for subsequent XML/workbook parsing. For a full CPU/memory guarantee, an isolated server-side parser process with enforceable resource limits is the stronger option, at the cost of a new upload/backend path and operational/data-handling changes. No candidate installation or implementation was approved; the finding remains **Unresolved** pending a design decision and tests that demonstrate actual-output rejection and cancellation.

## Confirmed findings and remediation

### 1. Event writes were authorized by workspace membership only

- **Severity:** High
- **Evidence:** The original event INSERT, UPDATE, and DELETE policies in `supabase/migrations/20260925000004_rls_policies.sql` checked membership rather than the role’s event-write permissions. `supabase/migrations/20260925000002_seed_roles_permissions.sql` gives viewers `events.read`, not event-write permissions.
- **Attack path and impact:** A workspace viewer could bypass the UI and use authenticated database API operations to attempt event creation, modification, and deletion.
- **Remediation:** `supabase/migrations/20261019000001_fix_event_write_rls.sql` replaces the three write policies. INSERT requires `events.create`; UPDATE checks `events.update` for both the original and resulting workspace row; DELETE requires `events.delete`. The original historical migration is unchanged.
- **Regression coverage:** `supabase/tests/events_rls.sql` tests viewer, read-only, no-write, member, admin, and owner behavior, anonymous access, missing/malformed JWT subjects, read behavior, and cross-workspace reads/writes/moves.
- **Verification:** **Static inspection completed.** **PostgreSQL/RLS test blocked by missing infrastructure.** Finding remains open pending database execution.

### 2. Integration-job `SECURITY DEFINER` RPCs had default public execute privileges

- **Severity:** High
- **Evidence:** `claim_integration_jobs` and `claim_integration_jobs_for_registration` are `SECURITY DEFINER` functions returning entire `integration_jobs` rows and changing job state. Their creation migrations did not revoke default `PUBLIC` execution. Job payloads can include attendee names, email addresses, and phone numbers.
- **Attack path and impact:** If deployed with default PostgreSQL function privileges, an untrusted caller could invoke a worker RPC, claim jobs, and retrieve their payloads outside the table’s RLS policy.
- **Remediation:** `supabase/migrations/20261019000002_integration_jobs_rpc_acl.sql` revokes execution from `PUBLIC`, `anon`, and `authenticated` and grants it only to `service_role`. The existing worker uses the server-side service-role client.
- **Regression coverage:** `supabase/tests/integration_jobs_rpc_acl.sql` verifies effective execute privileges for the worker and untrusted roles.
- **Verification:** **Static inspection completed.** **PostgreSQL/RLS test blocked by missing infrastructure.** Live default privileges and migration state are unknown.

### 3. Public registration page enabled registration while serving a GET

- **Severity:** Medium
- **Evidence:** The public registration page previously upserted `is_enabled = true` when settings were absent or disabled, selected the complete event row, and interpolated an untrusted slug into a PostgREST `.or(...)` filter expression.
- **Attack path and impact:** A visitor who knew an event slug or ID could cause a read request to enable registrations, bypass an organizer’s disabled state, and receive event fields not needed by the public registration form. The interpolated filter also allowed untrusted path content to be parsed as filter syntax rather than a single slug value.
- **Remediation:** `src/app/events/[slug]/register/page.tsx` no longer writes registration settings during rendering. It serves the form only when an explicit settings row has `is_enabled = true`, selects only event fields needed by the form, and uses equality filters for slug/UUID lookup. `PublicRegistrationClient` now treats missing settings as closed. The server-side registration RPC already checks that settings exist and are enabled.
- **Regression coverage:** `src/lib/security/__tests__/publicBoundaries.test.ts` covers missing, disabled, and enabled settings.
- **Verification:** **Unit or application test executed.** The page’s Supabase query behavior was not tested against a database.
- **Product note:** An explicit enabled registration setting is treated as organizer intent to expose the limited registration fields, even if the event website itself is unpublished. Whether registration should additionally require website publication is a product decision and remains to be confirmed.

### 4. Flyer and logo object policies allowed cross-user path writes

- **Severity:** Medium
- **Evidence:** The historical `event-flyers` and `organization-logos` policies allowed any authenticated user to mutate either bucket. The first follow-up draft then used `owner_id = auth.uid() OR first_path_segment = auth.uid()` in INSERT and UPDATE `WITH CHECK` clauses.
- **Attack path and impact:** Supabase records the authenticated uploader in `owner_id`; the OR condition therefore allowed that uploader to create an object at another user's path, or move an owned object there. Public asset paths could be squatted or overwritten across workspaces. The original SQL test fixtures omitted owner IDs on normal uploads, so they did not reproduce that ownership state.
- **Remediation:** `supabase/migrations/20261019000003_event_flyer_storage_owner_policies.sql` now requires the first path segment to equal `auth.uid()` for INSERT and for the resulting row of UPDATE. UPDATE/DELETE `USING` still allows a recorded owner to reach a legacy object, while an update must move it under that owner's prefix; DELETE remains available to its recorded owner. App upload call sites already use user-ID prefixes. Public reads remain enabled.
- **Regression coverage:** `supabase/tests/event_flyers_storage_rls.sql` now gives all fixtures realistic `owner_id` values and tests attempted cross-user-path inserts and moves in both buckets, along with owner lifecycle, legacy access, and public reads.
- **Verification:** **Static inspection completed.** **PostgreSQL/RLS test blocked by missing infrastructure.**
- **Existing objects:** Legacy unprefixed paths remain publicly readable and can be deleted by their recorded owner; browser updates must first use an owner-prefixed path. Any legacy migration or cleanup should be planned separately; no objects were changed.

### 5. Integration-job cron endpoint failed open when `CRON_SECRET` was unset

- **Severity:** Conditional, medium
- **Evidence:** Previously the route enforced bearer authentication only when `CRON_SECRET` was configured.
- **Attack path and impact:** In an environment missing the secret, an unauthenticated GET or POST could trigger integration-job processing.
- **Remediation:** The route now returns `503 Service unavailable` when the secret is missing, and `401` for invalid credentials. Timing-safe comparison checks byte lengths before comparing.
- **Regression coverage:** `src/lib/security/__tests__/publicBoundaries.test.ts` covers missing, malformed, wrong, and valid bearer credentials.
- **Verification:** **Unit or application test executed.** **Production configuration not verified**; confirm the scheduled deployment has the intended secret configured.

### 6. High-severity development dependency advisory remains unresolved

- **Severity:** High per the online npm advisory data; current affected package entries are development-only.
- **Evidence:** `npm audit --audit-level=low` reports five affected dependency entries for [CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm): `eslint-config-next@16.4.2` → `@next/eslint-plugin-next@16.4.2` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`. The reviewed advisory states that deeply nested brace patterns can exhaust the stack and terminate Node.js; vulnerable range is `<=3.0.3`, first patched version is not available. npm proposes downgrading the Next ESLint config to 14.2.35, which conflicts with Next 16.4.
- **Attack surface:** The plugin uses `fast-glob` to expand the `settings.next.rootDir` ESLint setting (not a production request path). The practical exposure is a developer or CI process, if configured, running lint against an untrusted branch/configuration containing a crafted nested pattern. This can deny service to that lint process/runner; static evidence does not show a production endpoint invoking `braces`. No repository-owned CI workflow was found.
- **Remediation status:** `npm ls` confirms the locked and installed tree. Registry metadata reports 3.0.3 as latest and 3.0.4 as unavailable. `fast-glob`/`micromatch` ranges accept later compatible patches if published, but none is available now. No override, dependency downgrade, or package change was made; a third-party/unreviewed override would add compatibility and supply-chain risk.
- **Verification:** **Online dependency audit executed:** five High dependency entries from one High advisory remain. **Static inspection completed:** traced usage to Next ESLint's configurable glob setting. Finding remains open until a compatible patched `braces` or upstream dependency release is available and passes the Next 16 lint/test matrix.

### 7. XLSX archive preflight does not bound actual decompression work

- **Severity:** Medium (client-side denial of service when an organizer parses an attacker-supplied workbook)
- **Evidence:** `src/services/attendeeImport.ts` requires matching local/central compressed and uncompressed size declarations and sums the declared uncompressed sizes, but those fields are attacker-controlled. In the installed `@e965/xlsx@0.20.3` pure-JavaScript inflater, an uncompressed-size declaration of zero selects a dynamically growing output buffer (`realloc`) and no actual-output limit is enforced. An archive whose local and central uncompressed sizes are both understated as zero can pass this preflight (the declared sum is zero) and still cause actual decompression. `sheetRows` constrains worksheet conversion after ZIP processing and is not an inflate resource limit.
- **Impact and limits:** A file within the 5 MB upload bound can consume CPU and memory proportional to actual decompressed content, potentially freezing or exhausting the organizer's browser tab. This is a source-verified bypass of the claimed metadata bound; no large decompression-bomb proof of concept was executed and no exploit cost was measured. This is not evidence of server-side code execution or another user's data exposure. Data-descriptor/streamed ZIP entries, ZIP64 markers, more than 256 declared entries, malformed files, and row/column excesses are rejected by existing code.
- **Remediation status:** **Partially mitigated.** Retained structural limits and added tests for ZIP64 size sentinels and the 256-entry guard. No metadata-only adjustment can make declared ZIP sizes a trustworthy decompression ceiling. A bounded streaming inflater/verified parser, or parsing in an isolated worker/process with enforceable time/resource limits, needs a design decision; do not silently change parser or architecture.
- **Verification:** **Unit or application test executed:** eight import tests pass. They do not prove an actual decompression ceiling. **Static inspection completed:** parser source and the installed inflater were reviewed. No large bomb was executed.

### 8. Third-party XLSX republisher has residual provenance/update risk

- **Severity:** Medium (supply-chain trust risk; no compromise established)
- **Verified evidence:** `@e965/xlsx@0.20.3` is locked to integrity `sha512-703RN/3OdsRD5mtse2HBX7Um7xwaP9tlswEG6svOtjqokXoX7rJdQj7DyabD2I+xk22RgaIIU+R6BHgkpZGB/w==`; npm registry metadata advertises SLSA provenance. Registry metadata lists one maintainer (`e965`) and last release `0.20.3` on 2024-07-19, while the publisher repository has more recent commits. Its workflow runs on a schedule and its publisher script downloads a versioned tarball from `cdn.sheetjs.com`, renames it, and publishes it. This review did not independently verify the provenance signature or CDN source artifact.
- **Residual concern:** The available attestation binds the published npm artifact to a publisher workflow, but not to an immutable upstream SheetJS commit/source tarball digest. The package is not named `xlsx`, so npm audit's SheetJS advisory results do not establish its vulnerability status. No compromise is established, but provenance and update latency warrant review.
- **Remediation status:** No dependency change made; changing parser or adding another package requires explicit approval.

## Password recovery verification

- The repository has one `resetPasswordForEmail()` call. It sends users to `/reset-password` on the current site origin; the supplied local configuration (`http://localhost:3000` with a matching allowlist) is consistent with that redirect.
- `@supabase/ssr`'s browser client is configured for PKCE, URL-session detection, and a singleton cookie-backed client. Supabase's supported PKCE callback processing establishes the session before the page enables `updateUser({ password })`; the page also requires a `PASSWORD_RECOVERY` event with a session and applies the existing password policy.
- Middleware does not redirect `/reset-password` or strip its query parameters. The application does not mix token-hash verification with PKCE.
- The observed `error_code=otp_expired` is returned by Supabase Auth while verifying the one-time email link, before the browser can exchange a PKCE authorization code. Source inspection therefore rules out the page's password-update call as the cause of this specific error. The available evidence cannot distinguish an expired link from a previously consumed/replaced link or another Supabase Auth/email-delivery issue; Auth logs and the exact newest email link's issue/click times are needed to identify that underlying cause.
- **No custom SMTP, template, or redirect change is indicated by the source review.** Do not keep clicking older reset emails after requesting a newer one. Open the newest message's link promptly in the browser context that requested it so the PKCE verifier is available.
- **Verification:** **Static inspection completed.** Existing recovery-state tests pass as part of `test:auth`; a real email, Auth verify endpoint, and password update were not exercised. No source change is justified by the current evidence.

## Super Admin and tenant-isolation review

- The Super Admin layout requires an authenticated user and `console.view`; customer and activity data are loaded through server-only functions with independent `customers.read` and `activity.read` checks.
- The customer and activity `SECURITY DEFINER` RPCs repeat those required-permission checks inside the database function. The support-role seed grants only `console.view`, so support cannot read customer or activity results unless those permissions are separately granted. Direct table grants for platform role, permission, and audit-log data are revoked from API roles; initial Super Admin provisioning is service-role-only.
- Existing Super Admin unit tests verify fail-closed permission decisions, and the database functions were statically inspected. **Database/RPC enforcement was not executed** because no safe local PostgreSQL environment is available.
- Static review of event, people, registration, ticket, check-in, and storage boundaries did not establish a new cross-workspace IDOR in this pass. Their effective deployed policies remain unverified; the event and storage SQL tests cover only their stated cases.

## Additional risks requiring verification

- **QR credential issuance:** `src/app/api/qr/generate/route.ts` accepts event and registration identifiers and calls an admin-backed generator. The review did not establish that an unauthenticated attacker can obtain another attendee’s registration UUID or that a target lacks an active credential. Practical cross-user exploitability remains **unverified**. Test with isolated synthetic identities before treating it as a vulnerability or changing the intended check-in flow.
- **Security headers and HTTPS:** The inspected `next.config.ts` does not define security headers, and the inspected middleware does not establish whether a hosting edge adds them. TLS termination, HTTP-to-HTTPS redirects, HSTS, CSP, and response headers at the deployed endpoint are **not verified**.
- **Deployed database state:** The repository’s linked-project metadata shows that this checkout has a linked Supabase project, but no remote operation was performed. Applied migrations, storage policies, grants/default privileges, and production configuration remain **unverified**.
- **Legacy storage paths:** Existing media under unprefixed paths may become immutable to browser clients after migration. Plan a privileged, audited migration or cleanup if continued owner-side mutation is required.
- **Runtime penetration testing:** No production or staging endpoint, live email, browser recovery flow, or third-party integration was tested.

## Review scope

Source review included authentication and recovery flows, middleware and redirects, workspace and platform authorization, API routes and server actions, Supabase clients and privileged operations, relevant RLS/storage/function migrations, uploads, integration processing, registration pages, deployment configuration, and package manifests. No additional confirmed authentication, SQL injection, SSRF, or cross-workspace data-exposure finding is asserted beyond those listed above. The registration route’s PostgREST filter-expression issue is included in finding 3; it was not runtime-tested.

The directory is not a Git repository, so the review could not establish a commit baseline or distinguish pre-existing workspace changes.

## Phase 3 through Phase 5 files changed

- `package.json` and `package-lock.json`: replace `xlsx@0.18.5` with the approved SheetJS-compatible `@e965/xlsx@0.20.3` republisher and align `eslint-config-next@16.4.2` with Next.js 16.4.
- `src/services/attendeeImport.ts` and `src/services/__tests__/attendeeImport.test.ts`: preflight `.xlsx` structure and declared local/central sizes, reject ZIP64/streamed entries, limit declared archive entries/size and rows/columns, and test the implemented guards. Phase 5 adds regression tests for the 256-entry limit and ZIP64 size sentinel. Tests do not establish an actual inflater output limit.
- `src/components/people/AttendeeImportModal.tsx` and `scripts/run-attendee-import-tests.cjs`: expose import limits in the UI and run focused regression tests.
- `eslint.config.mjs`: load the flat TypeScript config exported by the installed Next 16 ESLint package.
- `docs/security/SECURITY_AUDIT_REPORT.md`, `docs/security/SECURITY_TEST_MATRIX.md`, and `docs/security/PRODUCTION_HARDENING_CHECKLIST.md`: update Phase 5 dependency, parser, lint, and database verification evidence.
- `supabase/migrations/20261019000003_event_flyer_storage_owner_policies.sql` and `supabase/tests/event_flyers_storage_rls.sql`: enforce user-prefixed upload/result paths and test ownership-aware cross-path denial with realistic `owner_id` fixtures.
- `docs/security/SECURITY_AUDIT_REPORT.md`, `docs/security/SECURITY_TEST_MATRIX.md`, and `docs/security/PRODUCTION_HARDENING_CHECKLIST.md`: record current findings and actual verification status.

## Verification status

| Verification | Status |
|---|---|
| Static inspection | **Static inspection completed.** |
| Security helper tests | **Unit or application test executed:** `npm run test:security` — 2 passed. |
| Existing plan tests | **Unit or application test executed:** `npm run test:plans` — 40 passed. |
| Existing authentication tests | **Unit or application test executed:** `npm run test:auth` — 55 passed. |
| Existing Super Admin tests | **Unit or application test executed:** `npm run test:super-admin` — 20 passed. |
| TypeScript | **Unit or application test executed:** `npx tsc --noEmit` passed. |
| Attendee import | **Unit or application test executed:** `npm run test:import` — 8 passed, 0 failed. The suite verifies CSV/XLSX parsing, malformed/empty files, file/declared expanded-size limits, ZIP metadata mismatch, streamed-entry rejection, ZIP64 size sentinel, >256-entry rejection, and row/column limits. It does not prove a runtime decompression ceiling. |
| Dependency audit | **Online dependency audit executed:** `npm audit --audit-level=low` exited 1 with 5 High affected package entries from one `braces@3.0.3` advisory in the development-only ESLint chain. No compatible patched version was found; `@e965/xlsx` is outside npm's `xlsx` advisory name mapping. |
| Lint | `eslint-config-next@16.4.2` aligns with Next.js 16.4 and the flat config loads. **Unit or application test executed:** `npm run lint` exits 1 with 51 errors and 356 warnings. Targeted lint on modified import/config files exits 0 with 1 existing unused-variable warning in `attendeeImport.ts`. |
| Production build | Not run: a listener remains active on port 3000 (PID 7700) and shares `.next`; building in place could disrupt the running development workspace. |
| PostgreSQL event RLS, RPC ACL, and storage RLS tests | **Blocked by missing infrastructure.** No migration was applied. |
| Production configuration and deployment | **Production configuration not verified.** No production access or changes. |
| Deployment readiness | **Not ready:** the High `braces` advisory remains, XLSX decompression is not actually bounded, repository-wide lint fails, and critical database RLS/RPC/storage tests have not executed. |
