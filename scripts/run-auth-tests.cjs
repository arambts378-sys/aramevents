// Runs the authentication tests with Node's built-in test runner + the already-installed ts-node.
// Cross-platform, no extra dependencies. See also run-plan-tests.cjs.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const result = spawnSync(
  process.execPath,
  [
    '--no-experimental-strip-types',
    '--require',
    'ts-node/register',
    '--require',
    path.join(__dirname, 'auth-test-setup.cjs'),
    '--test',
    'src/lib/validation/__tests__/auth.test.ts',
    'src/app/api/organizer/__tests__/organizerAuthFlow.test.ts',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: 'true',
      TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'commonjs', moduleResolution: 'node' }),
    },
  },
);
process.exit(result.status ?? 1);
