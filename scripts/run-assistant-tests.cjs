// Runs the Aram Assist built-in answer tests with Node's test runner + ts-node (same setup as run-plan-tests.cjs).
const { spawnSync } = require('node:child_process');

const result = spawnSync(
  process.execPath,
  ['--no-experimental-strip-types', '--require', 'ts-node/register', '--test', 'src/lib/marketing/__tests__/siteAssistant.test.ts'],
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
