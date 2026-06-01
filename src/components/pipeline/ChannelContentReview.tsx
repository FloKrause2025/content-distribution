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
 *
 * Instagram Carousel posts also carry a separate `caption` field (the text
 * posted alongside the slides). When present it gets its own labeled section
 * beneath the slides, with its own Edit and Copy controls — mirroring the
 * main content. Other channels don't have a caption, so the section never
 * renders for them.
 *
 * There are also "Copy All" and "Export as Markdown" buttons for the whole set.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TextArea } from "@/components/ui/TextArea";
import type { ChannelContent, KeyIdea } from "@/agents/types";

/** The two inline-editable fields on a content piece. */
type EditableField = "content" | "caption";

interface ChannelContentReviewProps {
  content: ChannelContent[];
  keyIdeas: KeyIdea[];
  /** Save an inline edit to one editable field on a content piece. */
  onUpdateField: (id: string, field: EditableField, value: string) => void;
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
      );
      // Caption is its own section, included only when the channel produces one.
      if (piece.caption !== undefined) {
        lines.push("**Caption:**", "", piece.caption, "");
      }
      lines.push("---", "");
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
      if (piece.caption !== undefined) {
        blocks.push(`Caption:\n${piece.caption}\n`);
      }
    }
  }
  return blocks.join("\n");
}

/**
 * Each piece can have two independently editable sections (content + caption),
 * so we track edit/copy state by a composite "<piece-id>:<field>" key.
 */
function fieldKey(id: string, field: EditableField): string {
  return `${id}:${field}`;
}

export function ChannelContentReview({
  content,
  keyIdeas,
  onUpdateField,
  onStartOver,
}: ChannelContentReviewProps) {
  // Which section is currently being edited (composite key) and which was just
  // copied (so we can flash "Copied!" for ~1.5s).
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1500);
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
            {copiedKey === "__all__" ? "Copied!" : "Copy All"}
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
                const contentKey = fieldKey(piece.id, "content");
                const captionKey = fieldKey(piece.id, "caption");
                const editingContent = editingKey === contentKey;
                const editingCaption = editingKey === captionKey;
                const hasCaption = piece.caption !== undefined;

                return (
                  <Card key={piece.id}>
                    {/* Header: platform + format badges and content actions */}
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
                            setEditingKey(editingContent ? null : contentKey)
                          }
                        >
                          {editingContent ? "Done" : "Edit"}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => copy(piece.content, contentKey)}
                        >
                          {copiedKey === contentKey ? "Copied!" : "Copy"}
                        </Button>
                      </div>
                    </div>

                    {/* Body: editable textarea or styled preview */}
                    {editingContent ? (
                      <TextArea
                        value={piece.content}
                        onChange={(e) =>
                          onUpdateField(piece.id, "content", e.target.value)
                        }
                        rows={12}
                      />
                    ) : (
                      <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
                        {piece.content}
                      </div>
                    )}

                    {/* Caption section — only for channels that produce one. */}
                    {hasCaption && (
                      <div className="mt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Caption
                          </span>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              onClick={() =>
                                setEditingKey(
                                  editingCaption ? null : captionKey,
                                )
                              }
                            >
                              {editingCaption ? "Done" : "Edit"}
                            </Button>
                            <Button
                              variant="ghost"
                              onClick={() =>
                                copy(piece.caption ?? "", captionKey)
                              }
                            >
                              {copiedKey === captionKey ? "Copied!" : "Copy"}
                            </Button>
                          </div>
                        </div>
                        {editingCaption ? (
                          <TextArea
                            value={piece.caption ?? ""}
                            onChange={(e) =>
                              onUpdateField(
                                piece.id,
                                "caption",
                                e.target.value,
                              )
                            }
                            rows={6}
                          />
                        ) : (
                          <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800">
                            {piece.caption}
                          </div>
                        )}
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
