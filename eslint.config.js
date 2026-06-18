const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

// no-empty soll absichtlich leere catch-Bloecke erlauben (bewusstes Schlucken).
const noEmpty = ["error", { allowEmptyCatch: true }];
const unusedVars = ["warn", { argsIgnorePattern: "^_" }];

module.exports = [
  {
    ignores: ["node_modules/**", "assets/**", "package-lock.json", "*.min.js"],
  },

  // Klassische Browser-Skripte: teilen Funktionen ueber window-Globals.
  // no-undef und no-unused-vars passen nicht zu dieser Architektur
  // (Cross-File-Funktionen sind statisch nicht aufloesbar) -> deaktiviert.
  {
    files: ["script/**/*.js", "js/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-empty": noEmpty,
      "no-unused-private-class-members": "warn",
    },
  },

  // ESM-Dateien (import/export): echtes Modul-Scope -> unused-vars als Warnung.
  {
    files: ["main.js", "script/app.js", "script/services/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-undef": "off",
      "no-unused-vars": unusedVars,
      "no-empty": noEmpty,
      "no-unused-private-class-members": "warn",
    },
  },

  // Dual-Env (UMD-Wrapper: nutzen module UND window).
  {
    files: [
      "script/dom-cache.js",
      "script/utils/team-actions.js",
      "script/utils/type-effectiveness.js",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // Node: Proxy-Server und Tooling.
  {
    files: ["server.js", "script/capture-screenshots.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": unusedVars,
      "no-empty": noEmpty,
    },
  },

  // Tests (node:test).
  {
    files: ["test/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: { ...js.configs.recommended.rules },
  },

  prettier,
];
