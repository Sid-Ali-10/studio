
"use client";

import React, { useState, useEffect, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, CheckCircle, Package, LogOut, Loader2, Trash2, Wallet, Moon, Sun } from "lucide-react";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { ListingCard, type Listing } from "@/components/listings/ListingCard";
import { ListingFilters } from "@/components/listings/ListingFilters";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useTheme } from "@/context/ThemeContext";

declare global {
  interface Window {
    google: any;
    googleTranslateElementInit: () => void;
  }
}

export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const { user: currentUser, profile: myProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [tab, setTab] = useState<"all" | "traveler" | "buyer">("all");
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [ratingId, setRatingId] = useState<string | null>(null);
  const [totalRatings, setTotalRatings] = useState(0);
  const [avgRating, setAvgRating] = useState(0);
  const router = useRouter();

  const [advancedFilters, setAdvancedFilters] = useState({
    search: "",
    city: "",
    date: "",
    minPrice: "",
    maxPrice: "",
    minWeight: "",
  });

  const isOwnProfile = currentUser?.uid === id;

  useEffect(() => {
    if (isOwnProfile && typeof window !== 'undefined') {
      const initTranslate = () => {
        if (window.google && window.google.translate) {
          new window.google.translate.TranslateElement(
            { 
              pageLanguage: 'en', 
              layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
              autoDisplay: false
            },
            'google_translate_element'
          );
        }
      };

      window.googleTranslateElementInit = initTranslate;
      
      if (window.google && window.google.translate) {
        initTranslate();
      }
    }
  }, [isOwnProfile, id]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const userDoc = await getDoc(doc(db, "userProfiles", id as string));
      if (userDoc.exists()) setProfile(userDoc.data());

      const ratingsQuery = query(collection(db, "ratings"), where("ratedUserId", "==", id));
      const ratingsSnap = await getDocs(ratingsQuery);
      const ratingsData = ratingsSnap.docs.map(d => d.data());
      setTotalRatings(ratingsData.length);
      if (ratingsData.length > 0) {
        const sum = ratingsData.reduce((acc, curr) => acc + (curr.stars || 0), 0);
        setAvgRating(sum / ratingsData.length);
      } else {
        setAvgRating(5.0);
      }

      if (currentUser && !isOwnProfile) {
        const myRatingQuery = query(
          collection(db, "ratings"), 
          where("ratedUserId", "==", id),
          where("raterId", "==", currentUser.uid)
        );
        const myRatingSnap = await getDocs(myRatingQuery);
        if (!myRatingSnap.empty) {
          setUserRating(myRatingSnap.docs[0].data().stars);
          setRatingId(myRatingSnap.docs[0].id);
        }
      }

      const q = query(collection(db, "listings"), where("listerId", "==", id));
      const snapshot = await getDocs(q);
      setAllListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing)));
    } catch (err) {
      console.error("Error fetching profile data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProfileData();
  }, [id, currentUser]);

  const filteredListings = useMemo(() => {
    return allListings.filter(l => {
      const matchesTab = tab === "all" || l.type === tab;
      
      const matchesSearch = advancedFilters.search === "" || 
        l.title.toLowerCase().includes(advancedFilters.search.toLowerCase()) || 
        l.description.toLowerCase().includes(advancedFilters.search.toLowerCase());
      
      const matchesCity = advancedFilters.city === "" || 
        (l.city?.toLowerCase().includes(advancedFilters.city.toLowerCase()) || 
         l.destination?.toLowerCase().includes(advancedFilters.city.toLowerCase()));
      
      const matchesDate = advancedFilters.date === "" || l.date === advancedFilters.date;
      
      const matchesPrice = advancedFilters.maxPrice === "" || 
        (l.price && parseInt(l.price) <= parseInt(advancedFilters.maxPrice));
        
      const matchesWeight = advancedFilters.minWeight === "" || 
        (l.weight && parseInt(l.weight) >= parseInt(advancedFilters.minWeight));

      return matchesTab && matchesSearch && matchesCity && matchesDate && matchesPrice && matchesWeight;
    });
  }, [allListings, tab, advancedFilters]);

  const handleRating = async (stars: number) => {
    if (!currentUser || isOwnProfile) return;

    const newRatingId = ratingId || `${currentUser.uid}_${id}`;
    const ratingRef = doc(db, "ratings", newRatingId);

    try {
      await setDoc(ratingRef, {
        id: newRatingId,
        raterId: currentUser.uid,
        ratedUserId: id,
        stars,
        listingId: "profile_general",
        createdAt: serverTimestamp(),
      }, { merge: true });
      
      setUserRating(stars);
      setRatingId(newRatingId);
      toast({ title: "Rating submitted" });
      fetchProfileData();
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "Could not save rating." });
    }
  };

  const deleteRating = async () => {
    if (!ratingId) return;
    try {
      await deleteDoc(doc(db, "ratings", ratingId));
      setUserRating(null);
      setRatingId(null);
      toast({ title: "Rating removed" });
      fetchProfileData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "listings", listingId));
      setAllListings(prev => prev.filter(l => l.id !== listingId));
      toast({ title: "Listing deleted" });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;
  }

  if (!profile) return <div className="p-20 text-center">User not found.</div>;

  const profileToShow = isOwnProfile ? myProfile : profile;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Card className="border-none shadow-2xl bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl overflow-hidden">
        <CardContent className="p-8 md:p-12 relative">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-white dark:bg-card rounded-3xl shadow-xl flex items-center justify-center text-4xl font-bold text-primary border-4 border-primary/10">
              {profileToShow?.username?.substring(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="space-y-1">
                <div className="flex flex-col md:flex-row md:items-center gap-2">
                  <h1 className="text-3xl font-bold">{profileToShow?.username}</h1>
                  {profileToShow?.isVerified && (
                    <Badge className="bg-primary/10 text-primary border-none rounded-full px-3 gap-1">
                      <CheckCircle size={14} /> Verified
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{profileToShow?.email}</p>
              </div>
              
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="bg-card px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
                  <Star className="text-yellow-400 fill-yellow-400" size={20} />
                  <span className="font-bold">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground font-normal">({totalRatings})</span>
                </div>
                <div className="bg-card px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2">
                  <Package className="text-primary" size={20} />
                  <span className="font-bold">{profileToShow?.successfulDealsCount || 0} Deals</span>
                </div>
                {isOwnProfile && (
                  <Link href="/wallet" className="bg-card px-4 py-2 rounded-2xl shadow-sm flex items-center gap-2 hover:bg-muted/20 transition-colors">
                    <Wallet className="text-accent" size={20} />
                    <span className="font-bold">{profileToShow?.walletBalance?.toLocaleString() || 0} DA</span>
                  </Link>
                )}
              </div>

              {!isOwnProfile && currentUser && (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRating(star)}
                        className={cn(
                          "p-1 rounded-full transition-all hover:bg-muted",
                          (userRating || 0) >= star ? "text-yellow-400" : "text-muted-foreground/30"
                        )}
                      >
                        <Star size={28} fill={(userRating || 0) >= star ? "currentColor" : "none"} />
                      </button>
                    ))}
                    {userRating && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={deleteRating}
                        className="ml-2 rounded-full hover:bg-muted text-destructive"
                      >
                        <Trash2 size={18} />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {isOwnProfile && (
                <div className="flex flex-col gap-4 pt-2 items-center md:items-start">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="destructive" className="rounded-xl px-6" onClick={handleLogout}>
                      <LogOut size={18} className="mr-2" /> Logout
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleTheme} 
                      className="rounded-full text-muted-foreground hover:bg-muted transition-colors"
                      title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    >
                      {theme === "light" ? <Moon size={22} /> : <Sun size={22} />}
                    </Button>
                  </div>
                  <div className="translate-widget-container">
                    <div id="google_translate_element"></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Postings</h2>
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full md:w-auto">
            <TabsList className="bg-card grid grid-cols-3 h-10 p-1 rounded-xl w-full md:w-64">
              <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
              <TabsTrigger value="traveler" className="rounded-lg">Travelers</TabsTrigger>
              <TabsTrigger value="buyer" className="rounded-lg">Buyers</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ListingFilters 
          filters={advancedFilters} 
          onFilterChange={setAdvancedFilters} 
          showPrice={tab !== "traveler"}
          showWeight={tab !== "buyer"}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredListings.map((listing) => (
            <ListingCard 
              key={listing.id} 
              listing={listing} 
              onDelete={handleDeleteListing}
            />
          ))}
          {filteredListings.length === 0 && (
            <div className="col-span-full py-20 text-center bg-card rounded-3xl text-muted-foreground italic">
              No listings found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
