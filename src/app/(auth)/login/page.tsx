"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FriendlyAuthError, useAuth } from "@/contexts/AuthContext";
import { useSetupState } from "@/hooks/useSetupState";
import { Field, NeuButton, NeuInput } from "@/components/ui/primitives";
import { isFirebaseConfigured, firebaseSetupHint } from "@/lib/firebase/config";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const { setupState } = useSetupState();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (setupState === "loading" || setupState === "unauthorized" || setupState === "error") return;
    if (setupState === "complete") {
      router.replace("/dashboard");
    } else if (setupState === "needs_profile" || setupState === "needs_household") {
      router.replace("/onboarding");
    }
  }, [setupState, router]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof FriendlyAuthError ? err.message : "Couldn't sign in. Try again.");
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
        <h2 className="font-display text-lg font-semibold text-ink">Sign in to your account</h2>
        <Field label="Email" htmlFor="login-email">
          <NeuInput id="login-email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} invalid={Boolean(error)} />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <NeuInput id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} invalid={Boolean(error)} />
        </Field>
        {error && (
          <p className="text-[13px] font-medium text-danger" role="alert">
            {error}
          </p>
        )}
        <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="mt-1 w-full">
          Sign in
        </NeuButton>
        <div className="flex items-center justify-between text-[13px]">
          <Link href="/forgot-password" className="font-semibold text-teal hover:underline">
            Forgot password?
          </Link>
          <p className="text-sub">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-teal hover:underline">
              Sign up
            </Link>
          </p>
        </div>
        <div className="neu-divider my-1" />
        <NeuButton
          type="button"
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await loginWithGoogle();
            } catch (err) {
              setError(err instanceof FriendlyAuthError ? err.message : "Google sign-in failed.");
            } finally {
              setBusy(false);
            }
          }}
          loading={busy}
          className="w-full"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" aria-hidden>
            <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.15 3.5 2.7.24.02c2.2-2 3.5-5 3.5-8.6" />
            <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.8-2.9c-1 .7-2.4 1.2-4.1 1.2-3.1 0-5.8-2.1-6.8-5l-.14.01-3.6 2.8-.05.13C3.4 21.3 7.4 24 12 24" />
            <path fill="#FBBC05" d="M5.2 14.4c-.25-.7-.4-1.5-.4-2.4s.15-1.7.42-2.4l-.01-.16-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.4 5.3l3.8-2.9" />
            <path fill="#EB4335" d="M12 4.6c2.2 0 3.6.9 4.5 1.7l3.3-3.2C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.7 1.4 6.7l3.8 2.9c1-2.9 3.7-5 6.8-5" />
          </svg>
          Continue with Google
        </NeuButton>
      </form>
      <p className="text-center text-[12px] text-faint">
        Invited by your partner? <Link href="/join" className="font-semibold text-teal hover:underline">Use your invite</Link>
      </p>
    </div>
  );
}
