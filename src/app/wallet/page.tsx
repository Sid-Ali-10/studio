
'use client';

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  increment, 
  updateDoc
} from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Plus, Loader2, CheckCircle2, Sparkles, ShoppingBag, CreditCard, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Transaction {
  id: string;
  amount: number;
  type: "recharge" | "payment" | "payout" | "commission";
  description: string;
  createdAt: any;
}

interface SubscriptionPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  isPopular?: boolean;
}

const CardVisual = ({ info, isRTL }: { info: any, isRTL: boolean }) => {
  const isEdahabia = info.number.startsWith('6280');
  
  return (
    <div className={cn(
      "relative w-full aspect-[1.58/1] rounded-2xl p-6 text-white overflow-hidden shadow-2xl transition-all duration-500",
      isEdahabia 
        ? "bg-gradient-to-br from-amber-400 via-yellow-600 to-amber-900" 
        : "bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900"
    )}>
      {/* Decorative patterns */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/20 rounded-full -ml-16 -mb-16 blur-2xl" />
      
      <div className="flex justify-between items-start mb-8 relative z-10">
        <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">
            {isEdahabia ? 'ALGERIE POSTE' : 'CIB ALGERIE'}
          </span>
          <span className="text-xs font-bold">{isEdahabia ? 'Edahabia' : 'Interbancaire'}</span>
        </div>
        <div className="w-12 h-9 bg-gradient-to-br from-yellow-200 to-yellow-500 rounded-md border border-white/20 shadow-inner flex items-center justify-center">
          <div className="w-8 h-6 border border-black/10 rounded-sm" />
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="text-xl sm:text-2xl tracking-[0.15em] font-mono drop-shadow-md">
          {info.number || "**** **** **** ****"}
        </div>
        
        <div className="flex justify-between items-end">
          <div className="space-y-0.5 text-start">
            <div className="text-[7px] uppercase font-bold opacity-70">CARD HOLDER</div>
            <div className="text-sm font-black tracking-widest truncate max-w-[150px] uppercase">
              {info.name || "HOLDER NAME"}
            </div>
          </div>
          <div className="space-y-0.5 text-end">
            <div className="text-[7px] uppercase font-bold opacity-70">EXPIRES</div>
            <div className="text-sm font-black font-mono">
              {info.expiry || "MM/YY"}
            </div>
          </div>
        </div>
      </div>

      {/* Brand Logo */}
      <div className="absolute bottom-4 right-6 opacity-80">
        {isEdahabia ? (
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-amber-600 font-black text-xl">S</div>
        ) : (
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full bg-red-500/80" />
            <div className="w-6 h-6 rounded-full bg-yellow-500/80" />
          </div>
        )}
      </div>
    </div>
  );
};

export default function WalletPage() {
  const { user, profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [packages, setPackages] = useState<SubscriptionPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeLoading, setRechargeLoading] = useState<string | null>(null);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<SubscriptionPackage | null>(null);
  
  // Payment step state
  const [paymentStep, setPaymentStep] = useState<'confirm' | 'card'>('confirm');
  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    name: '',
    cvv: ''
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "userProfiles", user.uid, "transactions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribeTx = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      console.error("Wallet listener error:", error);
      setLoading(false);
    });

    const unsubscribePackages = onSnapshot(collection(db, "subscriptionPackages"), (snap) => {
      const pkgs = snap.docs.map(d => ({ id: d.id, ...d.data() } as SubscriptionPackage));
      setPackages(pkgs.sort((a, b) => a.price - b.price));
    });

    return () => {
      unsubscribeTx();
      unsubscribePackages();
    };
  }, [user]);

  const handleRecharge = async () => {
    if (!user || !selectedPackage) return;
    setRechargeLoading(selectedPackage.id);

    try {
      const userRef = doc(db, "userProfiles", user.uid);
      
      await addDoc(collection(db, "userProfiles", user.uid, "transactions"), {
        amount: selectedPackage.credits,
        pricePaid: selectedPackage.price,
        type: "recharge",
        description: `Purchased ${selectedPackage.name}: ${selectedPackage.credits} operations for ${selectedPackage.price} DA`,
        createdAt: serverTimestamp()
      });

      await addDoc(collection(db, "revenue"), {
        amount: selectedPackage.price,
        buyerId: user.uid,
        buyerName: profile?.username || user.email?.split("@")[0],
        packageName: selectedPackage.name,
        creditsGiven: selectedPackage.credits,
        createdAt: serverTimestamp()
      });

      await updateDoc(userRef, {
        walletBalance: increment(selectedPackage.credits),
        updatedAt: serverTimestamp()
      });

      toast({ title: t('success'), description: `${selectedPackage.credits} ${t('recharge_success')}` });
      setIsRechargeOpen(false);
      setSelectedPackage(null);
      setPaymentStep('confirm');
      setCardInfo({ number: '', expiry: '', name: '', cvv: '' });
    } catch (err) {
      console.error("Recharge Error:", err);
      toast({ variant: "destructive", title: t('failed'), description: t('recharge_failed') });
    } finally {
      setRechargeLoading(null);
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    let formatted = '';
    for (let i = 0; i < value.length; i++) {
      if (i > 0 && i % 4 === 0) formatted += ' ';
      formatted += value[i];
    }
    setCardInfo({ ...cardInfo, number: formatted.substring(0, 19) });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 2) {
      value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    setCardInfo({ ...cardInfo, expiry: value.substring(0, 5) });
  };

  const translateDescription = (desc: string) => {
    if (desc.includes("Purchased")) return t('recharge_desc');
    if (desc.includes("Traveler deal commission") || desc.includes("Deduction for successful deal")) {
      return t('marketplace_fee');
    }
    return desc;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="space-y-1 text-start">
        <h1 className="text-3xl font-bold tracking-tight">{t('wallet_title')}</h1>
        <p className="text-sm text-muted-foreground">{t('wallet_subtitle')}</p>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-2xl bg-primary text-primary-foreground p-8 overflow-hidden relative group">
        <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-500">
          <Sparkles size={120} />
        </div>
        <div className="relative z-10 flex justify-between items-center">
          <div className="space-y-1 text-start">
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest">{t('balance_label')}</p>
            <p className="text-6xl font-black">{profile?.walletBalance || 0}</p>
            <p className="text-[10px] font-medium opacity-60 uppercase">{t('balance_subtitle')}</p>
          </div>
          <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md">
            <Sparkles size={32} />
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {packages.length === 0 ? (
          <div className="flex justify-center py-12">
            {loading ? <Loader2 className="animate-spin text-primary" size={32} /> : <p className="text-muted-foreground italic">No packages available.</p>}
          </div>
        ) : (
          packages.map((pkg) => {
            const isPopular = pkg.isPopular;
            return (
              <Card 
                key={pkg.id}
                onClick={() => {
                  setSelectedPackage(pkg);
                  setPaymentStep('confirm');
                  setIsRechargeOpen(true);
                }}
                className={cn(
                  "rounded-[2rem] border-none shadow-sm bg-card p-6 flex items-center justify-between cursor-pointer hover:shadow-xl transition-all active:scale-[0.99] group relative overflow-hidden",
                  isPopular && "ring-2 ring-primary/50"
                )}
              >
                {isPopular && (
                  <div className="absolute top-0 right-0 px-4 py-1 bg-primary text-white text-[9px] font-black rounded-bl-2xl flex items-center gap-1 shadow-sm">
                    <Sparkles size={10} /> {t('populaire')}
                  </div>
                )}
                <div className="space-y-1 text-start">
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-2xl group-hover:text-primary transition-colors">{pkg.name}</h3>
                  </div>
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-tight">
                    {pkg.credits} {pkg.credits === 1 ? t('currency_da_single') : t('currency_da')}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-3xl font-black text-primary">{pkg.price.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">DA</p>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isRechargeOpen} onOpenChange={(open) => {
        setIsRechargeOpen(open);
        if (!open) {
          setPaymentStep('confirm');
          setCardInfo({ number: '', expiry: '', name: '', cvv: '' });
        }
      }}>
        <DialogContent className="rounded-3xl border-none shadow-2xl max-w-lg" dir={isRTL ? "rtl" : "ltr"}>
          <DialogHeader className="text-start">
            <div className="flex items-center gap-2 mb-2">
              {paymentStep === 'card' && (
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8" onClick={() => setPaymentStep('confirm')}>
                  <ArrowLeft size={18} className={cn(isRTL && "rotate-180")} />
                </Button>
              )}
              <DialogTitle className="text-2xl font-black">
                {paymentStep === 'confirm' ? t('confirm') : t('payment_method')}
              </DialogTitle>
            </div>
            <DialogDescription className="text-base">
              {paymentStep === 'confirm' 
                ? `${t('confirm')} ${selectedPackage?.name}: ${selectedPackage?.credits} ${t('currency_da')}`
                : t('secure_payment_notice')
              }
            </DialogDescription>
          </DialogHeader>

          {paymentStep === 'confirm' ? (
            <div className="py-6 space-y-6">
              <div className="p-6 bg-muted/30 rounded-2xl space-y-4 text-start">
                <div className="flex justify-between items-center text-lg font-black text-primary border-t-2 border-primary/10 pt-4">
                  <span>{t('total_platform_revenue')}</span>
                  <span className="text-2xl">{selectedPackage?.price} DA</span>
                </div>
              </div>
              <DialogFooter className="gap-3">
                <Button variant="ghost" className="rounded-xl h-12 flex-1" onClick={() => setIsRechargeOpen(false)}>{t('cancel')}</Button>
                <Button className="rounded-xl h-12 flex-1 font-black shadow-lg" onClick={() => setPaymentStep('card')}>
                  {t('confirm')}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="py-4 space-y-6 animate-in slide-in-from-right duration-300">
              <CardVisual info={cardInfo} isRTL={isRTL} />
              
              <div className="grid gap-4 text-start">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-60 px-1">{t('card_number')}</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input 
                      placeholder="6280 0000 0000 0000" 
                      className="rounded-xl h-12 ps-10 font-mono tracking-widest text-lg" 
                      value={cardInfo.number}
                      onChange={handleCardNumberChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-60 px-1">{t('expiry_date')}</Label>
                    <Input 
                      placeholder="MM/YY" 
                      className="rounded-xl h-12 text-center font-mono" 
                      value={cardInfo.expiry}
                      onChange={handleExpiryChange}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase opacity-60 px-1">{t('cvv')}</Label>
                    <Input 
                      type="password"
                      placeholder="***" 
                      maxLength={3}
                      className="rounded-xl h-12 text-center font-mono" 
                      value={cardInfo.cvv}
                      onChange={(e) => setCardInfo({...cardInfo, cvv: e.target.value.replace(/\D/g, '')})}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase opacity-60 px-1">{t('cardholder_name')}</Label>
                  <Input 
                    placeholder="MOHAMED DZ" 
                    className="rounded-xl h-12 uppercase font-bold" 
                    value={cardInfo.name}
                    onChange={(e) => setCardInfo({...cardInfo, name: e.target.value})}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button 
                  className="w-full h-14 rounded-2xl font-black text-lg shadow-xl hover:scale-[1.02] transition-transform" 
                  onClick={handleRecharge} 
                  disabled={rechargeLoading !== null || !cardInfo.number || !cardInfo.expiry || !cardInfo.name || cardInfo.cvv.length < 3}
                >
                  {rechargeLoading ? <Loader2 className="animate-spin" /> : <><ShoppingBag size={20} className="mr-2" /> {t('pay_now')}</>}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="space-y-4 pt-6">
        <h2 className="text-2xl font-black flex items-center gap-2 text-start px-2"><Clock size={24} className="text-primary" /> {t('transaction_history')}</h2>
        
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 bg-card rounded-3xl italic">No recent payments or deductions.</p>
            ) : (
              transactions.map((tx) => (
                <Card key={tx.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:bg-muted/30 transition-colors">
                  <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                        tx.amount > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                      )}>
                        {tx.amount > 0 ? <Plus size={24} strokeWidth={3} /> : <CheckCircle2 size={24} strokeWidth={3} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm">{translateDescription(tx.description)}</p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">{t(`type_${tx.type}`)} • {tx.createdAt ? format(tx.createdAt.toDate(), "PPpp") : "..."}</p>
                      </div>
                    </div>
                    <div className={cn("text-xl font-black shrink-0 text-start sm:text-end", tx.amount > 0 ? "text-emerald-600" : "text-primary")}>
                      {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString()} {t('currency_da')}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
