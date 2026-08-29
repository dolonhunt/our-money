import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is used ONLY for file storage (avatars, receipt attachments) —
 * Firebase remains the auth + Firestore backend. Supabase Storage works on
 * the free tier, unlike Firebase Storage (which needs the Blaze plan).
 * Only the publishable (anon) key is used client-side; the secret key is
 * never referenced in app code.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

export const STORAGE_BUCKET = "uploads";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) client = createClient(url, anonKey, { auth: { persistSession: false } });
  return client;
}

/**
 * Upload a file and return its public URL.
 * Prefers Supabase Storage; falls back to Firebase Storage when Supabase
 * env vars are not configured (that path requires a Firebase Blaze plan).
 */
export async function uploadFile(path: string, file: File): Promise<string> {
  const supabase = getSupabase();
  if (supabase) {
    const clean = path.replace(/[^\w./-]/g, "_");
    const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(clean, file, {
      upsert: false,
      contentType: file.type || "application/octet-stream",
    });
    if (error) throw new Error(error.message);
    const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(clean);
    return data.publicUrl;
  }

  const [storageMod, { getFirebaseApp }] = await Promise.all([
    import("firebase/storage"),
    import("@/lib/firebase/config"),
  ]);
  const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = storageMod;
  const r = storageRef(getStorage(getFirebaseApp()), path);
  await uploadBytes(r, file);
  return getDownloadURL(r);
}
