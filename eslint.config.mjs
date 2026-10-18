import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const typescriptFiles = ["**/*.ts", "**/*.tsx", "**/*.mts", "**/*.cts"];
const nextTypeScriptConfig = nextTs.slice(0, -1).map((config) => ({
  ...config,
  files: typescriptFiles,
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScriptConfig,
  nextTs[nextTs.length - 1],
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: typescriptFiles,
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
