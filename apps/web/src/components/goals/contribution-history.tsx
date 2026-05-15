"use client";

import { format, parseISO, isToday, isYesterday } from "date-fns";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import type { GoalContribution } from "@/types/database";

type Props = {
  contributions: GoalContribution[];
  isLoading: boolean;
  onEdit: (contribution: GoalContribution) => void;
  onDelete: (contribution: GoalContribution) => void;
};

function formatDate(iso: string): string {
  const d = parseISO(iso);
  if (isToday(d)) return "Today";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "d MMM yyyy");
}

export function ContributionHistory({
  contributions,
  isLoading,
  onEdit,
  onDelete,
}: Props) {
  const { household } = useAuth();
  const currency = household?.currency ?? "GBP";
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-12 bg-muted animate-pulse rounded" />
        <div className="h-12 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (contributions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No contributions yet. Add your first deposit to start tracking.
      </p>
    );
  }

  return (
    <ul className="divide-y -mx-4">
      {contributions.map((c) => {
        const isDeposit = c.amount > 0;
        return (
          <li
            key={c.id}
            className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-sm font-medium tabular-nums",
                    isDeposit ? "text-green-600" : "text-destructive",
                  )}
                >
                  {isDeposit ? "+" : ""}
                  {formatCurrency(c.amount)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(c.contributed_at)}
                </span>
              </div>
              {c.note && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {c.note}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label={`Edit or delete entry from ${formatDate(c.contributed_at)}`}
                className="p-1.5 hover:bg-muted rounded-md transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => onEdit(c)}>
                  <Pencil className="w-3.5 h-3.5 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => onDelete(c)}
                  className="text-destructive"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        );
      })}
    </ul>
  );
}
