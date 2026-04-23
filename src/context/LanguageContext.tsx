
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

  // Create Listing Page
  create_listing_title: { en: "Create Listing", ar: "إنشاء إعلان", fr: "Créer une annonce" },
  create_listing_desc: { en: "Reach out to our community", ar: "تواصل مع مجتمعنا", fr: "Contactez notre communauté" },
  tab_traveler: { en: "Traveler", ar: "مسافر", fr: "Voyageur" },
  tab_buyer: { en: "Buyer", ar: "مشتري", fr: "Acheteur" },
  traveler_offer_title: { en: "Traveler Offer", ar: "عرض مسافر", fr: "Offre de voyageur" },
  traveler_offer_desc: { en: "Share your trip details and available luggage space.", ar: "شارك تفاصيل رحلتك ومساحة الأمتعة المتاحة.", fr: "Partagez les détails de votre voyage et l'espace bagages disponible." },
  buyer_request_title: { en: "Buyer Request", ar: "طلب مشتري", fr: "Demande d'acheteur" },
  buyer_request_desc: { en: "Let travelers know what you need and from where.", ar: "أخبر المسافرين بما تحتاجه ومن أين.", fr: "Informez les voyageurs de ce dont vous avez besoin et d'où." },
  label_title: { en: "Title", ar: "العنوان", fr: "Titre" },
  label_description: { en: "Description", ar: "الوصف", fr: "Description" },
  label_departure_city: { en: "Departure City", ar: "مدينة المغادرة", fr: "Ville de départ" },
  label_purchase_source: { en: "Purchase Source (Country/City)", ar: "مصدر الشراء (البلد/المدينة)", fr: "Source d'achat (Pays/Ville)" },
  label_final_delivery: { en: "Final Delivery Location", ar: "موقع التسليم النهائي", fr: "Lieu de livraison final" },
  label_buyer_city: { en: "Your City in Algeria", ar: "مدينتك في الجزائر", fr: "Votre ville en Algérie" },
  label_arrival_date: { en: "Arrival Date", ar: "تاريخ الوصول", fr: "Date d'arrivée" },
  label_desired_date: { en: "Desired By Date", ar: "مطلوب بحلول تاريخ", fr: "Souhaité avant le" },
  label_available_weight: { en: "Available Weight (kg)", ar: "الوزن المتاح (كجم)", fr: "Poids disponible (kg)" },
  label_max_budget: { en: "Max Budget (DA)", ar: "أقصى ميزانية (د.ج)", fr: "Budget max (DA)" },
  placeholder_traveler_title: { en: "e.g. Arriving from Paris on July 10", ar: "مثلاً: قادم من باريس في 10 يوليو", fr: "ex: Arrivée de Paris le 10 juillet" },
  placeholder_buyer_title: { en: "e.g. Need iPhone 15 Pro from UAE", ar: "مثلاً: أحتاج آيفون 15 برو من الإمارات", fr: "ex: Besoin d'un iPhone 15 Pro des EAU" },
  placeholder_description: { en: "Details about items you can carry, delivery preferences, or product specifics.", ar: "تفاصيل حول العناصر التي يمكنك حملها، أو تفضيلات التسليم، أو تفاصيل المنتج.", fr: "Détails sur les articles que vous pouvez transporter, vos préférences de livraison ou les spécificités du produit." },
  placeholder_departure_city: { en: "e.g. Paris, France", ar: "مثلاً: باريس، فرنسا", fr: "ex: Paris, France" },
  placeholder_purchase_source: { en: "e.g. Dubai, UAE", ar: "مثلاً: دبي، الإمارات", fr: "ex: Dubaï, Émirats Arabes Unis" },
  placeholder_delivery_location: { en: "e.g. Oran", ar: "مثلاً: وهران", fr: "ex: Oran" },
  placeholder_weight: { en: "e.g. 5", ar: "مثلاً: 5", fr: "ex: 5" },
  placeholder_budget: { en: "e.g. 20000", ar: "مثلاً: 20000", fr: "ex: 20000" },
  btn_create_post: { en: "Create Post", ar: "إنشاء منشور", fr: "Créer une publication" },
  btn_posting: { en: "Posting...", ar: "جاري النشر...", fr: "Publication en cours..." },

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
