# Our Money --- Final PRD & UI Design Instructions

**Status:** Final implementation specification\
**Product:** Our Money\
**Positioning:** Couple-first budgeting and household money management\
**Primary currency:** BDT\
**Platforms:** Responsive Web + PWA\
**Core promise:** **Two people. One financial picture.**

## 1. Product vision

Our Money is a couple-first financial workspace. It must make household
money understandable at a glance without feeling like accounting
software.

The product must answer three questions:

1.  **Where are we now?** --- balances, income, spending and savings.
2.  **Where is our money going?** --- transactions, categories, budgets
    and insights.
3.  **What is coming next?** --- bills, subscriptions, planned payments,
    goals and forecast.

Every major financial view should distinguish **Shared**, **My**,
**Partner**, **Paid by me**, **Paid by partner**, and **Paid together**
where relevant.

------------------------------------------------------------------------

## 2. Final information architecture

### Home

-   Dashboard

### Money

-   Transactions
-   Accounts
-   Income
-   Expenses

### Plan

-   Budgets
-   Bills & Subscriptions
-   Upcoming
-   Goals

### Insights

-   Reports
-   Spending Insights
-   Financial Health

### Together

-   Couple
-   Activity

### System

-   Notifications
-   Settings

**Mobile:** Home / Transactions / Plan / Insights / More, plus a
prominent contextual `+` action.

------------------------------------------------------------------------

## 3. Dashboard

The dashboard is the main product anchor. It should communicate
household financial state in about five seconds.

### Hierarchy

**1 --- Household position** - "OUR MONEY" - Total household balance -
Available balance - Month income - Month spending

Use the largest typography for the primary balance.

**2 --- Money flow** - Income - Expenses - Net cash flow - Savings
rate - 1M / 3M / 6M / 1Y selector

**3 --- Upcoming** - Bills due soon - Subscriptions - Planned payments -
Goal contributions

**4 --- Budget health** - Overall usage - Near-limit categories -
Over-budget categories

**5 --- Couple** - Shared spending - My contribution - Partner
contribution - Contribution difference - Shared vs personal

Do not overload the dashboard with equal-weight cards. Establish one
dominant number, then supporting context.

------------------------------------------------------------------------

## 4. Transactions

Support: - Expense - Income - Transfer - Category - Account - Amount -
Currency - Date - Description - Paid by - Ownership - Tags -
Receipt/attachment - Recurring transaction - Soft delete

Row hierarchy:

`Category icon → description → date/account → amount`

Filters: - All - Income - Expenses - Transfers - Shared - Personal -
Me - Partner - Category - Account - Date

Search should operate over the loaded transaction window and remain
visually lightweight.

------------------------------------------------------------------------

## 5. Accounts

Supported types: - Cash - Bank - Mobile wallet - Credit - Savings -
Other

Show: - Current derived balance - Account type - Currency - Owner -
Shared/personal - Recent activity - Archived state

Transfers must: - Decrease source account - Increase destination
account - Never count as income - Never count as expense

Credit liabilities must not be presented as positive household wealth.

------------------------------------------------------------------------

## 6. Income and Expenses

Use the same underlying transaction system.

### Income

Show monthly total, previous-month comparison, sources, recurring
income, ownership and destination account.

### Expenses

Show monthly total, previous-month comparison, top categories, trend,
shared/personal split and paid-by split.

Every summary must provide a direct route into the corresponding
filtered transactions.

------------------------------------------------------------------------

## 7. Budgets

Monthly, category-based budgeting.

Each budget shows: - Budget amount - Actual spending - Remaining -
Percentage used - Days remaining - Useful trend context

States: - Healthy - Watch - Near limit - Over budget

Use semantic color as a secondary signal, never as the only signal.

------------------------------------------------------------------------

## 8. Bills & Subscriptions

Extend the existing Bills architecture rather than creating an unrelated
subsystem.

Support: - One-time bills - Recurring bills - Subscriptions - Billing
frequency - Reminder schedule - Next due date - Last paid date -
Account - Category - Amount - Ownership - Paid/unpaid state

Statuses: - Upcoming - Due soon - Due today - Overdue - Paid

Subscription intelligence: - Monthly equivalent - Annual equivalent -
Active subscriptions - Upcoming renewals - Price increases where
detectable - Subscription spending trend

A subscription is still part of the household planning system.

------------------------------------------------------------------------

## 9. Upcoming / Planned Payments

**Required P1 feature.**

Create a unified future-money timeline containing: - Bills -
Subscriptions - Recurring expenses - Planned payments - Recurring
income - Scheduled transfers - Goal contributions

Each item shows date, description, amount, account, ownership,
shared/personal state and status.

