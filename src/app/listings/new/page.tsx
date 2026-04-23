
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
import { useLanguage } from "@/context/LanguageContext";

export default function NewListingPage() {
  const { user, profile } = useAuth();
  const { t } = useLanguage();
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
      
      toast({ title: t('Listing created!'), description: t('Your post is now live.') });
      router.push("/");
    } catch (error: any) {
      toast({ variant: "destructive", title: t('Error'), description: error.message });
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
      <div className="space-y-1 text-start">
        <h1 className="text-2xl font-bold tracking-tight">{t('create_listing_title')}</h1>
        <p className="text-muted-foreground">{t('create_listing_desc')}</p>
      </div>

      <Tabs defaultValue="traveler" onValueChange={(v) => setType(v as any)}>
        <TabsList className="bg-card grid grid-cols-2 h-14 p-1 rounded-2xl w-full mb-6">
          <TabsTrigger value="traveler" className="rounded-xl flex gap-2">
            <Plane size={18} /> {t('tab_traveler')}
          </TabsTrigger>
          <TabsTrigger value="buyer" className="rounded-xl flex gap-2">
            <ShoppingBag size={18} /> {t('tab_buyer')}
          </TabsTrigger>
        </TabsList>

        <Card className="border-none shadow-xl rounded-2xl overflow-hidden text-start">
          <CardHeader>
            <CardTitle>{type === "traveler" ? t('traveler_offer_title') : t('buyer_request_title')}</CardTitle>
            <CardDescription>
              {type === "traveler" ? t('traveler_offer_desc') : t('buyer_request_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">{t('label_title')}</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder={type === "traveler" ? t('placeholder_traveler_title') : t('placeholder_buyer_title')}
                  className="rounded-xl h-12 text-start"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('label_description')}</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder={t('placeholder_description')}
                  className="rounded-xl min-h-[120px] resize-none text-start"
                  value={formData.description}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    {type === "traveler" ? t('label_departure_city') : t('label_purchase_source')}
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    placeholder={type === "traveler" ? t('placeholder_departure_city') : t('placeholder_purchase_source')}
                    className="rounded-xl h-12 text-start"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="destination">
                    {type === "traveler" ? t('label_final_delivery') : t('label_buyer_city')}
                  </Label>
                  <Input
                    id="destination"
                    name="destination"
                    placeholder={t('placeholder_delivery_location')}
                    className="rounded-xl h-12 text-start"
                    value={formData.destination}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">
                    {type === "traveler" ? t('label_arrival_date') : t('label_desired_date')}
                  </Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    className="rounded-xl h-12 text-start"
                    value={formData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                {type === "traveler" ? (
                  <div className="space-y-2">
                    <Label htmlFor="weight">{t('label_available_weight')}</Label>
                    <Input
                      id="weight"
                      name="weight"
                      type="number"
                      placeholder={t('placeholder_weight')}
                      className="rounded-xl h-12 text-start"
                      value={formData.weight}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="price">{t('label_max_budget')}</Label>
                    <Input
                      id="price"
                      name="price"
                      type="number"
                      placeholder={t('placeholder_budget')}
                      className="rounded-xl h-12 text-start"
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
                {loading ? t('btn_posting') : t('btn_create_post')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
