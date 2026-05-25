/**
 * src/lib/anthropic.ts
 * -----------------------------------------------------------------------------
 * This is our single "wrapper" around the Anthropic (Claude) API. Every AI call
 * in the app goes through the `callClaude` function here. Centralising it means:
 *   - The model name, token limit, and temperature live in ONE place.
 *   - Retry logic and error handling are written once and reused everywhere.
 *   - Token usage is logged consistently so you can keep an eye on cost.
 *
 * This file runs on the SERVER only (inside our API routes). It reads the secret
 * API key from the environment, which is never exposed to the browser.
 */

import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// CONFIGURATION — change these values to tune the AI's behaviour.
// ---------------------------------------------------------------------------

/** The Claude model used for every agent. */
export const MODEL = "claude-sonnet-4-20250514";

/** Maximum length of the AI's response, measured in tokens (~4 chars each). */
const MAX_TOKENS = 4096;

/**
 * "Temperature" controls creativity. 0 = very predictable, 1 = very creative.
 * 0.7 gives us creative-but-controlled marketing copy.
 */
const TEMPERATURE = 0.7;

// ---------------------------------------------------------------------------
// CLIENT SETUP
// ---------------------------------------------------------------------------

// We create the Anthropic client lazily (only when first needed) so that the
// app can still build and start even if the API key has not been added yet.
let client: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing ANTHROPIC_API_KEY. Create a `.env.local` file (copy it from " +
        "`.env.example`) and paste your Anthropic API key into it, then restart " +
        "the dev server.",
    );
  }
  if (!client) {
    client = new Anthropic({ apiKey });
  }
  return client;
}

// ---------------------------------------------------------------------------
// THE MAIN HELPER
// ---------------------------------------------------------------------------

export interface ClaudeCallOptions {
  /** The system prompt: stable context/instructions (brand voice, playbooks). */
  system: string;
  /** The user prompt: the specific task for this call. */
  user: string;
  /** A short label used in console logs, e.g. "hero-analyzer". */
  label: string;
}

/**
 * Sends one request to Claude and returns the raw text of the response.
 *
 * It automatically retries ONCE if the first attempt fails (network blips and
 * transient API errors are common), and logs token usage to the console so you
 * can monitor cost while testing.
 */
export async function callClaude(options: ClaudeCallOptions): Promise<string> {
  const { system, user, label } = options;
  const anthropic = getClient();

  // We try up to 2 times total (1 initial attempt + 1 retry).
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        system,
        messages: [{ role: "user", content: user }],
      });

      // Log token usage so the developer/operator can track cost during testing.
      const usage = response.usage;
      console.log(
        `[Claude:${label}] input=${usage.input_tokens} tokens, ` +
          `output=${usage.output_tokens} tokens (attempt ${attempt})`,
      );

      // The response content is an array of "blocks". For our text-only prompts
      // we expect a single text block — we join any text blocks together.
      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) {
        throw new Error("Claude returned an empty response.");
      }
      return text;
    } catch (error) {
      lastError = error;
      console.error(
        `[Claude:${label}] attempt ${attempt} failed:`,
        error instanceof Error ? error.message : error,
      );
      // If this was the first attempt, wait a moment and try once more.
      if (attempt === 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Both attempts failed — throw a clear, user-friendly error.
  throw new Error(
    `The AI request (${label}) failed after retrying. ` +
      (lastError instanceof Error ? lastError.message : "Unknown error."),
  );
}

// ---------------------------------------------------------------------------
// JSON PARSING HELPER
// ---------------------------------------------------------------------------

/**
 * Our agents ask Claude to return JSON. Occasionally the model wraps that JSON
 * in markdown code fences (```json ... ```), or adds a sentence before it. This
 * helper strips that wrapping and safely parses the JSON, throwing a clear error
 * if parsing fails.
 */
export function parseJsonResponse<T>(raw: string, label: string): T {
  let cleaned = raw.trim();

  // Remove a leading ```json or ``` fence and the trailing ``` fence, if present.
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, "").replace(/\s*```$/, "");
  }

  // As a last resort, grab the first {...} block in case extra prose snuck in.
  if (!cleaned.startsWith("{") && !cleaned.startsWith("[")) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    console.error(`[Claude:${label}] failed to parse JSON. Raw response:\n`, raw);
    throw new Error(
      `The AI (${label}) returned a response we couldn't read. Please try again.`,
    );
  }
}
