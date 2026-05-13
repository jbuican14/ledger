"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ListItemSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useGoals } from "@/hooks/use-goals";
import { GoalCard } from "@/components/goals/goal-card";
import { GoalForm } from "@/components/goals/goal-form";
import { GoalsEmptyState } from "@/components/goals/goals-empty-state";

export default function GoalsPage() {
  const { activeGoals, addGoal, isLoading, error } = useGoals();
  const { showToast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  // Suggested-name seed from the empty-state chips. Cleared each time the
  // sheet closes so a manual "+ New goal" doesn't carry over a stale value.
  const [suggestedName, setSuggestedName] = useState("");

  const openCreate = (seed?: string) => {
    setSuggestedName(seed ?? "");
    setSheetOpen(true);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Savings goals</h1>
          {activeGoals.length > 0 && (
            <Button onClick={() => openCreate()}>
              <Plus className="w-4 h-4 mr-1" />
              New goal
            </Button>
          )}
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            <ListItemSkeleton />
            <ListItemSkeleton />
          </div>
        ) : activeGoals.length === 0 ? (
          <GoalsEmptyState onCreate={openCreate} />
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {activeGoals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSuggestedName("");
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>New savings goal</SheetTitle>
            <SheetDescription>
              Pick a target — we&apos;ll track your contributions and show
              your progress.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <GoalForm
              initialName={suggestedName}
              onSubmit={async (data) => {
                const result = await addGoal(data);
                if (!result.error) {
                  showToast(`"${data.name}" goal created`, "success");
                }
                return result;
              }}
              onClose={() => setSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
