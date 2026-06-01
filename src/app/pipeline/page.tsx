/**
 * src/app/pipeline/page.tsx
 * -----------------------------------------------------------------------------
 * THE PIPELINE PAGE (URL "/pipeline") — the core of the app.
 *
 * This is a "client component" (note the "use client" line below) because it
 * holds interactive state in the browser and calls our API endpoints. It walks
 * the user through three steps and keeps all the data in React state. If the
 * user refreshes the page, they start over — that's expected for the MVP.
 *
 * The flow:
 *   Step 1 (HeroInput)           -> calls analyze-hero THEN extract-key-ideas
 *   Step 2 (KeyIdeasReview)      -> calls generate-channel-content
 *   Step 3 (ChannelContentReview)-> review, edit, copy, export
 */
"use client";

import { useState } from "react";
import { PipelineProgress } from "@/components/pipeline/PipelineProgress";
import { HeroInput, type HeroInputValues } from "@/components/pipeline/HeroInput";
import { KeyIdeasReview } from "@/components/pipeline/KeyIdeasReview";
import { ChannelContentReview } from "@/components/pipeline/ChannelContentReview";
import { Card } from "@/components/ui/Card";
import { CHANNELS } from "@/agents/types";
import type {
  ChannelContent,
  HeroAnalysis,
  KeyIdea,
} from "@/agents/types";

export default function PipelinePage() {
  // Which step we're on (1, 2, or 3).
  const [step, setStep] = useState(1);

  // Data carried through the pipeline.
  const [heroValues, setHeroValues] = useState<HeroInputValues | null>(null);
  const [, setHeroAnalysis] = useState<HeroAnalysis | null>(null);
  const [keyIdeas, setKeyIdeas] = useState<KeyIdea[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<
    Record<string, string[]>
  >({});
  const [content, setContent] = useState<ChannelContent[]>([]);

  // UI state.
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // A small helper to call one of our API endpoints and return the parsed JSON,
  // throwing a readable error if the request failed.
  async function callApi<T>(url: string, payload: unknown): Promise<T> {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error ?? "Request failed.");
    }
    return data as T;
  }

  // -------------------- STEP 1 -> STEP 2 ----------------------------------
  // Analyze the hero asset, then extract key ideas, then show step 2.
  async function handleAnalyze(values: HeroInputValues) {
    setError(null);
    setLoading(true);
    setHeroValues(values);
    try {
      setLoadingMessage("Analyzing hero asset...");
      const { analysis } = await callApi<{ analysis: HeroAnalysis }>(
        "/api/pipeline/analyze-hero",
        {
          heroContent: values.heroContent,
          title: values.title || undefined,
          targetAudience: values.targetAudience || undefined,
        },
      );
      setHeroAnalysis(analysis);

      setLoadingMessage("Extracting key ideas...");
      const { keyIdeas: ideas } = await callApi<{ keyIdeas: KeyIdea[] }>(
        "/api/pipeline/extract-key-ideas",
        { heroContent: values.heroContent, heroAnalysis: analysis },
      );
      setKeyIdeas(ideas);

      // Pre-select each idea's suggested channels (the user can adjust them).
      const initialSelection: Record<string, string[]> = {};
      for (const idea of ideas) {
        initialSelection[idea.id] = idea.suggestedChannels.filter((id) =>
          CHANNELS.some((c) => c.id === id),
        );
      }
      setSelectedChannels(initialSelection);

      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }

  // -------------------- STEP 2 helpers ------------------------------------
  function updateIdea(id: string, patch: Partial<KeyIdea>) {
    setKeyIdeas((prev) =>
      prev.map((idea) => (idea.id === id ? { ...idea, ...patch } : idea)),
    );
  }

  function toggleChannel(ideaId: string, channelId: string) {
    setSelectedChannels((prev) => {
      const current = prev[ideaId] ?? [];
      const next = current.includes(channelId)
        ? current.filter((c) => c !== channelId)
        : [...current, channelId];
      return { ...prev, [ideaId]: next };
    });
  }

  // -------------------- STEP 2 -> STEP 3 ----------------------------------
  async function handleGenerate() {
    if (!heroValues) return;
    setError(null);
    setLoading(true);
    setLoadingMessage("Generating channel content...");
    try {
      // Build the list of jobs: only ideas that have at least one channel ticked.
      const items = keyIdeas
        .map((idea) => ({
          keyIdea: idea,
          channels: selectedChannels[idea.id] ?? [],
        }))
        .filter((item) => item.channels.length > 0);

      const { content: generated } = await callApi<{
        content: ChannelContent[];
      }>("/api/pipeline/generate-channel-content", {
        heroContent: heroValues.heroContent,
        items,
      });

      setContent(generated);
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setLoadingMessage("");
    }
  }

  // -------------------- STEP 3 helpers ------------------------------------
  // Generalized so the user can edit either the main content or the (optional)
  // Instagram caption. `field` is "content" | "caption"; the same handler
  // covers both — anything else is rejected at the type level.
  function updateField(
    id: string,
    field: "content" | "caption",
    value: string,
  ) {
    setContent((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  }

  function startOver() {
    setStep(1);
    setHeroAnalysis(null);
    setKeyIdeas([]);
    setSelectedChannels({});
    setContent([]);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <PipelineProgress currentStep={step} />

      {/* Error banner, shown if any step failed. */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading overlay message with the current step name. */}
      {loading && loadingMessage && (
        <Card className="flex items-center gap-3 border-accent/30 bg-accent-light">
          <span className="h-5 w-5 animate-spin-slow rounded-full border-2 border-accent border-t-transparent" />
          <span className="text-sm font-medium text-accent">
            {loadingMessage}
          </span>
        </Card>
      )}

      <Card>
        {step === 1 && (
          <HeroInput
            onAnalyze={handleAnalyze}
            loading={loading}
            initialValues={heroValues ?? undefined}
          />
        )}

        {step === 2 && (
          <KeyIdeasReview
            keyIdeas={keyIdeas}
            selectedChannels={selectedChannels}
            onUpdateIdea={updateIdea}
            onToggleChannel={toggleChannel}
            onBack={() => setStep(1)}
            onGenerate={handleGenerate}
            loading={loading}
          />
        )}

        {step === 3 && (
          <ChannelContentReview
            content={content}
            keyIdeas={keyIdeas}
            onUpdateField={updateField}
            onStartOver={startOver}
          />
        )}
      </Card>
    </div>
  );
}
