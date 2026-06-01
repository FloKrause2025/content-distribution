/**
 * src/agents/channel-adapter.ts
 * -----------------------------------------------------------------------------
 * AGENT 3 of 3 — the "Channel Content Adapter".
 *
 * Its job: take ONE key idea and produce ready-to-publish content for ONE
 * channel (e.g. a LinkedIn founder post, or an Instagram carousel). It injects
 * that channel's playbook so the output follows the right format and tone.
 *
 * This agent is called many times — once for every (key idea × selected
 * channel) combination chosen by the user in step 2.
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
} from "@/agents/types";

export async function generateChannelContent(
  input: ChannelAdapterInput,
  projectSlug: string = DEFAULT_PROJECT_SLUG,
): Promise<ChannelContent> {
  const { keyIdea, channel, heroContent } = input;

  // Look up the channel definition so we know its playbook, format, etc.
  const channelDef = getChannel(channel);
  if (!channelDef) {
    throw new Error(`Unknown channel "${channel}".`);
  }

  // Instagram Carousels get a dedicated `caption` field in the JSON output (the
  // text posted alongside the slides). Every other channel is unaffected.
  const isCarousel = channelDef.id === "instagram-carousel";

  const systemIntro = `You are an expert social media content writer for ${BRAND_NAME}. Your task is to take a single key idea and write a ready-to-publish ${channelDef.label}. Follow the format, tone, structure, and examples in the channel playbook EXACTLY. The output must be something the team can copy, paste, and publish with minimal editing.`;

  const taskPrompt = `Create a ${channelDef.label} (${channelDef.format}) from the key idea below.

KEY IDEA:
- Pillar: ${keyIdea.pillarLabel}
- Core argument: ${keyIdea.coreArgument}
- Supporting points:
${keyIdea.supportingPoints.map((p) => `  - ${p}`).join("\n")}

ORIGINAL HERO CONTENT (for reference only — do not copy verbatim):
"""
${heroContent}
"""

Write the ${channelDef.format} now, following the playbook precisely.

Return a JSON object with EXACTLY these fields:
{
  "content": "the full, ready-to-publish content (use \\n for line breaks; for a carousel, label each slide)",
  "hookLine": "the single opening hook line of the content",
  "cta": "the call-to-action at the end of the content",
  "estimatedLength": "a short size estimate, e.g. '1,200 characters' for a post or '7 slides' for a carousel"${isCarousel ? `,
  "caption": "the Instagram caption that hooks the reader into the carousel — the text posted alongside the slides, NOT the slide text itself"` : ""}
}${isCarousel ? `

IMPORTANT: For this Instagram Carousel, the "content" field MUST contain ONLY the labeled slides. The caption MUST go in the separate "caption" field above and MUST NOT also appear inside "content".` : ""}

${JSON_ONLY_INSTRUCTION}`;

  // Inject the brand voice guide PLUS this channel's specific playbook.
  const { system, user } = await assemblePrompt(
    projectSlug,
    ["brand-voice-guide", channelDef.playbookDoc],
    taskPrompt,
    systemIntro,
  );

  const raw = await callClaude({
    system,
    user,
    label: `channel-adapter:${channel}`,
  });
  const parsed = parseJsonResponse<{
    content?: string;
    hookLine?: string;
    cta?: string;
    estimatedLength?: string;
    caption?: string;
  }>(raw, `channel-adapter:${channel}`);

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
    // Caption is set ONLY for the Instagram Carousel; left undefined elsewhere
    // so non-carousel channels remain entirely unaffected.
    ...(isCarousel ? { caption: parsed.caption ?? "" } : {}),
  };
}
