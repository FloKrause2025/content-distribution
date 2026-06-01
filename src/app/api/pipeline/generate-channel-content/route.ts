/**
 * src/app/api/pipeline/generate-channel-content/route.ts
 * -----------------------------------------------------------------------------
 * PIPELINE STEP 3 (server endpoint).
 *
 * Receives the approved key ideas (each with the channels the user selected)
 * plus the original blog post. For EVERY (key idea × selected channel) pair it
 * runs the Channel Adapter agent. All the calls run in parallel so the user
 * waits as little as possible. Returns the full list of generated content.
 * URL: `/api/pipeline/generate-channel-content`.
 */

import { NextResponse } from "next/server";
import { generateChannelPosts } from "@/agents/channel-adapter";
import { DEFAULT_PROJECT_SLUG } from "@/lib/knowledge-base";
import type { ChannelContent, KeyIdea } from "@/agents/types";

interface GenerateItem {
  keyIdea: KeyIdea;
  channels: string[];
}

interface GenerateRequest {
  heroContent: string;
  items: GenerateItem[];
  projectSlug?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<GenerateRequest>;

    if (!body.heroContent || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Nothing to generate. Approve at least one idea and channel." },
        { status: 400 },
      );
    }
    const projectSlug = body.projectSlug ?? DEFAULT_PROJECT_SLUG;
    const heroContent = body.heroContent;

    // Build one job per (idea × channel). Each job decomposes the key idea into
    // 1–3 angles and writes one focused post per angle, returning an array.
    const jobs: Array<Promise<ChannelContent[]>> = [];
    for (const item of body.items) {
      if (!item.keyIdea || !Array.isArray(item.channels)) continue;
      for (const channel of item.channels) {
        jobs.push(
          generateChannelPosts(
            { keyIdea: item.keyIdea, channel, heroContent },
            projectSlug,
          ),
        );
      }
    }

    if (jobs.length === 0) {
      return NextResponse.json(
        { error: "No channels were selected for the approved ideas." },
        { status: 400 },
      );
    }

    // Run every (idea × channel) job in parallel. `allSettled` means one
    // failing (idea × channel) doesn't sink the whole batch — we flatten the
    // arrays from the ones that succeeded and count failures at (idea × channel)
    // granularity (so partially-failed decompositions don't count as multiple).
    const settled = await Promise.allSettled(jobs);
    const content: ChannelContent[] = [];
    let failures = 0;
    for (const result of settled) {
      if (result.status === "fulfilled") {
        content.push(...result.value);
      } else {
        failures += 1;
        console.error("[api/generate-channel-content] a job failed:", result.reason);
      }
    }

    if (content.length === 0) {
      return NextResponse.json(
        { error: "All content generations failed. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ content, failures });
  } catch (error) {
    console.error("[api/generate-channel-content] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
