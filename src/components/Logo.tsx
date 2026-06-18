
"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
// استيراد الصورة المحلية logo.png من نفس مجلد المكونات
import logoImg from "./logo.png";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * مكون الشعار: يعرض صورة logo.png بشكل دائري كامل (rounded-full)
 */
export const Logo = ({ className, size = 40 }: LogoProps) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-full shadow-md bg-white border border-border", 
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={logoImg}
        alt="GetMeDZ Logo"
        width={size}
        height={size}
        className="object-cover"
        priority
      />
    </div>
  );
};
