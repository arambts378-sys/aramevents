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
    'src/services/__tests__/attendeeImport.test.ts',
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
