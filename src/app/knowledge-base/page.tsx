/**
 * src/app/knowledge-base/page.tsx
 * -----------------------------------------------------------------------------
 * THE KNOWLEDGE BASE PAGE (URL "/knowledge-base").
 *
 * This is where the user manages the AI's context documents — the brand voice
 * guide and the channel playbooks. They can list, open, edit, save, upload, and
 * delete markdown files. Everything talks to /api/knowledge-base.
 *
 * It's a "client component" because it's interactive and loads data in the
 * browser. If editing/uploading doesn't persist after a refresh, you're likely
 * running on Vercel (read-only file system) — see the README "Known limitations".
 */
"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DocEditor } from "@/components/knowledge-base/DocEditor";
import { DocUploader } from "@/components/knowledge-base/DocUploader";
import type { KnowledgeBaseDoc } from "@/agents/types";

// Format a byte count into something human-readable (e.g. "2.4 KB").
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// Format an ISO date string into a short local date.
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Pick a badge colour based on the document's category.
function categoryTone(category: KnowledgeBaseDoc["category"]) {
  if (category === "Brand Voice") return "indigo" as const;
  if (category === "Channel Playbook") return "blue" as const;
  return "gray" as const;
}

export default function KnowledgeBasePage() {
  const [docs, setDocs] = useState<KnowledgeBaseDoc[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState(""); // To detect edits.
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDoc, setLoadingDoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load the list of documents when the page first opens.
  useEffect(() => {
    refreshList();
  }, []);

  async function refreshList() {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge-base");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load documents.");
      setDocs(data.docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load documents.");
    } finally {
      setLoadingList(false);
    }
  }

  // Open one document in the editor.
  async function openDoc(filename: string) {
    setLoadingDoc(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/knowledge-base?filename=${encodeURIComponent(filename)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open the document.");
      setSelected(filename);
      setContent(data.content);
      setSavedContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the document.");
    } finally {
      setLoadingDoc(false);
    }
  }

  // Save edits to the currently open document.
  async function saveDoc() {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/knowledge-base", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: selected, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not save.");
      setSavedContent(content);
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  // Delete the currently open document (after a confirmation prompt).
  async function deleteDoc() {
    if (!selected) return;
    if (!confirm(`Delete "${selected}"? This cannot be undone.`)) return;
    setError(null);
    try {
      const res = await fetch(
        `/api/knowledge-base?filename=${encodeURIComponent(selected)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete.");
      setSelected(null);
      setContent("");
      setSavedContent("");
      await refreshList();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete.");
    }
  }

  // Upload (create) a new document, then open it.
  async function uploadDoc(filename: string, fileContent: string) {
    setError(null);
    try {
      const res = await fetch("/api/knowledge-base", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename, content: fileContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not upload.");
      await refreshList();
      await openDoc(data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload.");
    }
  }

  const dirty = content !== savedContent;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        <p className="mt-1 text-sm text-gray-600">
          These documents are injected into every AI prompt. Editing them changes
          the voice and format of all generated content.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT: document list + uploader */}
        <div className="space-y-4">
          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Documents
            </h2>
            {loadingList ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : docs.length === 0 ? (
              <p className="text-sm text-gray-400">
                No documents yet. Upload one below.
              </p>
            ) : (
              <ul className="space-y-2">
                {docs.map((doc) => (
                  <li key={doc.filename}>
                    <button
                      onClick={() => openDoc(doc.filename)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                        selected === doc.filename
                          ? "border-accent bg-accent-light"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-gray-800">
                          {doc.filename}
                        </span>
                        <Badge tone={categoryTone(doc.category)}>
                          {doc.category}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {formatSize(doc.sizeBytes)} · {formatDate(doc.lastModified)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Upload a document
            </h2>
            <DocUploader onUpload={uploadDoc} />
          </Card>
        </div>

        {/* RIGHT: editor */}
        <Card>
          {loadingDoc ? (
            <p className="text-sm text-gray-400">Opening…</p>
          ) : selected ? (
            <DocEditor
              filename={selected}
              content={content}
              onChange={setContent}
              onSave={saveDoc}
              onDelete={deleteDoc}
              saving={saving}
              dirty={dirty}
            />
          ) : (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center text-center text-sm text-gray-400">
              <p>Select a document on the left to view and edit it.</p>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={refreshList}
              >
                Refresh list
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
