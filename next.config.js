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
};

module.exports = nextConfig;
