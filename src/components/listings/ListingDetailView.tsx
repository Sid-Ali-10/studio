"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Plane, ShoppingBag, MapPin, Calendar, Weight, Globe, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { type Listing } from "./ListingCard";
import { useLanguage } from "@/context/LanguageContext";

interface ListingDetailViewProps {
  listing: Listing;
}

export function ListingDetailView({ listing }: ListingDetailViewProps) {
  const { t, isRTL } = useLanguage();
  const iconColor = listing.type === 'traveler' ? 'text-primary' : 'text-emerald-600';

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center justify-between">
        <Badge 
          className={cn(
            "uppercase text-[10px] tracking-widest px-3 py-1 rounded-full border-none font-bold",
            listing.type === "traveler" 
              ? "bg-primary text-white" 
              : "bg-emerald-600 text-white"
          )}
        >
          {listing.type === "traveler" ? (
            <Plane size={12} className={cn(isRTL ? "ml-1.5" : "mr-1.5")} />
          ) : (
            <ShoppingBag size={12} className={cn(isRTL ? "ml-1.5" : "mr-1.5")} />
          )}
          <span>{t(listing.type)}</span>
        </Badge>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold border border-primary/20">
            {listing.userName?.substring(0, 2).toUpperCase() || "UN"}
          </div>
          <div className="flex flex-col text-start">
            <span className="text-xs font-semibold">{listing.userName}</span>
            <div className="flex items-center gap-0.5">
              <Star size={10} className="fill-yellow-400 text-yellow-400" />
              <span className="text-[10px] font-medium">{listing.userRating}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-start">
        <h3 className="text-2xl font-bold">{listing.title}</h3>
        <p className="text-muted-foreground whitespace-pre-wrap">{listing.description}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl">
        {listing.type === "traveler" ? (
          <>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Globe size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_from_detail')}</span>
                <span className="font-semibold text-sm">{listing.city}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <MapPin size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_to_detail')}</span>
                <span className="font-semibold text-sm">{listing.destination}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Calendar size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_arrival_date_detail')}</span>
                <span className="font-semibold text-sm">{listing.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Weight size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_available_weight_detail')}</span>
                <span className="font-semibold text-sm">{listing.weight} kg</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Globe size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_purchase_source_detail')}</span>
                <span className="font-semibold text-sm">{listing.city}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <MapPin size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_city_algeria_detail')}</span>
                <span className="font-semibold text-sm">{listing.destination}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Calendar size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_desired_by_detail')}</span>
                <span className="font-semibold text-sm">{listing.date}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-start">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <ShoppingBag size={20} className={iconColor} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">{t('label_budget_detail')}</span>
                <span className="font-semibold text-sm">{listing.price} DA</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}