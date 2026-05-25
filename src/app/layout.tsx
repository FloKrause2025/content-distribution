/**
 * src/app/layout.tsx
 * -----------------------------------------------------------------------------
 * The "root layout" wraps EVERY page in the app. Whatever you put here (like the
 * top navigation bar) appears on all pages. Next.js renders each page inside the
 * `{children}` slot below.
 */

import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// This sets the browser tab title and description.
export const metadata: Metadata = {
  title: "Insight Cascade",
  description:
    "Turn a long-form blog post into platform-specific social content.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {/* Top navigation bar, shown on every page. */}
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-container items-center justify-between px-6 py-4">
            <Link href="/" className="flex items-center gap-2">
              {/* A small square logo mark in the accent colour. */}
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
                IC
              </span>
              <span className="text-lg font-semibold text-gray-900">
                Insight Cascade
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium text-gray-600">
              <Link href="/pipeline" className="hover:text-accent">
                Run Pipeline
              </Link>
              <Link href="/knowledge-base" className="hover:text-accent">
                Knowledge Base
              </Link>
            </nav>
          </div>
        </header>

        {/* Each page's content is rendered here. */}
        <main className="mx-auto max-w-container px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
