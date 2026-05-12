"use client";

import { useState } from "react";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr",
  "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec",
];

interface MonthYearPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedYear: number;
  selectedMonth: number;
  onSelect: (year: number, month: number) => void;
}

export function MonthYearPicker({
  open,
  onOpenChange,
  selectedYear,
  selectedMonth,
  onSelect,
}: MonthYearPickerProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Year shown in the grid — starts at the selected month's year and can be
  // scrubbed independently before committing a choice.
  const [viewYear, setViewYear] = useState(selectedYear);

  // Re-sync viewYear when the sheet opens with a possibly-different selection.
  // Avoids showing a stale year if the user picks a month, closes, then reopens.
  const handleOpenChange = (next: boolean) => {
    if (next) setViewYear(selectedYear);
    onOpenChange(next);
  };

  const canGoNextYear = viewYear < currentYear;

  const handlePick = (month: number) => {
    onSelect(viewYear, month);
    onOpenChange(false);
  };

  const handleToday = () => {
    onSelect(currentYear, currentMonth);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="pb-safe">
        <SheetHeader className="pb-2">
          <SheetTitle>Select month</SheetTitle>
          <SheetDescription>
            Pick a month to view its transactions.
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 space-y-5">
          {/* Year scrubber */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setViewYear((y) => y - 1)}
              aria-label="Previous year"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold tabular-nums">{viewYear}</div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setViewYear((y) => y + 1)}
              disabled={!canGoNextYear}
              aria-label="Next year"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-2">
            {MONTHS.map((label, idx) => {
              const m = idx + 1;
              const isFuture =
                viewYear > currentYear ||
                (viewYear === currentYear && m > currentMonth);
              const isSelected = viewYear === selectedYear && m === selectedMonth;
              const isToday = viewYear === currentYear && m === currentMonth;

              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => handlePick(m)}
                  disabled={isFuture}
                  title={
                    isFuture
                      ? "Future months are managed by Recurring (coming soon)"
                      : undefined
                  }
                  className={cn(
                    "rounded-lg border py-3 text-sm font-medium transition-colors min-h-[44px]",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : isFuture
                        ? "bg-muted/30 text-muted-foreground/40 border-transparent cursor-not-allowed"
                        : isToday
                          ? "bg-card border-primary/40 text-foreground hover:bg-muted"
                          : "bg-card border-input text-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Quick "today" shortcut */}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleToday}
            disabled={
              selectedYear === currentYear && selectedMonth === currentMonth
            }
          >
            Jump to {format(now, "MMM yyyy")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
