# ARAM BTS Security Test Matrix

This matrix separates source-level and unit-test evidence from database and production verification. A SQL test file is not evidence that PostgreSQL executed it.

## Phase 6 verification (2026-10-17)

The following current results supersede any prior Phase 5 run counts:

| Command | Exit | Result |
|---|---:|---|
| `npm run test:import` | 0 | 8 passed, 0 failed |
| `npm run test:security` | 0 | 2 passed, 0 failed |
| `npm run test:auth` | 0 | 55 passed, 0 failed |
| `npm run test:plans` | 0 | 40 passed, 0 failed |
| `npm run test:super-admin` | 0 | 20 passed, 0 failed |
| **Five suites total** | **0** | **125 passed, 0 failed** |
| `npx tsc --noEmit` | 0 | Passed |
| `npx eslint src\services\attendeeImport.ts src\services\__tests__\attendeeImport.test.ts src\components\people\AttendeeImportModal.tsx eslint.config.mjs` | 0 | 0 errors, 1 warning |
| `npm run lint` | 1 | 51 errors, 356 warnings |
| `npm audit --audit-level=low` | 1 | 5 High entries, all from GHSA-vfj7-8cjw-p6xm / CVE-2026-93687 |
| `npm ls braces micromatch fast-glob @next/eslint-plugin-next eslint-config-next next --all` | 0 | Locked/installed chain confirmed; see dependency row below |
| Security SQL runner | Not run | `psql` unavailable; no confirmed disposable local database |
| `npm run build` | Not run | Port 3000 is active and shares `.next` |

### Finding classifications

| Finding or verification | Phase 6 classification | Reason |
|---|---|---|
| Event write RLS | **Fixed in source but not integration-tested** | Migration/test statically reviewed; PostgreSQL suite not run. |
| Integration-job RPC ACL | **Fixed in source but not integration-tested** | Migration/test statically reviewed; database grants not exercised. |
| Public registration GET and cron authorization | **Fixed and verified** | Application tests passed in `npm run test:security`; no production check. |
| Flyer/logo storage ownership | **Fixed in source but not integration-tested** | Migration/test statically reviewed; PostgreSQL suite not run. |
| `braces` advisory | **Unresolved** | Advisory range is `<=3.0.3` with no first patched version; no compatible Next 16 chain found. |
| XLSX decompression resource exhaustion | **Unresolved** | Parser has no actual output/CPU/memory bound; metadata can be understated. |
| `@e965/xlsx` provenance/update risk | **Unresolved** | npm attestation exists, but upstream source lineage is not pinned and signature was not independently verified. |
| PostgreSQL security-test execution | **Not tested** | No safe local database was confirmed; no database connection or migration was attempted. |
| Production settings/deployment | **Not tested** | No production environment was accessed. |

The XLSX upload currently parses in the browser, before the RPC import. The parser's `sheetRows` option limits later worksheet processing only; it is not a decompression ceiling. The current installed `@e965/xlsx@0.20.3` inflater dynamically grows its output buffer when the declared size is zero, and exposes no documented actual-output, CPU-time, memory, or pre-parse workbook-dimension limit. No small understated-size archive test was added because, without an enforceable parser bound, such a test could demonstrate bypass acceptance but could not prove bounded termination; no decompression bomb was executed.

The `braces` advisory was rechecked against GitHub's reviewed advisory and npm registry metadata. `braces@3.0.3` remains the registry latest; the vulnerable range is `<=3.0.3` and `first_patched_version` is null. The currently published Next ESLint config and plugin are `16.4.2`; no Next 16-compatible patched dependency chain was identified. npm still proposes an incompatible forced downgrade to `eslint-config-next@14.2.35`.

The separate XLSX supply-chain review confirmed a registry integrity value and npm SLSA provenance metadata. The publisher's scheduled GitHub workflow fetches a versioned tarball from the SheetJS CDN and republishes it under `@e965/xlsx`; provenance does not establish an immutable upstream SheetJS source commit or CDN source digest. Signature verification was not performed.

### Parser-option evaluation (not implemented)

The workspace has no installed ZIP-streaming package (`npm ls fflate pako yauzl yazl unzipper @zip.js/zip.js jszip exceljs --all` returned an empty tree). Registry/upstream documentation review found:

- `fflate@0.8.3` has browser ZIP streaming with decompressed output chunks delivered to entry callbacks, plus asynchronous worker APIs that can be terminated. It has no built-in aggregate decompression cap; the application would need to count emitted bytes and actual entries and abort at the limit. Reusing SheetJS would decompress the bounded archive a second time, and the browser worker does not impose a hard memory ceiling.
- `@zip.js/zip.js@2.24.0` supports streaming extraction to a `WritableStream`, but its documentation explicitly says aggregate uncompressed size and entry count are not capped. A counting sink and bounded entry iteration would be application-enforced and require regression proof.

