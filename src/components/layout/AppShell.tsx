"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Banknote, Receipt, Target, TrendingDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { QuickAddProvider, useQuickAdd } from "@/contexts/QuickAddContext";
import { PageLoader } from "@/components/ui/feedback";
import { Sidebar } from "./Sidebar";
import { AppHeader } from "./AppHeader";
import { MobileNav } from "./MobileNav";
import { TransactionFormModal } from "@/components/transactions/TransactionForm";
import { BillFormModal } from "@/components/bills/BillForm";

/**
 * Authenticated application shell. Guards: no user → /login;
 * user without household → /onboarding (PRD §14–15).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (profile && !profile.householdId) router.replace("/onboarding");
  }, [loading, user, profile, router]);

  if (loading || !user || (profile && !profile.householdId)) {
    return <PageLoader label="Getting your money space ready…" />;
  }

  return (
    <QuickAddProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="min-w-0 flex-1">
          <AppHeader />
          <main className="mx-auto w-full max-w-[1200px] px-4 pb-36 pt-2 sm:px-6 lg:px-8 lg:pb-12 lg:pt-6" id="main">
            {children}
          </main>
        </div>
      </div>
      <MobileNav />
      <QuickAddHost />
    </QuickAddProvider>
  );
}

/** Renders the sheet/modals for the current quick-add kind (PRD §13, §52). */
function QuickAddHost() {
  const { kind, close, open } = useQuickAdd();

  if (kind === "menu") {
    return (
      <div className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(38,50,56,0.35)] backdrop-blur-[2px]" onClick={close} role="dialog" aria-modal="true" aria-label="Quick add">
        <div className="neu-card w-full max-w-md rounded-b-none rounded-t-[28px] p-5 pb-8 sm:mb-6 sm:rounded-[28px]" onClick={(e) => e.stopPropagation()}>
          <p className="mb-4 ml-1 font-display text-base font-semibold text-ink">What are you adding?</p>
          <div className="grid grid-cols-2 gap-2.5">
            <QuickAction label="Expense" icon={<TrendingDown size={20} />} tint="peach" onClick={() => open("expense")} />
            <QuickAction label="Income" icon={<Banknote size={20} />} tint="teal" onClick={() => open("income")} />
            <QuickAction label="Transfer" icon={<ArrowLeftRight size={20} />} tint="teal" onClick={() => open("transfer")} />
            <QuickAction label="Bill" icon={<Receipt size={20} />} tint="peach" onClick={() => open("bill")} />
            <QuickAction label="Goal contribution" icon={<Target size={20} />} tint="teal" wide onClick={() => open("contribution")} />
          </div>
        </div>
      </div>
    );
  }

  if (kind === "contribution") {
    return <GoalContributionRedirect onClose={close} />;
  }

  if (kind === "bill") {
    return <BillFormModal open onClose={close} />;
  }

  if (kind === "expense" || kind === "income" || kind === "transfer") {
    return <TransactionFormModal open onClose={close} initialType={kind} />;
  }

  return null;
}

function GoalContributionRedirect({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  useEffect(() => {
    onClose();
    router.push("/goals?contribute=1");
  }, [onClose, router]);
  return null;
}

function QuickAction({
  label,
  icon,
  tint,
  wide,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  tint: "teal" | "peach";
  wide?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`neu-btn flex items-center gap-3 !rounded-2xl px-4 py-3.5 text-sm ${wide ? "col-span-2" : ""}`}
    >
      <span
        className={`neu-inset-sm flex h-10 w-10 items-center justify-center rounded-full ${tint === "teal" ? "text-teal" : "text-orange"}`}
      >
        {icon}
      </span>
      <span className="font-semibold text-ink">{label}</span>
    </button>
  );
}
