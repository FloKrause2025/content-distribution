/**
 * src/agents/hero-analyzer.ts
 * -----------------------------------------------------------------------------
 * AGENT 1 of 3 — the "Hero Analyzer".
 *
 * Its job: read the raw blog post (the "hero asset") and produce a structured
 * breakdown of it — the main argument, themes, proof points, tone, and possible
 * angles. This breakdown feeds into Agent 2 (the key-idea extractor).
 *
 * Each agent is an isolated module: it owns its own prompt and its own
 * input/output shape. Adding or changing one agent never touches the others.
 *
 * Runs on the SERVER only (called from an API route).
 */

import { callClaude, parseJsonResponse } from "@/lib/anthropic";
import { assemblePrompt, BRAND_NAME, JSON_ONLY_INSTRUCTION } from "@/lib/prompts";
import { DEFAULT_PROJECT_SLUG } from "@/lib/knowledge-base";
import type { HeroAnalysis, HeroAnalyzerInput } from "@/agents/types";

export async function analyzeHero(
  input: HeroAnalyzerInput,
  projectSlug: string = DEFAULT_PROJECT_SLUG,
): Promise<HeroAnalysis> {
  const { heroContent, title, targetAudience } = input;

  // The stable instruction that opens the system prompt.
  const systemIntro = `You are a senior content strategist for ${BRAND_NAME}. Your task is to analyze a hero asset (a long-form blog post) and identify the key themes, arguments, and proof points that can be repurposed into social media content. Be precise, concrete, and faithful to the source material.`;

  // The specific task (the "user" message). We describe the exact JSON we want.
  const taskPrompt = `Analyze the following blog post and return a structured breakdown.

${title ? `TITLE: ${title}\n` : ""}${targetAudience ? `TARGET AUDIENCE (override): ${targetAudience}\n` : ""}
BLOG POST:
"""
${heroContent}
"""

Return a JSON object with EXACTLY these fields:
{
  "mainArgument": "the central thesis of the post, in 1-2 sentences",
  "targetAudience": "who this content is for (use the override above if provided)",
  "themes": ["3 to 5 major themes identified in the post"],
  "proofPoints": ["specific data, statistics, examples, or quotes found in the post"],
  "tone": "a short description of the tone detected in the original",
  "suggestedAngles": ["3 to 5 potential angles for turning this into social content"]
}

${JSON_ONLY_INSTRUCTION}`;

  // Agents 1 & 2 use the brand voice guide as their context. (Other docs that
  // exist in the knowledge base, like a cascade framework, can be added here.)
  const { system, user } = await assemblePrompt(
    projectSlug,
    ["brand-voice-guide", "cascade-framework"],
    taskPrompt,
    systemIntro,
  );

  const raw = await callClaude({ system, user, label: "hero-analyzer" });
  const parsed = parseJsonResponse<HeroAnalysis>(raw, "hero-analyzer");

  // Normalise the result so the rest of the app can rely on arrays existing.
  return {
    mainArgument: parsed.mainArgument ?? "",
    targetAudience: parsed.targetAudience ?? targetAudience ?? "",
    themes: Array.isArray(parsed.themes) ? parsed.themes : [],
    proofPoints: Array.isArray(parsed.proofPoints) ? parsed.proofPoints : [],
    tone: parsed.tone ?? "",
    suggestedAngles: Array.isArray(parsed.suggestedAngles)
      ? parsed.suggestedAngles
      : [],
  };
}
