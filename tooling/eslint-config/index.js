// @ts-check
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const prettier = require("eslint-config-prettier");
const globals = require("globals");

/**
 * Shared strict ESLint flat config, base for all workspace packages.
 * See docs/engineering/coding-standards.md for the conventions this enforces.
 */
module.exports = [
  {
    ignores: [
      "dist/**",
      "build/**",
      ".next/**",
      "node_modules/**",
      ".turbo/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // CJS tooling/config files: eslint.config.js, commitlint.config.js,
    // and everything under tooling/ (shared config packages themselves).
    files: ["**/*.config.js", "**/*.config.cjs", "tooling/**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
