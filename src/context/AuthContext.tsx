
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useRouter, usePathname } from "next/navigation";

interface UserProfile {
  id: string;
  username: string;
  email: string;
  averageRating: number;
  successfulDealsCount: number;
  walletBalance: number;
  isVerified: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      
      if (!firebaseUser) {
        setProfile(null);
        if (pathname !== "/login" && pathname !== "/signup") {
          router.push("/login");
        }
      }
    });

    return () => unsubscribeAuth();
  }, [router, pathname]);

  useEffect(() => {
    if (!user) return;

    // Use real-time listener for the user profile to keep balance in sync
    const profileRef = doc(db, "userProfiles", user.uid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfile);
      }
    }, (error) => {
      // Quietly ignore permission errors on logout
      if (error.code !== 'permission-denied') {
        console.error("AuthContext Profile listener error:", error);
      }
    });

    return () => unsubscribeProfile();
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
