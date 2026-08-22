# Firebase Setup Guide — Our Money

This app is Firebase-backed (Authentication + Firestore + Storage). Follow this
once and you're done. **Time: ~5 minutes.**

> Already have the old DS001 Firebase project? Skip to **step 3**, enable
> **Storage** (new), then paste your existing config in **step 5**.

---

## 1. Create the Firebase project

1. Go to <https://console.firebase.google.com> and click **Add project**.
2. Name it (e.g. `our-money`), Google Analytics optional.
3. Create the project.

## 2. Register a Web App

1. On the project overview, click the **Web (`</>`)** icon.
2. Nickname: `Our Money`. Tick **Also set up Firebase Hosting** only if you plan to host on Firebase (Vercel works fine too — no tick needed).
3. Click **Register app**.
4. You'll see a `firebaseConfig` object — keep that screen open (or copy it).

## 3. Enable Authentication

1. **Build → Authentication → Get started**.
2. Enable **Email/Password** (required).
3. Optionally enable **Google** (the login screen shows the button).

## 4. Create the Firestore database

1. **Build → Firestore Database → Create database**.
2. Choose **Production mode** (we'll deploy real rules next) and a location
   close to you (e.g. `asia-south1` for Bangladesh).
3. **Do not** create collections manually — the app creates everything
   (`users`, `households/…`) on first run.

## 5. Fill in `.env.local`

1. In this project folder, copy the template:
   - Windows PowerShell: `Copy-Item .env.local.example .env.local`
   - Git Bash: `cp .env.local.example .env.local`
2. Paste the matching values from the `firebaseConfig` you copied in step 2:

   ```ini
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=our-money-xxxx.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=our-money-xxxx
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=our-money-xxxx.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abc123...
   ```

   These `NEXT_PUBLIC_` values are public by design — real security is
   enforced by the Firestore/Storage rules, not by hiding this config.

## 6. Enable Storage (receipts & avatars)

1. **Build → Storage → Get started**. Accept the default bucket.
2. Production rules come with this repo (see step 7).

## 7. Deploy the security rules

The repo ships with hardened rules. Deploy with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage --project YOUR_PROJECT_ID
```

(When prompted to initialize first, answer **No** / keep existing files —
`firebase.json` already points at the right files.)

Prefer the console? Paste `firestore.rules` into **Firestore → Rules**, and
`storage.rules` into **Storage → Rules**, then click **Publish**. Create the
three composite indexes from `firestore.indexes.json` if the console prompts
you (the app also shows a direct link the first time a query needs one).

## 8. Run the app

```bash
npm install
npm run dev
```

Open <http://localhost:3000>:

1. **Sign up** → onboarding → **Create money space**.
2. Copy the **invite link/code** shown in step 3 of onboarding (or from the
   Couple page later).
3. Open an incognito window, sign up as your partner, choose **Use invite**,
   paste the code — you're both in one live workspace.
4. Add an expense in one window; watch it appear in the other instantly. ✅

## Deploying

Any Node host works. Simplest:

```bash
npm run build && npm start
```

Or connect the repo to **Vercel** (zero config). Remember to add the same
`.env.local` variables in the hosting provider's environment settings.

---

## Security model (what the rules enforce)

- Nothing is readable without signing in.
- Household data (`transactions`, `budgets`, `goals`, `bills`, `accounts`,
  `activity`, `notifications`, `categories`) is readable/writable **only by
  members of that household** — verified server-side, always.
- Joining requires the household's current **invite code** (checked inside the
  security rule itself, not just the UI).
- Only the **owner** can rename the household, regenerate invites, transfer
  ownership or remove members.
- Users can edit **only their own** profile; notifications can be marked read
  only by their recipient; activity & goal contributions are append-only.
- One signed-in user can never read another household's data — even with
  hand-crafted requests.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| "Setup needed" banner on login | `.env.local` missing or incomplete — step 5, then restart `npm run dev`. |
| `permission-denied` on first writes | Rules not deployed yet — step 7. |
| "The query requires an index" | Click the link in the error; it creates the composite index in one click. |
| Receipt upload fails | Storage not enabled — step 6. |
| Invite link says invalid | The code was regenerated after the link was shared — share the new one from the Couple page. |
