/**
 * src/components/knowledge-base/DocUploader.tsx
 * -----------------------------------------------------------------------------
 * Lets the user add a new markdown (.md) file to the knowledge base, either by
 * dragging a file onto the dashed box or by clicking to pick a file. It reads
 * the file's text in the browser and hands it to the parent via `onUpload`.
 */
"use client";

import { useRef, useState } from "react";

interface DocUploaderProps {
  /** Called with the chosen file's name and text content. */
  onUpload: (filename: string, content: string) => void;
}

export function DocUploader({ onUpload }: DocUploaderProps) {
  // `dragging` styles the box while a file is hovering over it.
  const [dragging, setDragging] = useState(false);
  // A hidden <input type=file> we trigger when the box is clicked.
  const inputRef = useRef<HTMLInputElement>(null);

  // Read a single .md file as text and pass it up.
  async function handleFile(file: File) {
    if (!file.name.endsWith(".md")) {
      alert("Please choose a markdown file (.md).");
      return;
    }
    const text = await file.text();
    onUpload(file.name, text);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center text-sm transition-colors ${
        dragging
          ? "border-accent bg-accent-light text-accent"
          : "border-gray-300 text-gray-500 hover:border-accent hover:bg-gray-50"
      }`}
    >
      <span className="font-medium">Drop a .md file here, or click to browse</span>
      <span className="mt-1 text-xs text-gray-400">
        Markdown files only. Existing files with the same name are overwritten.
      </span>
      <input
        ref={inputRef}
        type="file"
        accept=".md"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          // Reset so picking the same file again still fires onChange.
          e.target.value = "";
        }}
      />
    </div>
  );
}
