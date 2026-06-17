
"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * GetMeDZ Brand Logo: Uses an external image file (logo.png) with a dynamic SVG fallback.
 */
export const Logo = ({ className, size = 40 }: LogoProps) => {
  return (
    <div 
      className={cn("relative flex items-center justify-center overflow-hidden", className)}
      style={{ width: size, height: size }}
    >
      {/* 
        We use a standard img tag for the custom logo provided by the user. 
        The user should place their logo.png in the /public folder.
      */}
      <img 
        src="/logo.png" 
        alt="GetMeDZ Logo" 
        className="w-full h-full object-contain"
        onError={(e) => {
          // If image fails to load, we show a clean SVG fallback
          e.currentTarget.style.display = 'none';
          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
          if (fallback) fallback.style.display = 'flex';
        }}
      />
      
      {/* Professional SVG Fallback */}
      <div className="hidden w-full h-full items-center justify-center bg-primary rounded-xl">
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-2/3 h-2/3"
        >
          <path
            d="M35 35V25C35 16.7 41.7 10 50 10C58.3 10 65 16.7 65 25V35"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M20 35H80V80C80 85.5 75.5 90 70 90H30C24.5 90 20 85.5 20 80V35Z"
            fill="white"
            fillOpacity="0.3"
            stroke="white"
            strokeWidth="4"
          />
          <path
            d="M35 60L50 75L85 40"
            stroke="white"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};
