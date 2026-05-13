"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { CategoryIcon } from "@/components/categories/category-icon";
import { useAuth } from "@/lib/auth/auth-context";
import type { TransactionWithCategory } from "@/types/database";

type Props = {
  transactions: TransactionWithCategory[];
};

type Row = {
  key: string;
  name: string;
  icon: string | null;
  color: string;
  amount: number;
};

const UNCATEGORIZED_COLOR = "#6B7280";
const COLLAPSED_COUNT = 5;

// Aggregates expense transactions by category and renders a ranked list with
// per-row bars. Uncategorised (deleted-category) spend is bucketed together.
export function CategoryBreakdown({ transactions }: Props) {
  const { household } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const currency = household?.currency ?? "GBP";
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(n);

  const { rows, total } = useMemo(() => {
    const map = new Map<string, Row>();
    let totalExpense = 0;

    for (const t of transactions) {
      if (t.amount >= 0) continue; // expenses only
      const spend = Math.abs(t.amount);
      totalExpense += spend;
      const key = t.category?.id ?? "uncategorized";
      const existing = map.get(key);
      if (existing) {
        existing.amount += spend;
      } else {
        map.set(key, {
          key,
          name: t.category?.name ?? "Uncategorized",
          icon: t.category?.icon ?? null,
          color: t.category?.color ?? UNCATEGORIZED_COLOR,
          amount: spend,
        });
      }
    }

    const sorted = [...map.values()].sort((a, b) => b.amount - a.amount);
    return { rows: sorted, total: totalExpense };
  }, [transactions]);

  if (rows.length === 0) return null;

  const visible = expanded ? rows : rows.slice(0, COLLAPSED_COUNT);
  const hasMore = rows.length > COLLAPSED_COUNT;

  return (
    <div className="bg-card border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Where it went</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatCurrency(total)} total
        </span>
      </div>

      <ul className="space-y-3">
        {visible.map((row) => {
          const pct = total > 0 ? (row.amount / total) * 100 : 0;
          return (
            <li key={row.key} className="flex items-center gap-3">
              <CategoryIcon
                name={row.icon}
                color={row.color}
                size={18}
                className="w-9 h-9 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline text-sm">
                  <span className="font-medium truncate">{row.name}</span>
                  <span className="tabular-nums ml-2">
                    {formatCurrency(row.amount)}
                  </span>
                </div>
                <div
                  className="h-1.5 bg-muted rounded-full mt-1.5 overflow-hidden"
                  role="progressbar"
                  aria-valuenow={Math.round(pct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${row.name}: ${Math.round(pct)}% of spending`}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: row.color }}
                  />
                </div>
              </div>
              {/* % column appears on md+ only — bar carries the signal on mobile */}
              <span className="hidden md:inline text-xs text-muted-foreground tabular-nums w-10 text-right">
                {pct.toFixed(0)}%
              </span>
            </li>
          );
        })}
      </ul>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-4 text-sm text-primary hover:underline flex items-center gap-1"
        >
          {expanded ? (
            <>
              Show less <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show all {rows.length} <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
