import withNuxt from "./.nuxt/eslint.config.mjs";
import stylistic from "@stylistic/eslint-plugin";
import eslintConfigPrettier from "eslint-config-prettier";

export default withNuxt(eslintConfigPrettier, {
  plugins: { "@stylistic": stylistic },
  rules: {
    "@stylistic/padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "block-like", next: "*" },
      { blankLine: "always", prev: "*", next: "block-like" },
      { blankLine: "never", prev: ["const", "let", "var"], next: ["const", "let", "var"] },
      { blankLine: "always", prev: ["const", "let", "var"], next: "*" },
    ],
  },
})
  .override("nuxt/typescript/rules", {
    rules: {
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-explicit-any": "warn",
    },
  })
  .override("nuxt/vue/rules", {
    rules: {
      "vue/block-order": ["error", { order: ["script", "template", "style"] }],
      "vue/component-name-in-template-casing": ["error", "PascalCase"],
      "vue/html-button-has-type": "error",
      "vue/multi-word-component-names": "off",
      "vue/require-default-prop": "off",
    },
  })
  .override("nuxt/vue/rules", {
    rules: {
      "vue/max-lines-per-block": [
        "error",
        {
          script: 80,
          template: 80,
          style: 80,
          skipBlankLines: false,
        },
      ],
    },
  })
  .append({
    files: ["app/components/ui/**/*.vue"],
    rules: { "vue/max-lines-per-block": "off" },
  });
