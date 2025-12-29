import * as SQLite from 'expo-sqlite';

export const db = SQLite.openDatabaseSync('finance.db');

export const initDB = () => {
  try {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'income' or 'expense'
        color TEXT,
        icon TEXT
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        balance REAL DEFAULT 0, -- Initial Balance
        color TEXT,
        icon TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        date INTEGER NOT NULL, -- Unix timestamp
        note TEXT,
        categoryId INTEGER,
        accountId INTEGER,
        FOREIGN KEY (categoryId) REFERENCES categories (id),
        FOREIGN KEY (accountId) REFERENCES accounts (id)
      );

      CREATE TABLE IF NOT EXISTS transaction_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionId INTEGER NOT NULL,
        name TEXT NOT NULL,
        quantity REAL DEFAULT 0,
        unit TEXT,
        pricePerUnit REAL DEFAULT 0,
        FOREIGN KEY (transactionId) REFERENCES transactions (id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS transaction_allocations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionId INTEGER NOT NULL,
        accountId INTEGER NOT NULL,
        amount REAL NOT NULL,
        FOREIGN KEY (transactionId) REFERENCES transactions (id) ON DELETE CASCADE,
        FOREIGN KEY (accountId) REFERENCES accounts (id)
      );

      CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        description TEXT,
        type TEXT NOT NULL, -- 'borrowed', 'lent'
        due_date INTEGER,
        is_paid INTEGER DEFAULT 0,
        contact_name TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS recurring_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        description TEXT,
        categoryId INTEGER,
        frequency TEXT NOT NULL, -- 'monthly', etc.
        due_day INTEGER,
        next_due_date INTEGER,
        reminder_days_before INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        last_paid_date INTEGER,
        FOREIGN KEY (categoryId) REFERENCES categories (id)
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // --- Migrations ---
    try {
        db.execSync('ALTER TABLE transactions ADD COLUMN accountId INTEGER REFERENCES accounts(id);');
    } catch (e) {
        // Column likely exists
    }

    // Seed default categories if empty
    const result = db.getFirstSync('SELECT COUNT(*) as count FROM categories');
    // @ts-ignore
    if (result && result.count === 0) {
        seedCategories();
    }

    // Seed default account if empty
    const accResult = db.getFirstSync('SELECT COUNT(*) as count FROM accounts');
    // @ts-ignore
    if (accResult && accResult.count === 0) {
        seedAccounts();
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

const seedCategories = () => {
    const defaultCategories = [
        { name: 'Salary', type: 'income', color: '#4CAF50', icon: 'cash' },
        { name: 'Freelance', type: 'income', color: '#8BC34A', icon: 'laptop' },
        { name: 'Groceries', type: 'expense', color: '#FF9800', icon: 'cart' },
        { name: 'Transport', type: 'expense', color: '#2196F3', icon: 'bus' },
        { name: 'Housing', type: 'expense', color: '#9C27B0', icon: 'home' },
        { name: 'Entertainment', type: 'expense', color: '#E91E63', icon: 'movie' },
        { name: 'Health', type: 'expense', color: '#F44336', icon: 'hospital' },
        { name: 'Education', type: 'expense', color: '#3F51B5', icon: 'school' },
    ];

    defaultCategories.forEach(cat => {
        db.runSync(
            'INSERT INTO categories (name, type, color, icon) VALUES (?, ?, ?, ?)',
            [cat.name, cat.type, cat.color, cat.icon]
        );
    });
};

const seedAccounts = () => {
    const defaultAccounts = [
        { name: 'Cash', type: 'Cash', balance: 0, color: '#4CAF50', icon: 'cash' },
        { name: 'Bank', type: 'Bank', balance: 0, color: '#2196F3', icon: 'bank' },
        { name: 'Mobile Money', type: 'Mobile', balance: 0, color: '#E91E63', icon: 'cellphone' },
    ];

    defaultAccounts.forEach(acc => {
        db.runSync(
            'INSERT INTO accounts (name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?)',
            [acc.name, acc.type, acc.balance, acc.color, acc.icon]
        );
    });
};
