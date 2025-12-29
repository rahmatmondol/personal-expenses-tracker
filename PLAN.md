# Development Plan: Personal Finance App

## Phase 1: Project Setup & Foundation
- [ ] Initialize React Native Project (Expo recommended for ease of setup).
- [ ] Configure TypeScript.
- [ ] Setup Navigation Structure (React Navigation).
  - Bottom Tab Navigator (Dashboard, Reports, Settings).
  - Stack Navigator (Add/Edit Transaction).
- [ ] Setup UI Framework (e.g., React Native Paper).

## Phase 2: Core Data & Logic (Local First)
- [ ] Design Data Models.
  - **Transaction**: ID, Date, TotalAmount, Type (Income/Expense).
  - **TransactionItem**: ID, TransactionID, ItemName, Quantity, Unit, PricePerUnit.
  - **Category**: ID, Name, Color.
- [ ] Implement Local Storage Layer.
  - Use `SQLite` (Recommended for relational data like Transactions <-> Items).
  - Create repository functions: `addTransactionWithItems`, `getItemSummaryByMonth`.
- [ ] Implement State Management (Zustand).

## Phase 3: Feature Implementation - Part A (Transactions)
- [ ] **Dashboard Screen**:
  - Display total balance.
  - Trend widgets (3-month / 6-month mini-charts).
- [ ] **Add/Edit Screen**:
  - Master form for Transaction details.
  - **Dynamic Item List**: Button to "Add Item" (Name, Qty, Unit, Price).
- [ ] **Category Management**:
  - Custom categories.

## Phase 4: Feature Implementation - Part B (Analytics)
- [ ] **Reports Screen**:
  - **Financial Report**: Income vs Expense charts.
  - **Item Consumption Report**: List of items purchased with total quantities (e.g., "Potatoes: 8kg").
  - **Trend Comparison**: 3-month and 6-month comparison views.

## Phase 5: Backup & Restore (Encrypted)
- [ ] **Encrypted Export**:
  - Convert database state to JSON string.
  - Encrypt using AES.
  - Save file to device file system.
  - Implement "Share" functionality to save/send the file.
- [ ] **Encrypted Import**:
  - Read file.
  - Decrypt using password.
  - Validate schema.
  - Overwrite/Merge local database.

## Phase 6: Polish & Refinement
- [ ] Implement Dark/Light mode theming.
- [ ] Add currency formatting helpers.
- [ ] Add app icon and splash screen.
- [ ] Final testing and bug fixes.
