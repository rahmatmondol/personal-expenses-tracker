export const formatAmount = (amount: number): string => {
  // Rounds to 2 decimal places and removes trailing zeros
  // 100.00 -> 100
  // 100.50 -> 100.5
  // 100.52 -> 100.52
  return parseFloat(amount.toFixed(2)).toString();
};
