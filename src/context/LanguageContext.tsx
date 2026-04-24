
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
  back: { en: "Back", ar: "رجوع", fr: "Retour" },
  save: { en: "Save", ar: "حفظ", fr: "Enregistrer" },
  cancel: { en: "Cancel", ar: "إلغاء", fr: "Annuler" },
  confirm: { en: "Confirm", ar: "تأكيد", fr: "Confirmer" },
  
  // Board / Listings
  board_title: { en: "Listings Board", ar: "لوحة الإعلانات", fr: "Tableau des annonces" },
  board_subtitle: { en: "Find travelers or buyers across the Algerian diaspora.", ar: "ابحث عن مسافرين أو مشترين في الشتات الجزائري.", fr: "Trouvez des voyageurs ou des acheteurs dans la diaspora algérienne." },
  all: { en: "All", ar: "الكل", fr: "Tout" },
  traveler: { en: "Traveler", ar: "مسافر", fr: "Voyageur" },
  travelers: { en: "Travelers", ar: "المسافرون", fr: "Voyageurs" },
  buyer: { en: "Buyer", ar: "مشتري", fr: "Acheteur" },
  buyers: { en: "Buyers", ar: "المشترون", fr: "Acheteurs" },
  no_results: { en: "No results found", ar: "لا توجد نتائج", fr: "Aucun résultat trouvé" },
  from: { en: "From", ar: "من", fr: "De" },
  to: { en: "To", ar: "إلى", fr: "À" },
  arriving: { en: "Arriving", ar: "الوصول", fr: "Arrivée" },
  weight: { en: "Weight", ar: "الوزن", fr: "Poids" },
  budget: { en: "Budget", ar: "الميزانية", fr: "Budget" },
  connect: { en: "Connect", ar: "تواصل", fr: "Connecter" },
  connected: { en: "Connected", ar: "متصل", fr: "Connecté" },
  listing_deleted: { en: "Listing deleted", ar: "تم حذف الإعلان", fr: "Annonce supprimée" },
  confirm_delete: { en: "Are you sure you want to delete this?", ar: "هل أنت متأكد أنك تريد الحذف؟", fr: "Êtes-vous sûr de vouloir supprimer ceci ?" },
  confirm_delete_title: { en: "Confirm Deletion", ar: "تأكيد الحذف", fr: "Confirmer la suppression" },

  // Detail View Labels
  label_from_detail: { en: "FROM", ar: "من", fr: "DE" },
  label_to_detail: { en: "TO", ar: "إلى", fr: "À" },
  label_arrival_date_detail: { en: "ARRIVAL DATE", ar: "تاريخ الوصول", fr: "DATE D'ARRIVÉE" },
  label_available_weight_detail: { en: "AVAILABLE WEIGHT", ar: "الوزن المتاح", fr: "POIDS DISPONIBLE" },
  label_purchase_source_detail: { en: "PURCHASE SOURCE", ar: "مصدر الشراء", fr: "SOURCE D'ACHAT" },
  label_city_algeria_detail: { en: "CITY IN ALGERIA", ar: "مدينة في الجزائر", fr: "VILLE EN ALGÉRIE" },
  label_desired_by_detail: { en: "DESIRED BY", ar: "مطلوب بحلول", fr: "SOUHAITÉ AVANT LE" },
  label_budget_detail: { en: "BUDGET", ar: "الميزانية", fr: "BUDGET" },

  // Saved Listings Page
  saved_title: { en: "Saved Listings", ar: "الإعلانات المحفوظة", fr: "Annonces enregistrées" },
  saved_subtitle: { en: "Your personal wishlist of interesting deals.", ar: "قائمة أمنياتك الشخصية للعروض المثيرة للاهتمام.", fr: "Votre liste de souhaits personnelle pour des offres intéressantes." },
  no_saved: { en: "Nothing saved", ar: "لا يوجد شيء محفوظ", fr: "Rien d'enregistré" },
  no_saved_desc: { en: "Go to the main board and heart some posts!", ar: "اذهب إلى اللوحة الرئيسية وأضف بعض المنشورات للمفضلة!", fr: "Allez sur le tableau principal et mettez des cœurs sur des publications !" },
  browse_board: { en: "Browse Board", ar: "تصفح اللوحة", fr: "Parcourir le tableau" },
  removed_favorite: { en: "Removed from favorites", ar: "تمت الإزالة من المحفوظات", fr: "Supprimé des favoris" },

  // Create & Edit Listing Page
  create_listing_title: { en: "Create Listing", ar: "إنشاء إعلان", fr: "Créer une annonce" },
  create_listing_desc: { en: "Reach out to our community", ar: "تواصل مع مجتمعنا", fr: "Contactez notre communauté" },
  edit_post_title: { en: "Edit Post", ar: "تعديل المنشور", fr: "Modifier la publication" },
  edit_post_desc_traveler: { en: "Update your traveler details.", ar: "تحديث تفاصيل المسافر الخاصة بك.", fr: "Mettez à jour vos informations de voyageur." },
  edit_post_desc_buyer: { en: "Update your buyer details.", ar: "تحديث تفاصيل المشتري الخاصة بك.", fr: "Mettez à jour vos informations d'acheteur." },
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
  placeholder_description: { en: "Details about items you can carry...", ar: "تفاصيل حول العناصر التي يمكنك حملها...", fr: "Détails sur les articles..." },
  placeholder_departure_city: { en: "e.g. Paris, France", ar: "مثلاً: باريس، فرنسا", fr: "ex: Paris, France" },
  placeholder_purchase_source: { en: "e.g. Dubai, UAE", ar: "مثلاً: دبي، الإمارات", fr: "ex: Dubaï, Émirats Arabes Unis" },
  placeholder_delivery_location: { en: "e.g. Oran", ar: "مثلاً: وهران", fr: "ex: Oran" },
  placeholder_weight: { en: "e.g. 5", ar: "مثلاً: 5", fr: "ex: 5" },
  placeholder_budget: { en: "e.g. 20000", ar: "مثلاً: 20000", fr: "ex: 20000" },
  btn_create_post: { en: "Create Post", ar: "إنشاء منشور", fr: "Créer une publication" },
  btn_update_post: { en: "Update Post", ar: "تحديث المنشور", fr: "Mettre à jour" },
  btn_posting: { en: "Posting...", ar: "جاري النشر...", fr: "Publication en cours..." },
  btn_saving: { en: "Saving...", ar: "جاري الحفظ...", fr: "Enregistrement..." },
  listing_created: { en: "Listing created!", ar: "تم إنشاء الإعلان!", fr: "Annonce créée !" },
  listing_live: { en: "Your post is now live.", ar: "منشورك متاح الآن.", fr: "Votre publication est maintenant en ligne." },
  error: { en: "Error", ar: "خطأ", fr: "Erreur" },

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
  recharge_success: { en: "added to wallet.", ar: "تمت إضافتها إلى المحفظة.", fr: "ajouté au portefeuille." },
  recharge_failed: { en: "Recharge failed.", ar: "فشل الشحن.", fr: "Échec de la recharge." },
  success: { en: "Success", ar: "تم بنجاح", fr: "Succès" },
  failed: { en: "Failed", ar: "فشل", fr: "Échec" },
  
  // Chat & Messages
  messages_subtitle: { en: "Manage your deals and connections.", ar: "إدارة صفقاتك واتصالاتك.", fr: "Gérez vos transactions et vos relations." },
  search_chats_placeholder: { en: "Search chats...", ar: "البحث في المحادثات...", fr: "Rechercher..." },
  no_chats: { en: "No chats yet", ar: "لا توجد محادثات بعد", fr: "Pas de discussions" },
  no_chats_desc: { en: "Start a deal on the board!", ar: "ابدأ صفقة من اللوحة!", fr: "Commencez une transaction !" },
  conv_started: { en: "Conversation started", ar: "بدأت المحادثة", fr: "Discussion entamée" },
  admin_monitor_notice: { en: "THIS CONVERSATION IS MONITORED BY GETMEDZ ADMINISTRATION", ar: "هذه المحادثة مراقبة من قبل إدارة GetMeDZ", fr: "CETTE CONVERSATION EST SURVEILLÉE PAR L'ADMINISTRATION" },
  rated: { en: "Rated", ar: "تم التقييم", fr: "Évalué" },
  agreed_price_label: { en: "AGREED PRICE", ar: "السعر المتفق عليه", fr: "PRIX CONVENU" },
  report_problem: { en: "Report Problem", ar: "الإبلاغ عن مشكلة", fr: "Signaler" },
  delete_chat: { en: "Delete Chat", ar: "حذف المحادثة", fr: "Supprimer" },
  complete_deal: { en: "Complete Deal", ar: "إتمام الصفقة", fr: "Finaliser" },
  price_offer: { en: "Price Offer", ar: "عرض سعر", fr: "Offre de prix" },
  new_price_offer: { en: "New Price Offer", ar: "عرض سعر جديد", fr: "Nouvelle offre" },
  offer_sent_notice: { en: "You sent this offer.", ar: "لقد أرسلت هذا العرض.", fr: "Offre envoyée." },
  offer_received_notice: { en: "proposed this price.", ar: "اقترح هذا السعر.", fr: "a proposé ce prix." },
  accept: { en: "Accept", ar: "قبول", fr: "Accepter" },
  reject: { en: "Reject", ar: "رفض", fr: "Refuser" },
  type_message: { en: "Type message...", ar: "اكتب رسالة...", fr: "Écrire..." },
  edit: { en: "Edit", ar: "تعديل", fr: "Modifier" },
  delete: { en: "Delete", ar: "حذف", fr: "Supprimer" },
  reply: { en: "Reply", ar: "رد", fr: "Répondre" },
  report_issue_title: { en: "Report Issue", ar: "الإبلاغ عن مشكلة", fr: "Signaler un problème" },
  report_issue_desc: { en: "Describe the issue you're facing. Our team will review it.", ar: "صف المشكلة التي تواجهها. سيقوم فريقنا بمراجعتها.", fr: "Décrivez le problème rencontré. Notre équipe l'examinera." },
  issue_type: { en: "Type of Issue", ar: "نوع المشكلة", fr: "Type de problème" },
  issue_details: { en: "Details", ar: "التفاصيل", fr: "Détails" },
  send_report: { en: "Send Report", ar: "إرسال البلاغ", fr: "Envoyer le signalement" },
  make_price_offer: { en: "Make a Price Offer", ar: "تقديم عرض سعر", fr: "Faire une offre" },
  price_offer_desc: { en: "Propose a price. The other party must accept before finalizing.", ar: "اقترح سعراً. يجب على الطرف الآخر القبول قبل الإتمام.", fr: "Proposez un prix. L'autre partie doit accepter." },
  finalize_settle: { en: "Finalize & Settle", ar: "الإتمام والتسوية", fr: "Finaliser et régler" },
  finalize_desc: { en: "Completing this confirms the deal took place.", ar: "إكمال هذا يؤكد إتمام الصفقة.", fr: "Confirme que la transaction a eu lieu." },
  rate_complete: { en: "Rate & Complete Deal", ar: "تقييم وإتمام الصفقة", fr: "Évaluer et terminer" },
  listing_details: { en: "Listing Details", ar: "تفاصيل الإعلان", fr: "Détails de l'annonce" },
  offer_sent: { en: "Offer sent", ar: "تم إرسال العرض", fr: "Offre envoyée" },
  offer_failed: { en: "Failed to send offer", ar: "فشل إرسال العرض", fr: "Échec de l'envoi de l'offre" },
  offer_accepted: { en: "Offer Accepted!", ar: "تم قبول العرض!", fr: "Offre acceptée !" },
  offer_rejected: { en: "Offer Rejected", ar: "تم رفض العرض", fr: "Offre rejeteé" },
  msg_updated: { en: "Message updated", ar: "تم تحديث الرسالة", fr: "Message mis à jour" },
  msg_deleted: { en: "Message deleted", ar: "تم حذف الرسالة", fr: "Message supprimé" },
  conv_removed: { en: "Conversation removed", ar: "تمت إزالة المحادثة", fr: "Discussion supprimée" },
  rating_saved: { en: "Rating saved!", ar: "تم حفظ التقييم!", fr: "Évaluation enregistrée !" },
  report_sent: { en: "Report Sent", ar: "تم إرسال البلاغ", fr: "Signalement envoyé" },
  deal_finalized: { en: "Deal Finalized!", ar: "تم إتمام الصفقة!", fr: "Transaction finalisée !" },
  incomplete_deal: { en: "Incomplete Deal", ar: "صفقة غير مكتملة", fr: "Transaction incomplète" },
  insufficient_balance: { en: "Insufficient Balance", ar: "رصيد غير كافٍ", fr: "Solde insuffisant" },
  auth_required: { en: "Auth required", ar: "التوثيق مطلوب", fr: "Authentification requise" },
  login_connect: { en: "Log in to connect.", ar: "سجل الدخول للتواصل.", fr: "Connectez-vous pour continuer." },
  
  // Filters
  search_placeholder: { en: "Search by title or description...", ar: "البحث عن طريق العنوان أو الوصف...", fr: "Recherche par titre ou description..." },
  filter_city: { en: "Filter by city", ar: "تصفية حسب المدينة", fr: "Filtrer par ville" },
  filter_weight: { en: "Min weight (kg)", ar: "أقل وزن (كجم)", fr: "Poids min (kg)" },
  filter_budget: { en: "Max budget (DA)", ar: "أقصى ميزانية (د.ج)", fr: "Budget max (DA)" },
  clear_filters: { en: "Clear All Filters", ar: "مسح الفلاتر", fr: "Effacer les filtres" },
  
  // Profile
  verified: { en: "Verified", ar: "موثق", fr: "Vérifié" },
  deals: { en: "Deals", ar: "صفقات", fr: "Transactions" },
  postings: { en: "Postings", ar: "المنشورات", fr: "Annonces" },
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
