import { defineConfig } from "oxlint"

export default defineConfig({
  plugins: ["typescript", "unicorn", "oxc", "react"],
  categories: {
    correctness: "error"
  },
  env: {
    builtin: true,
    browser: true,
    node: true
  },
  ignorePatterns: [
    "**/dist",
    "**/src/routeTree.gen.ts",
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".cursor/**",
    ".scratch/**",
    "packages/oxlint/anti-slop/**"
  ],
  jsPlugins: [
    { name: "anti-slop", specifier: "./packages/oxlint/anti-slop/index.ts" }
  ],
  rules: {
    "no-unused-vars": [
      "error",
      { args: "none", varsIgnorePattern: "^_", argsIgnorePattern: "^_" }
    ],
    "react-hooks/exhaustive-deps": "off",
    "anti-slop/no-chained-type-assertions": "error",
    "anti-slop/no-conditional-empty-object-spread": "error",
    "anti-slop/no-known-value-widening": "error",
    "anti-slop/no-long-comments": "error",
    "anti-slop/no-module-mocking": "error",
    "anti-slop/no-object-parameters": "error",
    "anti-slop/no-reflect-apply": "error",
    "anti-slop/no-reflect-get": "error",
    "anti-slop/no-runtime-typeof": "error",
    "anti-slop/no-shape-in-symbol-names": "error",
    "anti-slop/no-unknown-parameters": "error",
    "anti-slop/no-unknown-returns": "error",
    "anti-slop/no-unknown-type-aliases": "error",
    "anti-slop/no-unsafe-dictionary-type": "error",
    "anti-slop/no-widen-then-assert": "error",
    "anti-slop/require-safety-comment-for-type-assertion": "error"
  },
  overrides: [
    {
      files: ["apps/web/src/**/*.tsx", "packages/ui/src/**/*.tsx"],
      jsPlugins: ["oxlint-tailwindcss"],
      rules: {
        // Correctness
        "tailwindcss/no-contradicting-variants": "error",
        "tailwindcss/no-dark-without-light": "error",
        "tailwindcss/no-duplicate-classes": "error",
        "tailwindcss/no-dynamic-classes": "error",
        "tailwindcss/no-unknown-classes": "error",
        // Modernization
        "tailwindcss/enforce-canonical": "error",
        "tailwindcss/enforce-negative-arbitrary-values": "error",
        "tailwindcss/no-deprecated-classes": "error",
        "tailwindcss/no-unnecessary-arbitrary-value": "error",
        "tailwindcss/prefer-scale-token": "error",
        "tailwindcss/prefer-theme-tokens": "error",
        // Consistency
        "tailwindcss/consistent-variant-order": "error",
        "tailwindcss/enforce-consistent-important-position": "error",
        "tailwindcss/enforce-consistent-variable-syntax": "error",
        "tailwindcss/enforce-physical": "error",
        "tailwindcss/enforce-shorthand": "error",
        "tailwindcss/no-unnecessary-whitespace": "error",
        // Design-system guardrails
        "tailwindcss/no-borrowed-component-styles": "error",
        "tailwindcss/no-restricted-classes": "error"
      }
    }
  ],
  settings: {
    tailwindcss: {
      entryPoint: "packages/ui/src/styles/globals.css"
    }
  }
})
