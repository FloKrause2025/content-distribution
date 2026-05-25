/**
 * src/components/ui/TextArea.tsx
 * -----------------------------------------------------------------------------
 * A reusable multi-line text input, with an optional label above it. Used for
 * pasting the blog post and for editing text throughout the app.
 */
"use client";

import type { TextareaHTMLAttributes } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function TextArea({ label, className = "", id, ...rest }: TextAreaProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
        {...rest}
      />
    </div>
  );
}
