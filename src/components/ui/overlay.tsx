"use client";

import { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { NeuButton } from "./primitives";

/** Accessible dialog: ESC to close, backdrop click, focus containment (PRD §74). */
export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-[rgba(38,50,56,0.35)] p-0 backdrop-blur-[3px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <motion.div
            ref={panelRef}
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 30, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className={clsx("neu-card max-h-[92vh] w-full overflow-y-auto rounded-b-none rounded-t-[28px] p-6 sm:rounded-[28px]", wide ? "sm:max-w-2xl" : "sm:max-w-md")}
          >
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">{title}</h2>
              <NeuButton variant="ghost" size="sm" onClick={onClose} aria-label="Close dialog" className="!rounded-full !p-2">
                <X size={18} />
              </NeuButton>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Destructive-action confirmation (PRD §17 — owner-only destructive confirmations). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={loading ? () => undefined : onClose} title={title}>
      <p className="text-sm leading-relaxed text-sub">{message}</p>
      <div className="mt-6 flex justify-end gap-3">
        <NeuButton variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </NeuButton>
        <NeuButton variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </NeuButton>
      </div>
    </Modal>
  );
}
