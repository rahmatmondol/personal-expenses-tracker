import { db, initDB } from './db';
import { Category, Transaction, TransactionItem, Account, Debt, RecurringPayment, Loan, LoanInstallment } from '../types';

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
    const roundedBalance = Math.round(balance);
    db.runSync(
        'INSERT INTO accounts (name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?)',
        [name, type, roundedBalance, color, icon]
    );
};

export const updateAccount = (id: number, name: string, type: string, balance: number, color: string, icon: string): void => {
    const roundedBalance = Math.round(balance);
    db.runSync(
        'UPDATE accounts SET name = ?, type = ?, balance = ?, color = ?, icon = ? WHERE id = ?',
        [name, type, roundedBalance, color, icon, id]
    );
};

export const deleteAccount = (id: number): void => {
    db.runSync('DELETE FROM accounts WHERE id = ?', [id]);
};

const getOrCreateTransferCategory = (type: 'income' | 'expense'): number => {
    const existing = db.getFirstSync<{id: number}>('SELECT id FROM categories WHERE name = ? AND type = ?', ['Transfer', type]);
    if (existing) return existing.id;
    
    db.runSync('INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)', 
        ['Transfer', type, '#2196F3', 'bank-transfer']);
    const result = db.getFirstSync<{id: number}>('SELECT last_insert_rowid() as id');
    return result?.id || 0;
}

export const transferFunds = (fromAccountId: number, toAccountId: number, amount: number): void => {
    const roundedAmount = Math.round(amount);
    db.withTransactionSync(() => {
        // Get Account Names
        const fromAccount = db.getFirstSync<{name: string}>('SELECT name FROM accounts WHERE id = ?', [fromAccountId]);
        const toAccount = db.getFirstSync<{name: string}>('SELECT name FROM accounts WHERE id = ?', [toAccountId]);

        // 1. Deduct from Source
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [roundedAmount, fromAccountId]);
        
        // Record Expense Transaction
        const expenseCatId = getOrCreateTransferCategory('expense');
        db.runSync(
            'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
            [roundedAmount, Date.now(), expenseCatId, `Transfer to ${toAccount?.name || 'Account'}`, fromAccountId]
        );

        // 2. Add to Destination
        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [roundedAmount, toAccountId]);

        // Record Income Transaction
        const incomeCatId = getOrCreateTransferCategory('income');
        db.runSync(
            'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
            [roundedAmount, Date.now(), incomeCatId, `Transfer from ${fromAccount?.name || 'Account'}`, toAccountId]
        );
    });
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

