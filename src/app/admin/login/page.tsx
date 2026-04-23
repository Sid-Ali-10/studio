
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock, ArrowRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// The secret key for admin access
const ADMIN_SECRET = "GetMeDZ_Admin_2025";

export default function AdminLoginPage() {
  const [key, setKey] = useState("");
  const [error, setError] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (key === ADMIN_SECRET) {
      sessionStorage.setItem("admin_token", "authorized_dz_admin");
      toast({ title: "Access Granted", description: "Welcome to the GetMeDZ Admin Panel." });
      router.push("/admin/dashboard");
    } else {
      setError(true);
      toast({ 
        variant: "destructive", 
        title: "Access Denied", 
        description: "Invalid secret key. Access is restricted to authorized personnel." 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-3xl">
        <div className="bg-primary h-2 w-full" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="text-primary" size={32} />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <CardDescription>Enter the secret key to access the control center.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type="password"
                  placeholder="Enter Secret Key"
                  className={`pl-10 h-14 rounded-2xl border-2 transition-all ${error ? 'border-destructive' : 'focus:border-primary'}`}
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setError(false);
                  }}
                  required
                />
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1 pl-1">
                  <AlertCircle size={12} /> Incorrect secret key
                </p>
              )}
            </div>

            <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-lg gap-2 shadow-lg">
              Unlock Panel <ArrowRight size={20} />
            </Button>
          </form>
          
          <p className="text-center text-[10px] text-muted-foreground mt-8 uppercase tracking-widest font-bold">
            Authorized Personnel Only
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
