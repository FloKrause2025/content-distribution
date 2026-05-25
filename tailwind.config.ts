/**
 * tailwind.config.ts
 * -----------------------------------------------------------------------------
 * Tailwind CSS is the styling system this app uses. Instead of writing CSS
 * files, we add small utility classes directly in the HTML (e.g. `text-lg`,
 * `bg-indigo-600`). This file tells Tailwind:
 *   1. WHICH files to scan for those utility classes (`content`)
 *   2. Our custom theme values, like the brand accent colour (`theme.extend`)
 *
 * If you want to change the app's accent colour, edit `accent` below.
 */
import type { Config } from "tailwindcss";

const config: Config = {
  // Tailwind looks through these files and only generates the CSS that is
  // actually used, which keeps the final app small and fast.
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // The single accent colour for the whole app (indigo/purple).
        // Used for primary buttons, active states, and highlights.
        accent: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          light: "#EEF2FF",
        },
      },
      maxWidth: {
        // The maximum width of the main content area, as specified in the
        // design guidelines (1200px).
        container: "1200px",
      },
    },
  },
  plugins: [],
};

export default config;
