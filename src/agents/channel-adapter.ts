/**
 * src/agents/channel-adapter.ts
 * -----------------------------------------------------------------------------
 * AGENT 3 of 3 — the "Channel Content Adapter".
 *
 * Its job: take ONE key idea and produce ready-to-publish content for ONE
 * channel. A key idea is a full argument that often contains MULTIPLE distinct
 * publishable angles — so one (idea × channel) can yield up to 3 focused posts,
 * not one bloated post that tries to cover everything.
 *
 * The flow inside this agent is now TWO Claude calls (per idea × channel),
 * followed by parallel post generation:
 *
 *   1. DECOMPOSE — identify the distinct publishable angles (1–3 of them).
 *      Never fragments a single argument; never pads to 3. For the Instagram
 *      Carousel, each angle must independently meet the playbook's carousel
 *      bar; angles that don't qualify are dropped.
 *
 *   2. WRITE   — for every angle, generate one focused post that covers ONLY
 *      that angle, following the channel playbook. Runs in parallel.
 *
 * This agent is still called once per (key idea × selected channel); a tight
 * idea legitimately produces a single post (backward-compatible).
 *
 * Runs on the SERVER only (called from an API route).
 */

import { randomUUID } from "crypto";
import { callClaude, parseJsonResponse } from "@/lib/anthropic";
import { assemblePrompt, BRAND_NAME, JSON_ONLY_INSTRUCTION } from "@/lib/prompts";
import { DEFAULT_PROJECT_SLUG } from "@/lib/knowledge-base";
import {
  getChannel,
  type ChannelAdapterInput,
  type ChannelContent,
  type ChannelDefinition,
  type KeyIdea,
} from "@/agents/types";

/** Internal shape: one decomposed angle of a key idea for a given channel. */
interface AngleSpec {
  /** Short 3-7 word label (e.g. "The hidden cost"). */
  label: string;
  /** The single sharp point the post will make (1-2 sentences). */
  point: string;
}

/**
 * STEP 1 — angle decomposition.
 *
 * Asks Claude to identify the DISTINCT publishable angles in the key idea for
 * the given channel. Returns between 1 and 3. The brand voice guide and the
 * channel's playbook are injected so the model understands what "publishable"
 * means for this channel (especially the carousel bar).
 */