Both are new dependencies. Neither establishes an end-to-end memory bound for the current SheetJS workbook parse. The streaming approach is a potential byte-ceiling mitigation, not a verified fix; isolated server-side parsing is the stronger option for enforceable CPU/memory limits but requires a backend/worker architecture change. No dependency was installed, no implementation or archive PoC was run, and the finding remains **Unresolved**.

## Executed checks

| Area | Test or command | Expected security property | Result | Classification |
|---|---|---|---|---|
| Event RLS | Static inspection of original/follow-up event policies | INSERT=create, UPDATE=update on old/new row, DELETE=delete | Policy SQL matches intended permission checks; no alternate event write policy found in repository migrations | **Static inspection completed** |
| Event RLS | `supabase/tests/events_rls.sql` | Deny viewer/no-permission/anonymous writes; preserve seeded owner/admin/member permissions; deny cross-workspace operations | Not executed | **Blocked by missing infrastructure** |
| Integration job RPCs | Static inspection of function definitions and server worker caller | Worker RPCs must not be executable by public client roles | Follow-up migration revokes public/anon/authenticated access and grants `service_role` | **Static inspection completed** |
| Integration job RPCs | `supabase/tests/integration_jobs_rpc_acl.sql` | Only `service_role` can execute either claim function | Not executed | **Blocked by missing infrastructure** |
| Storage | Static inspection of bucket policies and upload call sites | New inserts and resulting update rows stay under the authenticated user's path; legacy owners cannot move objects into another user's path | INSERT and UPDATE `WITH CHECK` require the authenticated-user path prefix; `USING`/DELETE also allow matching `owner_id` for legacy objects; public SELECT remains intentional | **Static inspection completed** |
| Storage | `supabase/tests/event_flyers_storage_rls.sql` | Public reads continue; realistic owner IDs cannot bypass path isolation; cross-user inserts/moves fail in both buckets | Fixtures now set `owner_id`; includes owned-object lifecycle, legacy-path handling, and cross-path denial; not executed | **Blocked by missing infrastructure** |
| Public registration | Static inspection of `src/app/events/[slug]/register/page.tsx` | GET does not enable registration; public query returns only required event fields | No settings mutation; explicit enabled setting required; slug and ID use equality filters | **Static inspection completed** |
| Registration | `npm run test:security` | Missing/disabled registration settings remain closed; cron authorization fails closed | 2 passed, 0 failed | **Unit or application test executed** |
| Password recovery | Static inspection of forgot/reset pages, middleware, browser client, and installed Supabase SSR defaults | Recovery callback uses one consistent supported flow and updates only with a recovery session | PKCE is enabled; URL-session detection is enabled; `/reset-password` is not redirected; `otp_expired` is an Auth link-verification failure before code exchange | **Static inspection completed** |
| Password recovery | `npm run test:auth` and live email callback | Recovery state is required before update; Auth link succeeds and new password works | Recovery-state unit tests pass as part of 55 tests; real Auth/email flow not exercised | **Blocked by missing infrastructure** |
| Authentication | `npm run test:auth` | Existing auth validation, OTP, recovery-state, enumeration, and registration tests | 55 passed, 0 failed | **Unit or application test executed** |
| Workspace plans | `npm run test:plans` | Workspace plan authorization and entitlement behavior | 40 passed, 0 failed | **Unit or application test executed** |
| Super Admin | `npm run test:super-admin` | Platform permission checks and customer/activity parsing | 20 passed, 0 failed | **Unit or application test executed** |
| Super Admin data | Static inspection of layout, server-only customer/activity readers, and `SECURITY DEFINER` RPC checks | Support with `console.view` only cannot read customers/activity | Application and RPC paths require `customers.read` / `activity.read`; support seed grants only `console.view` | **Static inspection completed** |
| Tenant isolation | Static review of event, people, registration, ticket, check-in, and storage policies | User-controlled identifiers cannot bypass workspace-scoped authorization | No new confirmed IDOR in this pass; effective deployed RLS is not verified | **Static inspection completed** |
| Attendee import | `npm run test:import` | CSV/XLSX import remains compatible and rejects invalid structural metadata before parsing | 8 passed: CSV/XLSX parsing, unsupported/oversized input, malformed/truncated workbook, local/central ZIP size mismatch, declared expanded-size cap, streamed-entry rejection, ZIP64 size sentinel, >256-entry rejection, row/column caps | **Unit or application test executed** |
| TypeScript | `npx tsc --noEmit` | Changed application files type-check | Passed | **Unit or application test executed** |
| Dependency tree | `npm ls braces micromatch fast-glob @next/eslint-plugin-next eslint-config-next next --all` | Confirm installed and locked affected versions and compatibility | `next@16.4.0`; `eslint-config-next@16.4.2` → `@next/eslint-plugin-next@16.4.2` → `fast-glob@3.3.1` → `micromatch@4.0.8` → `braces@3.0.3`. Lockfile integrity and registry metadata agree. | **Static inspection completed** |
| Dependency audit | `npm audit --audit-level=low` | Check the dependency tree against current npm advisory data | Online exit code 1: 5 High affected dependency entries trace to CVE-2026-93687 / GHSA-vfj7-8cjw-p6xm. Advisory range `<=3.0.3`, no patched version. Deeply nested attacker-controlled brace patterns can exhaust Node's stack. Next's plugin calls `fast-glob` for configurable `settings.next.rootDir`; exposure is lint/CI availability when an untrusted repository/branch configuration is linted, not a production request path. npm proposes downgrading `eslint-config-next` to 14.2.35. No override or downgrade was applied. | **Online dependency audit executed** |
| XLSX package provenance | `npm view @e965/xlsx@0.20.3 ...`; review npm registry attestation and publisher README/workflow/script | Establish integrity, source lineage, maintainer and release status | Lockfile integrity matches registry metadata; registry advertises SLSA provenance. Publisher's scheduled workflow downloads a versioned `cdn.sheetjs.com` tarball, changes package metadata/name, and publishes. One npm maintainer; last package release 2024-07-19, although publisher repository activity is newer. Attestation does not establish a pinned upstream source commit/tarball digest; signature was not independently verified. npm audit does not map SheetJS advisories under this package name. No dependency change made. | **Static inspection completed** |
| XLSX decompression limit | Static inspection of attendee preflight and installed `@e965/xlsx` inflater | Actual inflated output and CPU must be bounded before/while parsing | **Not established.** Matching local/central uncompressed-size fields can be understated as zero; the installed pure-JS inflater then dynamically grows output buffers while decompressing, with no actual-output ceiling. `sheetRows` applies later. A client-side CPU/memory exhaustion risk remains; no large bomb PoC was executed. | **Static inspection completed** |
| Lint configuration | `npm run lint` | ESLint loads a Next 16-compatible flat config | `next@16.4.0` and `eslint-config-next@16.4.2` are aligned; config loads, but exits 1 with 51 errors and 356 warnings. Rule/file breakdown is below. Current checkout is not a Git repository, so a pre-Phase-5 baseline cannot be established. | **Unit or application test executed** |
| Changed-file lint | `npx eslint src/services/attendeeImport.ts src/services/__tests__/attendeeImport.test.ts src/components/people/AttendeeImportModal.tsx eslint.config.mjs` | Changed parser and ESLint config introduce no lint errors | Exit code 0; 0 errors and 1 unused-variable warning in `attendeeImport.ts`. | **Unit or application test executed** |
| Production build | `npm run build` | Next production build completes | Not run: port 3000 has an active listener and shares `.next`; avoid disrupting it | **Blocked by active development server** |
| SQL test runner | Static/safety checks of `scripts/run-security-sql-tests.ps1` | Runner rejects remote hosts and requires explicit disposable DB confirmation | Runner now accepts literal loopback IPs only and still requires `-ConfirmDisposableLocalDatabase`; it was not pointed at a database | **Static inspection completed** |

