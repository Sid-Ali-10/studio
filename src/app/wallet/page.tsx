
"use client";

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, History, Plus, Loader2, Clock, CheckCircle2, ShoppingCart } from "lucide-react";
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

interface Transaction {
  id: string;
  amount: number;
  type: "recharge" | "payment" | "payout" | "commission";
  description: string;
  createdAt: any;
}

export default function WalletPage() {
  const { user, profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeLoading, setRechargeLoading] = useState<number | null>(null);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<{ credits: number, price: number } | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "userProfiles", user.uid, "transactions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Transaction));
      setTransactions(txs);
      setLoading(false);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error("Wallet listener error:", error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleRecharge = async () => {
    if (!user || !selectedPackage) return;
    setRechargeLoading(selectedPackage.credits);

    try {
      const userRef = doc(db, "userProfiles", user.uid);
      const txRef = collection(db, "userProfiles", user.uid, "transactions");

      // Record the credit addition
      await addDoc(txRef, {
        amount: selectedPackage.credits,
        pricePaid: selectedPackage.price,
        type: "recharge",
        description: `Purchased ${selectedPackage.credits} operations for ${selectedPackage.price} DA`,
        createdAt: serverTimestamp()
      });

      // Update user credits
      await updateDoc(userRef, {
        walletBalance: increment(selectedPackage.credits),
        updatedAt: serverTimestamp()
      });

      toast({ title: t('success'), description: `${selectedPackage.credits} ${t('recharge_success')}` });
      setIsRechargeOpen(false);
      setSelectedPackage(null);
    } catch (err) {
      toast({ variant: "destructive", title: t('failed'), description: t('recharge_failed') });
    } finally {
      setRechargeLoading(null);
    }
  };

  // Predefined credit packages with actual DA prices
  const creditPackages = [
    { credits: 5, price: 500 },
    { credits: 12, price: 1000 },
    { credits: 30, price: 2000 }
  ];

  const translateDescription = (desc: string) => {
    if (desc.startsWith("Purchased")) return t('recharge_desc');
    if (desc.startsWith("Traveler deal commission") || desc.startsWith("Deduction for successful deal")) {
      return t('marketplace_fee');
    }
    return desc;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="space-y-1 text-start">
        <h1 className="text-3xl font-bold tracking-tight">{t('wallet_title')}</h1>
        <p className="text-muted-foreground">{t('wallet_subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-xl bg-primary text-primary-foreground overflow-hidden">
          <CardHeader className="text-start">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 size={24} /> {t('balance_label')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-start">
            <div className="text-5xl font-black">
              {profile?.walletBalance?.toLocaleString() || "0"} <span className="text-xl font-medium">{t('currency_da')}</span>
            </div>
            <p className="text-primary-foreground/70 text-sm">{t('balance_subtitle')}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-md bg-card">
          <CardHeader className="text-start">
            <CardTitle className="flex items-center gap-2"><ShoppingCart size={20} /> {t('recharge_funds')}</CardTitle>
            <CardDescription>{t('recharge_subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {creditPackages.map((pkg) => (
              <Dialog key={pkg.credits} open={isRechargeOpen && selectedPackage?.credits === pkg.credits} onOpenChange={(open) => {
                setIsRechargeOpen(open);
                if (open) setSelectedPackage(pkg);
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1 min-w-[140px] h-20 rounded-2xl flex flex-col gap-1 hover:border-primary transition-all active:scale-[0.98] bg-muted/30 border-none"
                  >
                    <span className="font-black text-lg">{pkg.credits} {t('currency_da')}</span>
                    <span className="text-xs font-bold text-primary">{pkg.price} {t('price_da')}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl border-none shadow-2xl" dir={isRTL ? "rtl" : "ltr"}>
                  <DialogHeader className="text-start">
                    <DialogTitle>{t('confirm')} {t('recharge_funds')}</DialogTitle>
                    <DialogDescription>
                      You are about to purchase <span className="font-bold">{pkg.credits} operation credits</span> for <span className="font-bold text-primary">{pkg.price} DA</span>. This amount will be processed as a subscription fee.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="p-4 bg-muted/30 rounded-xl space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Package:</span>
                      <span className="font-bold">{pkg.credits} Credits</span>
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
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
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
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 text-start">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                        tx.amount > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-primary/10 text-primary"
                      )}>
                        {tx.amount > 0 ? <Plus size={24} /> : <CheckCircle2 size={24} />}
                      </div>
                      <div>
                        <p className="font-bold truncate">{translateDescription(tx.description)}</p>
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
