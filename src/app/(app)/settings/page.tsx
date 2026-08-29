"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Bell, LogOut, Monitor, Moon, Palette, Plus, ShieldCheck, Sun, UserRound, Wallet } from "lucide-react";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme, type ThemeChoice } from "@/contexts/ThemeContext";
import { useHousehold } from "@/contexts/HouseholdContext";
import { useToast } from "@/contexts/ToastContext";
import type { CategoryKind, NotificationPrefs } from "@/types";
import { updateUserProfile, sendResetEmail } from "@/lib/firebase/auth";
import { createCategory, updateCategory } from "@/lib/firebase/categories";
import { getFirebaseApp } from "@/lib/firebase/config";
import { PageLoader } from "@/components/ui/feedback";
import { Avatar, FadeUp, Field, NeuButton, NeuInput, NeuSelect, SectionHead, Segmented } from "@/components/ui/primitives";
import { DEFAULT_CURRENCY } from "@/lib/currency";

export default function SettingsPage() {
  const { profile, user, logout, resetPassword } = useAuth();
  const { choice, setChoice } = useTheme();
  const { householdId, categories, loading } = useHousehold();
  const toast = useToast();
  const router = useRouter();
  const avatarRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(profile?.displayName ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [country, setCountry] = useState(profile?.country ?? "");
  const [currency, setCurrency] = useState(profile?.currency ?? DEFAULT_CURRENCY);
  const [prefs, setPrefs] = useState<NotificationPrefs>(profile?.notificationPrefs ?? { partnerActivity: true, budgetAlerts: true, billReminders: true, goalUpdates: true });
  const [newCategory, setNewCategory] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<CategoryKind>("expense");
  const [busy, setBusy] = useState(false);

  if (loading || !profile) return <PageLoader label="Loading settings…" />;

  async function uploadAvatar(file: File) {
    setBusy(true);
    try {
      const storage = getStorage(getFirebaseApp());
      const r = storageRef(storage, `users/${profile!.uid}/avatar/${Date.now()}_${file.name.replace(/[^\w.\-]/g, "_")}`);
      await uploadBytes(r, file);
      const url = await getDownloadURL(r);
      await updateUserProfile(profile!.uid, { photoURL: url });
      toast.success("Photo updated");
    } catch {
      toast.error("Couldn't upload the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile() {
    if (!name.trim()) return toast.error("Name can't be empty.");
    setBusy(true);
    try {
      await updateUserProfile(profile!.uid, { displayName: name.trim(), phone: phone.trim(), country: country.trim(), currency });
      toast.success("Profile saved");
    } catch {
      toast.error("Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function savePrefs(next: NotificationPrefs) {
    setPrefs(next);
    try {
      await updateUserProfile(profile!.uid, { notificationPrefs: next });
    } catch {
      toast.error("Couldn't save preferences.");
    }
  }

  async function addCategory() {
    if (!newCategory.trim() || !householdId) return;
    setBusy(true);
    try {
      await createCategory(householdId, profile!.uid, {
        name: newCategory.trim(),
        kind: newCategoryKind,
        order: categories.filter((c) => c.kind === newCategoryKind).length + 1,
      });
      setNewCategory("");
      toast.success("Category added");
    } catch {
      toast.error("Couldn't add the category.");
    } finally {
      setBusy(false);
    }
  }

  const activeCategories = categories.filter((c) => !c.archived);
  const archivedCategories = categories.filter((c) => c.archived);

  return (
    <div className="flex flex-col gap-6">
      <FadeUp>
        <SectionHead title="Settings" subtitle="Account, household, finance & appearance" />
      </FadeUp>

      {/* Account */}
      <FadeUp delay={0.04}>
        <section className="neu-card flex flex-col gap-4 p-6" aria-label="Account settings">
          <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <UserRound size={16} className="text-teal" aria-hidden /> Account
          </h3>
          <div className="flex items-center gap-4">
            <button onClick={() => avatarRef.current?.click()} className="relative" aria-label="Change profile photo">
              <Avatar name={name || "?"} photoURL={profile.photoURL} size={58} ring="mint" />
              <span className="neu-pill absolute -bottom-1 -right-2 !rounded-full !px-2 !py-0.5 text-[10px] font-bold text-teal">Edit</span>
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadAvatar(f);
                e.currentTarget.value = "";
              }}
            />
            <div className="text-[13px] text-sub">
              <p className="font-semibold text-ink">{profile.email}</p>
              <button
                className="mt-1 font-semibold text-teal hover:underline"
                onClick={async () => {
                  try {
                    await resetPassword(profile.email);
                    toast.success("Password reset email sent");
                  } catch {
                    toast.error("Couldn't send the reset email.");
                  }
                }}
              >
                Change password
              </button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" htmlFor="st-name">
              <NeuInput id="st-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={50} />
            </Field>
            <Field label="Phone" htmlFor="st-phone">
              <NeuInput id="st-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+880 …" />
            </Field>
            <Field label="Country" htmlFor="st-country">
              <NeuInput id="st-country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Bangladesh" />
            </Field>
            <Field label="Preferred currency" htmlFor="st-cur">
              <NeuInput id="st-cur" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))} />
            </Field>
          </div>
          <NeuButton variant="primary" loading={busy} onClick={saveProfile} className="self-start">
            Save profile
          </NeuButton>
        </section>
      </FadeUp>

      {/* Finance: categories */}
      <FadeUp delay={0.08}>
        <section className="neu-card flex flex-col gap-4 p-6" aria-label="Finance settings">
          <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <Wallet size={16} className="text-teal" aria-hidden /> Categories
          </h3>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[180px] flex-1">
              <Field label="New category" htmlFor="st-cat">
                <NeuInput id="st-cat" value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="e.g. Pets" maxLength={24} />
              </Field>
            </div>
            <NeuSelect value={newCategoryKind} onChange={(e) => setNewCategoryKind(e.target.value as CategoryKind)} aria-label="Category kind" className="!w-auto">
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </NeuSelect>
            <NeuButton variant="primary" loading={busy} onClick={addCategory}>
              <Plus size={15} aria-hidden /> Add
            </NeuButton>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {activeCategories.map((c) => (
              <div key={c.id} className="neu-card-sm flex items-center gap-2 p-2.5">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                <NeuInput
                  className="!py-1.5 !text-[13px]"
                  defaultValue={c.name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (v && v !== c.name && householdId) updateCategory(householdId, c.id, { name: v }).catch(() => toast.error("Rename failed"));
                  }}
                  aria-label={`Rename ${c.name}`}
                />
                <span className="shrink-0 rounded-full bg-mint/20 px-2 py-0.5 text-[10px] font-bold text-teal">{c.kind}</span>
                <NeuButton
                  variant="ghost"
                  size="sm"
                  className="!p-1.5"
                  aria-label={`Archive ${c.name}`}
                  title="Archive (keeps history)"
                  onClick={() => householdId && updateCategory(householdId, c.id, { archived: true }).then(() => toast.info(`${c.name} archived`))}
                >
                  <Archive size={13} />
                </NeuButton>
              </div>
            ))}
          </div>
          {archivedCategories.length > 0 && (
            <details className="ml-1 text-[12.5px] text-sub">
              <summary className="cursor-pointer font-semibold">Archived ({archivedCategories.length})</summary>
              <div className="mt-2 flex flex-wrap gap-2">
                {archivedCategories.map((c) => (
                  <button key={c.id} className="neu-chip !text-[11px] line-through" onClick={() => householdId && updateCategory(householdId, c.id, { archived: false })}>
                    {c.name} — restore
                  </button>
                ))}
              </div>
            </details>
          )}
          <p className="ml-1 text-[11.5px] text-faint">Archived categories keep their historical transactions (PRD-safe).</p>
        </section>
      </FadeUp>

      {/* Notifications */}
      <FadeUp delay={0.12}>
        <section className="neu-card flex flex-col gap-4 p-6" aria-label="Notification settings">
          <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <Bell size={16} className="text-teal" aria-hidden /> Notifications
          </h3>
          {(
            [
              ["partnerActivity", "Partner activity", "When your partner adds or changes money records"],
              ["budgetAlerts", "Budget alerts", "When a budget hits 90% or goes over"],
              ["billReminders", "Bill reminders", "Before a bill is due"],
              ["goalUpdates", "Goal updates", "Contributions and milestones"],
            ] as [keyof NotificationPrefs, string, string][]
          ).map(([key, label, description]) => (
            <label key={key} className="neu-inset-sm flex cursor-pointer items-center gap-3 p-3.5">
              <input
                type="checkbox"
                checked={prefs[key]}
                onChange={(e) => savePrefs({ ...prefs, [key]: e.target.checked })}
                className="h-4.5 w-4.5 h-[18px] w-[18px] shrink-0 accent-[var(--c-teal)]"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold text-ink">{label}</span>
                <span className="block text-[11.5px] text-sub">{description}</span>
              </span>
            </label>
          ))}
        </section>
      </FadeUp>

      {/* Appearance */}
      <FadeUp delay={0.16}>
        <section className="neu-card flex flex-col gap-4 p-6" aria-label="Appearance settings">
          <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <Palette size={16} className="text-teal" aria-hidden /> Appearance
          </h3>
          <Segmented
            ariaLabel="Theme"
            value={choice}
            onChange={(v) => setChoice(v as ThemeChoice)}
            options={[
              { value: "light", label: <span className="flex items-center gap-1.5"><Sun size={13} aria-hidden /> Light</span> },
              { value: "dark", label: <span className="flex items-center gap-1.5"><Moon size={13} aria-hidden /> Dark</span> },
              { value: "system", label: <span className="flex items-center gap-1.5"><Monitor size={13} aria-hidden /> System</span> },
            ]}
          />
        </section>
      </FadeUp>

      {/* Security */}
      <FadeUp delay={0.2}>
        <section className="neu-card flex flex-col gap-4 p-6" aria-label="Security settings">
          <h3 className="flex items-center gap-2 font-display text-[15px] font-semibold text-ink">
            <ShieldCheck size={16} className="text-teal" aria-hidden /> Security
          </h3>
          <p className="text-[13px] text-sub">
            Signed in as <strong className="text-ink">{profile.email}</strong>
            {user?.metadata?.lastSignInTime ? ` · last sign-in ${user.metadata.lastSignInTime}` : ""}
          </p>
          <div className="flex flex-wrap gap-3">
            <NeuButton variant="danger" onClick={() => logout().then(() => router.replace("/login"))}>
              <LogOut size={14} aria-hidden /> Sign out
            </NeuButton>
            <NeuButton variant="ghost" onClick={() => router.push("/couple")}>
              Household & members
            </NeuButton>
          </div>
        </section>
      </FadeUp>
    </div>
  );
}
