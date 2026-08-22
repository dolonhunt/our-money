"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FriendlyAuthError, useAuth } from "@/contexts/AuthContext";
import { Field, NeuButton, NeuInput } from "@/components/ui/primitives";
import { isFirebaseConfigured, firebaseSetupHint } from "@/lib/firebase/config";

export default function SignupPage() {
  const { signUp, user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace("/onboarding");
  }, [user, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Tell us your name.");
    if (!email.trim()) return setError("Enter your email.");
    if (password.length < 6) return setError("Password should be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don't match.");
    setBusy(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace("/onboarding");
    } catch (err) {
      setError(err instanceof FriendlyAuthError ? err.message : "Couldn't create the account. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!isFirebaseConfigured && (
        <div className="neu-card-sm p-4 text-[13px] leading-relaxed text-sub" role="alert">
          <strong className="text-ink">Setup needed:</strong> {firebaseSetupHint()}
        </div>
      )}
      <form onSubmit={submit} className="neu-card flex flex-col gap-4 p-6 sm:p-7" noValidate>
        <h2 className="font-display text-lg font-semibold text-ink">Create your account</h2>
        <Field label="Full name" htmlFor="su-name">
          <NeuInput id="su-name" autoComplete="name" placeholder="e.g. Dolon Hunt" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="su-email">
          <NeuInput id="su-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" htmlFor="su-pass">
            <NeuInput id="su-pass" type="password" autoComplete="new-password" placeholder="Min 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Field label="Confirm" htmlFor="su-pass2">
            <NeuInput id="su-pass2" type="password" autoComplete="new-password" placeholder="Repeat it" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
        </div>
        {error && (
          <p className="text-[13px] font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="mt-1 w-full">
          Create account
        </NeuButton>
        <p className="text-center text-[13px] text-sub">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-teal hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
