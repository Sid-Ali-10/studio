
"use client";

import React, { useState } from "react";
import { auth, db } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendEmailVerification,
  sendPasswordResetEmail 
} from "firebase/auth";
import { doc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, LogIn, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { Logo } from "@/components/Logo";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ title: "Welcome back!", description: "Successfully logged in." });
        router.push("/");
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        
        // Send verification email
        await sendEmailVerification(user);
        
        const profileRef = doc(db, "userProfiles", user.uid);
        const profileData = {
          id: user.uid,
          username: username || email.split("@")[0],
          email,
          averageRating: 5.0,
          successfulDealsCount: 0,
          walletBalance: 0,
          isVerified: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        setDocumentNonBlocking(profileRef, profileData, { merge: true });
        
        toast({ 
          title: "Account created!", 
          description: "A verification link has been sent to your email. Please verify to continue." 
        });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) return;
    setResetLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      toast({ 
        title: "Reset link sent", 
        description: "Check your email for instructions to reset your password." 
      });
      setIsResetOpen(false);
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F0F2F5]">
      <div className="w-full max-w-md space-y-8 animate-in fade-in duration-700">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center mb-4">
            <Logo size={64} />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">GetMeDZ</h1>
          <p className="text-muted-foreground">The peer-to-peer marketplace for Algerians</p>
        </div>

        <Card className="border-none shadow-2xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold">{isLogin ? "Login" : "Create Account"}</CardTitle>
            <CardDescription>
              {isLogin ? "Welcome back! Please enter your details" : "Join our community of travelers and buyers"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                    <Input
                      name="username"
                      autoComplete="username"
                      placeholder="Username"
                      className="pl-10 h-12 rounded-xl"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    className="pl-10 h-12 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                    placeholder="Password"
                    className="pl-10 pr-10 h-12 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors focus:outline-none"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-semibold bg-primary hover:bg-primary/90 transition-all shadow-lg"
                disabled={loading}
              >
                {loading ? "Loading..." : isLogin ? (
                  <span className="flex items-center gap-2"><LogIn size={20} /> Login</span>
                ) : (
                  <span className="flex items-center gap-2"><UserPlus size={20} /> Sign Up</span>
                )}
              </Button>
            </form>

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm font-medium text-primary hover:underline transition-colors"
              >
                {isLogin ? "New to GetMeDZ? Create account" : "Already have an account? Login"}
              </button>

              {isLogin && (
                <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
                  <DialogTrigger asChild>
                    <button className="text-xs text-muted-foreground hover:text-primary hover:underline transition-colors">
                      Forgot Password?
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                      <DialogTitle>Reset Password</DialogTitle>
                      <DialogDescription>
                        Enter your email address and we'll send you a link to reset your password.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleForgotPassword} className="space-y-4 py-4">
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input
                          name="reset-email"
                          type="email"
                          autoComplete="email"
                          placeholder="Email Address"
                          className="pl-10 h-12 rounded-xl"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      <DialogFooter>
                        <Button type="submit" className="w-full rounded-xl" disabled={resetLoading}>
                          {resetLoading ? "Sending..." : "Send Reset Link"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
