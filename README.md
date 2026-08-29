# Our Money — Couple Budget & Money Management App

> **Two people. One financial picture.**

A premium, couple-first budgeting web app + PWA. Separate accounts, one
synchronized household workspace — every income, expense, budget and goal is
shared and **live for both partners in real time**.

Built to the **DS001 Final PRD** (`couple-budget-final-prd.md`) as a clean-room
reimplementation: Next.js + TypeScript + Tailwind CSS, Firebase
(Authentication + Firestore + Storage), Recharts, Framer Motion, Lucide icons,
neumorphic soft-3D design system.

---

## Quick start

```bash
npm install
cp .env.local.example .env.local   # then fill it in (2 min)
npm run dev
```

Full Firebase walkthrough: **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)** —
includes enabling Auth/Firestore/Storage and deploying the security rules.

## Features

- **Couple system** — create a money space, invite your partner by secure link
  or code, owner/member roles, live member state, ownership transfer.
- **Real-time everything** — Firestore listeners sync transactions, budgets,
  goals, bills, notifications, activity and household changes between both
  partners with no refresh. Live sync badge included.
- **Money management** — expenses, income, transfers (never inflate totals),
  accounts with derived balances, paid-by (me / partner / both),
  shared vs personal records, soft deletes.
- **Planning** — monthly category budgets with healthy/approaching/warning/over
  thresholds, savings goals with ring progress, contributions from either
  partner (transaction-safe), bills with due-soon/overdue status and reminders,
  recurring transactions that materialize when due (idempotent — no doubles).
- **Together feed** — meaningful activity from both partners, in real time.
- **Notifications** — partner activity, budget alerts (90%/100%), bill
  reminders, goal milestones; idempotent so they never spam.
- **Reports** — monthly summary, category analysis with trends, couple
  contribution split, shared vs personal, cash flow, budget performance.
- **Dashboard** — "OUR MONEY" hero with dominant balance, money-flow chart
  (1M/3M/6M/1Y), spending donut that drills into filtered transactions.
- **Design** — neumorphic soft-3D system (light gray base, mint/teal +
  peach/orange), Poppins/Inter, tactile controls, dark mode (Light/Dark/System).
- **PWA** — installable, offline-safe reads, writes never silently disappear.
- **Dual storage** — Supabase Storage (free tier) for avatars and receipt
  attachments; automatic fallback to Firebase Storage if Supabase keys are not
  configured. See **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)**.
- **Security** — hardened Firestore/Storage rules: household membership is
  verified server-side; invite codes are checked inside the rules; one user can
  never touch another household. See `firestore.rules`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (also type-checks) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |

## Live demo

> [https://our-money-red.vercel.app](https://our-money-red.vercel.app)

## Deployment (Vercel)

1. Push this repo to GitHub (or fork it).
2. Import the repo in [vercel.com/new](https://vercel.com/new).
3. Add the same environment variables from `.env.local` under
   **Settings → Environment Variables**.
4. Deploy — Vercel auto-detects Next.js; no extra config needed.
5. Don't forget to deploy your Firebase security rules (see
   **[FIREBASE_SETUP.md](./FIREBASE_SETUP.md)**, step 7).

## Project structure

```
src/
  app/                  # Next.js App Router
    (auth)/             # login, signup, forgot-password
    (app)/              # authenticated shell + all feature pages
    join/               # invite link/code landing
    onboarding/         # 3-step first-run flow
  components/
    ui/                 # neumorphic primitives (buttons, inputs, modals…)
    layout/             # sidebar, mobile nav, header, quick-add host
    dashboard/          # hero, money flow, donut, summaries, feed
    transactions/ …     # feature components
    charts/             # themed Recharts wrappers
  contexts/             # Auth, Household, Theme, Toast, QuickAdd
  hooks/                # realtime collection hooks + sync status
  lib/
    firebase/           # service layer (one module per entity)
    finance.ts          # centralized financial calculations
    currency.ts dates.ts ids.ts sync.ts
  types/                # shared domain types
firestore.rules         # security rules (deploy these!)
storage.rules
firestore.indexes.json
```

## Data model (Firestore)

```
users/{uid}
households/{householdId}
  members/{uid}
  transactions/{id}        # expense | income | transfer (+ recurring parents)
  categories/{id}
  budgets/{id}             # per category + month
  accounts/{id}
  goals/{id}
  goalContributions/{id}
  bills/{id}
  notifications/{id}       # per-recipient
  activity/{id}            # append-only couple feed
```

Every transaction records `createdBy / updatedBy / createdAt / updatedAt`;
deletes are soft (`deletedAt`) so totals stay correct.

## Verification checklist (PRD §78)

After setup, verify with **two browsers** (one normal, one incognito) logged
into the same household:

1. Partner A adds an expense → Partner B's dashboard updates without refresh.
2. Repeat for income, budget, goal contribution, bill — all live.
3. Budget at 90% / over → both get one notification (not repeated).
4. Bill due tomorrow → reminder appears once.
5. Both edit around the same time → `updatedBy/updatedAt` preserved, no
   silent overwrites (goal contributions run in Firestore transactions).
6. Sign out / log in on phone → install as PWA, data intact.

## Known v1 boundaries (deliberate)

- Household rename/settings are owner-only (rules-enforced).
- Transaction history live window is the latest 500 records.
- Search/filter run client-side over the loaded window.
- Cloud Functions are not required — recurring generation and alerts are
  idempotent client-side jobs, safe when both partners run them.

## Credits

Product spec: DS001 Final PRD. Visual direction: modern neumorphic soft-3D
finance UI (mint/teal + peach/orange), interpreted originally.
