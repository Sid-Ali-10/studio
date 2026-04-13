
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Calendar, Weight, Banknote, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterState {
  search: string;
  city: string;
  date: string;
  minPrice: string;
  maxPrice: string;
  minWeight: string;
}

interface ListingFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  showPrice?: boolean;
  showWeight?: boolean;
}

export function ListingFilters({ filters, onFilterChange, showPrice = true, showWeight = true }: ListingFiltersProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const clearFilters = () => {
    onFilterChange({
      search: "",
      city: "",
      date: "",
      minPrice: "",
      maxPrice: "",
      minWeight: "",
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== "");

  return (
    <div className="bg-card p-4 rounded-2xl shadow-sm border space-y-4 animate-in fade-in duration-300">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input
          name="search"
          placeholder="Search by title or description..."
          className="pl-10 h-11 rounded-xl bg-muted/50 border-none"
          value={filters.search}
          onChange={handleChange}
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            name="city"
            placeholder="Filter by city"
            className="pl-10 h-10 rounded-xl bg-muted/50 border-none text-sm"
            value={filters.city}
            onChange={handleChange}
          />
        </div>
        
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            name="date"
            type="date"
            className="pl-10 h-10 rounded-xl bg-muted/50 border-none text-sm"
            value={filters.date}
            onChange={handleChange}
          />
        </div>

        {showWeight && (
          <div className="relative">
            <Weight className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              name="minWeight"
              type="number"
              placeholder="Min weight (kg)"
              className="pl-10 h-10 rounded-xl bg-muted/50 border-none text-sm"
              value={filters.minWeight}
              onChange={handleChange}
            />
          </div>
        )}

        {showPrice && (
          <div className="relative">
            <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              name="maxPrice"
              type="number"
              placeholder="Max budget (DA)"
              className="pl-10 h-10 rounded-xl bg-muted/50 border-none text-sm"
              value={filters.maxPrice}
              onChange={handleChange}
            />
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex justify-end">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground h-8 gap-1"
          >
            <X size={14} /> Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
