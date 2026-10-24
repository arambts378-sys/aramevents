const { spawnSync } = require('node:child_process');
const path = require('node:path');

const result = spawnSync(
  process.execPath,
  [
    '--no-experimental-strip-types',
    '--require',
    'ts-node/register',
    '--test',
    'src/lib/auth/__tests__/platformAccess.test.ts',
    'src/lib/auth/__tests__/provisionInitialSuperAdmin.test.ts',
    'src/lib/super-admin/__tests__/customerDirectory.test.ts',
    'src/lib/super-admin/__tests__/activity.test.ts',
    'src/lib/super-admin/__tests__/masterAdminPortal.test.ts',
  ],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_TRANSPILE_ONLY: 'true',
      TS_NODE_COMPILER_OPTIONS: JSON.stringify({ module: 'commonjs', moduleResolution: 'node' }),
    },
    cwd: path.resolve(__dirname, '..'),
  },
);
process.exit(result.status ?? 1);
