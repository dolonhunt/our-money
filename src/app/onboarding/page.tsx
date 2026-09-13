"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Heart, LogOut, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSetupState } from "@/hooks/useSetupState";
import { useToast } from "@/contexts/ToastContext";
import { PageLoader } from "@/components/ui/feedback";
import { SafeErrorView } from "@/components/layout/SafeErrorView";
import { Avatar, Field, NeuButton, NeuInput, NeuSelect } from "@/components/ui/primitives";
import { Logo } from "@/components/brand";
import { updateUserProfile } from "@/lib/firebase/auth";
import { createHousehold } from "@/lib/firebase/households";
import { getFirebaseApp } from "@/lib/firebase/config";
import { uploadFile } from "@/lib/supabase";
import { DEFAULT_CURRENCY } from "@/lib/currency";

const CURRENCIES = [
  { value: "BDT", label: "৳ BDT — Bangladeshi Taka" },
  { value: "USD", label: "$ USD — US Dollar" },
  { value: "EUR", label: "€ EUR — Euro" },
  { value: "GBP", label: "£ GBP — British Pound" },
  { value: "INR", label: "₹ INR — Indian Rupee" },
];

export default function OnboardingPage() {
  const { user, profile, logout } = useAuth();
  const { setupState, error: setupError, retry } = useSetupState();
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY);
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<{ link: string; code: string } | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (setupState === "loading" || setupState === "error") return;
    if (setupState === "unauthorized") {
      router.replace("/login");
      return;
    }
    if (setupState === "complete" && step !== 2 && !busy) {
      router.replace("/dashboard");
      return;
    }
    if (profile) {
      setName((prev) => prev || (profile.displayName ?? ""));
      setPhotoURL((prev) => prev || (profile.photoURL ?? null));
      setCurrency((prev) => prev || (profile.currency || DEFAULT_CURRENCY));
      setCountry((prev) => prev || (profile.country ?? ""));
      setPhone((prev) => prev || (profile.phone ?? ""));
      if (!householdName && profile.displayName) {
        const first = profile.displayName.split(" ")[0];
        setHouseholdName(`${first} + Partner`);
      }
    }
  }, [setupState, step, busy, profile, router, householdName]);

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  if (setupState === "error") {
    return <SafeErrorView onRetry={retry} message={setupError?.message} />;
  }
  if (setupState === "loading") {
    return <PageLoader label="Preparing onboarding…" />;
  }
  if (setupState === "unauthorized") {
    return <PageLoader label="Redirecting to login…" />;
  }
  if (setupState === "complete" && step !== 2 && !busy) {
    return <PageLoader label="Redirecting to dashboard…" />;
  }
  if (!user || (!profile && setupState !== "needs_profile")) {
    return <PageLoader label="Preparing onboarding…" />;
  }

  async function uploadAvatar(file: File) {
    setBusy(true);
    try {
      const url = await uploadFile(`users/${user!.uid}/avatar/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`, file);
      setPhotoURL(url);
    } catch {
      toast.error("Couldn't upload the image. Check that the Supabase \u201Cuploads\u201D bucket exists (see SUPABASE_SETUP.md).");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfileStep() {
    if (!name.trim()) return setError("Your name is required.");
    setBusy(true);
    setError(null);
    try {
      await updateUserProfile(user!.uid, { displayName: name.trim(), photoURL, currency, country: country.trim(), phone: phone.trim() });
      setStep(1);
    } catch (err) {
      console.error("Failed to save profile:", err);
      setError("Couldn't save your profile. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function createSpace() {
    if (!householdName.trim()) return setError("Give your money space a name.");
    setBusy(true);
    setError(null);
    try {
      const fallbackProfile: any = profile || {
        uid: user!.uid,
        displayName: name.trim() || user!.displayName || "Partner",
        email: user!.email ?? "",
        photoURL,
        currency,
        householdId: null,
        role: null,
        country: country.trim(),
        phone: phone.trim(),
        timezone: "UTC",
        notificationPrefs: { emailWeekly: true, emailOverBudget: true, pushActivity: true },
      };
      const { id, inviteCode } = await createHousehold(
        { ...fallbackProfile, displayName: name.trim() || fallbackProfile.displayName, photoURL },
        householdName.trim(),
        currency
      );
      setInvite({ link: `${origin}/join?h=${id}&c=${inviteCode}`, code: `${id}.${inviteCode}` });
      setStep(2);
    } catch (err) {
      console.error("Failed to create money space:", err);
      setError("Couldn't create the money space. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, what: "link" | "code") {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(what);
        setTimeout(() => setCopied(null), 1800);
      },
      () => toast.error("Couldn't copy — select the text manually.")
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-10">
      <div className="flex flex-col items-center gap-2">
        <Logo />
        <h1 className="font-display text-xl font-bold tracking-tight text-ink">Set up Our Money</h1>
        {/* Step dots */}
        <div className="flex items-center gap-2" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i === step ? "w-7 bg-teal" : i < step ? "w-2 bg-teal/60" : "w-2 bg-[var(--c-track)]"}`} />
          ))}
        </div>
      </div>

      <div className="w-full max-w-[480px]">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="s0" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="neu-card flex flex-col gap-4 p-6 sm:p-7">
              <h2 className="font-display text-lg font-semibold text-ink">Your profile</h2>
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => fileRef.current?.click()} className="group relative" aria-label="Upload profile photo">
                  <Avatar name={name || "?"} photoURL={photoURL} size={64} />
                  <span className="neu-pill absolute -bottom-1 -right-1 !rounded-full !p-1.5 text-teal">
                    <UserPlus size={13} aria-hidden />
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadAvatar(f);
                    e.currentTarget.value = "";
                  }}
                />
                <p className="text-[13px] leading-relaxed text-sub">Tap the avatar to add a photo so your partner always knows who did what.</p>
              </div>
              <Field label="Full name" htmlFor="ob-name">
                <NeuInput id="ob-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Currency" htmlFor="ob-cur">
                  <NeuSelect id="ob-cur" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    {CURRENCIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </NeuSelect>
                </Field>
                <Field label="Country" htmlFor="ob-country">
                  <NeuInput id="ob-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. Bangladesh" />
                </Field>
              </div>
              <Field label="Phone (optional)" htmlFor="ob-phone">
                <NeuInput id="ob-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880 …" />
              </Field>
              {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
              <NeuButton variant="primary" size="lg" loading={busy} onClick={saveProfileStep} className="w-full">
                Continue
              </NeuButton>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="s1" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="neu-card flex flex-col gap-4 p-6 sm:p-7">
              <h2 className="font-display text-lg font-semibold text-ink">Your money space</h2>
              <p className="text-sm leading-relaxed text-sub">A private workspace where you and your partner share one financial picture — in real time.</p>

              <div className="neu-inset flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="neu-card-sm flex h-10 w-10 items-center justify-center !rounded-full text-teal">
                    <Users size={19} aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">Create a new space</p>
                    <p className="text-[12.5px] text-sub">You&rsquo;ll be the owner and can invite your partner.</p>
                  </div>
                </div>
                <Field label="Space name" htmlFor="ob-hh">
                  <NeuInput id="ob-hh" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="e.g. Dolon + Partner" />
                </Field>
                <NeuButton variant="primary" loading={busy} onClick={createSpace}>
                  Create money space
                </NeuButton>
              </div>

              <div className="neu-inset flex flex-col gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="neu-card-sm flex h-10 w-10 items-center justify-center !rounded-full text-orange">
                    <Heart size={19} aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink">Join your partner</p>
                    <p className="text-[12.5px] text-sub">Have an invite link or code from them?</p>
                  </div>
                </div>
                <NeuButton onClick={() => router.push("/join")}>Use invite</NeuButton>
              </div>

              {error && <p className="text-[13px] font-medium text-danger" role="alert">{error}</p>}
              <button onClick={() => setStep(0)} className="text-[13px] font-semibold text-sub hover:text-ink">
                ← Back to profile
              </button>
            </motion.div>
          )}

          {step === 2 && invite && (
            <motion.div key="s2" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }} className="neu-card flex flex-col gap-4 p-6 sm:p-7">
              <h2 className="font-display text-lg font-semibold text-ink">Invite your partner</h2>
              <p className="text-sm leading-relaxed text-sub">
                Send either the secure link or the code below. Once they join, everything you both add appears live for both of you.
              </p>

              <Field label="Invite link">
                <div className="flex gap-2">
                  <NeuInput readOnly value={invite.link} className="truncate text-[12.5px]" onFocus={(e) => e.currentTarget.select()} />
                  <NeuButton onClick={() => copy(invite.link, "link")} aria-label="Copy invite link" className="!px-3">
                    {copied === "link" ? <Check size={16} className="text-teal" aria-hidden /> : <Copy size={16} aria-hidden />}
                  </NeuButton>
                </div>
              </Field>

              <Field label="Invite code" hint="Your partner pastes this on the Join screen.">
                <div className="flex gap-2">
                  <NeuInput readOnly value={invite.code} className="truncate text-[12.5px]" onFocus={(e) => e.currentTarget.select()} />
                  <NeuButton onClick={() => copy(invite.code, "code")} aria-label="Copy invite code" className="!px-3">
                    {copied === "code" ? <Check size={16} className="text-teal" aria-hidden /> : <Copy size={16} aria-hidden />}
                  </NeuButton>
                </div>
              </Field>

              <a
                href={`mailto:?subject=${encodeURIComponent("Join our money space 💸")}&body=${encodeURIComponent(`Hey! Join our shared budget on Our Money:\n\n${invite.link}\n\nOr use this code on the Join screen:\n${invite.code}`)}`}
                className="text-center text-[13px] font-semibold text-teal hover:underline"
              >
                Send by email instead
              </a>

              <NeuButton variant="primary" size="lg" onClick={() => router.replace("/dashboard")} className="w-full">
                Go to dashboard — I&rsquo;ll invite later
              </NeuButton>
              <button onClick={logout} className="mx-auto flex items-center gap-1.5 text-[12.5px] font-semibold text-sub hover:text-ink">
                <LogOut size={13} aria-hidden /> Sign out
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
