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
  Home,
  Lightbulb,
  Droplet,
  Flame,
  Wifi,
  Coffee,
  Fuel,
  Train,
  Gamepad2,
  Dumbbell,
  Plane,
  Gift,
  Pill,
  PiggyBank,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const ICON_MAP: Record<string, LucideIcon> = {
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
  home: Home,
  lightbulb: Lightbulb,
  droplet: Droplet,
  flame: Flame,
  wifi: Wifi,
  coffee: Coffee,
  fuel: Fuel,
  train: Train,
  "gamepad-2": Gamepad2,
  dumbbell: Dumbbell,
  plane: Plane,
  gift: Gift,
  pill: Pill,
  "piggy-bank": PiggyBank,
  tag: Tag,
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