### Remaining lint errors, grouped by rule and file

The current lint run reports 51 errors and 356 warnings. The changed import/parser/config files have no lint errors (one unused-variable warning remains in `attendeeImport.ts`). The workspace is not a Git repository, so it is not possible to prove which errors predate the configuration change.

| Rule | Errors | Files |
|---|---:|---|
| `react-hooks/set-state-in-effect` | 23 | `src/app/app/analytics/page.tsx`; `src/app/app/events/[eventId]/analytics/page.tsx`; `src/app/app/events/[eventId]/operations/access-control/page.tsx`; `src/app/app/events/[eventId]/people/page.tsx`; `src/app/app/events/[eventId]/registration/page.tsx`; `src/app/app/events/[eventId]/speakers/page.tsx`; `src/app/app/events/[eventId]/tickets/page.tsx`; `src/app/app/events/[eventId]/website/editor/page.tsx`; `src/app/app/people/[id]/page.tsx`; `src/app/app/people/page.tsx`; `src/app/invite/page.tsx`; `src/components/access-control/AccessZoneModal.tsx`; `src/components/event/Registration.tsx`; `src/components/marketing/useScrollReveal.tsx`; `src/components/people/PersonModal.tsx`; `src/components/settings/AccountSettings.tsx`; `src/components/settings/EventDefaultsSettings.tsx`; `src/components/settings/NotificationSettings.tsx`; `src/components/settings/OrganizationSettings.tsx`; `src/components/speakers/SpeakerModal.tsx`; `src/components/website-editor/SpeakersPropertiesPanel.tsx`; `src/context/AppContext.tsx` |
| `react/jsx-no-comment-textnodes` | 10 | `src/components/event/About.tsx`; `src/components/event/EventInfo.tsx`; `src/components/event/Footer.tsx`; `src/components/event/Registration.tsx`; `src/components/event/Venue.tsx`; `src/components/website-editor/TemplateGallery.tsx` |
| `react/no-unescaped-entities` | 5 | `src/app/app/events/[eventId]/people/page.tsx`; `src/app/invite/page.tsx`; `src/components/marketing/CreateEventSection.tsx`; `src/components/marketing/ProblemSection.tsx`; `src/components/website-editor/ContactPropertiesPanel.tsx` |
| `react-hooks/purity` | 4 | `src/app/app/events/[eventId]/operations/access-control/page.tsx`; `src/app/app/events/[eventId]/operations/volunteers/page.tsx` |
| `react-hooks/preserve-manual-memoization` | 3 | `src/app/app/analytics/page.tsx`; `src/app/app/people/[id]/page.tsx`; `src/app/app/people/page.tsx` |
| `react-hooks/immutability` | 3 | `src/app/app/events/[eventId]/operations/volunteers/page.tsx`; `src/app/volunteer/scanner/[tokenId]/page.tsx`; `src/components/check-in/QRScanner.tsx` |
| `@typescript-eslint/no-empty-object-type` | 2 | `src/components/shared/Card.tsx`; `src/components/shared/Label.tsx` |
| `@typescript-eslint/no-require-imports` | 1 | `verify_db.js` |

