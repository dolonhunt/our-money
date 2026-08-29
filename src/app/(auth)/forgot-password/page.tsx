"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { FriendlyAuthError, useAuth } from "@/contexts/AuthContext";
import { Field, NeuButton, NeuInput } from "@/components/ui/primitives";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError("Enter your email.");
    setBusy(true);
    try {
      await resetPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof FriendlyAuthError ? err.message : "Couldn't send the email. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="neu-card flex flex-col gap-4 p-6 sm:p-7" noValidate>
      <h2 className="font-display text-lg font-semibold text-ink">Reset your password</h2>
      {sent ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-sub">
            If an account exists for <strong className="text-ink">{email}</strong>, a reset link is on its way. Check your inbox (and spam folder).
          </p>
          <Link href="/login" className="text-center text-[13px] font-semibold text-teal hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm leading-relaxed text-sub">We&rsquo;ll email you a secure link to set a new password.</p>
          <Field label="Email" htmlFor="fp-email">
            <NeuInput id="fp-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          {error && (
            <p className="text-[13px] font-medium text-danger" role="alert">
              {error}
            </p>
          )}
          <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="w-full">
            Send reset link
          </NeuButton>
          <Link href="/login" className="text-center text-[13px] font-semibold text-teal hover:underline">
            Back to sign in
          </Link>
        </>
      )}
    </form>
  );
}
