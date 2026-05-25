/**
 * postcss.config.js
 * -----------------------------------------------------------------------------
 * PostCSS is a tool that processes our CSS. We use it here to run Tailwind CSS
 * (our styling system) and Autoprefixer (which automatically adds browser
 * compatibility prefixes to CSS). You normally never need to touch this file.
 */
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
