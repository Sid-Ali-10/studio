"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ArrowLeft } from "lucide-react";

export default function EditListingPage() {
  const { id } = useParams();
  const { user } = useAuth();
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
            toast({ variant: "destructive", title: "Access denied" });
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
  }, [id, user, router, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !id) return;
    setLoading(true);

    try {
      await updateDoc(doc(db, "listings", id as string), {
        ...formData,
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Listing updated!" });
      router.back();
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

  if (fetching) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-primary" size={40} /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" onClick={() => router.back()} className="gap-2 rounded-full hover:bg-muted">
        <ArrowLeft size={18} /> Back
      </Button>
      
      <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
        <CardHeader>
          <CardTitle>Edit Post</CardTitle>
          <CardDescription>Update your {type} details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" className="rounded-xl h-12" value={formData.title} onChange={handleInputChange} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" className="rounded-xl min-h-[120px]" value={formData.description} onChange={handleInputChange} required />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">
                  {type === "traveler" ? "Departure City" : "Purchase Source (Country/City)"}
                </Label>
                <Input id="city" name="city" className="rounded-xl h-12" value={formData.city} onChange={handleInputChange} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">
                  {type === "traveler" ? "Final Delivery Location" : "Your City in Algeria"}
                </Label>
                <Input id="destination" name="destination" className="rounded-xl h-12" value={formData.destination} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">
                  {type === "traveler" ? "Arrival Date" : "Desired By Date"}
                </Label>
                <Input id="date" name="date" type="date" className="rounded-xl h-12" value={formData.date} onChange={handleInputChange} required />
              </div>
              {type === "traveler" ? (
                <div className="space-y-2">
                  <Label htmlFor="weight">Available Weight (kg)</Label>
                  <Input id="weight" name="weight" type="number" className="rounded-xl h-12" value={formData.weight} onChange={handleInputChange} required />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="price">Max Budget (DA)</Label>
                  <Input id="price" name="price" type="number" className="rounded-xl h-12" value={formData.price} onChange={handleInputChange} required />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full h-14 rounded-xl font-bold gap-2 mt-4" disabled={loading}>
              <Save size={20} /> {loading ? "Saving..." : "Update Post"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
