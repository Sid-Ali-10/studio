"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, PlusSquare, User, Heart, ShieldCheck, Mail, LogOut, Loader2, Wallet } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { auth, db } from "@/lib/firebase";
import { signOut, sendEmailVerification } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Logo } from "@/components/Logo";

const SplashScreen = () => (
  <div className="splash-screen">
    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
      <Logo size={80} className="mb-4" />
      <h1 className="text-2xl font-bold text-primary">GetMeDZ</h1>
      <p className="text-muted-foreground text-sm">Connecting Travelers & Buyers</p>
    </div>
  </div>
);

const VerificationScreen = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      toast({ title: "Email sent", description: "Verification link sent to your inbox." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    } finally {
      setResending(false);
    }
  };

  const checkStatus = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6 text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mb-6">
        <Mail className="text-primary w-10 h-10" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
      <p className="text-muted-foreground max-w-xs mb-8">
        We've sent a verification link to <span className="font-semibold text-foreground">{user?.email}</span>. Please verify your email to access GetMeDZ.
      </p>
      
      <div className="space-y-3 w-full max-w-xs">
        <Button onClick={checkStatus} className="w-full h-12 rounded-xl font-bold">
          I've verified my email
        </Button>
        <Button variant="outline" onClick={handleResend} disabled={resending} className="w-full h-12 rounded-xl">
          {resending ? <Loader2 className="animate-spin" /> : "Resend Verification Link"}
        </Button>
        <Button variant="ghost" onClick={() => signOut(auth)} className="w-full h-12 rounded-xl text-destructive hover:text-destructive">
          <LogOut className="mr-2" size={18} /> Logout
        </Button>
      </div>
      
      <div className="mt-12 p-4 bg-muted/50 rounded-2xl text-xs text-muted-foreground max-w-xs">
        <ShieldCheck className="inline-block mr-1" size={12} />
        Verification ensures a safe and trusted community for all Algerians.
      </div>
    </div>
  );
};

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1500);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    if (!user) {
      setHasUnread(false);
      return;
    }

    const q = query(
      collection(db, "conversations"),
      where("participantIds", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const anyUnread = snapshot.docs.some(doc => {
        const data = doc.data();
        const isNotDeleted = !data.deletedBy?.includes(user.uid);
        return isNotDeleted && data.unreadBy?.includes(user.uid);
      });
      setHasUnread(anyUnread);
    }, (error) => {
      if (error.code !== 'permission-denied') {
        console.error("Unread listener error:", error);
      }
    });

    return () => unsubscribe();
  }, [user]);

  if (loading || (showSplash && pathname !== "/login")) {
    return <SplashScreen />;
  }

  const isAuthPage = pathname === "/login";
  if (isAuthPage) return <>{children}</>;

  if (user && !user.emailVerified) {
    return <VerificationScreen />;
  }

  const navItems = [
    { label: "Board", icon: Home, href: "/" },
    { label: "Inbox", icon: MessageSquare, href: "/chat", badge: hasUnread },
    { label: "New", icon: PlusSquare, href: "/listings/new" },
    { label: "Saved", icon: Heart, href: "/favorites" },
    { label: "Wallet", icon: Wallet, href: "/wallet" },
    { label: "Profile", icon: User, href: `/profile/${user?.uid}` },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0 transition-colors duration-300 md:pl-20">
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-20 flex-col items-center py-8 bg-card border-r z-50">
        <Logo size={40} className="mb-8" />
        <nav className="flex flex-col gap-6">
          {navItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "p-3 rounded-xl transition-all relative",
                pathname === item.href 
                  ? "bg-primary text-primary-foreground shadow-lg" 
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon size={24} />
              {item.badge && (
                <span className="absolute top-2 right-2 w-3 h-3 bg-red-500 border-2 border-card rounded-full" />
              )}
            </Link>
          ))}
        </nav>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around px-4 z-50">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1 transition-all p-2 rounded-xl relative",
              pathname === item.href ? "text-primary" : "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <div className="relative">
              <item.icon size={24} />
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 border-2 border-card rounded-full" />
              )}
            </div>
            <span className="text-[10px]">{item.label}</span>
          </Link>
        ))}
      </nav>

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 md:py-12">
        {children}
      </main>
    </div>
  );
};
