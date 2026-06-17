
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
import { Clock, Plus, Loader2, CheckCircle2, Sparkles, ShoppingBag, Star } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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
}

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
    } catch (err) {
      console.error("Recharge Error:", err);
      toast({ variant: "destructive", title: t('failed'), description: t('recharge_failed') });
    } finally {
      setRechargeLoading(null);
    }
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

      {/* Balance Card */}
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

      {/* Subscription Packages List */}
      <div className="space-y-4">
        {packages.length === 0 ? (
          <div className="flex justify-center py-12">
            {loading ? <Loader2 className="animate-spin text-primary" size={32} /> : <p className="text-muted-foreground italic">No packages available.</p>}
          </div>
        ) : (
          packages.map((pkg) => {
            const isPopular = pkg.credits === 5;
            return (
              <Dialog key={pkg.id} open={isRechargeOpen && selectedPackage?.id === pkg.id} onOpenChange={(open) => {
                setIsRechargeOpen(open);
                if (open) setSelectedPackage(pkg);
              }}>
                <DialogTrigger asChild>
                  <Card className={cn(
                    "rounded-[2rem] border-none shadow-sm bg-card p-6 flex items-center justify-between cursor-pointer hover:shadow-xl transition-all active:scale-[0.99] group relative overflow-hidden",
                    isPopular && "ring-2 ring-primary/50"
                  )}>
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
                </DialogTrigger>
                <DialogContent className="rounded-3xl border-none shadow-2xl" dir={isRTL ? "rtl" : "ltr"}>
                  <DialogHeader className="text-start">
                    <DialogTitle className="text-2xl font-black">{t('confirm')} {t('recharge_funds')}</DialogTitle>
                    <DialogDescription className="text-base">
                      {t('confirm')} <span className="font-black text-primary">{pkg.name}</span>: {pkg.credits} {t('currency_da')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-6 bg-muted/30 rounded-2xl space-y-4 text-start">
                    <div className="flex justify-between items-center text-lg font-black text-primary border-t-2 border-primary/10 pt-4">
                      <span>{t('total_platform_revenue')}</span>
                      <span className="text-2xl">{pkg.price} DA</span>
                    </div>
                  </div>
                  <DialogFooter className="gap-3">
                    <Button variant="ghost" className="rounded-xl h-12 flex-1" onClick={() => setIsRechargeOpen(false)}>{t('cancel')}</Button>
                    <Button className="rounded-xl h-12 flex-1 font-black shadow-lg" onClick={handleRecharge} disabled={rechargeLoading !== null}>
                      {rechargeLoading ? <Loader2 className="animate-spin" /> : t('confirm')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            );
          })
        )}
      </div>

      {/* Transaction History */}
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
