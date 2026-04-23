
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
  // Navigation & General
  feed: { en: "Board", ar: "اللوحة", fr: "Tableau" },
  messages: { en: "Messages", ar: "الرسائل", fr: "Messages" },
  newPost: { en: "New", ar: "جديد", fr: "Nouveau" },
  saved: { en: "Saved", ar: "المحفوظات", fr: "Enregistré" },
  wallet: { en: "Wallet", ar: "المحفظة", fr: "Portefeuille" },
  profile: { en: "Profile", ar: "الملف الشخصي", fr: "Profil" },
  logout: { en: "Logout", ar: "خروج", fr: "Déconnexion" },
  language: { en: "Language", ar: "اللغة", fr: "Langue" },
  theme: { en: "Theme", ar: "المظهر", fr: "Thème" },
  light: { en: "Light", ar: "فاتح", fr: "Clair" },
  dark: { en: "Dark", ar: "داكن", fr: "Sombre" },
  
  // Board / Listings
  board_title: { en: "Listings Board", ar: "لوحة الإعلانات", fr: "Tableau des annonces" },
  board_subtitle: { en: "Find travelers or buyers across the Algerian diaspora.", ar: "ابحث عن مسافرين أو مشترين في الشتات الجزائري.", fr: "Trouvez des voyageurs ou des acheteurs dans la diaspora algérienne." },
  all: { en: "All", ar: "الكل", fr: "Tout" },
  traveler: { en: "Traveler", ar: "مسافر", fr: "Voyageur" },
  travelers: { en: "Travelers", ar: "المسافرون", fr: "Voyageurs" },
  buyer: { en: "Buyer", ar: "مشتري", fr: "Acheteur" },
  buyers: { en: "Buyers", ar: "المشترون", fr: "Acheteurs" },
  no_results: { en: "No results found", ar: "لا توجد نتائج", fr: "Aucun résultat trouvé" },
  
  // Saved Listings Page
  saved_title: { en: "Saved Listings", ar: "الإعلانات المحفوظة", fr: "Annonces enregistrées" },
  saved_subtitle: { en: "Your personal wishlist of interesting deals.", ar: "قائمة أمنياتك الشخصية للعروض المثيرة للاهتمام.", fr: "Votre liste de souhaits personnelle pour des offres intéressantes." },
  no_saved: { en: "Nothing saved", ar: "لا يوجد شيء محفوظ", fr: "Rien d'enregistré" },
  no_saved_desc: { en: "Go to the main board and heart some posts!", ar: "اذهب إلى اللوحة الرئيسية وأضف بعض المنشورات للمفضلة!", fr: "Allez sur le tableau principal et mettez des cœurs sur des publications !" },
  browse_board: { en: "Browse Board", ar: "تصفح اللوحة", fr: "Parcourir le tableau" },

  // Listing Card
  connect: { en: "Connect", ar: "تواصل", fr: "Connecter" },
  connected: { en: "Connected", ar: "متصل", fr: "Connecté" },
  from: { en: "From", ar: "من", fr: "De" },
  to: { en: "To", ar: "إلى", fr: "À" },
  arriving: { en: "Arriving", ar: "الوصول", fr: "Arrivée" },
  weight: { en: "Weight", ar: "الوزن", fr: "Poids" },
  budget: { en: "Budget", ar: "الميزانية", fr: "Budget" },
  price: { en: "Price", ar: "السعر", fr: "Prix" },
  
  // Auth
  login: { en: "Login", ar: "دخول", fr: "Connexion" },
  signup: { en: "Sign Up", ar: "تسجيل", fr: "S'inscrire" },
  email: { en: "Email", ar: "البريد", fr: "Email" },
  password: { en: "Password", ar: "كلمة السر", fr: "Mot de passe" },
  username: { en: "Username", ar: "اسم المستخدم", fr: "Nom d'utilisateur" },
  forgot_password: { en: "Forgot Password?", ar: "نسيت كلمة السر؟", fr: "Mot de passe oublié ?" },
  welcome: { en: "Welcome", ar: "مرحباً", fr: "Bienvenue" },
  
  // Wallet
  wallet_title: { en: "Wallet", ar: "المحفظة", fr: "Portefeuille" },
  wallet_subtitle: { en: "Manage your marketplace funds and commissions.", ar: "إدارة أموال السوق والعمولات الخاصة بك.", fr: "Gérez vos fonds et vos commissions." },
  recharge_funds: { en: "Recharge Funds", ar: "شحن الرصيد", fr: "Recharger les fonds" },
  recharge_subtitle: { en: "Add money to your account for upcoming deals.", ar: "أضف أموالاً إلى حسابك للصفقات القادمة.", fr: "Ajoutez de l'argent à votre compte pour vos futures transactions." },
  balance_label: { en: "Balance", ar: "الرصيد", fr: "Solde" },
  balance_subtitle: { en: "Funds for deals and fees", ar: "أموال للصفقات والرسوم", fr: "Fonds pour les transactions et les frais" },
  add_plus: { en: "Add +", ar: "إضافة +", fr: "Ajouter +" },
  transaction_history: { en: "Transaction History", ar: "سجل العمليات", fr: "Historique des transactions" },
  currency_da: { en: "DA", ar: "د.ج", fr: "DA" },
  type_recharge: { en: "Recharge", ar: "شحن", fr: "Recharge" },
  type_payment: { en: "Payment", ar: "دفع", fr: "Paiement" },
  type_payout: { en: "Payout", ar: "سحب", fr: "Retrait" },
  type_commission: { en: "Commission", ar: "عمولة", fr: "Commission" },
  recharge_desc: { en: "Wallet Recharge", ar: "شحن المحفظة", fr: "Recharge du portefeuille" },
  marketplace_fee: { en: "Marketplace fee", ar: "رسوم السوق", fr: "Frais de marché" },
  platform_fee_deal: { en: "Platform Fee from deal", ar: "رسوم المنصة من الصفقة", fr: "Frais de plateforme de la transaction" },
  
  // Chat
  type_message: { en: "Type message...", ar: "اكتب رسالة...", fr: "Écrire..." },
  send: { en: "Send", ar: "إرسال", fr: "Envoyer" },
  make_offer: { en: "Offer Price", ar: "عرض سعر", fr: "Proposer un prix" },
  complete_deal: { en: "Complete Deal", ar: "إتمام الصفقة", fr: "Finaliser" },
  report: { en: "Report", ar: "إبلاغ", fr: "Signaler" },
  
  // Filters & Placeholders
  search_placeholder: { en: "Search by title or description...", ar: "بحث عن طريق العنوان أو الوصف...", fr: "Recherche par titre ou description..." },
  filter_city: { en: "Filter by city", ar: "تصفية حسب المدينة", fr: "Filtrer par ville" },
  filter_weight: { en: "Min weight (kg)", ar: "أقل وزن (كجم)", fr: "Poids min (kg)" },
  filter_budget: { en: "Max budget (DA)", ar: "أقصى ميزانية (د.ج)", fr: "Budget max (DA)" },
  clear_filters: { en: "Clear All Filters", ar: "مسح الفلاتر", fr: "Effacer les filtres" },
  
  // Profile
  verified: { en: "Verified", ar: "موثق", fr: "Vérifié" },
  deals: { en: "Deals", ar: "صفقات", fr: "Transactions" },
  postings: { en: "Postings", ar: "المنشورات", fr: "Annonces" },
  wallet_funds: { en: "Wallet Funds", ar: "رصيد المحفظة", fr: "Fonds du portefeuille" },
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("language") as Language;
    if (savedLang) setLanguageState(savedLang);
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  const t = (key: string) => {
    return translations[key]?.[language] || key;
  };

  const isRTL = language === "ar";

  if (!mounted) return null;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRTL }}>
      <div dir={isRTL ? "rtl" : "ltr"} className="min-h-screen">
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used within LanguageProvider");
  return context;
};
