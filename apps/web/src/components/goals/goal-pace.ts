import { differenceInCalendarMonths, parseISO, isPast } from "date-fns";

export type GoalPace =
  | { kind: "reached" }
  | { kind: "no-date"; remaining: number }
  | { kind: "overdue"; remaining: number; targetDate: Date }
  | { kind: "on-pace"; remaining: number; monthsLeft: number; perMonth: number; targetDate: Date };

// Computes the simple "Add £X/mo to hit your target" framing used on the
// detail page. We treat anything under one month as one month so the
// per-month figure doesn't divide by ~zero and explode.
export function computeGoalPace(
  currentAmount: number,
  targetAmount: number,
  targetDateIso: string | null,
): GoalPace {
  const remaining = Math.max(0, targetAmount - currentAmount);

  if (remaining <= 0) return { kind: "reached" };
  if (!targetDateIso) return { kind: "no-date", remaining };

  const targetDate = parseISO(targetDateIso);
  if (isPast(targetDate)) {
    return { kind: "overdue", remaining, targetDate };
  }

  const rawMonths = differenceInCalendarMonths(targetDate, new Date());
  const monthsLeft = Math.max(1, rawMonths);
  return {
    kind: "on-pace",
    remaining,
    monthsLeft,
    perMonth: remaining / monthsLeft,
    targetDate,
  };
}
