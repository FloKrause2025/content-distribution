/**
 * src/lib/knowledge-base.ts
 * -----------------------------------------------------------------------------
 * The "knowledge base" is a folder of markdown (.md) files per project that
 * gives the AI its context: the brand voice guide and the channel playbooks.
 *
 * This module is the ONLY place that reads and writes those files on disk. It
 * runs on the SERVER only (it uses Node's file system). Keeping all file access
 * here means the rest of the app doesn't need to know where files live.
 *
 * Files live in:  src/data/projects/<project-slug>/<name>.md
 *
 * IMPORTANT NOTE ON HOSTING: writing files works perfectly when you run the app
 * on your own computer (`npm run dev`). On Vercel the file system is read-only,
 * so edits/uploads/deletes won't persist there. For the MVP that's expected —
 * see the "Known limitations" section of the README.
 */

import fs from "fs/promises";
import path from "path";
import type { KnowledgeBaseDoc } from "@/agents/types";

/** The default (and currently only) project. Built to support more later. */
export const DEFAULT_PROJECT_SLUG = "serious-business";

/** Returns the absolute folder path for a given project's knowledge base. */
function projectDir(projectSlug: string): string {
  // process.cwd() is the project root (where package.json lives).
  return path.join(process.cwd(), "src", "data", "projects", projectSlug);
}

/**
 * Safety check: turns a requested filename into a safe one and makes sure it
 * can't "escape" the project folder (e.g. via "../../etc/passwd"). This prevents
 * a class of security bugs called "path traversal".
 */
function safeMarkdownName(filename: string): string {
  // Keep only the final path segment (drops any directory parts).
  const base = path.basename(filename);
  if (!base.endsWith(".md")) {
    throw new Error("Only markdown (.md) files are allowed.");
  }
  if (base.includes("..")) {
    throw new Error("Invalid filename.");
  }
  return base;
}

/**
 * Works out a friendly category tag from the filename so the UI can group docs.
 * - filenames containing "voice"   -> "Brand Voice"
 * - filenames containing "playbook" -> "Channel Playbook"
 * - anything else                  -> "Other"
 */
function categoryFromName(filename: string): KnowledgeBaseDoc["category"] {
  const lower = filename.toLowerCase();
  if (lower.includes("voice") || lower.includes("brand")) return "Brand Voice";
  if (lower.includes("playbook")) return "Channel Playbook";
  return "Other";
}

/** Lists all markdown docs in a project, with metadata, sorted by filename. */
export async function listDocs(
  projectSlug: string,
): Promise<KnowledgeBaseDoc[]> {
  const dir = projectDir(projectSlug);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    // Folder doesn't exist yet — treat as empty knowledge base.
    return [];
  }

  const docs: KnowledgeBaseDoc[] = [];
  for (const entry of entries) {
    if (!entry.endsWith(".md")) continue;
    const stat = await fs.stat(path.join(dir, entry));
    docs.push({
      filename: entry,
      category: categoryFromName(entry),
      lastModified: stat.mtime.toISOString(),
      sizeBytes: stat.size,
    });
  }
  docs.sort((a, b) => a.filename.localeCompare(b.filename));
  return docs;
}

/** Reads the full text content of a single markdown doc. */
export async function readDoc(
  projectSlug: string,
  filename: string,
): Promise<string> {
  const safe = safeMarkdownName(filename);
  return fs.readFile(path.join(projectDir(projectSlug), safe), "utf-8");
}

/**
 * Reads a doc by its NAME WITHOUT the ".md" extension (used by prompt assembly,
 * which refers to docs as e.g. "brand-voice-guide"). Returns null if missing so
 * callers can decide how to handle an absent optional document.
 */
export async function readDocByBaseName(
  projectSlug: string,
  baseName: string,
): Promise<string | null> {
  try {
    return await readDoc(projectSlug, `${baseName}.md`);
  } catch {
    return null;
  }
}

/** Creates or overwrites a markdown doc with new content. */
export async function writeDoc(
  projectSlug: string,
  filename: string,
  content: string,
): Promise<void> {
  const safe = safeMarkdownName(filename);
  const dir = projectDir(projectSlug);
  await fs.mkdir(dir, { recursive: true }); // Make the folder if it's missing.
  await fs.writeFile(path.join(dir, safe), content, "utf-8");
}

/** Deletes a markdown doc. */
export async function deleteDoc(
  projectSlug: string,
  filename: string,
): Promise<void> {
  const safe = safeMarkdownName(filename);
  await fs.unlink(path.join(projectDir(projectSlug), safe));
}
