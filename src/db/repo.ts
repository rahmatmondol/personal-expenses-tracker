import { db } from './db';
import { Category, Transaction, TransactionItem, Account, Debt, RecurringPayment } from '../types';

// --- Settings ---
export const getSetting = (key: string): string | null => {
    const result = db.getFirstSync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]);
    return result ? result.value : null;
};

export const setSetting = (key: string, value: string): void => {
    db.runSync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
};

// --- Accounts ---
export const getAccounts = (): Account[] => {
    return db.getAllSync<Account>('SELECT * FROM accounts ORDER BY name');
};

export const addAccount = (name: string, type: string, balance: number, color: string, icon: string): void => {
    db.runSync(
        'INSERT INTO accounts (name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?)',
        [name, type, balance, color, icon]
    );
};

export const updateAccount = (id: number, name: string, type: string, balance: number, color: string, icon: string): void => {
    db.runSync(
        'UPDATE accounts SET name = ?, type = ?, balance = ?, color = ?, icon = ? WHERE id = ?',
        [name, type, balance, color, icon, id]
    );
};

export const deleteAccount = (id: number): void => {
    db.runSync('DELETE FROM accounts WHERE id = ?', [id]);
};

// --- Categories ---
export const getCategories = (): Category[] => {
  return db.getAllSync<Category>('SELECT * FROM categories ORDER BY name');
};

export const addCategory = (name: string, type: 'income' | 'expense', color: string, icon: string): void => {
  db.runSync(
    'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)',
    [name, type, color, icon]
  );
};

export const updateCategory = (id: number, name: string, type: 'income' | 'expense', color: string, icon: string): void => {
  db.runSync(
    'UPDATE categories SET name = ?, type = ?, color = ?, icon = ? WHERE id = ?',
    [name, type, color, icon, id]
  );
};

export const deleteCategory = (id: number): void => {
    db.runSync('DELETE FROM categories WHERE id = ?', [id]);
};

// --- Transactions ---
export const getTransactions = (limit: number = 50, offset: number = 0): Transaction[] => {
    return db.getAllSync<Transaction>(`
        SELECT t.*, 
               c.name as categoryName, c.type as categoryType, c.color as categoryColor, c.icon as categoryIcon,
               a.name as accountName
        FROM transactions t
        LEFT JOIN categories c ON t.categoryId = c.id
        LEFT JOIN accounts a ON t.accountId = a.id
        ORDER BY t.date DESC
        LIMIT ? OFFSET ?
    `, [limit, offset]);
};

export const getTransactionsByRange = (startDate: number, endDate: number): Transaction[] => {
    return db.getAllSync<Transaction>(`
        SELECT t.*, 
        c.name as categoryName, c.type as categoryType, c.color as categoryColor, c.icon as categoryIcon,
        a.name as accountName
        FROM transactions t
        LEFT JOIN categories c ON t.categoryId = c.id
        LEFT JOIN accounts a ON t.accountId = a.id
        WHERE t.date BETWEEN ? AND ?
        ORDER BY t.date DESC
    `, [startDate, endDate]);
};

export const getBalance = (): { totalIncome: number; totalExpense: number; balance: number } => {
    const incomeResult = db.getFirstSync<{ total: number }>(`
        SELECT SUM(t.amount) as total 
        FROM transactions t 
        JOIN categories c ON t.categoryId = c.id 
        WHERE c.type = 'income'
    `);
    
    const expenseResult = db.getFirstSync<{ total: number }>(`
        SELECT SUM(t.amount) as total 
        FROM transactions t 
        JOIN categories c ON t.categoryId = c.id 
        WHERE c.type = 'expense'
    `);

    // Calculate actual balance from accounts
    const accountResult = db.getFirstSync<{ total: number }>('SELECT SUM(balance) as total FROM accounts');

    return {
        totalIncome: incomeResult?.total || 0,
        totalExpense: expenseResult?.total || 0,
        balance: accountResult?.total || 0
    };
};

