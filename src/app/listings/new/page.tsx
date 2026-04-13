"use client";

import React, { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Plane, ShoppingBag, Send } from "lucide-react";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";

export default function NewListingPage() {
  const { user, profile } = useAuth();
  const [type, setType] = useState<"traveler" | "buyer">("traveler");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    city: "",
    destination: "",
    date: "",
    weight: "",
    price: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const listingsRef = collection(db, "listings");
      
      const listingData = {
        ...formData,
        type,
        listerId: user.uid,
        userName: profile?.username || user.email?.split("@")[0],
        userRating: profile?.averageRating || 5.0,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      addDocumentNonBlocking(listingsRef, listingData);
      
      toast({ title: "Listing created!", description: "Your post is now live." });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom duration-500">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Create Listing</h1>
        <p className="text-muted-foreground">Reach out to our community.</p>
      </div>

      <Tabs defaultValue="traveler" onValueChange={(v) => setType(v as any)}>
        <TabsList className="bg-card grid grid-cols-2 h-14 p-1 rounded-2xl w-full mb-6">
          <TabsTrigger value="traveler" className="rounded-xl flex gap-2">
            <Plane size={18} /> Traveler
          </TabsTrigger>
          <TabsTrigger value="buyer" className="rounded-xl flex gap-2">
            <ShoppingBag size={18} /> Buyer
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
          <CardHeader>
            <CardTitle>{type === "traveler" ? "Traveler Offer" : "Buyer Request"}</CardTitle>
            <CardDescription>
              {type === "traveler" ? "Share your trip details and available luggage space." : "Let travelers know what you need and from where."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={type === "traveler" ? "e.g. Arriving from Paris on July 10" : "e.g. Need iPhone 15 Pro from UAE"}
                  className="rounded-xl h-12"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Details about items you can carry, delivery preferences, or product specifics."
                  className="rounded-xl min-h-[120px] resize-none"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    {type === "traveler" ? "Departure City" : "Purchase Source (Country/City)"}
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder={type === "traveler" ? "e.g. Paris, France" : "e.g. Dubai, UAE"}
                    className="rounded-xl h-12"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">
                    {type === "traveler" ? "Final Delivery Location" : "Your City in Algeria"}
                  </Label>
                  <Input
                    id="destination"
                    name="destination"
                    placeholder="e.g. Oran"
                    className="rounded-xl h-12"
                    value={formData.destination}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">
                    {type === "traveler" ? "Arrival Date" : "Desired By Date"}
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    className="rounded-xl h-12"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                {type === "traveler" ? (
                  <div className="space-y-2">
                    <Label htmlFor="weight">Available Weight (kg)</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      placeholder="e.g. 5"
                      className="rounded-xl h-12"
                      value={formData.weight}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="price">Max Budget (DA)</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder="e.g. 20000"
                      className="rounded-xl h-12"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-14 rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-lg text-lg gap-2"
                disabled={loading}
              >
                <Send size={20} />
                {loading ? "Posting..." : "Create Post"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
