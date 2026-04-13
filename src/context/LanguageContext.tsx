
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "en" | "ar" | "fr";

interface Translations {
  [key: string]: {
    en: string;
    ar: string;
    fr: string;
  };
}

export const translations: Translations = {
  feed: { en: "Listings Board", ar: "لوحة الإعلانات", fr: "Tableau des annonces" },
  messages: { en: "Messages", ar: "الرسائل", fr: "Messages" },
  newPost: { en: "New Post", ar: "إعلان جديد", fr: "Nouvelle annonce" },
  saved: { en: "Saved", ar: "المحفوظات", fr: "Enregistré" },
  wallet: { en: "Wallet", ar: "المحفظة", fr: "Portefeuille" },
  profile: { en: "Profile", ar: "الملف الشخصي", fr: "Profil" },
  logout: { en: "Logout", ar: "تسجيل الخروج", fr: "Déconnexion" },
  language: { en: "Language", ar: "اللغة", fr: "Langue" },
  theme: { en: "Theme", ar: "المظهر", fr: "Thème" },
  deals: { en: "Deals", ar: "صفقات", fr: "Transactions" },
  verified: { en: "Verified", ar: "موثق", fr: "Vérifié" },
  all: { en: "All", ar: "الكل", fr: "Tout" },
  travelers: { en: "Travelers", ar: "المسافرون", fr: "Voyageurs" },
  buyers: { en: "Buyers", ar: "المشترون", fr: "Acheteurs" },
  connect: { en: "Connect", ar: "تواصل", fr: "Connecter" },
  search: { en: "Search...", ar: "بحث...", fr: "Rechercher..." },
  settings: { en: "Settings", ar: "الإعدادات", fr: "Paramètres" },
  light: { en: "Light", ar: "فاتح", fr: "Clair" },
  dark: { en: "Dark", ar: "داكن", fr: "Sombre" },
  from: { en: "From", ar: "من", fr: "De" },
  to: { en: "To", ar: "إلى", fr: "À" },
  arriving: { en: "Arriving", ar: "يصل في", fr: "Arrivée" },
  weight: { en: "Weight", ar: "الوزن", fr: "Poids" },
  budget: { en: "Budget", ar: "الميزانية", fr: "Budget" },
  source: { en: "Source", ar: "المصدر", fr: "Source" },
  city: { en: "City", ar: "المدينة", fr: "Ville" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang) setLanguageState(savedLang);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  const isRTL = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"}>{children}</div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
