// @ts-check
const { FlatCompat } = require("@eslint/eslintrc");
const base = require("./index.js");

const compat = new FlatCompat({ baseDirectory: __dirname });

/**
 * ESLint flat config for Next.js apps — extends the shared base and
 * layers in Next's recommended rules via FlatCompat (eslint-config-next
 * does not yet ship a native flat export for the version pinned here).
 */
module.exports = [...base, ...compat.extends("next/core-web-vitals")];
