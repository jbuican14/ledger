# State Persistence Rules

> **Document Version:** 1.0  
> **Last Updated:** 2026-05-12  
> **Status:** Establishes patterns for KAN-37

This document defines where application state belongs across the three storage layers: URL (shareable), localStorage (persisted user preferences), and memory (ephemeral).

---

## Three Layers of State

### 1. URL (Shareable, Bookmarkable)

**What:** Navigation and filtering state that users might want to share via URL or bookmark.

**Characteristics:**
- Serializable to query parameters
- Survives page refresh
- Works across browser tabs
- Shareable via link

**Current Examples:**
- Selected month (`?month=2026-04` in useMonth hook)
- Future: date range filters, category filters, search queries

**Implementation:**
```tsx
// Use useSearchParams + router.push for bidirectional binding
const searchParams = useSearchParams();
const month = searchParams.get("month");

const setMonth = (y: number, m: number) => {
  const params = new URLSearchParams(searchParams);
  params.set("month", `${y}-${String(m).padStart(2, "0")}`);
  router.push(`?${params}`);
};
```

**Guidelines:**
- URL state is public — don't store sensitive data
- Keep it minimal; each param should have a clear user reason to share
- Provide sensible defaults (don't require all params to be present)
- Clamp invalid/future values on read (see useMonth's future-month protection)

---

### 2. localStorage (Persisted User Preferences)

**What:** User preferences that should survive across browser sessions and tabs.

**Characteristics:**
- Not shareable (per-device, per-user)
- Survives page refresh and browser restart
- ~5-10MB limit per domain
- Synchronous access (prefer minimal reads on app init)

**Current Examples:**
- Theme preference (`theme: "light" | "dark"` in ThemeToggle)

**Future Examples:**
- Sidebar collapsed/expanded state
- Default category/payment method selection
- UI preferences (rows per page, sort order for personal views)

**Implementation:**
```tsx
// On init: read localStorage + system preference as fallback
useEffect(() => {
  const saved = localStorage.getItem("theme");
  const preferred = saved || getSystemTheme();
  apply(preferred);
}, []);

// On change: write to localStorage and apply
const toggle = () => {
  const newValue = opposite(theme);
  localStorage.setItem("theme", newValue);
  apply(newValue);
};
```

**Guidelines:**
- Read on mount only; don't re-read on every render
- Provide sensible defaults (system preference, sensible constant)
- Use try/catch for localStorage access (may be disabled in private mode)
- Key naming: lowercase, hierarchical if many items (`app.theme`, `app.sidebar_collapsed`)
- Avoid storing derived data; store only the source of truth

---

### 3. React State (Ephemeral)

**What:** Transient UI state that only needs to survive during the current session.

**Characteristics:**
- Resets on page refresh
- Not shared across tabs
- Lost when browser closes
- Synchronous, no I/O overhead

**Current Examples:**
- Modal open/closed state
- Form field values (until submitted)
- Dropdown menu visibility
- Temporary toast notifications
- Picker modal open state (in MonthNavigator)

**Implementation:**
```tsx
const [isOpen, setIsOpen] = useState(false);
const [formData, setFormData] = useState({ category: "", amount: "" });
```

**Guidelines:**
- Default layer for any new state
- Don't use for anything users would expect to survive refresh
- Lift state only as high as needed for sibling communication
- Use useCallback to memoize callbacks and prevent unnecessary re-renders

---

## Decision Tree

When adding new state, ask:

```
1. Do users want to share this via URL?
   → YES: Use URL (useSearchParams + router.push)
   
2. Should this survive browser restart?
   → YES: Use localStorage
   → NO: Is this UI chrome (modal open, dropdown open)?
        → YES: Use React state
        → NO: Use React state (still good default)
```

**Examples:**

| State | Question 1 | Question 2 | Decision |
|-------|-----------|-----------|----------|
| Selected month | "Share prev month budget?" | — | URL ✓ |
| Theme preference | "Share light/dark choice?" | "Survive restart?" | localStorage ✓ |
| Modal open? | "No, just UI chrome" | — | React state ✓ |
| Search query | "Share search results?" | — | URL ✓ |
| Sidebar collapsed? | "Not really" | "Survive restart?" | localStorage ✓ |
| Hover state | "No" | "Survive restart?" | React state ✓ |

---

## Migration Notes

If state needs to move layers:
1. **React → localStorage:** Add localStorage read in useEffect, keep useState for hydration
2. **localStorage → URL:** Keep localStorage as fallback, sync URL updates to localStorage
3. **URL → localStorage:** Keep URL support for back-compat, new writes go to localStorage

---

## Testing & Validation

- **URL state:** Manually share link in new browser → verify state loads
- **localStorage:** Open DevTools → Application → localStorage → verify key/value after toggle
- **React state:** Close DevTools → refresh page → verify state resets

---

## Related Documents

- [SUPABASE_RULES.md](./SUPABASE_RULES.md) — Data layer rules
- [ship-workflow.md](./ship-workflow.md) — PR automation
- [PRODUCT_SPEC.md](../PRODUCT_SPEC.md) — Feature specifications
