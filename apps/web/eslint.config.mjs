import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // This MVP fetches data in plain useEffect + useState (no TanStack
      // Query/SWR yet -- see docs/ROADMAP.md). That's the exact pattern this
      // rule flags as an error project-wide; downgraded to a warning rather
      // than rewriting every data-fetching effect for a React Compiler-era
      // rule that doesn't reflect an actual bug here.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
