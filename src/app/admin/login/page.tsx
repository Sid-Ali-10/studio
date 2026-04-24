
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, ArrowRight, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// The secret key for admin access
const ADMIN_SECRET = 'GetMeDZ_Admin';

export default function AdminLoginPage() {
  const [key, setKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (key === ADMIN_SECRET) {
      try {
        const currentUser = auth.currentUser;

        if (currentUser) {
          const profileRef = doc(db, 'userProfiles', currentUser.uid);
          await setDoc(
            profileRef,
            {
              isAdmin: true,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } else {
          toast({
            variant: 'destructive',
            title: 'Authentication Required',
            description: 'You must be logged into your account before unlocking the admin panel.',
          });
          setLoading(false);
          return;
        }

        sessionStorage.setItem('admin_token', 'authorized_dz_admin');
        toast({ title: 'Access Granted', description: 'Admin privileges synchronized with your account.' });
        router.push('/admin/dashboard');
      } catch (err: any) {
        console.error('Admin promotion failed:', err);
        toast({
          variant: 'destructive',
          title: 'Sync Error',
          description: 'Could not verify admin status in the database. Please try again.',
        });
      } finally {
        setLoading(false);
      }
    } else {
      setError(true);
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Invalid secret key. Access is restricted to authorized personnel.',
      });
    }
  };

  return (
    <div dir="ltr" className="min-h-screen flex items-center justify-center bg-muted/30 p-4 text-left">
      <Card className="w-full max-w-md border-none shadow-2xl overflow-hidden rounded-3xl">
        <div className="bg-primary h-2 w-full" />
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
            <ShieldCheck className="text-primary" size={32} />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
          <CardDescription>Enter the secret key to synchronize admin status.</CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Secret Key"
                  className={`pl-10 pr-10 h-14 rounded-2xl border-2 transition-all duration-200 text-left ${
                    error ? 'border-destructive' : 'focus:border-primary'
                  }`}
                  value={key}
                  onChange={(e) => {
                    setKey(e.target.value);
                    setError(false);
                  }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-muted-foreground hover:text-primary rounded-full transition-all duration-200 active:scale-90 focus:outline-none"
                  title={showPassword ? 'Hide secret key' : 'Show secret key'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1 pl-1">
                  <AlertCircle size={12} /> Incorrect secret key
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-bold text-lg gap-2 shadow-lg transition-all duration-200 active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <>Unlock Panel <ArrowRight size={20} /></>}
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
