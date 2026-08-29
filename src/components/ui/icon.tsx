"use client";

import {
  Banknote,
  Briefcase,
  Car,
  CircleEllipsis,
  Clapperboard,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  Plane,
  Plug,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Curated icon registry (tree-shakeable). Category docs store the icon NAME;
 * this map resolves it. Unknown names fall back to CircleEllipsis.
 */
const ICONS: Record<string, LucideIcon> = {
  Banknote,
  Briefcase,
  Car,
  CircleEllipsis,
  Clapperboard,
  Gift,
  GraduationCap,
  Heart,
  HeartPulse,
  Home,
  Laptop,
  Plane,
  Plug,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
  Users,
};

export function DynamicIcon({ name, size = 18, className, strokeWidth = 2 }: { name: string; size?: number; className?: string; strokeWidth?: number }) {
  const Cmp = ICONS[name] ?? CircleEllipsis;
  return <Cmp size={size} className={className} strokeWidth={strokeWidth} aria-hidden />;
}