export const getTransactionsByRange = (startDate: number, endDate: number, accountId?: number): Transaction[] => {
    let query = `
        SELECT t.*, 
        c.name as categoryName, c.type as categoryType, c.color as categoryColor, c.icon as categoryIcon,
        a.name as accountName
        FROM transactions t
        LEFT JOIN categories c ON t.categoryId = c.id
        LEFT JOIN accounts a ON t.accountId = a.id
        WHERE t.date BETWEEN ? AND ?
    `;
    const params: any[] = [startDate, endDate];

    if (accountId) {
        query += ` AND (t.accountId = ? OR EXISTS (SELECT 1 FROM transaction_allocations ta WHERE ta.transactionId = t.id AND ta.accountId = ?))`;
        params.push(accountId, accountId);
    }

    query += ` ORDER BY t.date DESC`;

    return db.getAllSync<Transaction>(query, params);
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
  allocations: { accountId: number; amount: number }[] = [],
  dueInfo?: { amount: number; contactName: string; dueDate: number }
): void => {
  const roundedAmount = Math.round(amount);
  db.withTransactionSync(() => {
    let finalAllocations = allocations;
    
    const result = db.runSync(
      'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
      [roundedAmount, date, categoryId, note, accountId]
    );
    const transactionId = result.lastInsertRowId;

    if (dueInfo && dueInfo.amount > 0) {
        const roundedDueAmount = Math.round(dueInfo.amount);
        db.runSync(
            'INSERT INTO debts (amount, description, type, due_date, contact_name, created_at, transactionId) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [roundedDueAmount, `Pending balance for transaction: ${note}`, 'borrowed', dueInfo.dueDate, dueInfo.contactName, Date.now(), transactionId]
        );
    }

    for (const item of items) {
      db.runSync(
        'INSERT INTO transaction_items (transactionId, name, quantity, unit, pricePerUnit) VALUES (?, ?, ?, ?, ?)',
        [transactionId, item.name, item.quantity, item.unit, Math.round(item.pricePerUnit)]
      );
    }

    const category = db.getFirstSync<{type: string}>('SELECT type FROM categories WHERE id = ?', [categoryId]);
    if (!category) return;

    if (finalAllocations.length > 0) {
        for (const alloc of finalAllocations) {
            const roundedAllocAmount = Math.round(alloc.amount);
            db.runSync(
                'INSERT INTO transaction_allocations (transactionId, accountId, amount) VALUES (?, ?, ?)',
                [transactionId, alloc.accountId, roundedAllocAmount]
            );
            // Update Balance
            if (category.type === 'expense') {
                db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [roundedAllocAmount, alloc.accountId]);
            } else {
                db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [roundedAllocAmount, alloc.accountId]);
            }
        }
    } else if (accountId) {
        // Single account update
        if (category.type === 'expense') {
            db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [roundedAmount, accountId]);
        } else {
            db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [roundedAmount, accountId]);
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
export const getTransactionById = (id: number): Transaction | null => {
    return db.getFirstSync<Transaction>(`
        SELECT t.*, 
        c.name as categoryName, c.type as categoryType, c.color as categoryColor, c.icon as categoryIcon,
        a.name as accountName
        FROM transactions t
        LEFT JOIN categories c ON t.categoryId = c.id
        LEFT JOIN accounts a ON t.accountId = a.id
        WHERE t.id = ?
    `, [id]);
};

export const getTransactionItems = (transactionId: number): TransactionItem[] => {
    return db.getAllSync<TransactionItem>('SELECT * FROM transaction_items WHERE transactionId = ?', [transactionId]);
};

export const getDebtById = (id: number): Debt | null => {
    return db.getFirstSync<Debt>('SELECT * FROM debts WHERE id = ?', [id]);
};

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
    const roundedAmount = Math.round(amount);
    db.withTransactionSync(() => {
        db.runSync(
            'INSERT INTO debts (amount, description, type, due_date, contact_name, created_at) VALUES (?, ?, ?, ?, ?, ?)',
            [roundedAmount, description, type, due_date, contact_name, Date.now()]
        );

        if (accountId) {
            const categoryType = type === 'borrowed' ? 'income' : 'expense';
            const categoryId = getOrCreateDebtCategory(categoryType);
            const note = `Debt: ${type === 'borrowed' ? 'Borrowed from' : 'Lent to'} ${contact_name}${description ? ' - ' + description : ''}`;
            
            db.runSync(
                'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
                [roundedAmount, Date.now(), categoryId, note, accountId]
            );
            
            if (categoryType === 'expense') {
                db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [roundedAmount, accountId]);
            } else {
                db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [roundedAmount, accountId]);
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
    const roundedAmount = Math.round(amount);
    db.runSync(
        'INSERT INTO recurring_payments (amount, description, categoryId, frequency, due_day, next_due_date, reminder_days_before) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [roundedAmount, description, categoryId, frequency, due_day, next_due_date, reminder_days_before]
    );
};

export const updateRecurringPaymentNextDate = (id: number, next_due_date: number, last_paid_date: number, amount: number, categoryId: number, note: string, accountId: number | null = null): void => {
    const roundedAmount = Math.round(amount);
    db.withTransactionSync(() => {
        db.runSync(
            'UPDATE recurring_payments SET next_due_date = ?, last_paid_date = ? WHERE id = ?',
            [next_due_date, last_paid_date, id]
        );

        // Record transaction
        const result = db.runSync(
            'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
            [roundedAmount, last_paid_date, categoryId, note, accountId]
        );
        
        // Update Account Balance
        if (accountId) {
            db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [roundedAmount, accountId]);
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
        db.runSync('DELETE FROM loan_installments');
        db.runSync('DELETE FROM loans');
    });
    // Re-initialize to seed default categories and accounts
    initDB();
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

// --- Loans ---

export const getOrCreateLoanCategory = (type: 'income' | 'expense'): number => {
    const existing = db.getFirstSync<{id: number}>('SELECT id FROM categories WHERE name = ? AND type = ?', ['Loan', type]);
    if (existing) return existing.id;
    
    db.runSync('INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)', 
        ['Loan', type, type === 'income' ? '#4CAF50' : '#F44336', 'cash-multiple']);
    const result = db.getFirstSync<{id: number}>('SELECT last_insert_rowid() as id');
    return result?.id || 0;
}

export const addLoan = (
  loan: Omit<Loan, 'id'>,
  installments: { due_date: number; amount: number }[],
  targetAccountId?: number
): void => {
  const roundedPrincipal = Math.round(loan.principal_amount);
  const roundedRepayable = Math.round(loan.total_repayable);
  const roundedInstallment = Math.round(loan.installment_amount);
  const roundedRemaining = Math.round(loan.remaining_amount);

  db.withTransactionSync(() => {
    db.runSync(
      `INSERT INTO loans (title, principal_amount, interest_rate, total_repayable, start_date, installment_frequency, installment_amount, status, description, remaining_amount)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loan.title,
        roundedPrincipal,
        loan.interest_rate,
        roundedRepayable,
        loan.start_date,
        loan.installment_frequency,
        roundedInstallment,
        loan.status,
        loan.description || '',
        roundedRemaining
      ]
    );

    const result = db.getFirstSync<{ id: number }>('SELECT last_insert_rowid() as id');
    const loanId = result?.id;

    if (loanId) {
      for (const inst of installments) {
        db.runSync(
          'INSERT INTO loan_installments (loan_id, due_date, amount, status) VALUES (?, ?, ?, ?)',
          [loanId, inst.due_date, Math.round(inst.amount), 'pending']
        );
      }
    }

    // Handle deposit to account
    if (targetAccountId) {
        const categoryId = getOrCreateLoanCategory('income');
        
        db.runSync(
            'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
            [roundedPrincipal, loan.start_date, categoryId, `Loan Disbursement: ${loan.title}`, targetAccountId]
        );

        db.runSync('UPDATE accounts SET balance = balance + ? WHERE id = ?', [roundedPrincipal, targetAccountId]);
    }
  });
};

export const getLoans = (): Loan[] => {
  return db.getAllSync<Loan>('SELECT * FROM loans ORDER BY start_date DESC');
};

export const getLoanInstallments = (loanId: number): LoanInstallment[] => {
  return db.getAllSync<LoanInstallment>('SELECT * FROM loan_installments WHERE loan_id = ? ORDER BY due_date ASC', [loanId]);
};

export const payInstallment = (installmentId: number, accountId?: number): void => {
  db.withTransactionSync(() => {
    const installment = db.getFirstSync<LoanInstallment>('SELECT * FROM loan_installments WHERE id = ?', [installmentId]);
    if (!installment || installment.status === 'paid') return;

    db.runSync('UPDATE loan_installments SET status = ?, paid_date = ? WHERE id = ?', ['paid', Date.now(), installmentId]);
    
    db.runSync('UPDATE loans SET remaining_amount = remaining_amount - ? WHERE id = ?', [installment.amount, installment.loan_id]);
    
    if (accountId) {
        const categoryId = getOrCreateLoanCategory('expense');
        db.runSync(
            'INSERT INTO transactions (amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?)',
            [installment.amount, Date.now(), categoryId, `Loan Installment Payment: ${installment.loan_id}`, accountId]
        );
        db.runSync('UPDATE accounts SET balance = balance - ? WHERE id = ?', [installment.amount, accountId]);
    }

    // Check if loan is fully paid
    const loan = db.getFirstSync<{remaining_amount: number}>('SELECT remaining_amount FROM loans WHERE id = ?', [installment.loan_id]);
    if (loan && loan.remaining_amount <= 0) {
        db.runSync('UPDATE loans SET status = ? WHERE id = ?', ['completed', installment.loan_id]);
    }
  });
};

export const deleteLoan = (id: number): void => {
    db.runSync('DELETE FROM loans WHERE id = ?', [id]);
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
