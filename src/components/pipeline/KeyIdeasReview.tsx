/**
 * src/components/pipeline/KeyIdeasReview.tsx
 * -----------------------------------------------------------------------------
 * PIPELINE STEP 2 (UI).
 *
 * Shows the 4 extracted key ideas (one per content pillar). Each idea is:
 *   - editable (core argument + supporting points)
 *   - taggable with the channels to generate content for (checkboxes)
 *
 * The parent pipeline page owns the data; this component reports changes back
 * up through callbacks (onUpdateIdea, onToggleChannel) and triggers generation
 * with onGenerate.
 */
"use client";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TextArea } from "@/components/ui/TextArea";
import { CHANNELS, type KeyIdea } from "@/agents/types";

interface KeyIdeasReviewProps {
  keyIdeas: KeyIdea[];
  /** Channel ids selected for each key idea, keyed by the idea's id. */
  selectedChannels: Record<string, string[]>;
  /** Update one editable field on a key idea. */
  onUpdateIdea: (id: string, patch: Partial<KeyIdea>) => void;
  /** Toggle a channel on/off for a key idea. */
  onToggleChannel: (ideaId: string, channelId: string) => void;
  /** Go back to step 1. */
  onBack: () => void;
  /** Generate content for all approved ideas + selected channels. */
  onGenerate: () => void;
  loading: boolean;
}

export function KeyIdeasReview({
  keyIdeas,
  selectedChannels,
  onUpdateIdea,
  onToggleChannel,
  onBack,
  onGenerate,
  loading,
}: KeyIdeasReviewProps) {
  // Count how many channels are selected in total — we need at least one to
  // enable the "Generate" button.
  const totalSelected = Object.values(selectedChannels).reduce(
    (sum, list) => sum + list.length,
    0,
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">
          Step 2 — Review key ideas
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Edit any idea before generating. Tick the channels you want content for
          on each idea.
        </p>
      </div>

      <div className="space-y-4">
        {keyIdeas.map((idea) => (
          <Card key={idea.id}>
            <div className="mb-3 flex items-center gap-2">
              <Badge tone="indigo">{idea.pillarLabel}</Badge>
            </div>

            {/* Editable core argument */}
            <TextArea
              label="Core argument"
              value={idea.coreArgument}
              onChange={(e) =>
                onUpdateIdea(idea.id, { coreArgument: e.target.value })
              }
              rows={3}
            />

            {/* Editable supporting points (one per line) */}
            <div className="mt-3">
              <TextArea
                label="Supporting points (one per line)"
                value={idea.supportingPoints.join("\n")}
                onChange={(e) =>
                  onUpdateIdea(idea.id, {
                    // Split the textarea back into an array, dropping blank lines.
                    supportingPoints: e.target.value
                      .split("\n")
                      .map((line) => line.trim())
                      .filter((line) => line.length > 0),
                  })
                }
                rows={3}
              />
            </div>

            {/* Channel checkboxes */}
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium text-gray-700">
                Generate content for:
              </div>
              <div className="flex flex-wrap gap-3">
                {CHANNELS.map((channel) => {
                  const checked =
                    selectedChannels[idea.id]?.includes(channel.id) ?? false;
                  return (
                    <label
                      key={channel.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                        checked
                          ? "border-accent bg-accent-light text-accent"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => onToggleChannel(idea.id, channel.id)}
                        className="accent-accent"
                      />
                      {channel.label}
                    </label>
                  );
                })}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="secondary" onClick={onBack} disabled={loading}>
          ← Back
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            {totalSelected} channel{totalSelected === 1 ? "" : "s"} selected
          </span>
          <Button
            loading={loading}
            disabled={totalSelected === 0 || loading}
            onClick={onGenerate}
          >
            {loading ? "Generating..." : "Generate Channel Content"}
          </Button>
        </div>
      </div>
    </div>
  );
}
