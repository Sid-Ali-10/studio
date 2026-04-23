
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, limit, startAfter, getDocs, where, doc, deleteDoc, setDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Package } from "lucide-react";
import { ListingCard, type Listing } from "@/components/listings/ListingCard";
import { ListingFilters } from "@/components/listings/ListingFilters";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/LanguageContext";

export default function Home() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "traveler" | "buyer">("all");
  const [hasMore, setHasMore] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState({
    search: "",
    city: "",
    date: "",
    minPrice: "",
    maxPrice: "",
    minWeight: "",
  });

  useEffect(() => {
    if (!user) return;
    const fetchFavorites = async () => {
      const favSnapshot = await getDocs(collection(db, "userProfiles", user.uid, "favorites"));
      const favIds = new Set(favSnapshot.docs.map(doc => doc.data().listingId));
      setFavorites(favIds);
    };
    fetchFavorites();
  }, [user]);

  const fetchListings = async (loadMore = false) => {
    if (loading) return;
    setLoading(true);

    try {
      let q;
      if (filter === "all") {
        q = query(collection(db, "listings"), limit(50));
      } else {
        q = query(collection(db, "listings"), where("type", "==", filter), limit(50));
      }

      if (loadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const querySnapshot = await getDocs(q);
      const newDocs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));

      if (loadMore) {
        setListings(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const filteredNewDocs = newDocs.filter(d => !existingIds.has(d.id));
          return [...prev, ...filteredNewDocs];
        });
      } else {
        setListings(newDocs);
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === 50);
    } catch (err) {
      console.error("Error fetching listings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLastDoc(null);
    setHasMore(true);
    fetchListings(false);
  }, [filter]);

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
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

      return matchesSearch && matchesCity && matchesDate && (l.type === "buyer" ? matchesPrice : true) && (l.type === "traveler" ? matchesWeight : true);
    });
  }, [listings, advancedFilters]);

  const toggleFavorite = async (listingId: string) => {
    if (!user) return;
    const isFav = favorites.has(listingId);
    const favRef = doc(db, "userProfiles", user.uid, "favorites", listingId);
    try {
      if (isFav) {
        await deleteDoc(favRef);
        setFavorites(prev => {
          const next = new Set(prev);
          next.delete(listingId);
          return next;
        });
      } else {
        await setDoc(favRef, { listingId, createdAt: new Date().toISOString(), userId: user.uid });
        setFavorites(prev => new Set(prev).add(listingId));
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "listings", listingId));
      setListings(prev => prev.filter(l => l.id !== listingId));
      toast({ title: "Listing deleted" });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('board_title')}</h1>
          <p className="text-muted-foreground">{t('board_subtitle')}</p>
        </div>
        <Tabs value={filter} className="w-full md:w-auto" onValueChange={(v) => setFilter(v as any)}>
          <TabsList className="bg-card grid grid-cols-3 h-12 p-1 rounded-xl w-full md:w-64 shadow-sm">
            <TabsTrigger value="all" className="rounded-lg">{t('all')}</TabsTrigger>
            <TabsTrigger value="traveler" className="rounded-lg">{t('travelers')}</TabsTrigger>
            <TabsTrigger value="buyer" className="rounded-lg">{t('buyers')}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <ListingFilters 
        filters={advancedFilters} 
        onFilterChange={setAdvancedFilters} 
        showPrice={filter !== "traveler"}
        showWeight={filter !== "buyer"}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredListings.map((listing) => (
          <ListingCard 
            key={listing.id} 
            listing={listing} 
            isFavorited={favorites.has(listing.id)}
            onToggleFavorite={toggleFavorite}
            onDelete={handleDeleteListing}
          />
        ))}
      </div>

      {loading && (
        <div className="flex justify-center p-8">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      )}

      {filteredListings.length === 0 && !loading && (
        <div className="text-center py-20 bg-card rounded-3xl space-y-4">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Package className="text-muted-foreground" size={40} />
          </div>
          <h3 className="text-lg font-semibold">{t('no_results')}</h3>
          <p className="text-muted-foreground">Try adjusting your filters or search terms.</p>
        </div>
      )}
    </div>
  );
}
