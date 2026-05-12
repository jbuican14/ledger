import type { TransactionWithCategory } from "@/types/database";

type ExportRow = {
  date: string;
  amount: number;
  type: "income" | "expense";
  category: string;
  payment_method: string;
  description: string;
};

function toRow(t: TransactionWithCategory): ExportRow {
  return {
    date: t.transaction_date,
    amount: Math.abs(t.amount),
    type: t.amount < 0 ? "expense" : "income",
    category: t.category?.name ?? "",
    payment_method: t.payment_method?.name ?? "",
    description: t.description ?? "",
  };
}

// RFC 4180: wrap in quotes if the field contains a comma, double quote, CR,
// or LF; embedded double quotes are escaped by doubling them.
function escapeCSV(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADER = "Date,Amount,Type,Category,Payment Method,Description";

export function toCSV(transactions: TransactionWithCategory[]): string {
  const rows = transactions.map((t) => {
    const r = toRow(t);
    return [
      r.date,
      r.amount.toFixed(2),
      r.type,
      escapeCSV(r.category),
      escapeCSV(r.payment_method),
      escapeCSV(r.description),
    ].join(",");
  });
  return [CSV_HEADER, ...rows].join("\n");
}

export function toJSON(transactions: TransactionWithCategory[]): string {
  return JSON.stringify(transactions.map(toRow), null, 2);
}

// Triggers a browser file save. Kept separate from the serializers so they
// stay pure and unit-testable. Only call from the browser.
export function downloadFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
