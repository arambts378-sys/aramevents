// Runs the flyer draft validator and on-device flyer parser tests with Node's built-in test runner + the already-installed ts-node.
// Cross-platform (sets env vars here instead of in the npm script). No extra dependencies.
const { spawnSync } = require('node:child_process');

const result = spawnSync(
  process.execPath,
  ['--no-experimental-strip-types', '--require', 'ts-node/register', '--test', 'src/lib/ai/__tests__/validateFlyerDraft.test.ts', 'src/lib/flyer/__tests__/parseEventText.test.ts'],
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
