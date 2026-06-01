/**
 * src/components/pipeline/ChannelContentReview.tsx
 * -----------------------------------------------------------------------------
 * PIPELINE STEP 3 (UI).
 *
 * Renders the generated posts as a VISUAL CASCADE: each key idea is a parent
 * group (pillar badge + core argument), and beneath it the decomposed posts
 * appear as a numbered, ordered sequence — one card per angle. The cascade is
 * made visually obvious with indentation and a left accent rail under each
 * idea, and every card leads with a prominent "Angle N · {label}" sub-heading
 * so a user scanning the screen can immediately see how ONE idea cascaded into
 * multiple focused posts and follow them in order.
 *
 * Each card keeps its existing controls (Edit, Copy) and platform/format
 * badges. Instagram Carousel posts also carry a separate `caption` field which
 * gets its own labeled section beneath the slides, with its own Edit and Copy
 * controls — other channels don't have a caption, so that section never
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
import { CHANNELS, type ChannelContent, type KeyIdea } from "@/agents/types";

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

// ----- ordering helpers ----------------------------------------------------
// We render every idea's posts as a single numbered sequence. Posts are sorted
// by channel using the registry order (so all of one channel's angles sit
// together), and within a channel we keep the order returned by the API (which
// preserves the order of the angles the model produced).

const CHANNEL_ORDER = new Map(CHANNELS.map((c, i) => [c.id, i]));

function channelSortIndex(id: string): number {
  return CHANNEL_ORDER.get(id) ?? Number.POSITIVE_INFINITY;
}

function postsForIdea(
  content: ChannelContent[],
  ideaId: string,
): ChannelContent[] {
  return content
    .filter((c) => c.keyIdeaId === ideaId)
    .slice()
    .sort((a, b) => channelSortIndex(a.channel) - channelSortIndex(b.channel));
}

/** Heading text shown above each post, including the 1-based angle index. */
function angleHeading(angleNumber: number, label?: string): string {
  return label ? `Angle ${angleNumber} · ${label}` : `Angle ${angleNumber}`;
}

// ----- export helpers ------------------------------------------------------

/** Build a single structured markdown document from all content pieces. */
function buildMarkdown(content: ChannelContent[], keyIdeas: KeyIdea[]): string {
  const lines: string[] = ["# Insight Cascade — Generated Content", ""];
  for (const idea of keyIdeas) {
    const pieces = postsForIdea(content, idea.id);
    if (pieces.length === 0) continue;
    lines.push(`## ${idea.pillarLabel}`, "", `*${idea.coreArgument}*`, "");
    pieces.forEach((piece, idx) => {
      lines.push(
        `### ${angleHeading(idx + 1, piece.angle)}`,
        `**${piece.platform} — ${piece.format}** · _${piece.estimatedLength}_`,
        "",
        piece.content,
        "",
      );
      // Caption is its own section, included only when the channel produces one.
      if (piece.caption !== undefined) {
        lines.push("**Caption:**", "", piece.caption, "");
      }
      lines.push("---", "");
    });
  }
  return lines.join("\n");
}

/** Build the plain-text "Copy All" payload. */
function buildPlainText(content: ChannelContent[], keyIdeas: KeyIdea[]): string {
  const blocks: string[] = [];
  for (const idea of keyIdeas) {
    const pieces = postsForIdea(content, idea.id);
    if (pieces.length === 0) continue;
    blocks.push(`=== ${idea.pillarLabel} ===`);
    pieces.forEach((piece, idx) => {
      blocks.push(
        `\n${angleHeading(idx + 1, piece.angle)}\n[${piece.platform} — ${piece.format}]\n${piece.content}\n`,
      );
      if (piece.caption !== undefined) {
        blocks.push(`Caption:\n${piece.caption}\n`);
      }
    });
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

// ===========================================================================

export function ChannelContentReview({
  content,
  keyIdeas,
  onUpdateField,
  onStartOver,
}: ChannelContentReviewProps) {
  // Composite keys like "<piece-id>:content" so the content section and the
  // caption section can be edited and copied independently of each other.
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

  // Only show ideas that actually produced posts, in their original order.
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
            {content.length} post{content.length === 1 ? "" : "s"} generated.
            Each key idea cascades into one or more focused angle posts. Edit
            anything inline, then copy or export.
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

      {/* Parent group per key idea; angle cards cascade beneath each parent. */}
      <div className="space-y-8">
        {ideasWithContent.map((idea) => {
          const pieces = postsForIdea(content, idea.id);
          return (
            <section key={idea.id} className="space-y-3">
              {/* Parent header: pillar badge + core argument */}
              <header className="flex flex-wrap items-center gap-2">
                <Badge tone="indigo">{idea.pillarLabel}</Badge>
                <span className="text-sm font-medium text-gray-700">
                  {idea.coreArgument}
                </span>
              </header>

              {/* Visual cascade rail: indent + left accent line connects the
                  parent idea to its decomposed angle cards beneath. */}
              <div className="ml-3 space-y-3 border-l-2 border-accent/40 pl-5">
                {pieces.map((piece, idx) => {
                  const angleNumber = idx + 1;
                  const contentKey = fieldKey(piece.id, "content");
                  const captionKey = fieldKey(piece.id, "caption");
                  const editingContent = editingKey === contentKey;
                  const editingCaption = editingKey === captionKey;
                  const hasCaption = piece.caption !== undefined;

                  return (
                    <Card key={piece.id}>
                      {/* Prominent angle sub-heading at the top of the card */}
                      <div className="mb-3 text-sm font-bold uppercase tracking-wide text-accent">
                        {angleHeading(angleNumber, piece.angle)}
                      </div>

                      {/* Badges + content actions */}
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
            </section>
          );
        })}
      </div>

      <div className="flex justify-start">
        <Button variant="secondary" onClick={onStartOver}>
          Start over
        </Button>
      </div>
    </div>
  );
}
