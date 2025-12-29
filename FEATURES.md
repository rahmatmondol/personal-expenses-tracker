# Personal Finance Manager - App Documentation

## Overview
A comprehensive React Native application for managing personal expenses and earnings. The app prioritizes user privacy by storing all data locally on the device, with options to backup and restore data via encrypted files.

## Features List

### 1. Dashboard & Analytics
- **Total Balance Display**: Instantly view current available balance (Income - Expenses).
- **Summary Cards**: Quick view of total income and total expenses for the current month.
- **Visual Charts**:
  - Pie chart for expense distribution by category.
  - Bar chart for monthly income vs. expense comparison.
- **Trend Analysis**:
  - **Quarterly View**: Compare income/expenses over the last 3 months.
  - **Semi-Annual View**: Compare income/expenses over the last 6 months.
- **Recent Transactions**: List of the latest 5-10 transactions.

### 2. Transaction Management & Itemization
- **Add Income/Expense**:
  - Input Total Amount.
  - Select Category (e.g., Groceries, Transport).
  - Select Date & Time.
- **Detailed Item Logging (New)**:
  - Break down a transaction into specific items.
  - Example: A "Grocery" transaction can include:
    - Potato (2 kg)
    - Onion (1 kg)
    - Oil (1 Liter)
  - Track Quantity and Unit (kg, liter, pieces, etc.).
- **Edit/Delete**: Modify or remove existing transactions.
- **Filtering & Sorting**: Filter by date range or category.

### 3. Advanced Reporting (Item Level)
- **Consumption Report**: See exactly *what* you bought, not just how much you spent.
  - Example: "Total Potatoes bought this month: 8 kg".
  - Example: "Total Oil bought this month: 4 Liters".
- **Price History**: Track how the price of specific items (like Oil) changes over months.

### 3. Category Management
- **Pre-defined Categories**: Common categories for immediate use.
- **Custom Categories**: Users can add, edit, or delete categories.
- **Color/Icon Coding**: Assign colors or icons to categories for better visual distinction.

### 4. Data Persistence & Security
- **Local Storage**: All data is stored securely on the device using efficient local database solutions (e.g., SQLite or MMKV).
- **Offline Access**: Full functionality without internet connection.

### 5. Backup & Restore (Data Portability)
- **Encrypted Export**: Export all transaction data to an encrypted file (password protected).
- **Encrypted Import**: Restore data from a valid encrypted backup file.

### 6. Settings & Customization
- **Currency Support**: Select preferred currency symbol.
- **Theme Support**: Light and Dark mode toggle.
- **Data Management**: Option to clear all data (Factory Reset).

## Technical Architecture Plan

### Tech Stack
- **Framework**: React Native (Expo or CLI).
- **Language**: TypeScript.
- **State Management**: React Context API or Zustand.
- **Local Database**: WatermelonDB or SQLite.
- **Navigation**: React Navigation.
- **UI Component Library**: React Native Paper or Tamagui (for consistent design).
- **Charts**: `react-native-chart-kit` or `react-native-gifted-charts`.
- **File Handling**: `expo-file-system` or `react-native-fs`.

### Data Structure (JSON Schema)
```json
{
  "userSettings": {
    "currency": "USD",
    "theme": "dark"
  },
  "categories": [
    { "id": "c1", "name": "Food", "type": "expense", "color": "#FF5733" },
    { "id": "c2", "name": "Salary", "type": "income", "color": "#33FF57" }
  ],
  "transactions": [
    {
      "id": "t1",
      "amount": 50.00,
      "categoryId": "c1",
      "date": "2023-10-27T10:00:00Z",
      "note": "Lunch"
    }
  ]
}
```
