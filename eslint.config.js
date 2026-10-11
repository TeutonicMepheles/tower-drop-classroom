import path from "node:path";
import js from "@eslint/js";
import typescript from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";

const allowedLayers = {
  contracts: ["contracts"],
  gameplay: ["gameplay", "contracts"],
  presentation: ["presentation", "contracts"],
  ui: ["ui", "contracts"],
  runtime: ["runtime", "gameplay", "contracts"],
  storage: ["storage", "contracts"],
  app: [
    "app",
    "ui",
    "gameplay",
    "presentation",
    "runtime",
    "storage",
    "contracts",
  ],
};
const boundaries = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      dependency:
        "{{owner}} cannot import {{target}}. Use the public contracts and app composition.",
    },
  },
  create(context) {
    const sourceRoot = path.join(import.meta.dirname, "src");
    const filename = context.filename;
    const owner = path.relative(sourceRoot, filename).split(path.sep)[0];
    if (!allowedLayers[owner]) return {};
    const check = (node, value) => {
      if (typeof value !== "string") return;
      let target;
      if (value.startsWith("@/")) target = value.slice(2).split("/")[0];
      else if (value.startsWith("."))
        target = path
          .relative(sourceRoot, path.resolve(path.dirname(filename), value))
          .split(path.sep)[0];
      else target = value;
      const externalAllowed =
        (owner === "presentation" && value === "three") ||
        (owner === "runtime" && value === "cannon");
      if (!allowedLayers[owner].includes(target) && !externalAllowed)
        context.report({
          node,
          messageId: "dependency",
          data: { owner, target },
        });
    };
    return {
      ImportDeclaration: (node) => check(node, node.source.value),
      ExportNamedDeclaration: (node) => {
        if (node.source) check(node, node.source.value);
      },
      ExportAllDeclaration: (node) => check(node, node.source.value),
      ImportExpression: (node) => {
        if (node.source.type === "Literal") check(node, node.source.value);
      },
    };
  },
};
export default [
  // Archivos ignorados
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "*.config.js",
      "vite.config.ts",
    ],
  },

  // Reglas base de JS
  js.configs.recommended,

  // Reglas de TypeScript
  ...typescript.configs.recommended,
  ...typescript.configs.strictTypeChecked,
  ...typescript.configs.stylisticTypeChecked,

  // Desactiva reglas que conflictúan con Prettier
  prettierConfig,

  // Configuración global
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        project: ["./tsconfig.app.json", "./tsconfig.test.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      prettier,
    },
    rules: {
      // Prettier como regla de ESLint
      "prettier/prettier": "error",

      // TypeScript
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-non-null-assertion": "off",

      // General
      "no-console": "warn",
      "no-debugger": "error",
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],
    },
  },

  {
    files: ["src/**/*.ts"],
    plugins: { architecture: { rules: { boundaries } } },
    rules: { "architecture/boundaries": "error" },
  },
  {
    files: ["src/gameplay/**/*.ts", "src/contracts/**/*.ts"],
    rules: {
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "localStorage",
        "performance",
      ],
    },
  },
  // Reglas específicas para tests (más permisivas)
  {
    files: ["**/__tests__/**/*.ts", "**/*.test.ts", "**/*.spec.ts"],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "no-console": "off",
    },
  },
];
