import tsParser from "@typescript-eslint/parser";
import tsEslintPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    ignores: ["node_modules/**", "dist/**"],
  },
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        browser: "readonly",
        node: "readonly",
      },
    },
    env: {
      es2020: true,
    },
    plugins: {
      "@typescript-eslint": tsEslintPlugin,
    },
    rules: {
      ...tsEslintPlugin.configs.recommended.rules,

      // allow paren-less arrow functions
      "arrow-parens": "off",

      // allow async-await
      "generator-star-spacing": "off",

      // allow debugger during development
      "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    },
  },
];
