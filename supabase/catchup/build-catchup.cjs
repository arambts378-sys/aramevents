// Builds supabase/catchup/live_catchup.sql from the repo migrations, with the
// edits the live database needs. Usage: node supabase/catchup/build-catchup.cjs <repoRoot> [--dry-run]
const fs = require('fs');
const path = require('path');

const root = process.argv[2];
const dryRun = process.argv.includes('--dry-run');
const dir = path.join(root, 'supabase', 'migrations');
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n');

function mustReplace(src, from, to, label) {
  if (!src.includes(from)) throw new Error(`Edit "${label}" did not match`);
  return src.split(from).join(to);
}

// Objects in 17 already exist live (created by hand), so make it re-runnable.
function idempotentDdl(src) {
  return src
    .replace(/CREATE TABLE public\./g, 'CREATE TABLE IF NOT EXISTS public.')
    .replace(/CREATE INDEX (?!IF NOT EXISTS)/g, 'CREATE INDEX IF NOT EXISTS ')
    .replace(
      /CREATE TRIGGER (\w+)\s*\n(\s*(?:BEFORE|AFTER)[^\n]*\bON\s+(public\.\w+))/g,
      'DROP TRIGGER IF EXISTS $1 ON $3;\nCREATE TRIGGER $1\n$2'
    );
}

const steps = [
  { file: '20261013000000_workspace_subscriptions.sql' },
  { file: '20261014000000_auth_registration_hardening.sql' },
  { file: '20261017000000_platform_admin_foundation.sql', edit: idempotentDdl,
    note: 'Tables already exist live: CREATE TABLE/INDEX made IF NOT EXISTS, trigger dropped first.' },
  { file: '20261018000000_platform_customer_read.sql' },
  { file: '20261019000000_platform_activity_events.sql', edit: idempotentDdl,
    note: 'Made re-runnable (IF NOT EXISTS / DROP TRIGGER IF EXISTS).' },
  { file: '20261019000001_fix_event_write_rls.sql' },
  { file: '20261019000002_integration_jobs_rpc_acl.sql' },
  { file: '20261019000003_event_flyer_storage_owner_policies.sql' },
  {
    file: '20261020000000_security_remediation_suite.sql',
    note: 'Dropped the anon revokes on is_workspace_member / has_permission / get_workspace_from_event: they break every anonymous read of events and registrations (see 20261028010000).',
    edit: (src) =>
      mustReplace(
        src,
        `REVOKE ALL ON FUNCTION public.is_workspace_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_permission(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_permission(UUID, TEXT) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_workspace_from_event(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_workspace_from_event(UUID) TO authenticated, service_role;`,
        `-- [catch-up] Anon revokes on is_workspace_member / has_permission /
-- get_workspace_from_event removed: RLS policies TO public call them, so anon
-- needs EXECUTE. 20261028010000 documents this and is re-run at the end.`,
        'remediation anon revokes'
      ),
  },
  { file: '20261023000000_master_admin_portal.sql',
    note: 'Older versions of has_platform_permission / record_platform_audit_log; 20261028000000 is re-run next to restore the live ones.' },
  { file: '20261028000000_super_admin_live.sql', note: 'Already applied by hand; re-run (it is idempotent) so its newer functions win over 20261023.', record: true },
  { file: '20261028010000_function_acl_and_search_path.sql', note: 'Already applied (recorded live as 20261028160727); re-run to cover the functions created above.' },
];

let out = `-- =============================================================================
-- Live database catch-up (generated from supabase/migrations; do not edit by hand)
-- Project: mklsgyxtjxednizjvaav
--
-- Brings the live database up to the repo's migrations 20261013000000 through
-- 20261028010000. Runs as ONE transaction: if any statement fails, nothing changes.
-- Regenerate with: node supabase/catchup/build-catchup.cjs .
-- =============================================================================

BEGIN;

`;

for (const s of steps) {
  let sql = read(s.file);
  if (s.edit) sql = s.edit(sql);
  out += `-- -----------------------------------------------------------------------------\n-- ${s.file}\n`;
  if (s.note) out += `-- [catch-up] ${s.note}\n`;
  out += `-- -----------------------------------------------------------------------------\n\n${sql.trim()}\n\n`;
}

out += `-- -----------------------------------------------------------------------------
-- Clean-up
-- -----------------------------------------------------------------------------

-- 20261014 created a 6-argument version; 20261020 added the 7-argument one the app calls.
DROP FUNCTION IF EXISTS public.create_organizer_verification_challenge(
  TEXT, TEXT, TEXT, TIMESTAMPTZ, INT, TEXT
);

-- Record the migrations so \`supabase db push\` does not try to run them again.
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
${steps
  .filter((s) => s.record !== false)
  .map((s) => {
    const [, version, name] = s.file.match(/^(\d+)_(.+)\.sql$/);
    return `  ('${version}', '${name}')`;
  })
  .join(',\n')}
ON CONFLICT (version) DO NOTHING;

${dryRun ? 'ROLLBACK;' : 'COMMIT;'}
`;

const target = dryRun
  ? path.join(process.env.CATCHUP_DRYRUN_DIR || __dirname, 'live_catchup_dryrun.sql')
  : path.join(root, 'supabase', 'catchup', 'live_catchup.sql');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, out);
console.log(`wrote ${target} (${out.split('\n').length} lines)`);
