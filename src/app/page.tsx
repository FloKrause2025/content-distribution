/**
 * src/app/page.tsx
 * -----------------------------------------------------------------------------
 * The HOME / DASHBOARD page (the URL "/"). It introduces the app and offers two
 * navigation cards: "Run Pipeline" and "Knowledge Base". It also shows the
 * current project. For the MVP there is one project ("Serious Business"); the
 * indicator is built as its own element so it can become a dropdown later.
 */

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DEFAULT_PROJECT_SLUG } from "@/lib/knowledge-base";

// A tiny helper that turns a slug like "serious-business" into "Serious Business".
function prettyProjectName(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function HomePage() {
  const currentProject = prettyProjectName(DEFAULT_PROJECT_SLUG);

  return (
    <div className="space-y-8">
      {/* Intro / heading */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Insight Cascade</h1>
          <p className="mt-2 max-w-2xl text-gray-600">
            Turn one long-form blog post into ready-to-publish LinkedIn and
            Instagram content — broken into key ideas and written in your
            brand&apos;s voice.
          </p>
        </div>

        {/* Current project indicator. Built as a standalone element so it can
            become a project dropdown when multiple projects are supported. */}
        <div className="shrink-0 rounded-lg border border-gray-200 bg-white px-4 py-3 text-right">
          <div className="text-xs uppercase tracking-wide text-gray-400">
            Current project
          </div>
          <div className="mt-1 flex items-center justify-end gap-2">
            <Badge tone="indigo">{currentProject}</Badge>
          </div>
        </div>
      </div>

      {/* Two navigation cards */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Link href="/pipeline" className="group">
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">
              Run Pipeline →
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Paste a blog post, extract four key ideas, and generate
              platform-specific content step by step.
            </p>
          </Card>
        </Link>

        <Link href="/knowledge-base" className="group">
          <Card className="h-full transition-shadow group-hover:shadow-md">
            <h2 className="text-xl font-semibold text-gray-900">
              Knowledge Base →
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Manage the brand voice guide and channel playbooks that shape every
              piece of generated content.
            </p>
          </Card>
        </Link>
      </div>

      {/* A short "how it works" strip to orient first-time users. */}
      <Card>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          How it works
        </h3>
        <ol className="mt-3 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
          <li>
            <span className="font-semibold text-accent">1. Analyze</span> — paste
            your blog post; the AI maps its argument, themes, and proof points.
          </li>
          <li>
            <span className="font-semibold text-accent">2. Extract</span> — review
            four key ideas, one per content pillar, and pick channels.
          </li>
          <li>
            <span className="font-semibold text-accent">3. Generate</span> — get
            ready-to-publish posts you can edit, copy, and export.
          </li>
        </ol>
      </Card>
    </div>
  );
}
