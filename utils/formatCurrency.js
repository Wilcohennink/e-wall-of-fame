export const formatCurrency = (value, locale = 'en', currency = 'EUR') => {
    const localeCurrencyMap = {
      nl: 'EUR',
      en: 'USD',
      fr: 'EUR',
      de: 'EUR',
      es: 'EUR',
      zh: 'CNY',
      ja: 'JPY',
      ar: 'SAR',
    };
  
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: localeCurrencyMap[locale] || currency,
    }).format(value);
  };