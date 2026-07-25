// @ts-check
const { FlatCompat } = require("@eslint/eslintrc");
const base = require("./index.js");

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * ESLint flat config for Next.js apps — layers Next's recommended
 * rules (via FlatCompat; eslint-config-next has no native flat export
 * for the version pinned here) underneath the shared base config.
 *
 * Order matters: eslint-config-next supplies its own parser, which
 * doesn't track type-only import usage the way @typescript-eslint's
 * parser does (false "unused" on type-only imports used only in type
 * position) and doesn't satisfy typescript-eslint's parser-services
 * check either (crashes @typescript-eslint/consistent-type-imports).
 * Putting `base` last means its parser/rules win for matching files
 * while Next's plugin-specific rules (react-hooks, @next/next) still
 * apply.
 */
module.exports = [
  { ignores: ["next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals"),
  ...base,
];
