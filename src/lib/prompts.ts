/**
 * src/lib/prompts.ts
 * -----------------------------------------------------------------------------
 * This module builds the prompts we send to Claude. It keeps prompt
 * construction in ONE place so that:
 *   - The knowledge-base documents (brand voice, playbooks) are injected
 *     consistently for every agent.
 *   - The "system" context (stable instructions + knowledge base) is kept
 *     separate from the "user" message (the specific task for this call).
 *
 * Runs on the SERVER only (it reads files from disk via the knowledge-base lib).
 */

import { readDocByBaseName } from "@/lib/knowledge-base";

/** The brand/agency name injected into prompts. Change here to rebrand. */
export const BRAND_NAME = "Serious Business";

export interface AssembledPrompt {
  system: string;
  user: string;
}

/**
 * Assembles a system + user prompt.
 *
 * @param projectSlug   Which project's knowledge base to read from.
 * @param requiredDocs  Knowledge-base doc base-names (no ".md") to inject as
 *                      context, e.g. ["brand-voice-guide", "playbook-instagram"].
 *                      Missing docs are skipped (with a console warning) so the
 *                      app keeps working even if a doc hasn't been added yet.
 * @param taskPrompt    The specific instruction for this agent (becomes `user`).
 * @param systemIntro   The leading instruction line(s) for the system prompt.
 */
export async function assemblePrompt(
  projectSlug: string,
  requiredDocs: string[],
  taskPrompt: string,
  systemIntro: string,
): Promise<AssembledPrompt> {
  // Read each requested document and format it as a clearly-labelled section.
  const sections: string[] = [];
  for (const docBaseName of requiredDocs) {
    const content = await readDocByBaseName(projectSlug, docBaseName);
    if (content === null) {
      console.warn(
        `[prompts] Knowledge-base doc "${docBaseName}.md" not found for ` +
          `project "${projectSlug}". Skipping it.`,
      );
      continue;
    }
    // A clear delimiter helps the model treat each doc as a distinct reference.
    sections.push(
      `===== BEGIN DOCUMENT: ${docBaseName} =====\n${content}\n===== END DOCUMENT: ${docBaseName} =====`,
    );
  }

  const knowledgeBlock =
    sections.length > 0
      ? sections.join("\n\n")
      : "(No knowledge-base documents were available for this request.)";

  const system = [
    systemIntro.trim(),
    "",
    "The following reference documents define the brand voice and channel " +
      "playbooks you MUST follow. Treat them as the source of truth:",
    "",
    knowledgeBlock,
  ].join("\n");

  return { system, user: taskPrompt.trim() };
}

/**
 * A reusable instruction we append to task prompts to make sure the model
 * returns clean JSON we can parse (no markdown fences, no commentary).
 */
export const JSON_ONLY_INSTRUCTION =
  "Respond with VALID JSON ONLY. Do not wrap it in markdown code fences and do " +
  "not add any text before or after the JSON object.";
