
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, doc, deleteDoc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Loader2, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ListingCard, type Listing } from "@/components/listings/ListingCard";
import { ListingFilters } from "@/components/listings/ListingFilters";
import { useToast } from "@/hooks/use-toast";

export default function FavoritesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [advancedFilters, setAdvancedFilters] = useState({
    search: "",
    city: "",
    date: "",
    minPrice: "",
    maxPrice: "",
    minWeight: "",
  });

  const fetchFavorites = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const favSnapshot = await getDocs(collection(db, "userProfiles", user.uid, "favorites"));
      const listingPromises = favSnapshot.docs.map(favDoc => 
        getDoc(doc(db, "listings", favDoc.data().listingId))
      );
      
      const listingSnapshots = await Promise.all(listingPromises);
      const favListings = listingSnapshots
        .filter(snap => snap.exists())
        .map(snap => ({ id: snap.id, ...snap.data() } as Listing));
        
      setListings(favListings);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

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

      return matchesSearch && matchesCity && matchesDate && matchesPrice && matchesWeight;
    });
  }, [listings, advancedFilters]);

  const removeFavorite = async (listingId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "userProfiles", user.uid, "favorites", listingId));
      setListings(prev => prev.filter(l => l.id !== listingId));
      toast({ title: "Removed from favorites" });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteListing = async (listingId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "listings", listingId));
      setListings(prev => prev.filter(l => l.id !== listingId));
      toast({ title: "Listing deleted permanently" });
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-20">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Saved Listings</h1>
        <p className="text-muted-foreground">Your personal wishlist of interesting deals.</p>
      </div>

      <ListingFilters filters={advancedFilters} onFilterChange={setAdvancedFilters} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredListings.map((listing) => (
          <ListingCard 
            key={listing.id} 
            listing={listing} 
            isFavorited={true}
            onToggleFavorite={removeFavorite}
            onDelete={handleDeleteListing}
          />
        ))}
      </div>

      {filteredListings.length === 0 && (
        <div className="text-center py-20 bg-card rounded-3xl space-y-4">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Heart className="text-muted-foreground" size={40} />
          </div>
          <h3 className="text-lg font-semibold">Nothing saved</h3>
          <p className="text-muted-foreground">Go to the main board and heart some posts!</p>
          <Link href="/">
            <Button className="rounded-xl">Browse Board</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
