import {
  ShoppingCart,
  FileText,
  Car,
  Film,
  Utensils,
  ShoppingBag,
  HeartPulse,
  Box,
  Banknote,
  Coins,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  "file-text": FileText,
  car: Car,
  film: Film,
  utensils: Utensils,
  "shopping-bag": ShoppingBag,
  "heart-pulse": HeartPulse,
  box: Box,
  banknote: Banknote,
  coins: Coins,
};

export function CategoryIcon({
  name,
  color,
  size = 16,
  className,
}: {
  name: string | null;
  color?: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICON_MAP[name ?? ""] ?? Box;
  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        className,
      )}
      style={{ backgroundColor: color }}
    >
      <Icon size={size} className="text-white" />
    </div>
  );
}
