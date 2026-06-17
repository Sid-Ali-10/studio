
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
import { Clock, Plus, Loader2, CheckCircle2, Sparkles, ShoppingBag } from "lucide-react";
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
      // Sort packages by price
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
        <p className="text-muted-foreground">{t('wallet_subtitle')}</p>
      </div>

      {/* Balance Card - Matching image header */}
      <Card className="rounded-[2rem] border-none shadow-sm bg-card p-8">
        <div className="flex justify-between items-start">
          <div className="space-y-1 text-start">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{t('balance_label')}</p>
            <p className="text-5xl font-black">{profile?.walletBalance || 0}</p>
          </div>
          <div className="w-14 h-14 bg-red-50 dark:bg-red-950/20 rounded-[1.25rem] flex items-center justify-center text-red-500">
            <Sparkles size={28} />
          </div>
        </div>
      </Card>

      {/* Subscription Packages List - Matching image list style */}
      <div className="space-y-4">
        {packages.length === 0 ? (
          <div className="flex justify-center py-12">
            {loading ? <Loader2 className="animate-spin text-primary" size={32} /> : <p className="text-muted-foreground italic">No packages available.</p>}
          </div>
        ) : (
          packages.map((pkg) => (
            <Dialog key={pkg.id} open={isRechargeOpen && selectedPackage?.id === pkg.id} onOpenChange={(open) => {
              setIsRechargeOpen(open);
              if (open) setSelectedPackage(pkg);
            }}>
              <DialogTrigger asChild>
                <Card className="rounded-[2rem] border-none shadow-sm bg-card p-6 flex items-center justify-between cursor-pointer hover:shadow-md transition-all active:scale-[0.99] group">
                  <div className="space-y-1 text-start">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-xl group-hover:text-primary transition-colors">{pkg.name}</h3>
                      {pkg.credits === 5 && (
                        <Badge className="bg-orange-100 text-orange-600 border-none text-[8px] h-4 uppercase font-black px-2">
                          {t('populaire')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {pkg.credits} {pkg.credits === 1 ? t('currency_da_single') : t('currency_da')}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="text-2xl font-black">{pkg.price.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">DA</p>
                  </div>
                </Card>
              </DialogTrigger>
              <DialogContent className="rounded-2xl border-none shadow-2xl" dir={isRTL ? "rtl" : "ltr"}>
                <DialogHeader className="text-start">
                  <DialogTitle>{t('confirm')} {t('recharge_funds')}</DialogTitle>
                  <DialogDescription>
                    You are about to purchase <span className="font-bold">{pkg.credits} {pkg.credits === 1 ? t('currency_da_single') : t('currency_da')}</span> for <span className="font-bold text-primary">{pkg.price} DA</span>.
                  </DialogDescription>
                </DialogHeader>
                <div className="p-4 bg-muted/30 rounded-xl space-y-2 text-start">
                  <div className="flex justify-between text-sm">
                    <span>Package:</span>
                    <span className="font-bold">{pkg.name}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black text-primary border-t pt-2">
                    <span>Total:</span>
                    <span>{pkg.price} DA</span>
                  </div>
                </div>
                <DialogFooter className="gap-2">
                  <Button variant="ghost" className="rounded-xl active:scale-[0.98]" onClick={() => setIsRechargeOpen(false)}>{t('cancel')}</Button>
                  <Button className="rounded-xl px-8 active:scale-[0.98] font-bold" onClick={handleRecharge} disabled={rechargeLoading !== null}>
                    {rechargeLoading ? <Loader2 className="animate-spin" /> : t('confirm')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))
        )}
      </div>

      {/* Transaction History - Kept as requested */}
      <div className="space-y-4 pt-4 border-t">
        <h2 className="text-xl font-bold flex items-center gap-2 text-start"><Clock size={20} /> {t('transaction_history')}</h2>
        
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary" size={32} /></div>
        ) : (
          <div className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No recent payments or deductions.</p>
            ) : (
              transactions.map((tx) => (
                <Card key={tx.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-start">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        tx.amount > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                      )}>
                        {tx.amount > 0 ? <Plus size={24} /> : <CheckCircle2 size={24} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold truncate text-sm">{translateDescription(tx.description)}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">{t(`type_${tx.type}`)} • {tx.createdAt ? format(tx.createdAt.toDate(), "PPpp") : "..."}</p>
                      </div>
                    </div>
                    <div className={cn("text-lg font-black shrink-0 text-start sm:text-end", tx.amount > 0 ? "text-emerald-600" : "text-primary")}>
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
