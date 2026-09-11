import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase is used for file storage (avatars, receipt attachments) —
 * Firebase remains the auth + Firestore backend.
 * Falls back to Firebase Storage or local Data URL if neither storage is configured.
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
 * Prefers Supabase Storage; then Firebase Storage; and falls back to a base64 Data URL
 * to ensure offline resilience and seamless prototyping without external blockers.
 */
export async function uploadFile(path: string, file: File): Promise<string> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const clean = path.replace(/[^\w./-]/g, "_");
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(clean, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });
      if (!error) {
        const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(clean);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // Fall through to Firebase or Data URL fallback
    }
  }

  try {
    const [storageMod, { getFirebaseApp }] = await Promise.all([
      import("firebase/storage"),
      import("@/lib/firebase/config"),
    ]);
    const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = storageMod;
    const r = storageRef(getStorage(getFirebaseApp()), path);
    await uploadBytes(r, file);
    return await getDownloadURL(r);
  } catch {
    // Resilient fallback: base64 Data URL so user receipts work even without active cloud storage buckets
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}
