/**
 * src/app/api/pipeline/extract-key-ideas/route.ts
 * -----------------------------------------------------------------------------
 * PIPELINE STEP 2 (server endpoint).
 *
 * Receives the blog post + the analysis from step 1, runs the Key Idea
 * Extractor agent, and returns 4 key ideas (one per content pillar).
 * URL: `/api/pipeline/extract-key-ideas`.
 */

import { NextResponse } from "next/server";
import { extractKeyIdeas } from "@/agents/key-idea-extractor";
import { DEFAULT_PROJECT_SLUG } from "@/lib/knowledge-base";
import type { KeyIdeaExtractorInput } from "@/agents/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<KeyIdeaExtractorInput> & {
      projectSlug?: string;
    };

    if (!body.heroContent || !body.heroAnalysis) {
      return NextResponse.json(
        { error: "Missing the blog post or its analysis. Please redo step 1." },
        { status: 400 },
      );
    }

    const result = await extractKeyIdeas(
      {
        heroContent: body.heroContent,
        heroAnalysis: body.heroAnalysis,
      },
      body.projectSlug ?? DEFAULT_PROJECT_SLUG,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("[api/extract-key-ideas] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