async function decomposeAngles(
  keyIdea: KeyIdea,
  channelDef: ChannelDefinition,
  heroContent: string,
  projectSlug: string,
): Promise<AngleSpec[]> {
  const isCarousel = channelDef.id === "instagram-carousel";

  const systemIntro = `You are a senior content strategist for ${BRAND_NAME}. Working from the ORIGINAL HERO ASSET (not just the compressed key idea), you identify the genuinely DISTINCT publishable angles it can yield as ${channelDef.label}s. Judge each angle on its merits: keep it only if it makes a point the others don't and is well-supported by the hero asset. Some ideas yield three strong angles; many yield only one. Never invent or pad angles to hit a number.`;

  const taskPrompt = `Identify the DISTINCT publishable angles in the key idea below that can each stand alone as a focused ${channelDef.label} (${channelDef.format}).

RULES:
- An angle is a post that could stand alone, with its own hook and exactly ONE point. Two angles are distinct if each could be published separately without repeating the other's main point.
- Treat the core argument and each supporting point as a CANDIDATE angle, then KEEP only the ones that are genuinely distinct standalone takes. Drop any candidate that is just supporting detail for another, or that would overlap an angle you've already kept. Two kept angles must never share the same main point.
- Judge distinctness honestly against the hero asset. If the idea genuinely contains only one angle, return exactly 1 and SKIP the rest — do NOT force or pad to reach 2 or 3. One strong, distinct post beats three overlapping ones.
- Never split ONE claim into fragments, and never return more than 3.${isCarousel ? `
- For this Instagram Carousel specifically, each angle MUST independently meet the playbook's carousel bar — a drawable structure (~5–8 slides), a strong cover hook, and a novel take. Skip any angle that wouldn't qualify on its own; returning fewer than 3 (or even 1) is correct when others don't meet the bar.` : ""}

EXAMPLE — a key idea whose core argument is "lead with outcomes, not features," with supporting points "features-first forces the buyer to do extra work," "buyers need three things immediately (what world this makes possible, team credibility, problem urgency)," and "clarity is its own differentiation," should yield THREE distinct angles:
  - "Lead with outcomes, not features"
  - "The 3 things buyers decide in 10 seconds"
  - "Clarity is the differentiator"

COUNTER-EXAMPLE — a key idea whose core argument is "your brand lags your product and that gap quietly costs you sales credibility," whose supporting points all restate that one cost, contains only ONE genuine angle. Return exactly 1; do not manufacture a second or third by rephrasing it.

ORIGINAL HERO ASSET (judge distinct angles against THIS rich source, not just the summary below):
"""
${heroContent}
"""

KEY IDEA:
- Pillar: ${keyIdea.pillarLabel}
- Core argument: ${keyIdea.coreArgument}
- Supporting points:
${keyIdea.supportingPoints.map((p) => `  - ${p}`).join("\n")}

Return a JSON object with EXACTLY this shape:
{
  "angles": [
    {
      "label": "a short, plain 3-6 word DESCRIPTOR of the angle's single point, for navigating the cascade in the UI — NOT a hook or slogan. No formulas like 'Stop X, Start Y' or 'The secret to...'. e.g. 'Lead with outcomes, not features', 'The 10-second buyer test', 'Clarity as differentiation'",
      "point": "the single sharp point this post will make, 1-2 sentences"
    }
  ]
}

${JSON_ONLY_INSTRUCTION}`;

  const { system, user } = await assemblePrompt(
    projectSlug,
    ["brand-voice-guide", channelDef.playbookDoc],
    taskPrompt,
    systemIntro,
  );

  const raw = await callClaude({
    system,
    user,
    label: `channel-adapter:decompose:${channelDef.id}`,
  });

  const parsed = parseJsonResponse<{
    angles?: Array<{ label?: unknown; point?: unknown }>;
  }>(raw, `channel-adapter:decompose:${channelDef.id}`);

  const rawAngles = Array.isArray(parsed.angles) ? parsed.angles : [];
  const angles: AngleSpec[] = rawAngles
    .map((a) => ({
      label: typeof a.label === "string" ? a.label.trim() : "",
      point: typeof a.point === "string" ? a.point.trim() : "",
    }))
    .filter((a) => a.point.length > 0)
    .slice(0, 3); // Hard cap at 3, even if the model returned more.

  // Safety net: if the model returns nothing usable, treat the whole key idea
  // as a single un-labeled angle so we still produce one post (the legacy,
  // pre-decomposition behaviour).
  if (angles.length === 0) {
    return [{ label: "", point: keyIdea.coreArgument }];
  }
  return angles;
}

/**
 * STEP 2 — write one focused post for ONE angle of the key idea.
 *
 * Called once per angle by `generateChannelPosts`. Runs in parallel for every
 * angle the decomposition produced.
 */
async function writeAnglePost(
  keyIdea: KeyIdea,
  channelDef: ChannelDefinition,
  angle: AngleSpec,
  otherAngles: AngleSpec[],
  heroContent: string,
  projectSlug: string,
): Promise<ChannelContent> {
  const isCarousel = channelDef.id === "instagram-carousel";

  const systemIntro = `You are an expert social media content writer for ${BRAND_NAME}. Your task is to take ONE angle of a key idea and write a ready-to-publish ${channelDef.label}. Follow the format, tone, structure, and examples in the channel playbook EXACTLY. The output must be something the team can copy, paste, and publish with minimal editing.`;

  const taskPrompt = `Create a ${channelDef.label} (${channelDef.format}) that focuses on ONE angle of the key idea below.

ANGLE FOCUS (this is what the post is about):
- Label: ${angle.label || "(no label provided)"}
- Point: ${angle.point}

${otherAngles.length > 0 ? `OTHER ANGLES (each is being written as its OWN separate post — do NOT cover or overlap any of these):
${otherAngles.map((a) => `  - ${a.label || a.point}`).join("\n")}
` : ""}
KEY IDEA (background context only — do NOT try to cover it all):
- Pillar: ${keyIdea.pillarLabel}
- Core argument: ${keyIdea.coreArgument}
- Supporting points:
${keyIdea.supportingPoints.map((p) => `  - ${p}`).join("\n")}

ORIGINAL HERO CONTENT (for reference only — do not copy verbatim):
"""
${heroContent}
"""

IMPORTANT: This post must cover ONLY the angle above. Do NOT cover the rest of the key idea, and do NOT touch the OTHER ANGLES listed — those are separate posts. If two posts would share the same hook, opening line, or supporting point, this one is wrong. Make this post unmistakably distinct from the others.

Write the ${channelDef.format} now, following the playbook precisely.

Return a JSON object with EXACTLY these fields:
{
  "content": "the full, ready-to-publish content (use \\n for line breaks; for a carousel, label each slide)",
  "hookLine": "the single opening hook line of the content",
  "cta": "the call-to-action at the end of the content",
  "estimatedLength": "a short size estimate, e.g. '1,200 characters' for a post or '7 slides' for a carousel"${isCarousel ? `,
  "caption": "the Instagram caption that hooks the reader into the carousel — the text posted alongside the slides, NOT the slide text itself"` : ""}
}${isCarousel ? `

IMPORTANT: For this Instagram Carousel, the "content" field MUST contain ONLY the labeled slides. The caption MUST go in the separate "caption" field above and MUST NOT also appear inside "content".

BRIEF MINDSET: The output is a BRIEF for a design agency, not finished slide copy. The design team will turn each slide into the actual visual — font, size, layout, imagery. Your job per slide is the MINIMUM CONTENT that still carries the full value (the single point that slide must make). More words from us means less room for them. Strip throat-clearing, qualifiers, and set-up. Glanceable, not readable.

WORD BUDGETS PER SLIDE (hard limits — never exceed):
- Cover: max 10 words. One line, the whole hook.
- Prose slides (Tension, Synthesis, Make It Concrete, any body slide): max 25 words. Two or three short sentences at most.
- List / Reframe slides: intro max 8 words, then max 3 items, each a phrase of max 7 words. Items are PHRASES, never full sentences with their own explanation.
- Proof: max 30 words. One number/result, one consequence.
- CTA: max 25 words including the question.
If a point genuinely cannot fit its budget without losing value, SPLIT it into two slides — never overflow a single slide.` : ""}

${JSON_ONLY_INSTRUCTION}`;

  const { system, user } = await assemblePrompt(
    projectSlug,
    ["brand-voice-guide", channelDef.playbookDoc],
    taskPrompt,
    systemIntro,
  );

  const raw = await callClaude({
    system,
    user,
    label: `channel-adapter:write:${channelDef.id}`,
  });

  const parsed = parseJsonResponse<{
    content?: string;
    hookLine?: string;
    cta?: string;
    estimatedLength?: string;
    caption?: string;
  }>(raw, `channel-adapter:write:${channelDef.id}`);

  return {
    id: randomUUID(),
    keyIdeaId: keyIdea.id,
    channel: channelDef.id,
    channelLabel: channelDef.label,
    platform: channelDef.platform,
    format: channelDef.format,
    content: parsed.content ?? "",
    hookLine: parsed.hookLine ?? "",
    cta: parsed.cta ?? "",
    estimatedLength: parsed.estimatedLength ?? "",
    // Set angle only when there is actually a label, so the safety-net case
    // (decomposition produced nothing) leaves it undefined.
    ...(angle.label ? { angle: angle.label } : {}),
    // Caption is set ONLY for the Instagram Carousel; left undefined elsewhere
    // so non-carousel channels remain entirely unaffected.
    ...(isCarousel ? { caption: parsed.caption ?? "" } : {}),
  };
}

/**
 * Public entry point. For one (key idea × channel), decompose into 1–3 angles
 * and write one focused post per angle in parallel. Returns the array of posts.
 *
 * Replaces the previous one-in-one-out adapter implementation. A tight idea
 * still yields exactly one post (backward-compatible).
 */
export async function generateChannelPosts(
  input: ChannelAdapterInput,
  projectSlug: string = DEFAULT_PROJECT_SLUG,
): Promise<ChannelContent[]> {
  const { keyIdea, channel, heroContent } = input;

  const channelDef = getChannel(channel);
  if (!channelDef) {
    throw new Error(`Unknown channel "${channel}".`);
  }

  // 1. Decomposition (1 Claude call).
  const angles = await decomposeAngles(keyIdea, channelDef, heroContent, projectSlug);

  // 2. Write each angle in parallel (N Claude calls).
  const posts = await Promise.all(
    angles.map((angle, i) =>
      writeAnglePost(
        keyIdea,
        channelDef,
        angle,
        angles.filter((_, j) => j !== i),
        heroContent,
        projectSlug,
      ),
    ),
  );

  return posts;
}