export const addTransaction = (
  amount: number,
  date: number,
  categoryId: number,
  note: string,
  items: Omit<TransactionItem, 'id' | 'transactionId'>[] = [],
  accountId: number | null = null,
  allocations: { accountId: number; amount: number }[] = []
): void => {
  db.withTransactionSync(() => {
    let finalAllocations = allocations;
    // Backward compatibility: if no allocations but accountId exists, treat as single allocation
    // But we also store accountId in transaction table for single account transactions
    
    const result = db.runSync(
      'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
      [amount, date, categoryId, note, accountId]
    );
    const transactionId = result.lastInsertRowId;

    for (const item of items) {
      db.runSync(
        'INSERT INTO transaction_items (transactionId, name, quantity, unit, pricePerUnit) VALUES (?, ?, ?, ?, ?)',
        [transactionId, item.name, item.quantity, item.unit, item.pricePerUnit]
      );
    }

    const category = db.getFirstSync<{type: string}>('SELECT type FROM categories WHERE id = ?', [categoryId]);
    if (!category) return;

    if (finalAllocations.length > 0) {
        for (const alloc of finalAllocations) {
            db.runSync(
                'INSERT INTO transaction_allocations (transactionId, accountId, amount) VALUES (?, ?, ?)',
                [transactionId, alloc.accountId, alloc.amount]
            );
            // Update Balance
            if (category.type === 'expense') {
                db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [alloc.amount, alloc.accountId]);
            } else {
                db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [alloc.amount, alloc.accountId]);
            }
        }
    } else if (accountId) {
        // Single account update
        if (category.type === 'expense') {
            db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, accountId]);
        } else {
            db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, accountId]);
        }
    }
  });
};

export const deleteTransaction = (id: number): void => {
    db.withTransactionSync(() => {
        const transaction = db.getFirstSync<Transaction>('SELECT * FROM transactions WHERE id = ?', [id]);
        if (!transaction) return;

        const category = db.getFirstSync<{type: string}>('SELECT type FROM categories WHERE id = ?', [transaction.categoryId]);
        if (!category) return; // Should not happen

        // Check for allocations
        const allocations = db.getAllSync<{accountId: number; amount: number}>('SELECT accountId, amount FROM transaction_allocations WHERE transactionId = ?', [id]);

        if (allocations.length > 0) {
            for (const alloc of allocations) {
                // Reverse balance
                if (category.type === 'expense') {
                    db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [alloc.amount, alloc.accountId]);
                } else {
                    db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [alloc.amount, alloc.accountId]);
                }
            }
        } else if (transaction.accountId) {
            // Reverse balance for single account
            if (category.type === 'expense') {
                db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [transaction.amount, transaction.accountId]);
            } else {
                db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [transaction.amount, transaction.accountId]);
            }
        }

        db.runSync('DELETE FROM transactions WHERE id = ?', [id]);
    });
};

// --- Debts ---
export const getDebts = (): Debt[] => {
    return db.getAllSync<Debt>('SELECT * FROM debts ORDER BY due_date ASC');
};

const getOrCreateDebtCategory = (type: 'income' | 'expense'): number => {
    const existing = db.getFirstSync<{id: number}>('SELECT id FROM categories WHERE (name = ? OR name = ?) AND type = ?', ['Debt', 'Loan', type]);
    if (existing) return existing.id;
    
    // Create new
    db.runSync('INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)', 
        ['Debt', type, type === 'income' ? '#4CAF50' : '#F44336', 'handshake']);
    const result = db.getFirstSync<{id: number}>('SELECT last_insert_rowid() as id');
    return result?.id || 0;
}

export const addDebt = (amount: number, description: string, type: 'borrowed' | 'lent', due_date: number, contact_name: string, accountId: number | null = null): void => {
    db.withTransactionSync(() => {
        db.runSync(
            'INSERT INTO debts (amount, description, type, due_date, contact_name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [amount, description, type, due_date, contact_name, Date.now()]
        );

        if (accountId) {
            const categoryType = type === 'borrowed' ? 'income' : 'expense';
            const categoryId = getOrCreateDebtCategory(categoryType);
            const note = `Debt: ${type === 'borrowed' ? 'Borrowed from' : 'Lent to'} ${contact_name}${description ? ' - ' + description : ''}`;
            
            // We duplicate logic from addTransaction to avoid nested transaction issues if addTransaction also uses withTransactionSync
            // Or we can just call addTransaction if we trust it handles nesting (Savepoints).
            // Expo SQLite's withTransactionSync uses SAVEPOINTs, so nesting is supported.
            // However, to be absolutely safe and clean, let's just call addTransaction.
            // But wait, addTransaction is defined above.
            // Let's manually do the transaction insert and balance update here to be atomic with Debt insert.
            
            const transResult = db.runSync(
                'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
                [amount, Date.now(), categoryId, note, accountId]
            );
            
            if (categoryType === 'expense') {
                db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, accountId]);
            } else {
                db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, accountId]);
            }
        }
    });
};