The screen must answer:

> **How much money is already committed to the near future?**

Future commitments must never be confused with current available
balance.

------------------------------------------------------------------------

## 10. Cash-flow Forecast

Build a forward-looking forecast from: - Current account balances -
Known bills - Subscriptions - Recurring income - Recurring expenses -
Planned payments - Scheduled goal contributions

Show: - Current balance - Projected balance - Upcoming inflows -
Upcoming outflows - Lowest projected balance - Forecast horizon

Use the label **Projected balance**, not simply **Balance**.

States: - Comfortable - Tight - At risk

Forecasts are estimates, never guarantees.

------------------------------------------------------------------------

## 11. Savings Goals

Support: - Target amount - Current amount - Target date -
Contributions - Contribution history - Shared/personal ownership -
Progress percentage - Suggested monthly contribution

Example:
`৳15,000 remaining · Target Dec 2026 · Suggested monthly contribution ৳5,000`

Goal contributions must remain traceable.

------------------------------------------------------------------------

## 12. Spending Insights

Create a deterministic insights layer from transaction/budget data.

Examples: - "Dining spending is 18% higher than last month." - "You have
used 72% of the grocery budget with 10 days remaining." - "Shared
spending increased for the third consecutive month." - "Your largest
expense this month is rent." - "Transport spending is ৳4,200 above the
three-month average."

Insights must be: - Explainable - Based on visible data - Actionable -
Non-judgmental

Do not use fake AI language for ordinary calculations.

------------------------------------------------------------------------

## 13. Financial Health

Provide a transparent household financial-health view using: - Budget
control - Savings rate - Upcoming obligations - Emergency cash
position - Spending trend - Goal progress - Balance stability

Example: **Financial Health: Good** - Budget control --- Good - Savings
--- Strong - Upcoming obligations --- Watch - Goals --- On track

Any score must have an explainable calculation and must not be presented
as professional financial advice.

------------------------------------------------------------------------

## 14. Couple Balance

Show: - Shared spending - My contribution - Partner contribution -
Contribution difference - Shared vs personal

Example:
`Shared expenses ৳40,000 · You ৳24,000 · Partner ৳16,000 · Difference ৳8,000`

Periods: - This month - Last month - 3 months - Custom

Unequal contributions are information, not judgment.

------------------------------------------------------------------------

## 15. Reports

Required: - **Summary:** income, expenses, savings, net cash flow, top
category, six-month cash flow - **Categories:** current vs previous
month, trends, percentage of total - **Couple:** contribution split,
shared vs personal, paid-by split - **Budgets:** budget vs actual,
remaining, used percentage - **Future:** upcoming commitments and
forecast

Every chart needs a clear analytical purpose and takeaway.

------------------------------------------------------------------------

## 16. Import / Export

### Import

Support CSV and spreadsheet-compatible files.

Flow: 1. Upload 2. Detect columns 3. Preview 4. Map fields 5. Validate
6. Show errors 7. Confirm 8. Import 9. Report result

Never import silently.

### Export

Support: - CSV - PDF-friendly reports

Allow filters before export.

------------------------------------------------------------------------

## 17. Multi-currency foundation

BDT remains primary.

Architecture should support: - User currency - Account currency -
Transaction currency - Display currency - Exchange-rate metadata

Do not sum different currencies without conversion.

Future-ready records should preserve: - Original amount - Original
currency - Converted amount - Conversion rate - Conversion date/source

------------------------------------------------------------------------

## 18. Notifications

Useful notifications only: - Bill due soon - Bill overdue - Budget near
limit - Budget exceeded - Goal milestone - Partner activity - Household
changes - Recurring transaction generated - Forecast risk

Provide notification preferences and avoid notification spam.

------------------------------------------------------------------------

## 19. Couple / Household

Support: - Create household - Invite partner - Secure invite link/code -
Owner/member roles - Member state - Ownership transfer

Clearly separate household settings from personal settings. Owner-only
actions must not appear as available to ordinary members.

------------------------------------------------------------------------

## 20. Activity

Activity answers:

> **What changed in our money?**

Examples: - Partner added expense - Budget changed - Bill paid - Goal
contribution added - Account created - Household setting changed

Chronological, compact and useful.

------------------------------------------------------------------------

# UI / DESIGN SYSTEM

## 21. Visual direction

Use **modern neumorphic soft-3D finance UI**.

Desired qualities: - Soft - Premium - Calm - Tactile - Modern -
Trustworthy - Consumer-oriented

Do not look like: - Generic SaaS - Corporate admin panel -
Crypto/trading app - Accounting software - Neon fintech - Heavy
glassmorphism

------------------------------------------------------------------------

