"use client";

import { useState } from "react";
import { Trash2, Plus, CreditCard } from "lucide-react";
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
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { useToast } from "@/components/ui/toast";

export function PaymentMethodManagement() {
  const { paymentMethods, addPaymentMethod, deletePaymentMethod } =
    usePaymentMethods();
  const { showToast } = useToast();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const resetForm = () => setName("");

  const handleAdd = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    const { error } = await addPaymentMethod({ name });
    setIsSaving(false);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`"${name.trim()}" added`, "success");
      resetForm();
      setSheetOpen(false);
    }
  };

  const handleDelete = async (id: string, methodName: string) => {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id);
      return;
    }
    const { error } = await deletePaymentMethod(id);
    setConfirmDeleteId(null);
    if (error) {
      showToast(error, "error");
    } else {
      showToast(`"${methodName}" deleted`, "success");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Payment methods</h2>
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

      {paymentMethods.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No payment methods yet.
        </p>
      ) : (
        <ul className="space-y-1">
          {paymentMethods.map((pm) => (
            <li
              key={pm.id}
              className="flex items-center justify-between gap-3 rounded-lg px-3 py-2 hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{pm.name}</span>
              </div>

              {confirmDeleteId === pm.id ? (
                <div className="flex items-center gap-2 text-sm">
                  <button
                    className="text-destructive font-medium hover:underline"
                    onClick={() => handleDelete(pm.id, pm.name)}
                  >
                    Delete
                  </button>
                  <button
                    className="text-muted-foreground hover:underline"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  aria-label={`Delete ${pm.name}`}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => handleDelete(pm.id, pm.name)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="pb-safe">
          <SheetHeader className="pb-2">
            <SheetTitle>New payment method</SheetTitle>
            <SheetDescription>
              Track how you paid for a transaction (e.g. Cash, Debit Card).
            </SheetDescription>
          </SheetHeader>

          <div className="p-4 space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="pm-name">Name</Label>
              <Input
                id="pm-name"
                placeholder="e.g. Credit Card 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
              />
            </div>

            <Button
              className="w-full"
              onClick={handleAdd}
              disabled={!name.trim() || isSaving}
            >
              {isSaving ? "Saving…" : "Save payment method"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
