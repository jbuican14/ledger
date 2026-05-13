"use client";

import { useState } from "react";
import { Trash2, Plus, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import { CategoryIcon } from "@/components/categories/category-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { useCategories } from "@/hooks/use-categories";
import { useToast } from "@/components/ui/toast";
import { ListItemSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CategoryType } from "@/types/database";

const PRESET_COLORS = [
  "#22C55E", "#3B82F6", "#F97316", "#A855F7",
  "#EF4444", "#EC4899", "#14B8A6", "#6B7280",
  "#F59E0B", "#0EA5E9", "#8B5CF6", "#10B981",
];

// Curated set of 20 icons covering common UK household spending categories.
// Names map into the ICON_MAP in CategoryIcon — keep these two in sync.
const PRESET_ICONS = [
  "home", "file-text", "lightbulb", "droplet", "flame",
  "wifi", "shopping-cart", "utensils", "coffee", "fuel",
  "car", "train", "shopping-bag", "film", "gamepad-2",
  "dumbbell", "plane", "gift", "heart-pulse", "piggy-bank",
];

export function CategoryManagement() {
  const {
    expenseCategories,
    incomeCategories,
    addCategory,
    deleteCategory,
    getCategoryUsage,
    isLoading,
    error: fetchError,
  } = useCategories();
  const { showToast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [type, setType] = useState<CategoryType>("expense");
  const [color, setColor] = useState<string>(PRESET_COLORS[0] ?? "#22C55E");
  const [icon, setIcon] = useState<string>(PRESET_ICONS[0] ?? "tag");
  const [isSaving, setIsSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    transactions: number;
    recurring: number;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const resetForm = () => {
    setName("");
    setNameError(null);
    setType("expense");
    setColor(PRESET_COLORS[0] ?? "#22C55E");
    setIcon(PRESET_ICONS[0] ?? "tag");
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    setNameError(null);
    setIsSaving(true);
    const { error } = await addCategory({ name, type, color, icon });
    setIsSaving(false);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`"${name.trim()}" added`, "success");
      resetForm();
      setSheetOpen(false);
    }
  };

  const handleDeleteClick = async (id: string, categoryName: string) => {
    const usage = await getCategoryUsage(id);
    if (usage.error) {
      showToast(usage.error, "error");
      return;
    }
    // Silent delete when nothing references the category.
    if (usage.transactions === 0 && usage.recurring === 0) {
      const { error } = await deleteCategory(id);
      if (error) showToast(error, "error");
      else showToast(`"${categoryName}" deleted`, "success");
      return;
    }
    setDeleteTarget({
      id,
      name: categoryName,
      transactions: usage.transactions,
      recurring: usage.recurring,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const { error } = await deleteCategory(deleteTarget.id);
    setIsDeleting(false);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`"${deleteTarget.name}" deleted`, "success");
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Categories</h2>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setSheetOpen(true);
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-1">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      ) : fetchError ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <p className="text-destructive font-medium mb-1">
            Couldn&apos;t load categories
          </p>
          <p className="text-muted-foreground">{fetchError}</p>
        </div>
      ) : expenseCategories.length === 0 && incomeCategories.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="No categories yet"
          description="Add a category to start organising your transactions."
          action={
            <Button
              onClick={() => {
                resetForm();
                setSheetOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add category
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <CategoryGroup
            title="Expense"
            categories={expenseCategories}
            onDelete={handleDeleteClick}
          />
          <CategoryGroup
            title="Income"
            categories={incomeCategories}
            onDelete={handleDeleteClick}
          />
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader className="pb-2">
            <SheetTitle>New Category</SheetTitle>
            <SheetDescription>
              Add a custom category to organise your transactions.
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Name</Label>
              <Input
                id="cat-name"
                placeholder="e.g. Gym"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (nameError) setNameError(null);
                }}
                onBlur={() => {
                  if (!name.trim()) setNameError("Name is required");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                aria-invalid={!!nameError}
                aria-describedby={nameError ? "cat-name-error" : undefined}
                autoFocus
              />
              {nameError && (
                <p id="cat-name-error" className="text-sm text-destructive">
                  {nameError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium capitalize transition-colors",
                      type === t
                        ? "border-ring bg-primary/10 text-primary"
                        : "border-input text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-transform",
                      color === c
                        ? "border-ring scale-110"
                        : "border-transparent"
                    )}
                    style={{ backgroundColor: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div
                role="radiogroup"
                aria-label="Category icon"
                className="grid grid-cols-5 gap-2"
              >
                {PRESET_ICONS.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    role="radio"
                    aria-checked={icon === iconName}
                    aria-label={iconName}
                    onClick={() => setIcon(iconName)}
                    className={cn(
                      "rounded-lg border-2 p-1 flex items-center justify-center transition-all",
                      icon === iconName
                        ? "border-ring"
                        : "border-transparent hover:bg-muted"
                    )}
                  >
                    <CategoryIcon name={iconName} color={color} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <CategoryIcon name={icon} color={color} />
              <span className="text-sm font-medium">
                {name.trim() || "Category name"}
              </span>
            </div>

            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? "Saving…" : "Save Category"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
          <AlertDialogDescription>This will affect:</AlertDialogDescription>
          <ul className="mt-3 space-y-1.5 text-sm">
            {deleteTarget && deleteTarget.transactions > 0 && (
              <li>
                <span className="font-medium">{deleteTarget.transactions}</span>{" "}
                past transaction{deleteTarget.transactions === 1 ? "" : "s"} —
                will show as Uncategorised
              </li>
            )}
            {deleteTarget && deleteTarget.recurring > 0 && (
              <li>
                <span className="font-medium">{deleteTarget.recurring}</span>{" "}
                recurring rule{deleteTarget.recurring === 1 ? "" : "s"} —
                category will be cleared
              </li>
            )}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-2 mt-5">
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete category"}
            </Button>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type CategoryGroupProps = {
  title: string;
  categories: Array<{ id: string; name: string; color: string; icon: string | null }>;
  onDelete: (id: string, name: string) => void;
};

function CategoryGroup({ title, categories, onDelete }: CategoryGroupProps) {
  if (categories.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </p>
      <ul className="space-y-1">
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
          >
            <div className="flex items-center gap-3">
              <CategoryIcon name={cat.icon} color={cat.color} size={14} />
              <span className="text-sm">{cat.name}</span>
            </div>
            <button
              aria-label={`Delete ${cat.name}`}
              className="text-muted-foreground hover:text-destructive transition-colors"
              onClick={() => onDelete(cat.id, cat.name)}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
