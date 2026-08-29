"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

/** Skeleton block matching final layouts to prevent jumping (PRD §54). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx("neu-inset-sm relative overflow-hidden", className)}
      aria-hidden
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(90deg, transparent, rgba(138,206,209,0.14), transparent)" }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/** Designed empty state for every module (PRD §53). */
export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="neu-inset flex h-16 w-16 items-center justify-center rounded-full text-teal">{icon}</div>
      <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
      {description && <p className="max-w-xs text-[13px] leading-relaxed text-sub">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="neu-card-sm flex items-start gap-3 border-danger/30 p-4 text-sm text-danger" role="alert">
      {message}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={clsx("inline-block h-5 w-5 animate-spin rounded-full border-2 border-teal border-t-transparent", className)} aria-label="Loading" />;
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full flex-col items-center justify-center gap-4" aria-busy>
      <div className="neu-inset flex h-14 w-14 items-center justify-center rounded-full">
        <Spinner />
      </div>
      <p className="text-sm text-sub">{label}</p>
    </div>
  );
}
