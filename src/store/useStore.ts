import { create } from 'zustand';
import { Category, Transaction, TransactionItem, Account, Debt, RecurringPayment } from '../types';
import * as repo from '../db/repo';
import { initDB } from '../db/db';

interface AppState {
  categories: Category[];
  transactions: Transaction[];
  accounts: Account[];
  debts: Debt[];
  recurringPayments: RecurringPayment[];
  balance: { totalIncome: number; totalExpense: number; balance: number };
  isLoading: boolean;
  currency: string;
  
  // Actions
  init: () => Promise<void>;
  refreshData: () => void;
  addTransaction: (amount: number, date: number, categoryId: number, note: string, items: Omit<TransactionItem, 'id' | 'transactionId'>[], accountId?: number, allocations?: { accountId: number; amount: number }[]) => void;
  deleteTransaction: (id: number) => void;
  refreshReports: () => void;
  setCurrency: (currency: string) => void;
  addCategory: (name: string, type: 'income' | 'expense', color: string, icon: string) => void;
  updateCategory: (id: number, name: string, type: 'income' | 'expense', color: string, icon: string) => void;
  deleteCategory: (id: number) => void;
  filterTransactions: (startDate: number, endDate: number) => void;
  
  // Account Actions
  addAccount: (name: string, type: string, balance: number, color: string, icon: string) => void;
  updateAccount: (id: number, name: string, type: string, balance: number, color: string, icon: string) => void;
  deleteAccount: (id: number) => void;
}

export const useStore = create<AppState>((set, get) => ({
  categories: [],
  transactions: [],
  accounts: [],
  debts: [],
  recurringPayments: [],
  balance: { totalIncome: 0, totalExpense: 0, balance: 0 },
  isLoading: true,
  currency: '৳', // Default to BDT

  init: async () => {
    try {
      // Initialize DB
      initDB();
      // Load settings
      const savedCurrency = repo.getSetting('currency');
      if (savedCurrency) {
        set({ currency: savedCurrency });
      } else {
        // Save default if not exists
        repo.setSetting('currency', '৳');
      }
      get().refreshData();
    } catch (error) {
      console.error('Failed to init store:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  refreshData: () => {
    const categories = repo.getCategories();
    const accounts = repo.getAccounts();
    const transactions = repo.getTransactions(50, 0); // Get last 50
    const balance = repo.getBalance();
    const debts = repo.getDebts();
    const recurringPayments = repo.getRecurringPayments();
    set({ categories, accounts, transactions, balance, debts, recurringPayments });
  },

  addTransaction: (amount, date, categoryId, note, items, accountId, allocations) => {
    repo.addTransaction(amount, date, categoryId, note, items, accountId, allocations);
    get().refreshData();
  },

  deleteTransaction: (id) => {
    repo.deleteTransaction(id);
    get().refreshData();
  },

  refreshReports: () => {
      // Placeholder if we need specific report state
      get().refreshData();
  },

  setCurrency: (currency) => {
    repo.setSetting('currency', currency);
    set({ currency });
  },

  addCategory: (name, type, color, icon) => {
    repo.addCategory(name, type, color, icon);
    get().refreshData();
  },

  updateCategory: (id, name, type, color, icon) => {
    repo.updateCategory(id, name, type, color, icon);
    get().refreshData();
  },

  deleteCategory: (id) => {
    repo.deleteCategory(id);
    get().refreshData();
  },

  filterTransactions: (startDate, endDate) => {
    const transactions = repo.getTransactionsByRange(startDate, endDate);
    set({ transactions });
  },

  addAccount: (name, type, balance, color, icon) => {
    repo.addAccount(name, type, balance, color, icon);
    get().refreshData();
  },

  updateAccount: (id, name, type, balance, color, icon) => {
    repo.updateAccount(id, name, type, balance, color, icon);
    get().refreshData();
  },

  deleteAccount: (id) => {
    repo.deleteAccount(id);
    get().refreshData();
  }
}));
