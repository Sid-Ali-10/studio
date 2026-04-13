
import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * GetMeDZ Brand Logo: Azure blue shopping bag with a Teal airplane.
 */
export const Logo = ({ className, size = 40 }: LogoProps) => {
  return (
    <div 
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full drop-shadow-md"
      >
        {/* Shopping Bag Handles (Navy) */}
        <path
          d="M35 35V25C35 16.7 41.7 10 50 10C58.3 10 65 16.7 65 25V35"
          stroke="#1E3A8A"
          strokeWidth="8"
          strokeLinecap="round"
        />
        
        {/* Shopping Bag Body (Azure Blue) */}
        <path
          d="M20 35H80V80C80 85.5 75.5 90 70 90H30C24.5 90 20 85.5 20 80V35Z"
          fill="#3B82F6"
        />
        
        {/* Stylized Airplane (Teal) */}
        <path
          d="M35 60L50 75L85 40L80 35L50 65L40 55L35 60Z"
          fill="#10B981"
        />
        
        {/* Airplane Wing Detail */}
        <path
          d="M55 55L70 45M45 65L30 75"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </div>
  );
};
