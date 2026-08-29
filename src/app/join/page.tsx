"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Heart } from "lucide-react";
import { Suspense } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/feedback";
import { Field, NeuButton, NeuInput } from "@/components/ui/primitives";
import { Logo } from "@/components/brand";
import { joinHousehold, parseInvite } from "@/lib/firebase/households";

function JoinInner() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const linkH = params.get("h");
  const linkC = params.get("c");

  const [code, setCode] = useState(linkH && linkC ? `${linkH}.${linkC}` : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace(`/login?next=/join${linkH && linkC ? `%3Fh%3D${linkH}%26c%3D${linkC}` : ""}`);
    else if (profile?.householdId) router.replace("/dashboard");
  }, [loading, user, profile, router, linkH, linkC]);

  if (loading || !user || !profile) return <PageLoader label="Checking your invite…" />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = parseInvite(code);
    if (!parsed) {
      setError("Paste the full invite link or code your partner shared.");
      return;
    }
    setBusy(true);
    try {
      await joinHousehold(profile!, parsed.householdId, parsed.code);
      setDone(true);
      setTimeout(() => router.replace("/dashboard"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join. Check the invite and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2">
        <Logo />
        <h1 className="font-display text-xl font-bold tracking-tight text-ink">Join your partner</h1>
        <p className="flex items-center gap-1.5 text-sm text-sub">
          <Heart size={14} className="text-peach" aria-hidden /> One shared money space, live for both of you.
        </p>
      </div>

      <form onSubmit={submit} className="neu-card flex w-full max-w-[460px] flex-col gap-4 p-6 sm:p-7" noValidate>
        {done ? (
          <p className="py-6 text-center font-display text-lg font-semibold text-teal">Joined! Taking you to your dashboard…</p>
        ) : (
          <>
            <Field label="Invite link or code" error={error} htmlFor="join-code" hint="Looks like https://…/join?h=…&c=… or a long code with dots.">
              <NeuInput
                id="join-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Paste invite"
                className="text-[12.5px]"
                autoFocus
              />
            </Field>
            <NeuButton type="submit" variant="primary" size="lg" loading={busy} className="w-full">
              Join money space
            </NeuButton>
            <p className="text-center text-[13px] text-sub">
              Rather start your own?{" "}
              <Link href="/onboarding" className="font-semibold text-teal hover:underline">
                Create a space
              </Link>
            </p>
          </>
        )}
      </form>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<PageLoader label="Loading invite…" />}>
      <JoinInner />
    </Suspense>
  );
}
