/**
 * src/components/ui/Badge.tsx
 * -----------------------------------------------------------------------------
 * A small coloured label ("badge"). Used for pipeline status (pending / in
 * progress / complete), platforms (LinkedIn / Instagram), and formats.
 */
import type { ReactNode } from "react";

type Tone =
  | "gray"
  | "blue"
  | "green"
  | "indigo"
  | "linkedin"
  | "instagram";

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}

// Colour styles for each tone.
const TONE_CLASSES: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-600",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  indigo: "bg-accent-light text-accent",
  // Brand-ish colours for the two platforms.
  linkedin: "bg-[#E8F1FB] text-[#0A66C2]",
  instagram: "bg-[#FCE7F3] text-[#C13584]",
};

export function Badge({ tone = "gray", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