export const markDebtAsPaid = (id: number, accountId: number | null = null): void => {
    db.withTransactionSync(() => {
        db.runSync('UPDATE debts SET is_paid = 1 WHERE id = ?', [id]);

        if (accountId) {
            const debt = db.getFirstSync<Debt>('SELECT * FROM debts WHERE id = ?', [id]);
            if (debt) {
                // If borrowed, paying back means Expense.
                // If lent, receiving back means Income.
                const categoryType = debt.type === 'borrowed' ? 'expense' : 'income';
                const categoryId = getOrCreateDebtCategory(categoryType);
                const note = `Debt Repayment: ${debt.type === 'borrowed' ? 'Paid back to' : 'Received from'} ${debt.contact_name}`;
                
                db.runSync(
                    'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
                    [debt.amount, Date.now(), categoryId, note, accountId]
                );
                
                if (categoryType === 'expense') {
                    db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [debt.amount, accountId]);
                } else {
                    db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [debt.amount, accountId]);
                }
            }
        }
    });
};

export const deleteDebt = (id: number): void => {
    db.runSync('DELETE FROM debts WHERE id = ?', [id]);
};

// --- Recurring Payments ---
export const getRecurringPayments = (): RecurringPayment[] => {
    return db.getAllSync<RecurringPayment>(`
        SELECT r.*, c.name as categoryName, c.color as categoryColor, c.icon as categoryIcon 
        FROM recurring_payments r 
        LEFT JOIN categories c ON r.categoryId = c.id
        ORDER BY next_due_date ASC
    `);
};

export const addRecurringPayment = (
    amount: number, 
    description: string, 
    categoryId: number, 
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly', 
    due_day: number, 
    next_due_date: number, 
    reminder_days_before: number
): void => {
    db.runSync(
        'INSERT INTO recurring_payments (amount, description, categoryId, frequency, due_day, next_due_date, reminder_days_before) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [amount, description, categoryId, frequency, due_day, next_due_date, reminder_days_before]
    );
};

export const updateRecurringPaymentNextDate = (id: number, next_due_date: number, last_paid_date: number, amount: number, categoryId: number, note: string, accountId: number | null = null): void => {
    db.withTransactionSync(() => {
        db.runSync(
            'UPDATE recurring_payments SET next_due_date = ?, last_paid_date = ? WHERE id = ?',
            [next_due_date, last_paid_date, id]
        );

        // Record transaction
        const result = db.runSync(
            'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
            [amount, last_paid_date, categoryId, note, accountId]
        );
        
        // Update Account Balance
        if (accountId) {
             db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, accountId]);
        }
    });
};

export const deleteRecurringPayment = (id: number): void => {
    db.runSync('DELETE FROM recurring_payments WHERE id = ?', [id]);
};

// --- System ---
export const resetDatabase = (): void => {
    db.withTransactionSync(() => {
        db.runSync('DELETE FROM transaction_items');
        db.runSync('DELETE FROM transaction_allocations');
        db.runSync('DELETE FROM transactions');
        db.runSync('DELETE FROM recurring_payments');
        db.runSync('DELETE FROM debts');
        db.runSync('DELETE FROM categories');
        db.runSync('DELETE FROM accounts');
        db.runSync('DELETE FROM settings');
    });
};

// --- Reports ---
export const getItemConsumptionReport = (startDate: number, endDate: number) => {
    return db.getAllSync<{name: string, unit: string, totalQuantity: number, totalSpent: number}>(`
        SELECT 
            ti.name, 
            ti.unit, 
            SUM(ti.quantity) as totalQuantity, 
            SUM(ti.quantity * ti.pricePerUnit) as totalSpent
        FROM transaction_items ti
        JOIN transactions t ON ti.transactionId = t.id
        WHERE t.date BETWEEN ? AND ?
        GROUP BY ti.name, ti.unit
        ORDER BY totalSpent DESC
    `, [startDate, endDate]);
};

export const getDailyTrend = (startDate: number, endDate: number) => {
    return db.getAllSync<{day: string, expense: number}>(`
        SELECT 
            strftime('%d', date / 1000, 'unixepoch', 'localtime') as day,
            SUM(t.amount) as expense
        FROM transactions t
        JOIN categories c ON t.categoryId = c.id
        WHERE c.type = 'expense' AND t.date BETWEEN ? AND ?
        GROUP BY day
        ORDER BY day ASC
    `, [startDate, endDate]);
};

export const getMonthlyTrendByRange = (startDate: number, endDate: number) => {
    return db.getAllSync<{month: string, expense: number}>(`
        SELECT 
            strftime('%Y-%m', date / 1000, 'unixepoch', 'localtime') as month,
            SUM(t.amount) as expense
        FROM transactions t
        JOIN categories c ON t.categoryId = c.id
        WHERE c.type = 'expense' AND t.date BETWEEN ? AND ?
        GROUP BY month
        ORDER BY month ASC
    `, [startDate, endDate]);
};
