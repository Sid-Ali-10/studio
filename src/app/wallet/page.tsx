
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
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpCircle, ArrowDownCircle, Clock, Loader2, Plus, Banknote } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  amount: number;
  type: "recharge" | "payment" | "payout";
  description: string;
  createdAt: any;
}

export default function WalletPage() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [rechargeLoading, setRechargeLoading] = useState<number | null>(null);

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
       // Quietly ignore permission errors during auth transitions
      if (error.code !== 'permission-denied') {
        console.error("Wallet listener error:", error);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleRecharge = async (amount: number) => {
    if (!user) return;
    setRechargeLoading(amount);

    try {
      const userRef = doc(db, "userProfiles", user.uid);
      const txRef = collection(db, "userProfiles", user.uid, "transactions");

      // 1. Add transaction record
      await addDoc(txRef, {
        amount: amount,
        type: "recharge",
        description: "Wallet Recharge",
        createdAt: serverTimestamp()
      });

      // 2. Update wallet balance
      await updateDoc(userRef, {
        walletBalance: increment(amount),
        updatedAt: serverTimestamp()
      });

      toast({
        title: "Recharge Successful",
        description: `Successfully added ${amount} DA to your wallet.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Recharge Failed",
        description: "Something went wrong while processing your recharge.",
      });
    } finally {
      setRechargeLoading(null);
    }
  };

  const rechargeAmounts = [1000, 2000, 5000];

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="text-muted-foreground">Manage your funds and view transaction history.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 border-none shadow-xl bg-primary text-primary-foreground overflow-hidden relative">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet size={24} /> Balance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-4xl font-black">
              {profile?.walletBalance?.toLocaleString() || "0"} <span className="text-xl font-medium">DA</span>
            </div>
            <p className="text-primary-foreground/70 text-sm">Available for marketplace deals</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-md bg-card">
          <CardHeader>
            <CardTitle>Quick Recharge</CardTitle>
            <CardDescription>Select an amount to simulate a wallet recharge.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            {rechargeAmounts.map((amount) => (
              <Button
                key={amount}
                variant="outline"
                className="flex-1 min-w-[120px] h-16 rounded-2xl flex flex-col gap-1 hover:border-primary hover:bg-primary/5 transition-all"
                onClick={() => handleRecharge(amount)}
                disabled={rechargeLoading !== null}
              >
                {rechargeLoading === amount ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <span className="font-bold text-lg">{amount} DA</span>
                    <span className="text-[10px] text-muted-foreground">+ Add Funds</span>
                  </>
                )}
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Clock size={20} /> Transaction History
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-3xl border border-dashed">
            <p className="text-muted-foreground">No transactions recorded yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <Card key={tx.id} className="border-none shadow-sm rounded-2xl overflow-hidden hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                      tx.type === "recharge" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                    )}>
                      {tx.type === "recharge" ? <Plus size={24} /> : <Banknote size={24} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold truncate">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.createdAt ? format(tx.createdAt.toDate(), "PPpp") : "Processing..."}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "text-lg font-black shrink-0",
                    tx.type === "recharge" ? "text-accent" : "text-primary"
                  )}>
                    {tx.type === "recharge" ? "+" : "-"}{Math.abs(tx.amount).toLocaleString()} DA
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
