"use client";

import { ChevronDown, Download } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { downloadFile, toCSV, toJSON } from "@/lib/transactions/export";
import type { TransactionWithCategory } from "@/types/database";

type DownloadMenuProps = {
  transactions: TransactionWithCategory[];
  year: number;
  month: number;
};

function monthSlug(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function DownloadMenu({ transactions, year, month }: DownloadMenuProps) {
  const slug = monthSlug(year, month);

  const handleCSV = () => {
    downloadFile(`transactions-${slug}.csv`, toCSV(transactions), "text/csv");
  };

  const handleJSON = () => {
    downloadFile(
      `transactions-${slug}.json`,
      toJSON(transactions),
      "application/json",
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-2 outline-none focus-visible:underline"
        aria-label="Download transactions"
      >
        <Download className="h-4 w-4" />
        <span>Download</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={handleCSV}>Download CSV</DropdownMenuItem>
        <DropdownMenuItem onSelect={handleJSON}>Download JSON</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
