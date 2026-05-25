/**
 * next.config.js
 * -----------------------------------------------------------------------------
 * This is the configuration file for Next.js (the web framework this app uses).
 *
 * For this MVP we keep the configuration intentionally minimal — the defaults
 * are exactly what we want. This file exists mainly so it is easy to add
 * settings later (for example, image domains or redirects) without changing
 * any of the application code.
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
  // `reactStrictMode` turns on extra checks during development that help catch
  // common mistakes early. It has no effect on the live (production) app.
  reactStrictMode: true,

  // IMPORTANT FOR DEPLOYMENT (e.g. Vercel):
  // Our server code reads the knowledge-base markdown files from `src/data/` at
  // runtime. Because we build those file paths dynamically, Next.js can't detect
  // them automatically and would leave them out of the deployed serverless
  // functions — which would break every AI call in production. The setting below
  // force-includes the knowledge-base files in the API routes that read them, so
  // reading the brand voice + playbooks works once deployed.
  // (Note: this makes READING work in production. Saving/uploading/deleting still
  // won't persist on Vercel because its file system is read-only — see the
  // README's "Known limitations".)
  outputFileTracingIncludes: {
    "/api/pipeline/analyze-hero": ["./src/data/**/*"],
    "/api/pipeline/extract-key-ideas": ["./src/data/**/*"],
    "/api/pipeline/generate-channel-content": ["./src/data/**/*"],
    "/api/knowledge-base": ["./src/data/**/*"],
  },
};

module.exports = nextConfig;