## 22. Color system

Base: - Cool light gray / off-white background - Slightly brighter
surface - Deep charcoal primary text - Muted gray secondary text

Accent: - Mint - Teal - Peach - Soft orange

Semantic: - Green = positive/safe - Amber = attention - Red = genuine
risk/error only

Color should support hierarchy, not decorate every component.

------------------------------------------------------------------------

## 23. Neumorphism

Use subtle: - Raised cards - Inset fields - Soft shadows - Rounded
surfaces - Tactile buttons

Avoid: - Huge shadows - Excessive blur - Low contrast - Every element
floating - Decorative bevels everywhere

Accessibility always overrides visual softness.

------------------------------------------------------------------------

## 24. Typography

Preferred direction: - Poppins - Inter - Manrope - Geist

Use one primary family consistently.

Financial numbers: - Large - Bold - High contrast - Tabular numerals
where alignment matters

Labels should remain visually subordinate to their values.

------------------------------------------------------------------------

## 25. Card rules

Cards: - 16--24px radius - Soft raised/inset treatment - Clear internal
hierarchy - Generous spacing - Minimal borders

Do not create a card for every small piece of information. Group related
content.

------------------------------------------------------------------------

## 26. Desktop dashboard composition

``` text
┌──────────────────────────────────────────────────────────┐
│ Header / household / profile                             │
├──────────────────────────────────────────────────────────┤
│                       OUR MONEY                          │
│                    ৳ 185,420.00                          │
│                 household balance                        │
├───────────────────────┬──────────────────────────────────┤
│ Income                │ Expenses                         │
│ ৳85,000               │ ৳52,400                          │
├───────────────────────┴──────────────────────────────────┤
│ Cash Flow Chart                                          │
├───────────────────────┬──────────────────────────────────┤
│ Budget Health         │ Upcoming                         │
├───────────────────────┼──────────────────────────────────┤
│ Couple Balance        │ Goals                            │
└───────────────────────┴──────────────────────────────────┘
```

Implementation can vary, but hierarchy must remain equivalent.

------------------------------------------------------------------------

## 27. Mobile rules

Mobile is not a shrunken desktop.

Prioritize: 1. Household balance 2. Add transaction 3. Upcoming
obligations 4. Budget status 5. Recent transactions

Use: - Bottom navigation - Contextual add action - Bottom sheets -
Full-screen forms where appropriate - Horizontal filter scrolling -
Compact charts - Large touch targets

Target at least **44px** for interactive controls.

------------------------------------------------------------------------

## 28. Add transaction UX

Default fields: - Amount - Category - Account - Paid by - Shared /
Personal - Date - Note

Advanced: - Tags - Receipt - Recurring - Transfer details

The primary save action must be visually dominant. Common expenses
should be recordable in seconds.

------------------------------------------------------------------------

## 29. Charts

Use charts only when they answer a question.

Preferred: - Line/area --- cash-flow trend - Donut --- category
composition - Bar --- budget vs actual - Progress bar/ring --- goal
progress - Split bar --- couple contribution

Avoid: - 3D charts - Decorative charts - Excessive gradients - Dense
legends - Charts with no takeaway

Charts must work in light and dark themes.

------------------------------------------------------------------------

## 30. Motion

Use motion selectively: - Page transitions - Card entrance - Number
transitions - Bottom-sheet presentation - Success feedback - Filter
changes

Avoid constant animation, bouncing numbers or long transitions.

Respect `prefers-reduced-motion`.

------------------------------------------------------------------------

## 31. Dark mode

Design dark mode intentionally.

Preserve: - Financial hierarchy - Semantic status - Chart readability -
Focus states - Tactile depth

Use deep neutral surfaces rather than pure black everywhere.

------------------------------------------------------------------------

## 32. Empty / loading / error states

### Empty

Every empty state needs: 1. Short explanation 2. Relevant
icon/illustration 3. One primary action

Example: **No budgets yet**\
Create your first monthly budget to start tracking household spending.\
`Create budget`

### Loading

Use skeletons for content-heavy views. Avoid large spinners and layout
jumps.

### Error

Errors must be specific.

Good: \> We couldn't save this expense. Your data was not discarded. Try
again.

Preserve entered data where possible. Never imply success when a write
failed.

------------------------------------------------------------------------

## 33. Accessibility

Required: - Keyboard navigation - Visible focus - Semantic buttons -
Accessible labels - Adequate contrast - Reduced-motion support -
Screen-reader-friendly status - No color-only meaning - 44px practical
touch targets

Charts require text summaries or accessible labels.

------------------------------------------------------------------------

## 34. Responsive QA

Test intentionally at: - 360px - 390px - 430px - 768px - 1024px -
1280px - 1440px+

