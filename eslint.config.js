import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // 1. Safety: No explicit any
      "@typescript-eslint/no-explicit-any": "error",

      // 2. Cleanup: Unused vars (warn only to not break dev flow)
      "@typescript-eslint/no-unused-vars": "warn",

      // 3. React: Exhaustive deps (Critical for stability)
      "react-hooks/exhaustive-deps": "error",

      // 4. Production: No console.log
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // 5. Safety: Strict equality
      "eqeqeq": ["error", "always"],

      // 6. Consistency: Curly braces always
      "curly": "error",

      // 7. Safety: No debugger
      "no-debugger": "error",

      // 8. Modern JS: Prefer const
      "prefer-const": "error",

      // 9. Performance/Clarity: Consistent type imports
      "@typescript-eslint/consistent-type-imports": "warn",

      // 10. Safety: No shadow (using TS version to avoid enum false positives)
      "no-shadow": "off",
      "@typescript-eslint/no-shadow": "warn",
    },
  },
);
