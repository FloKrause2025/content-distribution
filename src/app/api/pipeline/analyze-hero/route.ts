/**
 * src/app/api/pipeline/analyze-hero/route.ts
 * -----------------------------------------------------------------------------
 * PIPELINE STEP 1 (server endpoint).
 *
 * The browser sends the pasted blog post here. We run the Hero Analyzer agent
 * and send back the structured analysis. This is a Next.js "route handler" — a
 * small server function that responds to a POST request at the URL
 * `/api/pipeline/analyze-hero`.
 */

import { NextResponse } from "next/server";
import { analyzeHero } from "@/agents/hero-analyzer";
import { DEFAULT_PROJECT_SLUG } from "@/lib/knowledge-base";
import type { HeroAnalyzerInput } from "@/agents/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<HeroAnalyzerInput> & {
      projectSlug?: string;
    };

    // Basic validation: we need at least some blog content to analyse.
    if (!body.heroContent || body.heroContent.trim().length < 20) {
      return NextResponse.json(
        { error: "Please paste a blog post (at least a few sentences)." },
        { status: 400 },
      );
    }

    const analysis = await analyzeHero(
      {
        heroContent: body.heroContent,
        title: body.title,
        targetAudience: body.targetAudience,
      },
      body.projectSlug ?? DEFAULT_PROJECT_SLUG,
    );

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("[api/analyze-hero] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 },
    );
  }
}