Do not optimize for only one desktop viewport.

------------------------------------------------------------------------

# TECHNICAL & DATA RULES

## 35. Foundation

Preserve the existing: - Next.js - TypeScript - Tailwind CSS - Firebase
Authentication - Firestore - Firebase Storage - Supabase Storage
fallback where already established - Recharts - Framer Motion - Lucide

Extend the current architecture. Do not rewrite working systems for
cosmetic reasons.

------------------------------------------------------------------------

## 36. Data integrity

Transactions are the financial source of truth.

Transfers: - source decreases - destination increases - excluded from
income - excluded from expense

Bill payment: - marks bill paid - creates/links expense transaction -
prevents duplicate payment

Recurring transactions: - idempotent - never duplicate when the same
recurrence is processed twice

Soft-deleted records must not affect active calculations.

Future/forecast amounts must remain distinct from real balances.

------------------------------------------------------------------------

## 37. Security

Enforce household access at the data layer.

Users may access only: - their own profile - their authorized household
data

Invitation codes/links must be securely validated.

Owner-only actions must be enforced by authorization/security rules, not
merely hidden in UI.

Never expose secrets in client code.

------------------------------------------------------------------------

# FINAL ROADMAP

## P0 --- Core foundation

1.  Dashboard
2.  Transactions
3.  Accounts
4.  Income
5.  Expenses
6.  Budgets
7.  Bills
8.  Recurring transactions
9.  Goals
10. Couple / household
11. Activity
12. Notifications
13. Reports
14. Transfers
15. Shared/personal ownership
16. PWA
17. Theme switching
18. Attachments / receipts

## P1 --- Final product completion

19. Upcoming / Planned Payments
20. Bills + Subscription intelligence
21. Cash-flow Forecast
22. Spending Insights
23. Financial Health
24. Couple Contribution Balance
25. CSV / spreadsheet Import
26. CSV Export
27. PDF Reports
28. Multi-currency foundation

## P2 --- Future expansion

29. Bank aggregation
30. Investments / stocks
31. Advanced portfolio tracking
32. AI financial assistant
33. Larger family/group support
34. Native mobile widgets
35. Native biometric capabilities

Do not delay the core product for P2 integrations.

------------------------------------------------------------------------

# IMPLEMENTATION ORDER

### Phase 1 --- Future money

Upcoming → planned payments → subscriptions → recurring payment timeline

### Phase 2 --- Forecasting

Projected cash flow → projected balances → risk states

### Phase 3 --- Intelligence

Spending insights → budget observations → financial health

### Phase 4 --- Couple depth

Contribution balance → shared expense analysis → couple summary

### Phase 5 --- Portability

CSV import → CSV export → PDF reports

### Phase 6 --- Internationalization

Multi-currency accounting foundation

### Phase 7 --- Final polish

Mobile UX → accessibility → states → motion → responsive QA → data QA →
security review

------------------------------------------------------------------------

# DEFINITION OF DONE

A feature is not finished because its page exists.

Every feature must have: - Correct data model - Correct
authorization/security behavior - Loading state - Empty state - Error
state - Success feedback - Mobile layout - Desktop layout - Dark mode -
Accessibility - Correct derived calculations - Direct navigation from
relevant summaries - No duplicate actions - No silent data loss

------------------------------------------------------------------------

# FINAL UI QUALITY GATE

Before release, inspect every major screen.

### Visual

-   Premium and coherent
-   Restrained neumorphism
-   Strong number hierarchy
-   Consistent spacing
-   No unnecessary cards

### UX

-   Purpose understood immediately
-   Primary action obvious
-   Common actions fast
-   Filters/navigation intuitive

### Couple

-   Shared vs personal obvious
-   Paid-by visible where relevant
-   Two-person financial picture remains central

### Finance

-   Balances correct
-   Transfers excluded from income/expense
-   Recurrences idempotent
-   Future values visibly different from current balances

### Accessibility

-   Keyboard usable
-   Focus visible
-   Color not the only signal
-   Charts understandable without visual interpretation

------------------------------------------------------------------------

# ANTI-PATTERNS

Do not introduce: - Generic admin-dashboard layouts - Excessive
glassmorphism - Crypto/trading aesthetics - Neon gradients - Huge
decorative hero art - Excessive modals - Tiny mobile controls -
Overloaded dashboards - Fake AI financial advice - Unexplained financial
scores - Dark patterns - Hidden commitments - Silent transaction
failures - Fake real-time states - Decorative charts without analytical
purpose

------------------------------------------------------------------------

# FINAL IMPLEMENTING-AGENT INSTRUCTION

Treat this document as the **source of truth for product scope and UI
direction**.

