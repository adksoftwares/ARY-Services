import React, { createContext, useContext, useState, useEffect } from 'react';

const DICTIONARIES = {
  en: {
    // Brand & Common
    appName: 'ARY Services',
    brandTagline: "Sri Lanka's Trusted Marketplace",
    home: 'Home',
    explore: 'Explore',
    bookings: 'Bookings',
    orders: 'Orders',
    ridesFood: 'Rides & Food',
    grocery: 'Grocery',
    profile: 'Profile',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    register: 'Register',
    customer: 'Customer',
    provider: 'Service Partner',
    driver: 'Driver',
    admin: 'Admin',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    cancel: 'Cancel',
    confirm: 'Confirm',
    accept: 'Accept',
    decline: 'Decline',
    close: 'Close',
    refresh: 'Refresh',

    // Customer Hero
    heroTitle: "Sri Lanka's trusted service marketplace.",
    heroSubtitle: 'Book certified electricians, plumbers, food delivery and rides with fixed pricing and guaranteed workmanship.',
    searchPlaceholder: 'Search electricians, plumbing, grocery, food...',
    findServices: 'Find Services',
    nearYou: 'Near You',
    verifiedGuarantee: '14-Day ARY Workmanship Guarantee',

    // Categories
    catFoodShops: 'Food Shops',
    catElectrical: 'Electrical Repair',
    catPlumbing: 'Plumbing',
    catGrocery: 'Grocery Products',
    catOther: 'Other Services',

    // Booking Statuses
    statusRequested: 'Requested',
    statusAccepted: 'Accepted',
    statusInProgress: 'In Progress',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    statusDisputed: 'Disputed',

    // Mobility
    foodDelivery: 'Food Delivery',
    passengerRides: 'Passenger Rides',
    parcelCourier: 'Parcel Courier',
    pickupAddress: 'Pickup Address',
    dropoffAddress: 'Destination Address',
    fareEstimate: 'Estimated Fare',
    verifyPin: 'Verify Security PIN',

    // Guarantee & Trust
    guaranteeBadge: '100% Verified Professionals',
    guaranteeText: 'All tradespeople are identity-checked and verified by Sri Lankan admin compliance.'
  },
  si: {
    // Brand & Common
    appName: 'ARY සේවා',
    brandTagline: 'ශ්‍රී ලංකාවේ විශ්වාසනීය සේවා ජාලය',
    home: 'මුල් පිටුව',
    explore: 'සොයන්න',
    bookings: 'වෙන්කිරීම්',
    orders: 'ඇණවුම්',
    ridesFood: 'ගමන් සහ ආහාර',
    grocery: 'බඩු බාහිරාදිය',
    profile: 'ගිණුම',
    signIn: 'ඇතුල් වන්න',
    signOut: 'ඉවත් වන්න',
    register: 'ලියාපදිංචි වන්න',
    customer: 'පාරිභෝගික',
    provider: 'සේවා සහකරු',
    driver: 'රියදුරු',
    admin: 'පරිපාලක',
    search: 'සොයන්න',
    filter: 'පෙරහන',
    sort: 'අනුපිළිවෙල',
    cancel: 'අවලංගු කරන්න',
    confirm: 'තහවුරු කරන්න',
    accept: 'පිළිගන්න',
    decline: 'ප්‍රතික්ෂේප කරන්න',
    close: 'වසන්න',
    refresh: 'යාවත්කාලීන කරන්න',

    // Customer Hero
    heroTitle: 'ශ්‍රී ලංකාවේ විශ්වාසනීය දේශීය සේවා වෙළඳපොළ.',
    heroSubtitle: 'ස්ථාවර මිල ගණන් සහ වැඩ වගකීමක් සමඟ සුදුසුකම් ලත් විදුලි කාර්මිකයන්, නල කාර්මිකයන්, ආහාර බෙදාහැරීම් සහ ප්‍රවාහන සේවා වෙන්කරගන්න.',
    searchPlaceholder: 'විදුලි කාර්මිකයන්, නළ කාර්මිකයන්, ආහාර සොයන්න...',
    findServices: 'සේවා සොයන්න',
    nearYou: 'ඔබ අසල',
    verifiedGuarantee: 'දින 14 ක ARY වැඩ වගකීම',

    // Categories
    catFoodShops: 'ආහාර වෙළඳසැල්',
    catElectrical: 'විදුලි අලුත්වැඩියාව',
    catPlumbing: 'නල කාර්මික සේවා',
    catGrocery: 'සිල්ලර බඩු',
    catOther: 'වෙනත් සේවා',

    // Booking Statuses
    statusRequested: 'ඉල්ලුම් කර ඇත',
    statusAccepted: 'පිළිගන්නා ලදී',
    statusInProgress: 'ක්‍රියාත්මක වෙමින් පවතී',
    statusCompleted: 'සම්පූර්ණයි',
    statusCancelled: 'අවලංගුයි',
    statusDisputed: 'ගැටලුවක් වාර්තා කර ඇත',

    // Mobility
    foodDelivery: 'ආහාර බෙදාහැරීම',
    passengerRides: 'මගී ප්‍රවාහනය',
    parcelCourier: 'පාර්සල් බෙදාහැරීම',
    pickupAddress: 'පිටත්වන ස්ථානය',
    dropoffAddress: 'ගමනාන්ත ලිපිනය',
    fareEstimate: 'ඇස්තමේන්තුගත ගාස්තුව',
    verifyPin: 'ආරක්ෂක PIN අංකය',

    // Guarantee & Trust
    guaranteeBadge: '100% තහවුරු කළ වෘත්තිකයන්',
    guaranteeText: 'සියලුම සේවා සපයන්නන්ගේ අනන්‍යතාවය ශ්‍රී ලංකා පරිපාලන කණ්ඩායම විසින් තහවුරු කර ඇත.'
  },
  ta: {
    // Brand & Common
    appName: 'ARY சேவைகள்',
    brandTagline: 'இலங்கையின் நம்பகமான சேவை தளம்',
    home: 'முகப்பு',
    explore: 'ஆராய்க',
    bookings: 'முன்பதிவுகள்',
    orders: 'ஆர்டர்கள்',
    ridesFood: 'பயணங்கள் & உணவு',
    grocery: 'மளிகை பொருட்கள்',
    profile: 'சுயவிவரம்',
    signIn: 'உள்நுழைக',
    signOut: 'வெளியேறுக',
    register: 'பதிவு செய்க',
    customer: 'வாடிக்கையாளர்',
    provider: 'சேவை வழங்குநர்',
    driver: 'சாரதி',
    admin: 'நிர்வாகி',
    search: 'தேடுக',
    filter: 'வடிகட்டுக',
    sort: 'வரிசைப்படுத்துக',
    cancel: 'ரத்து செய்க',
    confirm: 'உறுதி செய்க',
    accept: 'ஏற்றுக்கொள்க',
    decline: 'நிராகரிக்க',
    close: 'மூடுக',
    refresh: 'புதுப்பிக்க',

    // Customer Hero
    heroTitle: 'இலங்கையின் நம்பகமான உள்ளூர் சேவைகள் சந்தை.',
    heroSubtitle: 'மின்சார நிபுணர்கள், குழாய் பழுதுபார்ப்பவர்கள், உணவு விநியோகம் மற்றும் சவாரிகளை உத்தரவாதத்துடன் எளிதாக முன்பதிவு செய்யுங்கள்.',
    searchPlaceholder: 'எலக்ட்ரீஷியன்கள், பிளம்பர்கள், மளிகை, உணவு தேடவும்...',
    findServices: 'சேவைகளை தேடுக',
    nearYou: 'உங்கள் அருகில்',
    verifiedGuarantee: '14-நாள் ARY வேலை உத்தரவாதம்',

    // Categories
    catFoodShops: 'உணவு கடைகள்',
    catElectrical: 'மின் பழுதுபார்ப்பு',
    catPlumbing: 'குழாய் வேலைகள்',
    catGrocery: 'மளிகை பொருட்கள்',
    catOther: 'பிற சேவைகள்',

    // Booking Statuses
    statusRequested: 'கோரப்பட்டது',
    statusAccepted: 'ஏற்றுக்கொள்ளப்பட்டது',
    statusInProgress: 'செயலில் உள்ளது',
    statusCompleted: 'நிறைவடைந்தது',
    statusCancelled: 'ரத்து செய்யப்பட்டது',
    statusDisputed: 'சர்ச்சைக்குரியது',

    // Mobility
    foodDelivery: 'உணவு விநியோகம்',
    passengerRides: 'பயணிகள் சவாரி',
    parcelCourier: 'பார்சல் கூரியர்',
    pickupAddress: 'ஏற்றுதல் முகவரி',
    dropoffAddress: 'சேருமிடம் முகவரி',
    fareEstimate: 'மதிப்பிடப்பட்ட கட்டணம்',
    verifyPin: 'பாதுகாப்பு பின் குறியீடு',

    // Guarantee & Trust
    guaranteeBadge: '100% சரிபார்க்கப்பட்ட நிபுணர்கள்',
    guaranteeText: 'அனைத்து சேவை நிபுணர்களும் இலங்கை நிர்வாகக் குழுவால் சரிபார்க்கப்பட்டவர்கள்.'
  }
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
    return `LKR ${num.toLocaleString('en-LK')}`;
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
    // Fallback if rendered outside provider
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
