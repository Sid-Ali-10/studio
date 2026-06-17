
"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
// استيراد الصورة المحلية كما طلب المستخدم
import logoImg from "./logo.jpg";

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * GetMeDZ Brand Logo: يستخدم الصورة المحلية logo.jpg
 */
export const Logo = ({ className, size = 40 }: LogoProps) => {
  return (
    <div 
      className={cn("relative flex items-center justify-center overflow-hidden rounded-xl", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src={logoImg}
        alt="GetMeDZ Logo"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  );
};