The existing Our Money foundation should be extended, not unnecessarily
rebuilt.

Before each feature: 1. Inspect the existing data model. 2. Reuse
existing components and design tokens. 3. Preserve financial invariants.
4. Make the smallest architectural change that supports the requirement.
5. Build responsive behavior from the beginning. 6. Add loading, empty,
error and success states. 7. Verify calculations independently. 8.
Verify light and dark themes. 9. Verify mobile and desktop layouts. 10.
Run typecheck/build/tests where available. 11. Do not mark complete
without verification evidence.

**Final product outcome:**

> **Our Money should make a couple's finances visible, shared, planned
> and understandable.**

The product does not need to become every kind of financial application.
It needs to become the best simple shared money workspace for two
people.

# 48. FINAL VISUAL UX REFERENCE --- DESIGN THIS WAY

The uploaded visual reference is the **primary visual direction** for
the finished Our Money interface.

Reference composition:

``` text
┌───────────────────────────────────────────────────────────────────────────┐
│  BRAND / LOGO     SEARCH                 DATE        NOTIFICATIONS PROFILE │
├───────────────┬───────────────────────────────────────────────────────────┤
│               │ GOOD MORNING                                               │
│ Dashboard     │ Dolon & Partner                         contextual artwork │
│ Transactions  │ Same goals. A brighter tomorrow.                         │
│ Income        │                                                           │
│ Expenses      │ ┌───────────────┐ ┌────────┐ ┌────────┐ ┌────────┐        │
│ Budgets       │ │ OUR MONEY     │ │ INCOME │ │EXPENSES│ │SAVINGS │        │
│ Goals         │ │ large balance │ │ metric │ │ metric │ │ metric │        │
│ Bills         │ └───────────────┘ └────────┘ └────────┘ └────────┘        │
│ Accounts      │                                                           │
│ Reports       │ ┌────────────────────────┐ ┌────────────────────────────┐ │
│               │ │ MONEY FLOW             │ │ SPENDING BREAKDOWN          │ │
│ ───────────   │ │ chart                  │ │ donut + categories          │ │
│ Together      │ └────────────────────────┘ └────────────────────────────┘ │
│ Couple        │                                                           │
│ Activity      │ ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐ │
│               │ │ BUDGETS      │ │ SAVINGS      │ │ contextual card   │ │
│ Notifications │ │ progress     │ │ goals        │ │ lifestyle / goal  │ │
│ Settings      │ └──────────────┘ └──────────────┘ └────────────────────┘ │
│               │                                                           │
│ couple card   │ ┌───────────────────────────────────────────────────────┐ │
│ at bottom     │ │ RECENT TRANSACTIONS                                  │ │
│               │ │ compact finance table / activity list                 │ │
└───────────────┴───────────────────────────────────────────────────────────┘
```

## 48.1 Overall visual composition

The reference uses a **three-zone desktop layout**:

### Zone A --- Left navigation

A calm, narrow navigation rail/sidebar.

### Zone B --- Main financial workspace

The main content area carries the financial hierarchy.

### Zone C --- Right contextual rail

A narrower column for: - Goals - Quick actions - Couple activity -
Contextual encouragement - Upcoming information

The right rail is **supporting content**, never the primary financial
workspace.

On smaller screens, the right rail must collapse into the main flow
rather than creating horizontal scrolling.

------------------------------------------------------------------------

# 49. REFERENCE-BASED DESIGN TOKENS

## 49.1 Background

Use a warm, very light neutral background.

Target visual feeling:

-   Ivory
-   Warm off-white
-   Soft cream
-   Very subtle beige/gray

Avoid a sterile pure-white canvas.

The page background should visually blend with the cards.

## 49.2 Surfaces

Cards use a slightly brighter/warmer surface than the page.

Use:

-   Soft rounded corners
-   Very subtle border
-   Very soft shadow
-   Occasional inset depth

The reference is **soft neumorphism**, not extreme neumorphism.

## 49.3 Primary accent

Use the existing Our Money mint/teal system, but apply it with the
restraint shown in the reference.

Primary accent roles: - Active navigation - Primary CTA - Positive
financial state - Progress - Selected controls - Important highlights

## 49.4 Secondary accent

Use warm peach/orange selectively for: - Expenses - Warnings - Secondary
CTAs - Lifestyle imagery - Visual balance

Do not make orange the dominant application color.

------------------------------------------------------------------------

# 50. REFERENCE LAYOUT RULES

## 50.1 Desktop shell

Recommended structure:

``` text
Page
├── Sidebar: 220–250px
├── Main content: flexible
└── Right rail: 280–320px
```

The layout should breathe.

