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
  Activity,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: "notifications";
  primary?: true; // shown in mobile primary bar
  group?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, primary: true },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight, primary: true, group: "Money" },
  { href: "/income", label: "Income", icon: Wallet, group: "Money" },
  { href: "/expenses", label: "Expenses", icon: TrendingDown, group: "Money" },
  { href: "/accounts", label: "Accounts", icon: Wallet, group: "Money" },
  { href: "/budgets", label: "Budgets", icon: Target, group: "Plan" },
  { href: "/goals", label: "Goals", icon: Target, primary: true, group: "Plan" },
  { href: "/bills", label: "Bills & Recurring", icon: Receipt, group: "Plan" },
  { href: "/reports", label: "Reports", icon: BarChart3, group: "Insights" },
  { href: "/couple", label: "Couple", icon: Heart, group: "Together" },
  { href: "/activity", label: "Shared Activity", icon: Activity, group: "Together" },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications", group: "System" },
  { href: "/settings", label: "Settings", icon: Settings, group: "System" },
];
