// @ts-check
const base = require("@bluemoon/eslint-config");

module.exports = [
  ...base,
  {
    // CLI entry points -- console output is the point, not a smell.
    files: ["src/migrate.ts", "src/seed.ts"],
    rules: {
      "no-console": "off",
    },
  },
];
