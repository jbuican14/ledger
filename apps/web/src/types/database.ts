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
  household_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  color: string;
  icon: string | null;
  is_income: boolean;
  sort_order: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  household_id: string;
  user_id: string | null;
  category_id: string | null;
  amount: number;
  description: string | null;
  transaction_date: string;
  is_income: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

// Extended types with relations
export interface TransactionWithCategory extends Transaction {
  category: Category | null;
}

// Form types
export interface TransactionFormData {
  amount: string;
  description: string;
  category_id: string;
  transaction_date: string;
  is_income: boolean;
}