Do not compress three columns simply to fit more information.

At narrower desktop widths:

``` text
Sidebar + Main
```

The right rail may move below the main content.

At mobile:

``` text
Header
Main content
Bottom navigation
```

------------------------------------------------------------------------

# 51. SIDEBAR --- VISUAL INSTRUCTIONS

The sidebar in the reference is intentionally quiet.

### Header

Show: - Logo/brand mark - "Our Money" - Small tagline if useful

The logo should be compact and elegant.

Avoid oversized branding.

### Navigation

Each item contains:

`Icon + label`

Active item: - Soft mint/green filled pill - Dark readable text -
Slightly elevated feel

Inactive item: - Transparent - Muted dark-gray text - Minimal icon
treatment

Groups should have subtle section labels:

``` text
Money
Together
System
```

Avoid heavy dividers.

### Bottom profile area

Use a compact couple identity card:

-   Two overlapping avatars
-   "Dolon & Partner"
-   Live Synced indicator
-   Optional short motivational microcopy

This reinforces the couple-first identity.

------------------------------------------------------------------------

# 52. HEADER --- VISUAL INSTRUCTIONS

The header should feel like a modern personal-finance workspace.

### Left

Contextual greeting:

``` text
GOOD MORNING
Dolon & Partner
Same goals. A brighter tomorrow.
```

Use a small uppercase eyebrow above the main heading.

### Main heading

The reference uses an editorial serif treatment for the large couple
greeting.

Recommended: - Serif display font for the main emotional heading -
Sans-serif for application UI

This creates a premium editorial/financial feel.

Do not use serif typography throughout the application.

### Header utility controls

Right side: - Search - Date/month selector - Notification button -
Couple/profile selector

Controls should be pill-shaped or softly rounded.

------------------------------------------------------------------------

# 53. HERO --- "OUR MONEY"

This is the most important card on the dashboard.

### Visual treatment

Use a large dark teal/green hero surface.

Inside:

``` text
Our Money        couple avatars
৳ 432,568
Combined available balance
↑ +8.4% from last month
```

Add a subtle financial line/area chart integrated into the lower
portion.

### Rules

The hero must have: - Strong contrast - Large financial number - Short
supporting label - Couple identity - One useful comparison - Subtle
visual depth

Do not put six metrics inside this card.

The hero is about **household position**, not everything.

------------------------------------------------------------------------

# 54. KPI CARDS

Immediately beside/below the hero, use compact metric cards:

-   Our Income
-   Our Expenses
-   Our Savings
-   Savings Rate

Each card should contain:

``` text
small icon
label
large value
change
small comparison
```

Example:

``` text
Our Savings
৳33,260
↑ 28.6%
vs last month
```

### KPI design

Use different soft icon backgrounds but keep the overall palette
controlled.

Cards should feel related, not like four unrelated widgets.

------------------------------------------------------------------------

# 55. MONEY FLOW

The Money Flow card is a primary analytical surface.

Show: - Income - Expenses - Savings - Time axis

Preferred chart: - Soft bar/area visualization - Clear zero line -
Compact legend - Minimal grid

Controls: - This month - This year - 1M - 3M - 6M - 1Y

### Tooltip

The reference uses a floating tooltip.

Tooltip should show:

``` text
Jul 2025
Income      ৳12,400
Expense     -৳8,320
Savings      ৳4,080
```

Tooltip must not obscure the chart permanently.

------------------------------------------------------------------------

# 56. SPENDING BREAKDOWN

Use a donut chart with the total in the center.

Example:

``` text
        ┌─────────────┐
        │    donut    │
        │  ৳52,340    │
        │  This month │
        └─────────────┘

Food              28%
Housing           22%
Transport         14%
Shopping          12%
Bills             10%
Health             8%
Other              6%
```

### Rules

-   Center number is the primary focus.
-   Category labels remain readable.
-   Use no more than approximately 6--8 visible categories.
-   Group very small categories under "Other".
-   Clicking a category should filter transactions.

------------------------------------------------------------------------

# 57. MONTHLY BUDGETS

Use compact progress rows.

Each row:

``` text
[category icon] Food
৳18,500 / ৳25,000                         74%
━━━━━━━━━━━━━━━━━━━━━━━━
```

Show: - Category - Spent - Budget - Percentage - Progress

The progress bar should be visually soft.

Do not use aggressive red until genuinely over budget.

------------------------------------------------------------------------

# 58. SAVINGS GOALS

Use visual thumbnails or tasteful imagery when a goal benefits from it.

Each goal:

``` text
[thumbnail] Vacation Trip
৳72,000 / ৳150,000                       48%
━━━━━━━━━━━━━━━━━━━━━━━━
```

