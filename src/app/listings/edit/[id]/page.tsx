
"use client";

import React, { useState, useEffect, use } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export default function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const { user } = useAuth();
  const { t, isRTL } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [type, setType] = useState<"traveler" | "buyer">("traveler");
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

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;
      try {
        const snap = await getDoc(doc(db, "listings", id as string));
        if (snap.exists()) {
          const data = snap.data();
          if (data.listerId !== user?.uid) {
            toast({ variant: "destructive", title: t('error') });
            router.push("/");
            return;
          }
          setType(data.type);
          setFormData({
            title: data.title || "",
            description: data.description || "",
            city: data.city || "",
            destination: data.destination || "",
            date: data.date || "",
            weight: data.weight || "",
            price: data.price || "",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };
    if (user) fetchListing();
  }, [id, user, router, toast, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setLoading(true);

    try {
      await updateDoc(doc(db, "listings", id as string), {
        ...formData,
        updatedAt: serverTimestamp(),
      });
      toast({ title: t('success') });
      router.back();
    } catch (error: any) {
      toast({ variant: "destructive", title: t('error'), description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (fetching) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={() => router.back()} 
          className="gap-2 rounded-full hover:bg-muted"
        >
          <ArrowLeft size={18} className={cn(isRTL && "rotate-180")} /> {t('back')}
        </Button>
      </div>
      
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden text-start">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t('edit_post_title')}</CardTitle>
          <CardDescription>
            {type === "traveler" ? t('edit_post_desc_traveler') : t('edit_post_desc_buyer')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-bold">{t('label_title')}</Label>
              <Input 
                id="title" 
                name="title" 
                className="rounded-xl h-12 text-start" 
                value={formData.title} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="font-bold">{t('label_description')}</Label>
              <Textarea 
                id="description" 
                name="description" 
                className="rounded-xl min-h-[120px] resize-none text-start" 
                value={formData.description} 
                onChange={handleInputChange} 
                required 
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="font-bold">
                  {type === "traveler" ? t('label_departure_city') : t('label_purchase_source')}
                </Label>
                <Input 
                  id="city" 
                  name="city" 
                  className="rounded-xl h-12 text-start" 
                  value={formData.city} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination" className="font-bold">
                  {type === "traveler" ? t('label_final_delivery') : t('label_buyer_city')}
                </Label>
                <Input 
                  id="destination" 
                  name="destination" 
                  className="rounded-xl h-12 text-start" 
                  value={formData.destination} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="font-bold">
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
                  <Label htmlFor="weight" className="font-bold">{t('label_available_weight')}</Label>
                  <Input 
                    id="weight" 
                    name="weight" 
                    type="number" 
                    className="rounded-xl h-12 text-start" 
                    value={formData.weight} 
                    onChange={handleInputChange} 
                    required 
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="price" className="font-bold">{t('label_max_budget')}</Label>
                  <Input 
                    id="price" 
                    name="price" 
                    type="number" 
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
              className="w-full h-14 rounded-xl font-black text-lg gap-2 mt-4 shadow-lg transition-all active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
              {loading ? t('btn_saving') : t('btn_update_post')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
