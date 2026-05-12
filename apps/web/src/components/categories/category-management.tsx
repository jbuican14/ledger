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

export function CategoryManagement() {
  const {
    expenseCategories,
    incomeCategories,
    addCategory,
    deleteCategory,
    isLoading,
    error: fetchError,
  } = useCategories();
  const { showToast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [type, setType] = useState<CategoryType>("expense");
  const [color, setColor] = useState<string>(PRESET_COLORS[0] ?? "#22C55E");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => {
    setName("");
    setNameError(null);
    setType("expense");
    setColor(PRESET_COLORS[0] ?? "#22C55E");
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }
    setNameError(null);
    setIsSaving(true);
    const { error } = await addCategory({ name, type, color });
    setIsSaving(false);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`"${name.trim()}" added`, "success");
      resetForm();
      setSheetOpen(false);
    }
  };

  const handleDelete = async (id: string, categoryName: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    const { error } = await deleteCategory(id);
    setConfirmDeleteId(null);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`"${categoryName}" deleted`, "success");
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
            confirmDeleteId={confirmDeleteId}
            onDelete={handleDelete}
            onCancelDelete={() => setConfirmDeleteId(null)}
          />
          <CategoryGroup
            title="Income"
            categories={incomeCategories}
            confirmDeleteId={confirmDeleteId}
            onDelete={handleDelete}
            onCancelDelete={() => setConfirmDeleteId(null)}
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

            <div className="flex items-center gap-3 pt-1">
              <CategoryIcon name={null} color={color} />
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
    </div>
  );
}

type CategoryGroupProps = {
  title: string;
  categories: Array<{ id: string; name: string; color: string; icon: string | null }>;
  confirmDeleteId: string | null;
  onDelete: (id: string, name: string) => void;
  onCancelDelete: () => void;
};

function CategoryGroup({
  title,
  categories,
  confirmDeleteId,
  onDelete,
  onCancelDelete,
}: CategoryGroupProps) {
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

            {confirmDeleteId === cat.id ? (
              <div className="flex items-center gap-2 text-sm">
                <button
                  className="text-destructive font-medium hover:underline"
                  onClick={() => onDelete(cat.id, cat.name)}
                >
                  Delete
                </button>
                <button
                  className="text-muted-foreground hover:underline"
                  onClick={onCancelDelete}
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                aria-label={`Delete ${cat.name}`}
                className="text-muted-foreground hover:text-destructive transition-colors"
                onClick={() => onDelete(cat.id, cat.name)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
