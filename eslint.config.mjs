import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  // Next's core-web-vitals flat config — registers the @next/next plugin so it is
  // reliably detected (also satisfies the build-time lint step).
  nextPlugin.flatConfig.coreWebVitals,
  // TypeScript rules via the shared Next config.
  ...compat.extends("next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    ignores: [".next/**", "node_modules/**", "next-env.d.ts", "**/*.config.mjs", "**/*.config.ts"],
  },
];

export default eslintConfig;
