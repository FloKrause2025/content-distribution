/**
 * src/components/ui/Button.tsx
 * -----------------------------------------------------------------------------
 * A reusable button. Using one Button component everywhere keeps the look
 * consistent. It supports three "variants" (primary/secondary/ghost) and an
 * optional loading state that shows a spinner and disables the button.
 */
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

// The Tailwind classes for each variant, kept in one place.
const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary:
    "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50",
  ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
};

export function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      // `disabled` is true if the caller disabled it OR if it's loading.
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {loading && (
        // A small spinner shown while `loading` is true.
        <span className="h-4 w-4 animate-spin-slow rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
