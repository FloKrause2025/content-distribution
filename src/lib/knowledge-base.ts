/**
 * src/lib/knowledge-base.ts
 * -----------------------------------------------------------------------------
 * The "knowledge base" is the set of markdown (.md) documents per project that
 * give the AI its context: the brand voice guide, the cascade framework, and the
 * channel playbooks. This module is the ONLY place that reads and writes them.
 *
 * STORAGE — this module works in TWO modes automatically:
 *
 *   1. VERCEL BLOB (production).  When the environment variable
 *      BLOB_READ_WRITE_TOKEN is present (it appears automatically once you
 *      create a Blob store and connect it to the Vercel project), documents are
 *      read from and written to Vercel Blob. This means edits made in the app's
 *      Knowledge Base page PERSIST. On first use, the bundled starter docs (the
 *      .md files shipped in this repo) are copied into Blob once as a seed.
 *
 *   2. LOCAL FILE SYSTEM (development).  When there is no Blob token (e.g. when
 *      you run `npm run dev` on your own computer), documents are read from and
 *      written to the files in src/data/projects/<slug>/ — exactly as before.
 *
 * The rest of the app doesn't need to know which mode is active; the function
 * signatures below are identical in both.
 */

import fs from "fs/promises";
import path from "path";
import { list, put, del } from "@vercel/blob";
import type { KnowledgeBaseDoc } from "@/agents/types";

/** The default (and currently only) project. Built to support more later. */
export const DEFAULT_PROJECT_SLUG = "serious-business";

// ---------------------------------------------------------------------------
// MODE DETECTION + SHARED HELPERS
// ---------------------------------------------------------------------------

/** True when persistent Blob storage is configured (i.e. on Vercel). */
function blobEnabled(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/** Absolute folder path for a project's bundled (starter) docs. */
function projectDir(projectSlug: string): string {
  return path.join(process.cwd(), "src", "data", "projects", projectSlug);
}

/**
 * Turns a requested filename into a safe one and makes sure it can't "escape"
 * the project folder (prevents path-traversal bugs like "../../etc/passwd").
 */
function safeMarkdownName(filename: string): string {
  const base = path.basename(filename);
  if (!base.endsWith(".md")) {
    throw new Error("Only markdown (.md) files are allowed.");
  }
  if (base.includes("..")) {
    throw new Error("Invalid filename.");
  }
  return base;
}

/** Friendly category tag derived from the filename, used to group docs in the UI. */
function categoryFromName(filename: string): KnowledgeBaseDoc["category"] {
  const lower = filename.toLowerCase();
  if (lower.includes("voice") || lower.includes("brand")) return "Brand Voice";
  if (lower.includes("playbook")) return "Channel Playbook";
  return "Other";
}

/** Lists the bundled starter .md filenames shipped in the repo for a project. */
async function listBundledFilenames(projectSlug: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(projectDir(projectSlug));
    return entries.filter((e) => e.endsWith(".md"));
  } catch {
    return [];
  }
}

/** Reads a bundled starter doc from disk, or null if it isn't shipped. */
async function readBundled(
  projectSlug: string,
  filename: string,
): Promise<string | null> {
  try {
    return await fs.readFile(path.join(projectDir(projectSlug), filename), "utf-8");
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// BLOB HELPERS (only used when blobEnabled() is true)
// ---------------------------------------------------------------------------

/** Blob "folder" prefix for a project, e.g. "kb/serious-business/". */
function blobPrefix(projectSlug: string): string {
  return `kb/${projectSlug}/`;
}

/** Full Blob path for one document. */
function blobPath(projectSlug: string, filename: string): string {
  return `${blobPrefix(projectSlug)}${filename}`;
}

/** Marker stored in Blob to record that a project's starter docs were seeded. */
const SEED_MARKER = ".seeded";

/** Per-instance memory so we only check/seed once per warm serverless instance. */
const seededProjects = new Set<string>();

/** Options applied to every Blob write so paths are stable and reads are fresh. */
const PUT_OPTS = {
  access: "public" as const,
  addRandomSuffix: false, // keep a stable, predictable path so overwrites work
  allowOverwrite: true, // saving a doc replaces the previous version
  cacheControlMaxAge: 0, // don't CDN-cache, so edits show up immediately
};

/**
 * On first use for a project, copies the bundled starter docs into Blob so the
 * app has working content immediately. After that, Blob is the source of truth.
 */
async function ensureSeeded(projectSlug: string): Promise<void> {
  if (!blobEnabled() || seededProjects.has(projectSlug)) return;

  const { blobs } = await list({ prefix: blobPrefix(projectSlug) });
  const alreadySeeded = blobs.some(
    (b) => b.pathname === blobPath(projectSlug, SEED_MARKER),
  );

  if (!alreadySeeded) {
    const names = await listBundledFilenames(projectSlug);
    for (const name of names) {
      const content = await readBundled(projectSlug, name);
      if (content !== null) {
        await put(blobPath(projectSlug, name), content, {
          ...PUT_OPTS,
          contentType: "text/markdown",
        });
      }
    }
    await put(blobPath(projectSlug, SEED_MARKER), new Date().toISOString(), {
      ...PUT_OPTS,
      contentType: "text/plain",
    });
  }
  seededProjects.add(projectSlug);
}

/** Finds one Blob by its exact path, or null if it doesn't exist. */
async function findBlob(projectSlug: string, filename: string) {
  const target = blobPath(projectSlug, filename);
  const { blobs } = await list({ prefix: target });
  return blobs.find((b) => b.pathname === target) ?? null;
}

// ---------------------------------------------------------------------------
// PUBLIC API (identical signatures in both storage modes)
// ---------------------------------------------------------------------------

/** Lists all markdown docs in a project, with metadata, sorted by filename. */
export async function listDocs(
  projectSlug: string,
): Promise<KnowledgeBaseDoc[]> {
  if (blobEnabled()) {
    await ensureSeeded(projectSlug);
    const { blobs } = await list({ prefix: blobPrefix(projectSlug) });
    const docs = blobs
      .filter((b) => b.pathname.endsWith(".md"))
      .map((b) => ({
        filename: b.pathname.slice(blobPrefix(projectSlug).length),
        category: categoryFromName(b.pathname),
        lastModified: new Date(b.uploadedAt).toISOString(),
        sizeBytes: b.size,
      }));
    docs.sort((a, b) => a.filename.localeCompare(b.filename));
    return docs;
  }

  // File-system mode.
  const dir = projectDir(projectSlug);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
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

  if (blobEnabled()) {
    await ensureSeeded(projectSlug);
    const blob = await findBlob(projectSlug, safe);
    if (!blob) throw new Error(`Document "${safe}" was not found.`);
    // `no-store` + the cacheControlMaxAge:0 on write keep reads fresh after edits.
    const res = await fetch(blob.url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Could not read "${safe}".`);
    return res.text();
  }

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

  if (blobEnabled()) {
    await ensureSeeded(projectSlug);
    await put(blobPath(projectSlug, safe), content, {
      ...PUT_OPTS,
      contentType: "text/markdown",
    });
    return;
  }

  const dir = projectDir(projectSlug);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, safe), content, "utf-8");
}

/** Deletes a markdown doc. */
export async function deleteDoc(
  projectSlug: string,
  filename: string,
): Promise<void> {
  const safe = safeMarkdownName(filename);

  if (blobEnabled()) {
    await ensureSeeded(projectSlug);
    const blob = await findBlob(projectSlug, safe);
    if (blob) await del(blob.url);
    return;
  }

  await fs.unlink(path.join(projectDir(projectSlug), safe));
}
