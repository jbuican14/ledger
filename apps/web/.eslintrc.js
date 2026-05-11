module.exports = {
  root: true,
  // Relative path (resolved relative to this file) bypasses ESLint v8's
  // shareable-config name-prefix logic, which doesn't recognise our
  // @ledger/config package (it doesn't follow the eslint-config-* naming
  // convention). See KAN-20.
  extends: ["../../packages/config/eslint/next.js"],
};
