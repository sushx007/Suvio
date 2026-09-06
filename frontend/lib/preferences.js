// Shared preference constants + FX rates.
export const DEFAULT_PREFERENCES = {
  theme: 'midnight',
  accentColor: '#38bdf8',
  currency: 'INR',
  language: 'en',
  timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC',
  dateFormat: 'DD MMM YYYY',
  numberFormat: 'en-IN',
};

export const CURRENCIES = {
  INR: { symbol: '\u20B9', name: 'Indian Rupee', locale: 'en-IN' },
  USD: { symbol: '$',      name: 'US Dollar',    locale: 'en-US' },
  EUR: { symbol: '\u20AC', name: 'Euro',         locale: 'en-IE' },
  GBP: { symbol: '\u00A3', name: 'British Pound',locale: 'en-GB' },
  AED: { symbol: 'AED ',   name: 'UAE Dirham',   locale: 'en-AE' },
  AUD: { symbol: 'A$',     name: 'Australian Dollar', locale: 'en-AU' },
  CAD: { symbol: 'C$',     name: 'Canadian Dollar',   locale: 'en-CA' },
  SGD: { symbol: 'S$',     name: 'Singapore Dollar',  locale: 'en-SG' },
  JPY: { symbol: '\u00A5', name: 'Japanese Yen',      locale: 'ja-JP' },
};

// FX rates FROM INR (source of truth in DB is INR). Update whenever needed.
export const FX_FROM_INR = {
  INR: 1,
  USD: 1 / 83,
  EUR: 1 / 90,
  GBP: 1 / 105,
  AED: 1 / 22.6,
  AUD: 1 / 55,
  CAD: 1 / 60,
  SGD: 1 / 62,
  JPY: 1 / 0.56,
};

export function convertFromINR(amount, targetCurrency) {
  const rate = FX_FROM_INR[targetCurrency] ?? 1;
  return Number(amount || 0) * rate;
}

export function formatMoney(amount, currency = 'INR', { compact = false, decimals } = {}) {
  const c = CURRENCIES[currency] || CURRENCIES.INR;
  const val = Number(amount || 0);
  const d = decimals ?? (currency === 'JPY' ? 0 : val >= 1000 ? 0 : 2);
  try {
    const formatted = new Intl.NumberFormat(c.locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
      notation: compact ? 'compact' : 'standard',
    }).format(val);
    return `${c.symbol}${formatted}`;
  } catch {
    return `${c.symbol}${val.toFixed(d)}`;
  }
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
  { code: 'ja', label: 'Japanese' },
];

export const DATE_FORMATS = ['DD MMM YYYY', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'];
