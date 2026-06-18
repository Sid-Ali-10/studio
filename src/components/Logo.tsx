
"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
// استيراد الصورة المحلية من نفس المجلد
import logoImg from "./logo.jpg";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * GetMeDZ Brand Logo: يعرض الصورة المحلية مع حواف دائرية ناعمة
 */
export const Logo = ({ className, size = 40 }: LogoProps) => {
  return (
    <div 
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-2xl shadow-sm", 
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
