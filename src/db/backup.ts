import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AES from 'crypto-js/aes';
import encUtf8 from 'crypto-js/enc-utf8';
import { db } from './db';

const DB_NAME = 'finance.db';

export const exportDataToCSV = async () => {
    try {
        const transactions = db.getAllSync(`
            SELECT 
                t.date, 
                t.amount, 
                c.type as type, 
                c.name as category, 
                a.name as account, 
                t.note 
            FROM transactions t
            LEFT JOIN categories c ON t.categoryId = c.id
            LEFT JOIN accounts a ON t.accountId = a.id
            ORDER BY t.date DESC
        `);

        let csv = 'Date,Amount,Type,Category,Account,Note\n';
        transactions.forEach((t: any) => {
            const row = [
                new Date(t.date).toISOString().split('T')[0],
                t.amount,
                t.type,
                `"${t.category || ''}"`,
                `"${t.account || ''}"`,
                `"${(t.note || '').replace(/"/g, '""')}"`
            ].join(',');
            csv += row + '\n';
        });

        const fileUri = FileSystem.documentDirectory + 'transactions.csv';
        await FileSystem.writeAsStringAsync(fileUri, csv);

        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(fileUri);
        } else {
            alert('Sharing is not available');
        }
        return true;
    } catch (error) {
        console.error('CSV Export failed:', error);
        return false;
    }
};

export const exportDataToJSON = async (password: string, filename?: string) => {
  try {
    // 1. Get all data from DB
    const categories = db.getAllSync('SELECT * FROM categories');
    const transactions = db.getAllSync('SELECT * FROM transactions');
    const items = db.getAllSync('SELECT * FROM transaction_items');
    const accounts = db.getAllSync('SELECT * FROM accounts');
    const debts = db.getAllSync('SELECT * FROM debts');
    const recurringPayments = db.getAllSync('SELECT * FROM recurring_payments');
    const settings = db.getAllSync('SELECT * FROM settings');
    const transactionAllocations = db.getAllSync('SELECT * FROM transaction_allocations');

    const backupData = {
        version: 1,
        timestamp: Date.now(),
        categories,
        transactions,
        items,
        accounts,
        debts,
        recurringPayments,
        settings,
        transactionAllocations
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    
    // Encrypt
    const encrypted = AES.encrypt(jsonString, password).toString();

    // 2. Write to local file
    const safeFilename = filename ? filename.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'finance_backup';
    const finalFilename = safeFilename.endsWith('.enc') ? safeFilename : `${safeFilename}.enc`;
    const fileUri = FileSystem.documentDirectory + finalFilename;
    await FileSystem.writeAsStringAsync(fileUri, encrypted);

    // 3. Share the file
    if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
    } else {
        alert('Sharing is not available on this device');
    }
    
    return true;
  } catch (error) {
    console.error('Export failed:', error);
    return false;
  }
};

export const importDataFromJSON = async (uri: string, password: string) => {
    try {
        const content = await FileSystem.readAsStringAsync(uri);
        
        // Decrypt
        let jsonString = '';
        try {
            const bytes = AES.decrypt(content, password);
            jsonString = bytes.toString(encUtf8);
        } catch (e) {
            throw new Error('Invalid password or file corrupted');
        }

        if (!jsonString) {
             throw new Error('Decryption failed. Wrong password?');
        }

        const data = JSON.parse(jsonString);
        
        // Basic validation
        if (!data.categories || !data.transactions) {
            throw new Error('Invalid backup file structure');
        }

        // Restore Data (Clear and Insert)
        db.withTransactionSync(() => {
            // Clear all tables
            db.runSync('DELETE FROM transaction_items');
            db.runSync('DELETE FROM transaction_allocations');
            db.runSync('DELETE FROM transactions');
            db.runSync('DELETE FROM recurring_payments');
            db.runSync('DELETE FROM debts');
            db.runSync('DELETE FROM categories');
            db.runSync('DELETE FROM accounts');
            db.runSync('DELETE FROM settings');

            // Restore Accounts (Important to do before transactions due to foreign keys if enforced, though we use simple inserts)
            if (data.accounts) {
                data.accounts.forEach((a: any) => {
                    db.runSync(
                        'INSERT INTO accounts (id, name, type, balance, color, icon) VALUES (?, ?, ?, ?, ?, ?)',
                        [a.id, a.name, a.type, a.balance, a.color, a.icon]
                    );
                });
            }

            // Restore Categories
            data.categories.forEach((c: any) => {
                db.runSync(
                    'INSERT INTO categories (id, name, type, color, icon) VALUES (?, ?, ?, ?, ?)',
                    [c.id, c.name, c.type, c.color, c.icon]
                );
            });

            // Restore Transactions
            data.transactions.forEach((t: any) => {
                 db.runSync(
                    'INSERT INTO transactions (id, amount, date, categoryId, note, accountId) VALUES (?, ?, ?, ?, ?, ?)',
                    [t.id, t.amount, t.date, t.categoryId, t.note, t.accountId]
                 );
            });

            // Restore Items
            if (data.items) {
                data.items.forEach((i: any) => {
                    db.runSync(
                        'INSERT INTO transaction_items (id, transactionId, name, quantity, unit, pricePerUnit) VALUES (?, ?, ?, ?, ?, ?)',
                        [i.id, i.transactionId, i.name, i.quantity, i.unit, i.pricePerUnit]
                    );
                });
            }

            // Restore Allocations
            if (data.transactionAllocations) {
                data.transactionAllocations.forEach((ta: any) => {
                    db.runSync(
                        'INSERT INTO transaction_allocations (id, transactionId, accountId, amount) VALUES (?, ?, ?, ?)',
                        [ta.id, ta.transactionId, ta.accountId, ta.amount]
                    );
                });
            }

            // Restore Debts
            if (data.debts) {
                data.debts.forEach((d: any) => {
                    db.runSync(
                        'INSERT INTO debts (id, amount, description, type, due_date, is_paid, contact_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [d.id, d.amount, d.description, d.type, d.due_date, d.is_paid, d.contact_name, d.created_at]
                    );
                });
            }

            // Restore Recurring Payments
            if (data.recurringPayments) {
                data.recurringPayments.forEach((r: any) => {
                    db.runSync(
                        'INSERT INTO recurring_payments (id, amount, description, categoryId, frequency, due_day, next_due_date, reminder_days_before, is_active, last_paid_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [r.id, r.amount, r.description, r.categoryId, r.frequency, r.due_day, r.next_due_date, r.reminder_days_before, r.is_active, r.last_paid_date]
                    );
                });
            }

            // Restore Settings
            if (data.settings) {
                data.settings.forEach((s: any) => {
                    db.runSync(
                        'INSERT INTO settings (key, value) VALUES (?, ?)',
                        [s.key, s.value]
                    );
                });
            }
        });

        return true;
    } catch (error) {
        console.error('Import failed:', error);
        throw error;
    }
};
