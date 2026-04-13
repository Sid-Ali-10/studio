
"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Plane, ShoppingBag, MapPin, Calendar, Weight, Globe, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Listing } from "./ListingCard";

interface ListingDetailViewProps {
  listing: Listing;
}

export function ListingDetailView({ listing }: ListingDetailViewProps) {
  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Badge 
          className={cn(
            "uppercase text-[10px] tracking-widest px-3 py-1 rounded-full border-none font-bold",
            listing.type === "traveler" 
              ? "bg-primary text-white" 
              : "bg-accent text-white"
          )}
        >
          {listing.type === "traveler" ? (
            <Plane size={12} className="mr-1.5" />
          ) : (
            <ShoppingBag size={12} className="mr-1.5" />
          )}
          <span>{listing.type}</span>
        </Badge>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold border border-primary/20">
            {listing.userName?.substring(0, 2).toUpperCase() || "UN"}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold">{listing.userName}</span>
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-yellow-400 text-yellow-400" />
              <span className="text-[10px] font-medium">{listing.userRating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-2xl font-bold">{listing.title}</h3>
        <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl">
        {listing.type === "traveler" ? (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Globe size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">From</span>
                <span className="font-semibold text-sm">{listing.city}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MapPin size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">To</span>
                <span className="font-semibold text-sm">{listing.destination}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calendar size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Arrival Date</span>
                <span className="font-semibold text-sm">{listing.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Weight size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Available Weight</span>
                <span className="font-semibold text-sm">{listing.weight} kg</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Globe size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Purchase Source</span>
                <span className="font-semibold text-sm">{listing.city}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <MapPin size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">City in Algeria</span>
                <span className="font-semibold text-sm">{listing.destination}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Calendar size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Desired By</span>
                <span className="font-semibold text-sm">{listing.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <ShoppingBag size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Budget</span>
                <span className="font-semibold text-sm">{listing.price} DA</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
