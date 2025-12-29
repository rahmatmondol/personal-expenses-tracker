export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
}

export interface Account {
  id: number;
  name: string;
  type: string; // 'Cash', 'Bank', 'Mobile Money', etc.
  balance: number; 
  icon?: string;
  color?: string;
}

export interface TransactionItem {
  id: number;
  transactionId: number;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
}

export interface Transaction {
  id: number;
  amount: number;
  date: number; // Unix Timestamp
  note?: string;
  categoryId: number;
  accountId?: number;
  // Joins
  categoryName?: string;
  categoryColor?: string;
  categoryType?: 'income' | 'expense';
  categoryIcon?: string;
  accountName?: string;
  items?: TransactionItem[];
  allocations?: { accountId: number; amount: number }[];
}

export interface Debt {
  id: number;
  amount: number;
  description?: string;
  type: 'borrowed' | 'lent';
  due_date: number;
  is_paid: number; // 0 or 1
  contact_name: string;
  created_at: number;
}

export interface RecurringPayment {
  id: number;
  amount: number;
  description?: string;
  categoryId: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  due_day?: number; // e.g. 5
  next_due_date: number;
  reminder_days_before: number;
  is_active: number; // 0 or 1
  last_paid_date?: number;
  // Joins
  categoryName?: string;
  categoryColor?: string;
  categoryIcon?: string;
}
