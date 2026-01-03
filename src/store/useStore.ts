import { create } from 'zustand';
import { Category, Transaction, TransactionItem, Account, Debt, RecurringPayment, Loan } from '../types';
import * as repo from '../db/repo';
import { initDB } from '../db/db';
import * as auth from '../utils/auth';

interface AppState {
  categories: Category[];
  transactions: Transaction[];
  accounts: Account[];
  debts: Debt[];
  loans: Loan[];
  recurringPayments: RecurringPayment[];
  balance: { totalIncome: number; totalExpense: number; balance: number };
  isLoading: boolean;
  currency: string;
  
  // Auth State
  isLocked: boolean;
  hasPin: boolean;
  isBiometricEnabled: boolean;

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
  filterTransactions: (startDate: number, endDate: number, accountId?: number) => void;
  
  // Account Actions
  addAccount: (name: string, type: string, balance: number, color: string, icon: string) => void;
  updateAccount: (id: number, name: string, type: string, balance: number, color: string, icon: string) => void;
  deleteAccount: (id: number) => void;
  transferFunds: (fromAccountId: number, toAccountId: number, amount: number) => void;

  // Auth Actions
  setLocked: (locked: boolean) => void;
  checkAuth: () => Promise<void>;
  updateAuthSettings: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  categories: [],
  transactions: [],
  accounts: [],
  debts: [],
  loans: [],
  recurringPayments: [],
  balance: { totalIncome: 0, totalExpense: 0, balance: 0 },
  isLoading: true,
  currency: '৳', // Default to BDT

  // Auth State Defaults
  isLocked: false, // Will be updated in init
  hasPin: false,
  isBiometricEnabled: false,

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

      // Check Auth
      await get().checkAuth();

      get().refreshData();
    } catch (error) {
      console.error('Failed to init store:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  checkAuth: async () => {
    const hasPin = await auth.hasPin();
    const isBiometricEnabled = await auth.isBiometricEnabled();
    set({ hasPin, isBiometricEnabled, isLocked: hasPin });
  },

  updateAuthSettings: async () => {
      const hasPin = await auth.hasPin();
      const isBiometricEnabled = await auth.isBiometricEnabled();
      set({ hasPin, isBiometricEnabled });
  },

  setLocked: (locked: boolean) => set({ isLocked: locked }),

  refreshData: () => {
    const categories = repo.getCategories();
    const accounts = repo.getAccounts();
    const transactions = repo.getTransactions(50, 0); // Get last 50
    const balance = repo.getBalance();
    const debts = repo.getDebts();
    const loans = repo.getLoans();
    const recurringPayments = repo.getRecurringPayments();
    set({ categories, accounts, transactions, balance, debts, loans, recurringPayments });
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

  filterTransactions: (startDate, endDate, accountId) => {
    const transactions = repo.getTransactionsByRange(startDate, endDate, accountId);
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
  },

  transferFunds: (fromAccountId, toAccountId, amount) => {
    repo.transferFunds(fromAccountId, toAccountId, amount);
    get().refreshData();
  }
}));
