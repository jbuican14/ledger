// Re-export database types
import type { Database } from "./database.types";
export type { Database };

// Re-export Supabase auth types (centralized here per SUPABASE_RULES.md)
export type { User, Session } from "@supabase/supabase-js";

// Convenience types (will be populated after schema creation)
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
