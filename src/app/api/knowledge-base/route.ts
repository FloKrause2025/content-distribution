/**
 * src/app/api/knowledge-base/route.ts
 * -----------------------------------------------------------------------------
 * The server endpoints for managing knowledge-base documents (the markdown
 * files that give the AI its context). One file handles all four operations:
 *
 *   GET    /api/knowledge-base                  -> list all docs (metadata)
 *   GET    /api/knowledge-base?filename=x.md    -> read one doc's full content
 *   POST   /api/knowledge-base                  -> create/upload a new doc
 *   PUT    /api/knowledge-base                  -> save edits to an existing doc
 *   DELETE /api/knowledge-base?filename=x.md    -> delete a doc
 *
 * All read/write happens through src/lib/knowledge-base.ts.
 */

import { NextResponse } from "next/server";
import {
  DEFAULT_PROJECT_SLUG,
  deleteDoc,
  listDocs,
  readDoc,
  writeDoc,
} from "@/lib/knowledge-base";

// Knowledge-base files are read at request time, so this route must not be
// statically cached.
export const dynamic = "force-dynamic";

/** Resolve the project slug from the query string (defaults to the one project). */
function projectFrom(request: Request): string {
  const url = new URL(request.url);
  return url.searchParams.get("project") ?? DEFAULT_PROJECT_SLUG;
}

// ----------------------------- GET ---------------------------------------
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");
    const project = projectFrom(request);

    if (filename) {
      // Return the full content of one document.
      const content = await readDoc(project, filename);
      return NextResponse.json({ filename, content });
    }

    // Otherwise return the list of all documents with metadata.
    const docs = await listDocs(project);
    return NextResponse.json({ docs });
  } catch (error) {
    console.error("[api/knowledge-base GET] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not read documents." },
      { status: 500 },
    );
  }
}

// ----------------------------- POST (create) ------------------------------
export async function POST(request: Request) {
  try {
    const project = projectFrom(request);
    const body = (await request.json()) as {
      filename?: string;
      content?: string;
    };

    if (!body.filename) {
      return NextResponse.json({ error: "A filename is required." }, { status: 400 });
    }

    // Make sure the file ends in .md so it is treated as a markdown doc.
    const filename = body.filename.endsWith(".md")
      ? body.filename
      : `${body.filename}.md`;

    await writeDoc(project, filename, body.content ?? "");
    return NextResponse.json({ ok: true, filename });
  } catch (error) {
    console.error("[api/knowledge-base POST] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the document." },
      { status: 500 },
    );
  }
}

// ----------------------------- PUT (update) -------------------------------
export async function PUT(request: Request) {
  try {
    const project = projectFrom(request);
    const body = (await request.json()) as {
      filename?: string;
      content?: string;
    };

    if (!body.filename) {
      return NextResponse.json({ error: "A filename is required." }, { status: 400 });
    }

    await writeDoc(project, body.filename, body.content ?? "");
    return NextResponse.json({ ok: true, filename: body.filename });
  } catch (error) {
    console.error("[api/knowledge-base PUT] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save the document." },
      { status: 500 },
    );
  }
}

// ----------------------------- DELETE -------------------------------------
export async function DELETE(request: Request) {
  try {
    const project = projectFrom(request);
    const url = new URL(request.url);
    const filename = url.searchParams.get("filename");

    if (!filename) {
      return NextResponse.json({ error: "A filename is required." }, { status: 400 });
    }

    await deleteDoc(project, filename);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/knowledge-base DELETE] error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not delete the document." },
      { status: 500 },
    );
  }
}
