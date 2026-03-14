/**
 * Safe number formatting utilities
 * Prevents crashes from undefined/null values in toLocaleString
 */

export const safeFormatNumber = (
  value: any,
  locale: string = 'pl-PL',
  options?: Intl.NumberFormatOptions
): string => {
  try {
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return '0.00';
    }
    return numericValue.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options,
    });
  } catch (error) {
    console.warn('safeFormatNumber failed:', error, 'value:', value);
    return '0.00';
  }
};

export const safeFormatCurrency = (
  value: any,
  currency: string = 'PLN',
  locale: string = 'pl-PL'
): string => {
  try {
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
      return `0.00 ${currency}`;
    }
    const formatted = numericValue.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`;
  } catch (error) {
    console.warn('safeFormatCurrency failed:', error, 'value:', value);
    return `0.00 ${currency}`;
  }
};

export const safeFormatDate = (
  date: any,
  locale?: string,
  options?: Intl.DateTimeFormatOptions
): string => {
  try {
    if (!date) return 'N/A';
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    return dateObj.toLocaleString(locale, options);
  } catch (error) {
    console.warn('safeFormatDate failed:', error, 'date:', date);
    return 'Invalid Date';
  }
};
