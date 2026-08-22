"use client";

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";
import { motion } from "framer-motion";

/* ---------------------------------- Card ---------------------------------- */

export function NeuCard({ children, className, inset, ...rest }: { children: ReactNode; className?: string; inset?: boolean } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(inset ? "neu-inset" : "neu-card", className)} {...rest}>
      {children}
    </div>
  );
}

/* --------------------------------- Button --------------------------------- */

type ButtonVariant = "default" | "primary" | "peach" | "danger" | "ghost";

export interface NeuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const NeuButton = forwardRef<HTMLButtonElement, NeuButtonProps>(function NeuButton(
  { variant = "default", size = "md", loading = false, className, children, disabled, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={clsx(
        "neu-btn inline-flex items-center justify-center gap-2",
        variant === "primary" && "neu-btn-primary",
        variant === "peach" && "neu-btn-peach",
        variant === "danger" && "neu-btn-danger",
        variant === "ghost" && "!shadow-none !border-transparent hover:!bg-[rgba(138,206,209,0.10)]",
        size === "sm" && "px-3.5 py-2 text-[13px] rounded-xl",
        size === "md" && "px-5 py-2.5 text-sm rounded-2xl",
        size === "lg" && "px-6 py-3.5 text-[15px] rounded-2xl",
        className
      )}
      {...rest}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />}
      {children}
    </button>
  );
});

/* ---------------------------------- Field --------------------------------- */

export function Field({ label, error, hint, children, htmlFor }: { label: string; error?: string | null; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label htmlFor={htmlFor} className="ml-1 text-[13px] font-semibold text-sub">
        {label}
      </label>
      {children}
      {error ? (
        <p className="ml-1 text-xs font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="ml-1 text-xs text-faint">{hint}</p>
      ) : null}
    </div>
  );
}

/* ---------------------------------- Input --------------------------------- */

export const NeuInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function NeuInput(
  { className, invalid, ...rest },
  ref
) {
  return <input ref={ref} className={clsx("neu-input", className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const NeuSelect = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }>(function NeuSelect(
  { className, invalid, children, ...rest },
  ref
) {
  return (
    <select ref={ref} className={clsx("neu-input appearance-none pr-9", className)} aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  );
});

export const NeuTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function NeuTextarea(
  { className, ...rest },
  ref
) {
  return <textarea ref={ref} className={clsx("neu-input min-h-[84px] resize-y", className)} {...rest} />;
});

/* ---------------------------- Segmented control ---------------------------- */

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div className="neu-segment" role="tablist" aria-label={ariaLabel}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          data-active={value === o.value}
          className="neu-segment-item"
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------- Avatar --------------------------------- */

export function Avatar({ name, photoURL, size = 36, ring }: { name: string; photoURL?: string | null; size?: number; ring?: "mint" | "peach" | "none" }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className={clsx(
        "relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-display font-semibold text-white",
        ring === "mint" && "ring-[3px] ring-mint/70",
        ring === "peach" && "ring-[3px] ring-peach/70"
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: photoURL ? undefined : "linear-gradient(145deg, var(--c-teal), var(--c-teal-deep))",
      }}
      aria-hidden
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoURL} alt="" width={size} height={size} className="h-full w-full object-cover" />
      ) : (
        initials || "?"
      )}
    </span>
  );
}

/* ------------------------------- Section head ------------------------------ */

export function SectionHead({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-[17px] font-semibold tracking-tight text-ink md:text-lg">{title}</h2>
        {subtitle && <p className="mt-0.5 text-[13px] text-sub">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------ Entrance wrap ------------------------------ */

export function FadeUp({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
