/**
 * src/components/ui/Card.tsx
 * -----------------------------------------------------------------------------
 * A simple white "card" container with a border, rounded corners, and padding.
 * We use cards to visually separate each key idea and content piece.
 */
import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}