Use imagery sparingly.

Goal imagery should feel: - Aspirational - Calm - Personal - Premium

Never use generic stock-photo clutter.

------------------------------------------------------------------------

# 59. QUICK ACTIONS

The reference places quick actions in the right rail.

Required actions:

``` text
+ Add Expense
+ Add Income
↔ Transfer
▣ Add Bill
◎ Add Goal
```

Each action should have: - Soft circular/icon button - Short label -
Large enough touch target

The first three actions should receive the strongest emphasis.

------------------------------------------------------------------------

# 60. COUPLE ACTIVITY

The reference uses a compact activity stream.

Each row:

``` text
[avatar] Dolon added Grocery expense
        Today, 10:30 AM             -৳2,450
```

Use: - Partner avatar - Action text - Timestamp - Amount - Semantic
amount treatment

Keep this feed compact.

Provide:

`View all →`

------------------------------------------------------------------------

# 61. CONTEXTUAL / LIFESTYLE CARDS

The reference intentionally includes editorial lifestyle cards such as:

-   "Small steps to big dreams together."
-   "Build the life you both love."
-   "Together today. A brighter tomorrow."

These are **supporting emotional surfaces**, not financial metrics.

Use them to: - Reinforce goals - Encourage saving - Create visual
breathing room - Strengthen the couple identity

### Important

Do not overuse motivational copy.

Maximum: - 1--2 contextual cards on desktop - Hide or deprioritize them
on small mobile screens

The product must remain finance-first.

------------------------------------------------------------------------

# 62. RECENT TRANSACTIONS

The reference uses a clean compact table.

Desktop columns:

``` text
Name | Category | Paid By | Date | Time | Amount | Status | Actions
```

Example:

``` text
Grocery Purchase
Food
Dolon
01-11-2025
10:30 AM
-৳2,450
Completed
```

### Visual rules

-   Compact row height
-   Small category icon
-   Avatar for Paid By
-   Right-aligned amount
-   Status pill
-   Overflow action menu

Do not create excessive row borders.

Use subtle separators.

------------------------------------------------------------------------

# 63. STATUS PILLS

Use compact pills:

### Completed

Soft green background + dark green text

### Pending

Soft amber background + dark amber text

### Overdue

Soft red background + dark red text

### Shared

Soft teal background

### Personal

Soft neutral background

Status pills should never dominate a row.

------------------------------------------------------------------------

# 64. ICONOGRAPHY

Use Lucide consistently.

Icon rules: - Simple line icons - Rounded visual character - Consistent
stroke weight - 18--22px in normal UI - 24px for primary quick actions

Avoid mixing: - Filled icon packs - 3D icons - Random emoji - Multiple
icon families

Category icons may use soft colored circular backgrounds.

------------------------------------------------------------------------

# 65. AVATARS & COUPLE IDENTITY

The couple is a first-class visual identity.

Use: - Two overlapping avatars - Consistent avatar sizing - Small
online/live indicator where relevant - Shared identity treatment

Recommended sizes: - 28--36px in compact UI - 40--52px in prominent
couple cards

Do not make avatars decorative everywhere.

------------------------------------------------------------------------

# 66. FINANCIAL NUMBER HIERARCHY

The visual reference makes money values dominant.

Priority:

``` text
৳ 432,568
↑ +8.4%
Combined available balance
```

Never:

``` text
Combined available balance
৳ 432,568
↑ +8.4%
```

for the primary hero.

### Formatting

Use: - Consistent BDT symbol - Thousands separators - Consistent decimal
policy - Tabular numerals where appropriate

Negative values should be unmistakable.

------------------------------------------------------------------------

# 67. RIGHT RAIL BEHAVIOR

Desktop right rail:

1.  Goal/context card
2.  Quick actions
3.  Couple activity
4.  Optional second lifestyle card

At 1024px or less, move these into the main page flow.

At mobile: - Quick actions become a compact action grid/sheet - Activity
becomes a section - Lifestyle cards become optional

Never force the user to horizontally scroll.

------------------------------------------------------------------------

# 68. MOBILE VISUAL TARGET

Mobile should retain the same design language.

Example:

``` text
┌───────────────────────────┐
│ Good morning       🔔     │
│ Dolon & Partner           │
├───────────────────────────┤
│                           │
│ OUR MONEY                 │
│ ৳432,568                  │
│ Combined balance          │
│ ↑ 8.4%                    │
│                           │
├───────────────────────────┤
│ Income      Expenses      │
│ ৳85,600     ৳52,340       │
├───────────────────────────┤
│ Upcoming                  │
│ Rent             ৳25,000  │
│ Subscription      ৳1,199  │
├───────────────────────────┤
│ Budget Health             │
│ Food       ━━━━━━━ 74%    │
├───────────────────────────┤
│ Recent Transactions       │
│ Grocery          -৳2,450  │
│ Salary           +৳65,000 │
├───────────────────────────┤
│ Home Transactions Plan …  │
└───────────────────────────┘
```

