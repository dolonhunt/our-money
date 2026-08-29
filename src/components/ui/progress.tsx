"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";
import type { BudgetStatus } from "@/lib/finance";

/** Soft progress bar with tactile track (PRD §27). */
export function ProgressBar({ value, status = "healthy", className }: { value: number; status?: BudgetStatus; className?: string }) {
  const clamped = Math.min(1, Math.max(0, value));
  const fill =
    status === "over"
      ? "linear-gradient(90deg, var(--c-orange), var(--c-danger))"
      : status === "warning"
        ? "linear-gradient(90deg, var(--c-peach), var(--c-orange))"
        : status === "approaching"
          ? "linear-gradient(90deg, var(--c-mint), var(--c-peach))"
          : "linear-gradient(90deg, var(--c-mint), var(--c-teal))";
  return (
    <div
      className={clsx("neu-inset-sm h-3 w-full overflow-hidden !rounded-full", className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ background: fill }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped * 100}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

/** Circular ring progress for goals — reference's ring visual language (PRD §28). */
export function ProgressRing({
  value,
  size = 92,
  thickness = 9,
  color = "var(--c-teal)",
  trackColor = "var(--c-track)",
  children,
}: {
  value: number; // 0..1
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const id = `ring-${Math.round(clamped * 10000)}-${size}`;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--c-mint)" />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={thickness} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function StatusDot({ status }: { status: BudgetStatus }) {
  const color =
    status === "over" ? "bg-danger" : status === "warning" ? "bg-amber" : status === "approaching" ? "bg-peach" : "bg-teal";
  const label = status === "over" ? "Over budget" : status === "warning" ? "Warning" : status === "approaching" ? "Approaching" : "Healthy";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-sub">
      <span className={clsx("h-2 w-2 rounded-full", color)} aria-hidden />
      {label}
    </span>
  );
}
