/**
 * src/agents/key-idea-extractor.ts
 * -----------------------------------------------------------------------------
 * AGENT 2 of 3 — the "Key Idea Extractor".
 *
 * Its job: take the hero analysis from Agent 1 and break the content into
 * EXACTLY 4 key ideas — one for each content pillar. Each key idea becomes a
 * card the user reviews/edits before we generate channel content from it.
 *
 * The four pillars (the agency's "Cascade" framework) are defined in the
 * editable knowledge-base doc `cascade-framework.md`, which is injected into the
 * prompt. The prompt here only fixes the pillar ids, their order, and the output
 * shape — so the *meaning* of a pillar can be tuned in the doc without code.
 *
 * Runs on the SERVER only (called from an API route).
 */

import { randomUUID } from "crypto";
import { callClaude, parseJsonResponse } from "@/lib/anthropic";
import { assemblePrompt, BRAND_NAME, JSON_ONLY_INSTRUCTION } from "@/lib/prompts";
import { DEFAULT_PROJECT_SLUG } from "@/lib/knowledge-base";
import {
  CHANNELS,
  PILLAR_LABELS,
  type KeyIdea,
  type KeyIdeaExtractorInput,
  type KeyIdeaExtractorOutput,
  type PillarId,
} from "@/agents/types";

/** The four pillars in the fixed order we want them returned. */
const PILLAR_ORDER: PillarId[] = [
  "perspectives",
  "proof",
  "creative_work",
  "differentiator",
];

/** Default channel suggestions for a pillar, used if the AI omits them. */
function defaultChannelsForPillar(pillar: PillarId): string[] {
  return CHANNELS.filter((c) => c.suggestedForPillars.includes(pillar)).map(
    (c) => c.id,
  );
}

/** Map the AI's free-text channel suggestions onto our known channel ids. */
function normaliseSuggestedChannels(
  pillar: PillarId,
  suggested: unknown,
): string[] {
  if (!Array.isArray(suggested)) return defaultChannelsForPillar(pillar);

  const matched = new Set<string>();
  for (const item of suggested) {
    const text = String(item).toLowerCase();
    for (const channel of CHANNELS) {
      // Match on the channel id, its label, or its format wording.
      if (
        text.includes(channel.id) ||
        text.includes(channel.label.toLowerCase()) ||
        text.includes(channel.format.toLowerCase())
      ) {
        matched.add(channel.id);
      }
    }
  }
  return matched.size > 0 ? [...matched] : defaultChannelsForPillar(pillar);
}

export async function extractKeyIdeas(
  input: KeyIdeaExtractorInput,
  projectSlug: string = DEFAULT_PROJECT_SLUG,
): Promise<KeyIdeaExtractorOutput> {
  const { heroContent, heroAnalysis } = input;

  const systemIntro = `You are a senior content strategist for ${BRAND_NAME}. Based on a hero asset and its analysis, you extract exactly 4 key ideas — one for each content pillar — that the team can turn into social posts.`;

  const channelOptions = CHANNELS.map((c) => `"${c.id}" (${c.label})`).join(", ");

  const taskPrompt = `Using the hero asset and its analysis below, extract EXACTLY 4 key ideas — one for each content pillar.

The four content pillars — and what makes a strong key idea for each — are defined in the Cascade Framework reference document provided to you. Produce one idea per pillar, using these exact pillar ids in this order: perspectives, proof, creative_work, differentiator.

HERO ANALYSIS:
- Main argument: ${heroAnalysis.mainArgument}
- Target audience: ${heroAnalysis.targetAudience}
- Themes: ${heroAnalysis.themes.join("; ")}
- Proof points: ${heroAnalysis.proofPoints.join("; ")}
- Tone: ${heroAnalysis.tone}
- Suggested angles: ${heroAnalysis.suggestedAngles.join("; ")}

ORIGINAL HERO CONTENT (for reference):
"""
${heroContent}
"""

For each key idea, choose suggested channels from this list: ${channelOptions}.

Return a JSON object with EXACTLY this shape:
{
  "keyIdeas": [
    {
      "pillar": "perspectives" | "proof" | "creative_work" | "differentiator",
      "coreArgument": "the core argument in 2-3 sentences",
      "supportingPoints": ["2 to 3 supporting points"],
      "suggestedChannels": ["one or more channel ids from the list above"]
    }
  ]
}

There MUST be exactly 4 items, one per pillar, in this order: perspectives, proof, creative_work, differentiator.

${JSON_ONLY_INSTRUCTION}`;

  const { system, user } = await assemblePrompt(
    projectSlug,
    ["brand-voice-guide", "cascade-framework"],
    taskPrompt,
    systemIntro,
  );

  const raw = await callClaude({ system, user, label: "key-idea-extractor" });
  const parsed = parseJsonResponse<{ keyIdeas?: unknown[] }>(
    raw,
    "key-idea-extractor",
  );

  const rawIdeas = Array.isArray(parsed.keyIdeas) ? parsed.keyIdeas : [];

  // Build a clean, predictable list: one entry per pillar in the fixed order.
  // We match each returned idea to its pillar; if the model missed a pillar we
  // still return a (sparse) placeholder so the UI always shows all four.
  const byPillar = new Map<PillarId, Record<string, unknown>>();
  for (const idea of rawIdeas) {
    const obj = idea as Record<string, unknown>;
    const pillar = String(obj.pillar) as PillarId;
    if (PILLAR_ORDER.includes(pillar) && !byPillar.has(pillar)) {
      byPillar.set(pillar, obj);
    }
  }

  const keyIdeas: KeyIdea[] = PILLAR_ORDER.map((pillar) => {
    const obj = byPillar.get(pillar) ?? {};
    return {
      id: randomUUID(),
      pillar,
      pillarLabel: PILLAR_LABELS[pillar],
      coreArgument: typeof obj.coreArgument === "string" ? obj.coreArgument : "",
      supportingPoints: Array.isArray(obj.supportingPoints)
        ? (obj.supportingPoints as unknown[]).map(String)
        : [],
      suggestedChannels: normaliseSuggestedChannels(
        pillar,
        obj.suggestedChannels,
      ),
    };
  });

  return { keyIdeas };
}
