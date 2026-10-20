const { spawnSync } = require('node:child_process');
const path = require('node:path');

const result = spawnSync(
  process.execPath,
  [
    '--no-experimental-strip-types',
    '--require',
    'ts-node/register',
    '--test',
    'src/lib/security/__tests__/securityRemediation.test.ts',
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
