/**
 * eslint.config.mjs
 * -----------------------------------------------------------------------------
 * ESLint configuration (flat config, the format required by ESLint 9 and the
 * migration path off the now-deprecated `next lint` command). It pulls in the
 * standard Next.js rule sets (Core Web Vitals + TypeScript) via the legacy
 * extends bridge so we don't have to hand-roll the rule list.
 */
import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