The primary balance remains dominant.

------------------------------------------------------------------------

# 69. VISUAL RESPONSIVENESS RULE

Do not merely stack desktop cards vertically.

At each breakpoint, deliberately decide: - What remains visible - What
collapses - What moves - What becomes a bottom sheet - What becomes
horizontal scrolling - What disappears

Preserve information hierarchy, not exact geometry.

------------------------------------------------------------------------

# 70. COMPONENT LANGUAGE

Build reusable components around the visual system.

Recommended primitives:

``` text
AppShell
Sidebar
MobileBottomNav
TopBar
CoupleIdentity
HeroBalanceCard
MetricCard
SectionHeader
SoftCard
QuickAction
StatusPill
AvatarStack
TransactionRow
TransactionTable
BudgetProgress
GoalProgress
ChartCard
InsightCard
UpcomingItem
ActivityItem
EmptyState
Skeleton
BottomSheet
```

Do not build each screen as an isolated visual system.

------------------------------------------------------------------------

# 71. SPACING & RHYTHM

Use a consistent spacing rhythm.

Preferred: - 8px base rhythm - 12px compact spacing - 16px standard
spacing - 20--24px card padding - 24--32px section gaps

Large sections should breathe.

Avoid both: - cramped finance tables - excessive empty space that pushes
important information below the fold

------------------------------------------------------------------------

# 72. BORDER & SHADOW RULES

The reference uses almost invisible separation.

Prefer: - subtle border - soft shadow - surface contrast

Avoid: - thick borders - heavy black outlines - harsh drop shadows -
strong inner bevels

Depth should be perceived, not announced.

------------------------------------------------------------------------

# 73. IMAGE / ILLUSTRATION RULES

When visual imagery is used: - Use natural lifestyle imagery - Plants,
home, travel, goals and calm everyday scenes are appropriate - Use
rounded clipping - Blend imagery into the soft UI - Avoid busy stock
photography - Avoid financial clichés such as coins, dollar stacks and
trading screens

Images should support the couple/life-goals story.

------------------------------------------------------------------------

# 74. UI COPY STYLE

Use short, human labels.

Preferred: - Our Money - Upcoming - Money Flow - Spending Breakdown -
Monthly Budgets - Savings Goals - Couple Activity - Add Expense - Add
Income - Transfer

Avoid: - Household Financial Asset Management - Transactional
Expenditure Overview - Financial Performance Analytics

The interface should feel personal, not institutional.

------------------------------------------------------------------------

# 75. FINAL VISUAL ACCEPTANCE TEST

The implementation should visually resemble the reference in
**composition, hierarchy and mood**, without copying it literally.

A reviewer should immediately recognize:

1.  Premium couple-first finance product
2.  Large household balance hero
3.  Soft neutral canvas
4.  Green/mint financial accent system
5.  Editorial couple greeting
6.  Three-zone desktop workspace
7.  Compact KPI cards
8.  Analytical chart cards
9.  Budget and goal progress
10. Quick actions
11. Couple activity
12. Clean transaction table
13. Restrained lifestyle imagery
14. Soft rounded surfaces
15. Calm neumorphic depth

### The most important visual rule

**Do not optimize for "more UI." Optimize for a stronger visual
hierarchy.**

The interface should feel like a carefully designed financial home for
two people, not a collection of dashboard widgets.

------------------------------------------------------------------------

# 76. AGENT VISUAL IMPLEMENTATION RULE

When implementing any new screen, first map it to the reference
language:

``` text
1. What is the primary financial number?
2. What is the primary user action?
3. What is the supporting context?
4. Is this shared, personal, or both?
5. Does it belong in the main workspace or right rail?
6. Which existing component should be reused?
7. What is the mobile equivalent?
8. What is the empty/loading/error state?
9. Does the screen preserve the same visual rhythm?
10. Does it still look like Our Money?
```

If a new feature requires a visually different pattern, introduce the
smallest new pattern possible and add it to the shared design system.

**Do not invent a new visual language per page.**

------------------------------------------------------------------------

# 77. FINAL DESIGN NORTH STAR

Use the uploaded reference as the visual north star:

> **Premium personal finance + calm neumorphism + editorial lifestyle +
> couple-first identity + strong financial hierarchy.**

The final application should feel like:

**"Our shared financial home."**

Not:

**"A finance dashboard with couple features."**
