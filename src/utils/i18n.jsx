import React, { createContext, useContext, useState, useEffect } from 'react';
import enDict from './i18n/locales/en.json';
import siDict from './i18n/locales/si.json';
import taDict from './i18n/locales/ta.json';

const DICTIONARIES = {
  en: enDict,
  si: siDict,
  ta: taDict
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('ary_language');
        if (saved && ['en', 'si', 'ta'].includes(saved)) {
          return saved;
        }
      }
    } catch {}
    return 'en';
  });

  const setLanguage = (lang) => {
    if (['en', 'si', 'ta'].includes(lang)) {
      setLanguageState(lang);
      try {
        localStorage.setItem('ary_language', lang);
        document.documentElement.lang = lang;
      } catch {}
    }
  };

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {}
  }, [language]);

  const t = (key, fallback = '') => {
    const dict = DICTIONARIES[language] || DICTIONARIES.en;
    return dict[key] || DICTIONARIES.en[key] || fallback || key;
  };

  const formatLKR = (amount) => {
    const num = Number(amount) || 0;
    try {
      return new Intl.NumberFormat('en-LK', {
        style: 'currency',
        currency: 'LKR',
        maximumFractionDigits: 0
      }).format(num);
    } catch {
      return `LKR ${num.toLocaleString('en-LK')}`;
    }
  };

  const formatDate = (dateInput) => {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK';
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(date);
    } catch {
      return date.toLocaleDateString();
    }
  };

  const formatPhone = (phoneStr) => {
    if (!phoneStr) return '';
    const cleaned = String(phoneStr).replace(/\D/g, '');
    if (cleaned.startsWith('94') && cleaned.length === 11) {
      return `+94 ${cleaned.slice(2, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    if (cleaned.startsWith('0') && cleaned.length === 10) {
      return `+94 ${cleaned.slice(1, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
    }
    return phoneStr;
  };

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'si', label: 'Sinhala', native: 'සිංහල' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' }
  ];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatLKR,
        formatDate,
        formatPhone,
        languages
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useT() {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (k, fb = '') => fb || k,
      formatLKR: (amt) => `LKR ${Number(amt || 0).toLocaleString('en-LK')}`,
      formatDate: (d) => new Date(d).toLocaleDateString(),
      formatPhone: (p) => p,
      languages: [
        { code: 'en', label: 'English', native: 'English' },
        { code: 'si', label: 'Sinhala', native: 'සිංහල' },
        { code: 'ta', label: 'Tamil', native: 'தமிழ்' }
      ]
    };
  }
  return context;
}
