"use client";

import { PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

type Props = {
  onCreate: (suggestedName?: string) => void;
};

// Empty state for /goals when no active goals exist. Suggestion chips pre-fill
// the create form's name field so the first contact is a one-tap experience.
// Suggestions intentionally span both common (Emergency fund) and aspirational
// (Holiday) goals — the spread invites users to think about saving broadly.
const SUGGESTIONS = ["Holiday", "Emergency fund", "New car", "Wedding"];

export function GoalsEmptyState({ onCreate }: Props) {
  return (
    <EmptyState
      icon={PiggyBank}
      title="What are you saving for?"
      description="Set a goal to track your progress towards something meaningful — a holiday, a safety net, a big purchase. We'll show how close you are."
      action={
        <div className="flex flex-col items-center gap-3">
          <Button onClick={() => onCreate()}>Create your first goal</Button>
          <div className="flex flex-wrap justify-center gap-2 max-w-md">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onCreate(s)}
                className="text-xs px-3 py-1 rounded-full border bg-card hover:bg-muted transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
