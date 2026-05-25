/**
 * src/components/pipeline/ChannelContentReview.tsx
 * -----------------------------------------------------------------------------
 * PIPELINE STEP 3 (UI).
 *
 * Shows every generated content piece, grouped by the key idea it came from.
 * For each piece the user can:
 *   - read a styled preview
 *   - edit the text inline
 *   - copy it to the clipboard
 * There are also "Copy All" and "Export as Markdown" buttons for the whole set.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TextArea } from "@/components/ui/TextArea";
import type { ChannelContent, KeyIdea } from "@/agents/types";

interface ChannelContentReviewProps {
  content: ChannelContent[];
  keyIdeas: KeyIdea[];
  /** Save an inline edit to one content piece. */
  onUpdateContent: (id: string, newContent: string) => void;
  /** Start the whole pipeline over from step 1. */
  onStartOver: () => void;
}

/** Build a single structured markdown document from all content pieces. */
function buildMarkdown(content: ChannelContent[], keyIdeas: KeyIdea[]): string {
  const lines: string[] = ["# Insight Cascade — Generated Content", ""];
  for (const idea of keyIdeas) {
    const pieces = content.filter((c) => c.keyIdeaId === idea.id);
    if (pieces.length === 0) continue;
    lines.push(`## ${idea.pillarLabel}`, "", `*${idea.coreArgument}*`, "");
    for (const piece of pieces) {
      lines.push(
        `### ${piece.platform} — ${piece.format}`,
        `_${piece.estimatedLength}_`,
        "",
        piece.content,
        "",
        "---",
        "",
      );
    }
  }
  return lines.join("\n");
}

/** Build the plain-text "Copy All" payload. */
function buildPlainText(content: ChannelContent[], keyIdeas: KeyIdea[]): string {
  const blocks: string[] = [];
  for (const idea of keyIdeas) {
    const pieces = content.filter((c) => c.keyIdeaId === idea.id);
    if (pieces.length === 0) continue;
    blocks.push(`=== ${idea.pillarLabel} ===`);
    for (const piece of pieces) {
      blocks.push(
        `\n[${piece.platform} — ${piece.format}]\n${piece.content}\n`,
      );
    }
  }
  return blocks.join("\n");
}

export function ChannelContentReview({
  content,
  keyIdeas,
  onUpdateContent,
  onStartOver,
}: ChannelContentReviewProps) {
  // Track which piece is currently being edited (by id), and which was just
  // copied (so we can show a brief "Copied!" confirmation).
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Copy a single string to the clipboard and flash a confirmation.
  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      alert("Copy failed — your browser blocked clipboard access.");
    }
  }

  // Download all content as a single .md file.
  function exportMarkdown() {
    const md = buildMarkdown(content, keyIdeas);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "insight-cascade-content.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  // Only show ideas that actually produced content, in their original order.
  const ideasWithContent = keyIdeas.filter((idea) =>
    content.some((c) => c.keyIdeaId === idea.id),
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Step 3 — Review channel content
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {content.length} piece{content.length === 1 ? "" : "s"} generated.
            Edit anything inline, then copy or export.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              copy(buildPlainText(content, keyIdeas), "__all__")
            }
          >
            {copiedId === "__all__" ? "Copied!" : "Copy All"}
          </Button>
          <Button variant="secondary" onClick={exportMarkdown}>
            Export as Markdown
          </Button>
        </div>
      </div>

      {/* Content grouped by key idea */}
      <div className="space-y-6">
        {ideasWithContent.map((idea) => (
          <div key={idea.id} className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="indigo">{idea.pillarLabel}</Badge>
              <span className="text-sm text-gray-500">{idea.coreArgument}</span>
            </div>

            {content
              .filter((c) => c.keyIdeaId === idea.id)
              .map((piece) => {
                const isEditing = editingId === piece.id;
                return (
                  <Card key={piece.id}>
                    {/* Header: platform + format badges and actions */}
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          tone={
                            piece.platform === "LinkedIn"
                              ? "linkedin"
                              : "instagram"
                          }
                        >
                          {piece.platform}
                        </Badge>
                        <Badge tone="gray">{piece.format}</Badge>
                        {piece.estimatedLength && (
                          <span className="text-xs text-gray-400">
                            {piece.estimatedLength}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setEditingId(isEditing ? null : piece.id)
                          }
                        >
                          {isEditing ? "Done" : "Edit"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => copy(piece.content, piece.id)}
                        >
                          {copiedId === piece.id ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    {/* Body: editable textarea or styled preview */}
                    {isEditing ? (
                      <TextArea
                        value={piece.content}
                        onChange={(e) =>
                          onUpdateContent(piece.id, e.target.value)
                        }
                        rows={12}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
                        {piece.content}
                      </div>
                    )}

                    {/* Hook + CTA, if the AI extracted them */}
                    {(piece.hookLine || piece.cta) && (
                      <div className="mt-3 grid gap-2 text-xs text-gray-500 sm:grid-cols-2">
                        {piece.hookLine && (
                          <div>
                            <span className="font-semibold text-gray-600">
                              Hook:{" "}
                            </span>
                            {piece.hookLine}
                          </div>
                        )}
                        {piece.cta && (
                          <div>
                            <span className="font-semibold text-gray-600">
                              CTA:{" "}
                            </span>
                            {piece.cta}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                );
              })}
          </div>
        ))}
      </div>

      <div className="flex justify-start">
        <Button variant="secondary" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </div>
  );
}
