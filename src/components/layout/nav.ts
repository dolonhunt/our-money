import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  Heart,
  LayoutDashboard,
  Receipt,
  Settings,
  Target,
  TrendingDown,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "notifications";
  primary?: true; // shown in mobile primary bar
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, primary: true },
  { href: "/income", label: "Income", icon: Wallet },
  { href: "/expenses", label: "Expenses", icon: TrendingDown },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/goals", label: "Goals", icon: Target, primary: true },
  { href: "/bills", label: "Bills & Recurring", icon: Receipt },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
  { href: "/couple", label: "Couple", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
];
