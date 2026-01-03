export const formatAmount = (amount: number): string => {
  // Round to nearest integer to avoid float values as per user request
  return Math.round(amount).toString();
};