## Phase 5 findings and limits

- `npm audit --json` and registry advisory metadata confirm the same High `braces@3.0.3` issue; no patched version is available. This is a development-tool/CI denial-of-service exposure when lint processes an untrusted Next ESLint `rootDir` pattern, not evidence of a production request path.
- `@e965/xlsx@0.20.3` integrity matches registry metadata and npm advertises SLSA provenance. The publisher downloads a versioned SheetJS CDN tarball at build time; the available provenance does not establish an immutable upstream source commit/tarball digest. One maintainer is listed and the package release history ends in 2024, although the publisher repository has newer activity. Provenance signature was not independently verified.
- Parser tests verify current declared-metadata guardrails, including ZIP64 sentinel and entry count. They cannot establish runtime memory/CPU bounds. Understated ZIP metadata (including zero-size declarations) bypasses the 20 MB declared-size accounting and allows dynamically growing decompression buffers; safe remediation requires a bounded inflater or resource-isolated parsing and approval before dependency/architecture changes.

## Database environment assessment

- `psql`, Docker, and Podman are not available on `PATH`; `supabase/config.toml` is absent. `npx supabase --version` reports 2.121.0, but no local project/database is configured.
- `supabase/seed.sql` is absent.
- No repository-owned CI workflow was found. The opt-in rollback-only SQL runner at `scripts/run-security-sql-tests.ps1` exists but could not be executed because `psql` and a confirmed disposable local Supabase-compatible database are unavailable.
- A local PostgreSQL listener/database identity was not established; no database connection was attempted.
- Linked-project metadata exists in the checkout. No remote database, production project, or shared development database was accessed.
- No `supabase db reset`, `supabase db push`, migration application, or deployment was performed. `npm install` was run after approval to update the parser and ESLint dependencies.

Therefore, all three database test files remain pending. **PostgreSQL/RLS test execution was not performed**:

1. `supabase/tests/events_rls.sql`
2. `supabase/tests/integration_jobs_rpc_acl.sql`
3. `supabase/tests/event_flyers_storage_rls.sql`

An opt-in local runner is available at `scripts/run-security-sql-tests.ps1`. It accepts literal loopback IPs only (not hostnames) and requires the caller to pass `-ConfirmDisposableLocalDatabase`. Required prerequisites are an already-installed local PostgreSQL/Supabase-compatible engine with Supabase `auth` and `storage` schemas/roles, `psql`, local connection parameters for the runner, and all migrations applied in order to a database explicitly confirmed disposable. This review did not create or connect to such an environment. After establishing those prerequisites, run:

```powershell
.\scripts\run-security-sql-tests.ps1 -ConfirmDisposableLocalDatabase
```

Do not point it at the linked project or a shared developer database.

**Exact current classification:** migrations and SQL tests received **Static inspection completed** only; SQL execution is **Blocked by missing infrastructure**. No local or remote database was contacted, and no migration was applied.

## Production checks not performed

**Production configuration not verified:** TLS termination, HTTPS redirects, HSTS, CSP, cookies, Vercel environment variables, scheduled-job secret configuration, live database migration state, storage bucket state, email delivery, Supabase Auth settings, and real external integrations.
