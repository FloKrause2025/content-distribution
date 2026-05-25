/**
 * src/components/pipeline/PipelineProgress.tsx
 * -----------------------------------------------------------------------------
 * The step indicator shown at the top of the pipeline. It displays the three
 * steps and colours each badge by status:
 *   gray  = pending (not reached yet)
 *   blue  = in progress (the current step)
 *   green = complete (already done)
 */
"use client";

import { Badge } from "@/components/ui/Badge";

// The pipeline has three steps. We refer to the current step by number (1-3).
export const PIPELINE_STEPS = [
  { number: 1, name: "Input Hero Asset" },
  { number: 2, name: "Review Key Ideas" },
  { number: 3, name: "Review Channel Content" },
] as const;

interface PipelineProgressProps {
  /** The step the user is currently on (1, 2, or 3). */
  currentStep: number;
}

export function PipelineProgress({ currentStep }: PipelineProgressProps) {
  return (
    <ol className="flex flex-wrap items-center gap-3">
      {PIPELINE_STEPS.map((step) => {
        // Decide the status of this step relative to the current step.
        const status =
          step.number < currentStep
            ? "complete"
            : step.number === currentStep
              ? "in-progress"
              : "pending";

        const tone =
          status === "complete"
            ? "green"
            : status === "in-progress"
              ? "blue"
              : "gray";

        const label =
          status === "complete"
            ? "Complete"
            : status === "in-progress"
              ? "In progress"
              : "Pending";

        return (
          <li key={step.number} className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
              {step.number}
            </span>
            <span className="text-sm font-medium text-gray-700">
              {step.name}
            </span>
            <Badge tone={tone}>{label}</Badge>
          </li>
        );
      })}
    </ol>
  );
}
