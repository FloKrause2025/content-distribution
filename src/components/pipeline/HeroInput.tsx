/**
 * src/components/pipeline/HeroInput.tsx
 * -----------------------------------------------------------------------------
 * PIPELINE STEP 1 (UI).
 *
 * Lets the user paste their blog post (the "hero asset") plus a few optional
 * fields, then kicks off the analysis. The heavy lifting (calling the AI) is
 * done by the parent pipeline page; this component just collects the input and
 * calls `onAnalyze` with it.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";

export interface HeroInputValues {
  heroContent: string;
  title: string;
  targetAudience: string;
  primaryTopic: string;
}

interface HeroInputProps {
  /** Called when the user clicks "Analyze & Extract Key Ideas". */
  onAnalyze: (values: HeroInputValues) => void;
  /** True while the AI is working, so we show a loading state. */
  loading: boolean;
  /** Pre-fill values if the user comes back to this step. */
  initialValues?: Partial<HeroInputValues>;
}

export function HeroInput({ onAnalyze, loading, initialValues }: HeroInputProps) {
  const [heroContent, setHeroContent] = useState(initialValues?.heroContent ?? "");
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [targetAudience, setTargetAudience] = useState(
    initialValues?.targetAudience ?? "",
  );
  const [primaryTopic, setPrimaryTopic] = useState(
    initialValues?.primaryTopic ?? "",
  );

  // The button is disabled until there is at least a little content.
  const canSubmit = heroContent.trim().length >= 20 && !loading;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Step 1 — Paste your blog post
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Paste the full hero asset below. The optional fields help the AI tailor
          the analysis.
        </p>
      </div>

      {/* Optional metadata fields */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Title (optional)
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Why most rebrands fail"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Target audience (optional)
          </label>
          <input
            type="text"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g. Early-stage founders"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Primary topic (optional)
          </label>
          <input
            type="text"
            value={primaryTopic}
            onChange={(e) => setPrimaryTopic(e.target.value)}
            placeholder="e.g. Brand strategy"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* The main blog-post textarea */}
      <TextArea
        label="Blog post (hero asset)"
        value={heroContent}
        onChange={(e) => setHeroContent(e.target.value)}
        rows={16}
        placeholder="Paste your full blog post here..."
      />

      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">
          {heroContent.trim().length.toLocaleString()} characters
        </span>
        <Button
          loading={loading}
          disabled={!canSubmit}
          onClick={() =>
            onAnalyze({ heroContent, title, targetAudience, primaryTopic })
          }
        >
          {loading ? "Analyzing..." : "Analyze & Extract Key Ideas"}
        </Button>
      </div>
    </div>
  );
}
