// Database types matching Supabase schema

export interface Household {
  id: string;
  name: string;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  household_id: string;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryType = "expense" | "income";

export interface Category {
  id: string;
  household_id: string;
  name: string;
  color: string;
  icon: string | null;
  type: CategoryType;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  household_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// amount is signed: negative = expense, positive = income
export interface Transaction {
  id: string;
  household_id: string;
  user_id: string | null;
  category_id: string | null;
  payment_method_id: string | null;
  amount: number;
  description: string | null;
  transaction_date: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Extended types with relations
export interface TransactionWithCategory extends Transaction {
  category: Category | null;
  payment_method: PaymentMethod | null;
}

// Form types — `amount` is a string from the input (always positive); the
// hook applies the sign based on the form's income/expense toggle.
export interface TransactionFormData {
  amount: string;
  description: string;
  category_id: string;
  payment_method_id: string;
  transaction_date: string;
  is_income: boolean;
}
