import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default tseslint.config(
  // 全局忽略
  {
    ignores: ["dist/**", "build/**", "artifacts/**", "node_modules/**"],
  },

  // 基础规则
  js.configs.recommended,

  // TypeScript 规则
  ...tseslint.configs.recommended,

  // Prettier（放在最后，关闭冲突规则）
  prettierPlugin,

  // 前端 React 文件
  {
    files: ["src/mainview/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },

  // 后端 Bun 文件
  {
    files: ["src/bun/**/*.ts"],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // 通用规则覆盖
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
);
