/**
 * src/components/knowledge-base/DocEditor.tsx
 * -----------------------------------------------------------------------------
 * A simple markdown editor for one knowledge-base document. For the MVP this is
 * just a large textarea (no fancy preview) — exactly what's needed to edit the
 * brand voice guide and channel playbooks.
 *
 * The parent page owns the data and handles the actual saving/deleting; this
 * component reports changes and button clicks back up via callbacks.
 */
"use client";

import { Button } from "@/components/ui/Button";
import { TextArea } from "@/components/ui/TextArea";

interface DocEditorProps {
  filename: string;
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  /** True if there are unsaved changes (used to label/enable the Save button). */
  dirty: boolean;
}

export function DocEditor({
  filename,
  content,
  onChange,
  onSave,
  onDelete,
  saving,
  dirty,
}: DocEditorProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm font-semibold text-gray-900">
          {filename}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={onDelete}
            className="text-red-600 hover:bg-red-50"
          >
            Delete
          </Button>
          <Button onClick={onSave} loading={saving} disabled={!dirty || saving}>
            {dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <TextArea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        rows={24}
        className="font-mono text-xs leading-relaxed"
      />
    </div>
  );
}
