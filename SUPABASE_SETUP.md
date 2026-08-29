# Supabase Storage Setup (avatars + receipt attachments)

The app uses **Firebase for auth and the database** and **Supabase only for file storage**,
because Supabase Storage works on the free tier while Firebase Storage requires the Blaze
(pay-as-you-go) plan. If Supabase is not configured, the app automatically falls back to
Firebase Storage.

## One-time setup (2 minutes)

1. **Create the public bucket**
   - Open your Supabase dashboard → your project → **Storage** (left sidebar)
   - Click **New bucket**
   - Name: `uploads` (exactly this — the code references it)
   - Toggle **Public bucket** ON
   - Click **Create**

2. **Environment variables** — already set in `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://rxyjuajbwunwdedcgbnz.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable key from Project Settings → API>
   ```

   On Vercel, add the same two variables:
   **Project → Settings → Environment Variables**, then redeploy.

3. **Upload rules** — the default public-bucket policies allow uploads with the publishable
   key. If you want stricter rules later (Storage → Policies), restrict inserts to
   authenticated users; the app does not depend on any specific policy.

## Notes

- Only the **publishable (anon) key** is used in the app — it is safe to expose in the
  browser, just like the Firebase web config. The **secret key** is never used client-side.
- Files land at `uploads/users/<uid>/avatar/...` and
  `uploads/households/<id>/receipts/<uid>/...`
- Anyone with a file's URL can view it (that is what "public bucket" means). Receipts are
  stored under unguessable timestamped names; switch to signed URLs in `src/lib/supabase.ts`
  if you ever want per-request access control.
