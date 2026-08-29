# Couple Budget & Money Management App — Final PRD

**Project:** DS001 — Couple Budget & Money Management App  
**Product:** Responsive Web App + PWA  
**Frontend:** Next.js + TypeScript + Tailwind CSS  
**Backend:** Firebase Authentication + Firestore + Storage + Cloud Functions where required  
**Primary currency at launch:** BDT (৳)  
**Primary users:** Two partners/couples sharing and managing finances  
**Reference repository:** `dolonhunt/DS001`

---

## 1. Product Vision

Build a premium, modern, couple-first money management application where two partners have separate accounts but share one synchronized financial workspace.

Core idea:

> **Two people. One financial picture.**

Both partners must be able to:

- Sign up and log in independently.
- Create or join a shared household.
- Invite/link a partner.
- Add, edit and delete income, expenses and transfers.
- Manage shared and personal financial records.
- See the other partner's updates in real time.
- Receive meaningful notifications.
- Manage budgets, accounts, bills, recurring transactions and savings goals.
- View live financial dashboards and charts.
- Search and filter financial history.
- Edit their own profile.
- Use the app on desktop, tablet and mobile.
- Install the web application as a PWA.

The product must feel like a premium consumer finance/lifestyle product, not an accounting system or generic admin dashboard.

---

# 2. Existing DS001 Assessment

The existing `dolonhunt/DS001` project is a technical starting point and already contains:

- Next.js
- React
- TypeScript
- Tailwind CSS
- Firebase
- Recharts
- Framer Motion
- Lucide icons
- Firebase authentication context
- Budget context
- Household subscriptions
- Transaction subscriptions
- Category subscriptions
- Budget subscriptions
- Notification subscriptions
- Existing dashboard
- Existing financial calculations

The existing dashboard already shows income, expenses, balance, savings rate, expense categories, budget vs spent and recent transactions.

However, the current product is not sufficiently couple-first and its visual design is not the target.

## Critical instruction

Do not simply restyle the existing DS001 dashboard.

Use the existing repository as a technical foundation where useful, but redesign/restructure the application into the product described by this PRD.

---

# 3. Visual Reference — Mandatory

The supplied visual reference image is part of this specification.

**Reference image file:**

`couple-budget-ui-reference.png`

The implementation agent must inspect the supplied reference image before implementing the UI.

The reference establishes the primary visual direction:

> **Modern Neumorphic Soft-3D Finance UI**

The reference is an inspiration and design benchmark. Do not copy proprietary assets, exact text, branding or exact layouts.

Extract the visual language.

---

# 4. Visual Design Direction

## 4.1 Overall style

The application should look:

- Modern
- Premium
- Tactile
- Soft
- Calm
- Sophisticated
- Minimal
- Consumer-oriented
- Financial but not corporate

Visual category:

**Modern fintech + soft neumorphism + 3D editorial dashboard**

Avoid:

- Generic SaaS dashboard
- Traditional banking UI
- Spreadsheet-like finance UI
- Dark-purple admin dashboard
- Cryptocurrency aesthetic
- Excessive glassmorphism
- Excessive gradients
- Flat generic Tailwind cards

---

# 5. Neumorphic Soft-3D System

This is the most important visual requirement.

Cards and controls should have a subtle raised/sunken appearance.

Use:

- Soft shadows
- Inner shadows where appropriate
- Very subtle highlights
- Rounded corners
- Layered surfaces
- Recessed chart areas
- Raised buttons
- Tactile controls

Do not overdo neumorphism to the point of harming accessibility or readability.

The 3D effect should feel premium and restrained.

---

# 6. Reference Visual Characteristics

The supplied image demonstrates:

- Light gray background
- Rounded floating cards
- Soft 3D surfaces
- Mint/teal elements
- Peach/orange elements
- Large circular visual objects
- Rings
- Donut charts
- Raised/sunken controls
- Strong visual hierarchy
- Dashboard cards arranged with intentional spacing
- Decorative 3D objects
- Editorial composition
- Soft shadows
- Minimal dark text
- Rounded navigation
- Tactile buttons

These principles should be translated into a functional finance product.

---

# 7. Color Direction

Primary foundation:

- Soft light gray
- Warm off-white
- White
- Charcoal/dark gray text

Primary accent family:

- Mint
- Teal
- Soft aqua

Secondary accent family:

- Peach
- Apricot
- Soft orange

Semantic colors:

- Green/teal for positive financial values
- Peach/orange for expenses and attention
- Amber for warnings
- Muted red only when a serious negative state requires it

Do not make every card a different color.

Use color strategically.

---

# 8. Suggested Design Tokens

Create centralized CSS/design tokens.

Example conceptual palette:

```text
Background:
#F3F5F7

Surface:
#F8FAFA

White:
#FFFFFF

Primary Text:
#263238

Secondary Text:
#6B7478

Mint:
#8ACED1

Teal:
#57BFC4

Peach:
#F4B27A

Orange:
#EFA15F

Soft Border:
rgba(38,50,56,0.08)
```

Exact values can be adjusted after visual implementation, but the visual relationship should remain consistent.

---

# 9. Typography

Recommended font:

- Poppins for expressive headings/UI
- Inter for supporting/data text

Alternative:

- Manrope
- Geist

Typography should have strong hierarchy.

Large financial numbers should be visually dominant.

Example:

**৳184,250**

not:

`৳184,250.00` in a tiny KPI card.

Recommended hierarchy:

- Large display numbers: 32–56px depending on viewport
- Page headings: 24–36px
- Section headings: 16–22px
- Body: 14–16px
- Metadata: 11–13px

Do not make all text bold.

---

# 10. Surface Design

Cards should use:

- 18–28px radius
- Soft shadows
- Subtle borders
- Light gradients only where useful
- Consistent padding
- Clear internal hierarchy

Avoid dozens of visually identical cards.

Use different compositions for:

- Hero balance
- Charts
- Budgets
- Goals
- Activity
- Quick actions

---

# 11. Decorative 3D Elements

The reference contains soft 3D objects such as:

- Rings
- Spheres
- Discs
- Rounded blocks
- Leaves

These may be used selectively as decorative elements.

Important:

Decorative elements must never interfere with:

- Financial information
- Buttons
- Accessibility
- Mobile usability
- Performance

Do not turn every screen into a 3D illustration.

The dashboard can use a small number of decorative 3D elements to establish the visual identity.

---

# 12. Application Shell

## Desktop

Left navigation with:

- Couple profile/household header
- Dashboard
- Transactions
- Income
- Expenses
- Budgets
- Goals
- Bills & Recurring
- Accounts
- Reports
- Notifications
- Couple
- Settings

Navigation should use rounded active states with soft 3D treatment.

Profile section at bottom.

---

# 13. Mobile Navigation

Bottom navigation:

**Home | Money | + | Goals | More**

The center `+` button should be visually prominent.

Quick actions:

- Add Expense
- Add Income
- Transfer
- Add Bill
- Add Goal Contribution

Mobile UI must be intentionally designed, not simply a collapsed desktop layout.

---

# 14. Authentication

Use Firebase Authentication.

## Login

- Email
- Password
- Login
- Forgot password
- Create account
- Optional Google login

## Sign Up

- Full name
- Email
- Password
- Confirm password

After registration, continue to onboarding.

## Forgot Password

Email-based Firebase password reset.

---

# 15. Onboarding

## Step 1 — Personal profile

- Full name
- Profile image
- Preferred currency
- Country
- Optional phone

## Step 2 — Household

Options:

- Create a money space
- Join your partner

## Step 3 — Invite

Provide:

- Email invitation
- Secure invite link
- Invite code

---

# 16. Couple / Household Model

Each couple owns a private household/workspace.

Example:

**Dolon + Partner**

Display:

- Two profile avatars
- Household name
- Member count
- Sync status

Example status:

**● Live synced**

---

# 17. Couple Page

Display member cards:

- Avatar
- Name
- Email
- Role
- Joined date
- Last active/online status where available

Household settings:

- Household name
- Currency
- Categories
- Notification preferences
- Invite partner
- Leave household

Owner-only destructive actions must require confirmation.

---

# 18. Roles

Initial roles:

### Owner

Can:

- Manage household
- Invite/remove partner
- Manage household settings
- Manage shared financial data

### Member

Can:

- View shared data
- Add shared data
- Edit permitted financial records
- Manage personal records
- Edit own profile

Design the permission architecture so more roles can be added later.

---

# 19. Dashboard — Primary Experience

The dashboard is the most important screen.

It must visually resemble a premium modern financial/lifestyle dashboard inspired by the supplied reference.

Do NOT use a repetitive four-KPI-card layout.

---

# 20. Dashboard Header

Example:

**Good morning, Dolon**

**Dolon + Partner**

Show:

- Both avatars
- Household name
- Live sync status
- Month selector

Example:

**● Live synced**

Month selector:

`August 2026`

---

# 21. Dashboard Hero — Our Money

Large hero surface:

**OUR MONEY**

**৳184,250**

Available balance

Secondary:

- Income
- Expenses
- Savings
- Savings rate

Example:

`+12.4% vs last month`

The main balance should dominate visually.

---

# 22. Dashboard Visual Language

Use the reference style:

- Raised hero panel
- Recessed circular/3D chart element
- Mint/teal accents
- Peach/orange accents
- Soft shadows
- Rounded geometry
- Strong whitespace

The hero section should feel visually memorable.

---

# 23. Money Flow

Section:

**Money Flow**

Use an elegant chart.

Show:

- Income
- Expenses
- Net savings

Period controls:

- 1M
- 3M
- 6M
- 1Y

Use soft teal/orange lines.

Chart container should have a subtle recessed/neumorphic treatment.

---

# 24. Spending Breakdown

Section:

**Where Our Money Goes**

Use a modern donut/ring visualization.

Categories:

- Housing
- Food
- Transport
- Shopping
- Bills
- Health
- Entertainment
- Travel
- Other

Show:

- Amount
- Percentage
- Transaction count

Clicking a category opens filtered transactions.

---

# 25. Category Visualization

Use the supplied reference's circular/3D visual language.

Possible presentation:

- Donut/ring
- Soft raised center
- Small category markers
- Subtle 3D depth

Do not use unnecessary 3D effects that reduce chart readability.

---

# 26. Overview Metrics

Provide a compact overview area containing:

- Income
- Expenses
- Balance
- Savings

Use small visual circular indicators where appropriate.

Example:

```text
Income       Expense       Balance       Savings
৳85,600      ৳52,340       ৳184,250      ৳33,260
+12.4%       -8.6%         +7.6%         +28.6%
```

This area can use small neumorphic cards rather than large repetitive KPI blocks.

---

# 27. Budgets

Section:

**Budgets**

Example:

Food

`৳18,500 / ৳25,000`

`74%`

Transport

`৳4,200 / ৳8,000`

`53%`

Shopping

`৳6,300 / ৳10,000`

`62%`

Use soft progress bars with teal/peach treatment.

Statuses:

- Healthy
- Approaching
- Over budget

---

# 28. Goals

Section:

**Goals**

Example:

### Vacation Trip

`৳72,000 / ৳150,000`

`48%`

### New Camera

`৳18,000 / ৳60,000`

`30%`

Use circular progress/ring visualizations inspired by the reference.

Actions:

- Add Goal
- Add contribution
- Edit
- View details

---

# 29. Recent Activity

Section:

**Together**

Example:

> Dolon added Grocery expense — -৳2,450  
> Partner added Salary — +৳65,000  
> Dolon paid Electricity bill — -৳3,200  
> Partner contributed to Vacation goal — +৳5,000

Show:

- Avatar
- Actor
- Action
- Amount
- Time

This is one of the most important couple-specific features.

---

# 30. Real-Time Synchronization

Mandatory.

If Partner A adds an expense:

Partner B must see the change automatically without refreshing.

Use Firestore real-time listeners.

Synchronize:

- Transactions
- Income
- Expenses
- Transfers
- Budgets
- Goals
- Bills
- Accounts
- Dashboard totals
- Notifications
- Activity
- Household/member changes

---

# 31. Sync Indicator

Use:

**● Synced**

or:

**Updated just now**

During network interruption:

**Reconnecting…**

After recovery:

**Synced**

Avoid aggressive notification/toast spam.

---

# 32. Transactions

Transaction types:

- Expense
- Income
- Transfer

Fields:

- Amount
- Type
- Date
- Category
- Description
- Account
- Owner
- Paid by
- Shared/personal
- Notes
- Attachment
- Tags
- Recurring status

Every transaction must record:

- createdBy
- updatedBy
- createdAt
- updatedAt

---

# 33. Shared vs Personal

Transactions must support:

### Shared

Visible to both partners.

### Personal

Associated with one partner.

Display this clearly.

---

# 34. Paid By

Options:

- Me
- Partner
- Both

For shared expenses, record the actual contributor.

This allows future couple contribution reporting.

---

# 35. Transaction List

Use date grouping.

Example:

**Today**

Grocery  
Dolon  
`-৳2,450`

Electricity  
Partner  
`-৳3,200`

Actions:

- View
- Edit
- Delete
- Duplicate

---

# 36. Transaction Search

Filters:

- Search
- Category
- Type
- Person
- Account
- Date
- Amount
- Shared/personal

Provide:

**Clear filters**

---

# 37. Income

Default categories:

- Salary
- Freelance
- Business
- Bonus
- Investment
- Other

Fields:

- Amount
- Source
- Date
- Person
- Account
- Recurring
- Notes

---

# 38. Expenses

Default categories:

- Housing
- Food
- Transport
- Utilities
- Shopping
- Health
- Education
- Entertainment
- Travel
- Family
- Insurance
- Other

Users can:

- Create
- Rename
- Archive
- Reorder

Do not permanently remove categories containing historical transactions.

---

# 39. Accounts

Support:

- Cash
- Bank
- Mobile Wallet
- Credit Card
- Savings
- Other

Fields:

- Name
- Type
- Current balance
- Currency
- Owner
- Shared/personal

---

# 40. Transfers

Transfers are NOT income or expenses.

Example:

`Bank → Savings`

`৳10,000`

Use Firebase transaction/batch logic where necessary to maintain account consistency.

---

# 41. Budgets

Monthly budget fields:

- Category
- Amount
- Month
- Shared/personal
- Notes

Show:

- Budget
- Spent
- Remaining
- Percentage

Recommended visual thresholds:

- 0–74%: healthy
- 75–89%: approaching
- 90–99%: warning
- 100%+: over budget

---

# 42. Recurring Transactions

Support:

- Daily
- Weekly
- Monthly
- Yearly
- Custom recurrence

Examples:

- Salary
- Rent
- Internet
- Electricity
- Subscription
- Loan payment

Prevent duplicate generated transactions.

---

# 43. Bills

Fields:

- Name
- Amount
- Due date
- Category
- Account
- Recurring
- Reminder
- Paid/unpaid

Statuses:

- Upcoming
- Due soon
- Overdue
- Paid

---

# 44. Savings Goals

Fields:

- Name
- Target amount
- Current amount
- Target date
- Icon/image
- Description

Examples:

- Vacation
- Emergency fund
- New home
- Car
- Investment
- Wedding

---

# 45. Goal Contributions

Either partner can contribute.

Record:

- Contributor
- Amount
- Date
- Note

Update goal progress in real time.

---

# 46. Reports

Provide:

### Monthly report

- Income
- Expenses
- Savings
- Savings rate
- Top categories

### Couple contribution

- Partner contribution
- Shared expenses
- Personal expenses

### Category analysis

- Category totals
- Trends

### Cash flow

- Income vs expense

### Budget performance

- Budget vs actual

---

# 47. Notifications

Notification categories:

- Partner activity
- Budget alerts
- Bill reminders
- Goal updates
- Household events
- System notifications

Examples:

> Partner added a new expense.

> Food budget is 90% used.

> Electricity bill is due tomorrow.

> Vacation goal reached 50%.

---

# 48. Notification Center

Tabs/filters:

- All
- Unread
- Partner
- Budget
- Bills
- Goals

Each notification:

- Type
- Actor
- Timestamp
- Read/unread
- Related entity

Do not generate notifications for every trivial UI action.

---

# 49. Profile

Allow each user to edit:

- Name
- Profile image
- Email
- Phone
- Currency
- Country
- Timezone
- Notification preferences

---

# 50. Settings

Sections:

### Account
- Profile
- Password
- Email

### Household
- Household name
- Members
- Currency

### Finance
- Categories
- Accounts
- Budget settings

### Notifications
- Partner activity
- Budget alerts
- Bill reminders
- Goal updates

### Appearance
- Light
- Dark
- System

### Security
- Sessions
- Sign out

---

# 51. PWA

Implement:

- Web app manifest
- App icons
- Installable experience
- Responsive viewport
- Service worker where appropriate
- Install prompt where supported
- Offline-safe read behavior where practical

Financial writes must never silently disappear when offline.

---

# 52. Mobile Quick Add

Fastest workflow:

Tap `+`

Choose:

**Expense**

Enter:

`৳2,450`

Category:

`Food`

Description:

`Dinner`

Paid by:

`Me`

Shared:

`Yes`

Save.

Target:

**Normal transaction entry should take only a few seconds.**

---

# 53. Empty States

Every major module must have a designed empty state.

Example:

**Start tracking your money**

`Add your first income or expense to see your financial picture.`

CTA:

**Add transaction**

Do not show blank pages.

---

# 54. Loading States

Use skeleton loading.

Avoid full-page spinners wherever possible.

Skeletons should match final layouts to prevent layout jumping.

---

# 55. Error States

Handle:

- Firebase errors
- Authentication errors
- Permission errors
- Failed writes
- Network failures
- Invalid form data
- Offline/reconnection states

Never expose raw Firebase/internal errors.

---

# 56. Form UX

Every form must provide:

- Clear labels
- Validation
- Inline errors
- Saving state
- Success state
- Keyboard support
- Mobile-friendly controls

---

# 57. Firestore Structure

Recommended:

```text
users/{userId}

households/{householdId}
  members/{userId}
  transactions/{transactionId}
  categories/{categoryId}
  budgets/{budgetId}
  accounts/{accountId}
  goals/{goalId}
  goalContributions/{contributionId}
  bills/{billId}
  notifications/{notificationId}
  activity/{activityId}
  settings/{settingId}
```

User:

```text
users/{userId}
  displayName
  email
  photoURL
  householdId
  role
  currency
  createdAt
  updatedAt
```

---

# 58. Transaction Schema

```text
id
householdId
type
amount
currency
categoryId
description
notes
date
accountId
createdBy
updatedBy
paidBy
ownership
isRecurring
recurringId
attachmentUrl
tags[]
createdAt
updatedAt
deletedAt
```

---

# 59. Budget Schema

```text
id
householdId
categoryId
month
amount
ownership
createdBy
createdAt
updatedAt
```

---

# 60. Goal Schema

```text
id
householdId
name
targetAmount
currentAmount
targetDate
icon
imageUrl
createdBy
createdAt
updatedAt
```

Goal contributions should remain individually traceable.

---

# 61. Activity Schema

```text
id
householdId
actorId
action
entityType
entityId
description
metadata
createdAt
```

Examples:

```text
transaction.created
transaction.updated
transaction.deleted
budget.updated
goal.contributed
bill.paid
member.joined
```

---

# 62. Security

Firebase security rules must enforce:

- Authentication
- Household membership
- Authorized writes
- Profile ownership
- Notification ownership
- Role-based actions

Never depend only on frontend checks.

Users must never be able to read another household's data.

---

# 63. Data Accuracy

Centralize calculations:

- Total income
- Total expense
- Balance
- Savings
- Savings rate
- Budget remaining
- Budget percentage
- Goal percentage
- Account balances

Transfers must not inflate income/expense totals.

Deleted/soft-deleted transactions must not appear in calculations.

---

# 64. Real-Time Architecture

Use Firestore listeners for live shared state.

Correctly unsubscribe when:

- User logs out
- Household changes
- Component unmounts
- Date/month scope changes

Prevent listener leaks and duplicate subscriptions.

---

# 65. Concurrent Updates

When both partners modify data around the same time:

- Preserve data integrity.
- Use server timestamps where appropriate.
- Use Firestore transactions/batched writes for multi-document updates.
- Avoid silent overwrites.
- Store `updatedBy`.
- Store `updatedAt`.

---

# 66. Activity Feed

Only meaningful events should appear.

Good:

> Partner added Grocery — ৳2,450

Bad:

> Partner opened Transactions.

---

# 67. Chart Design

Charts must match the neumorphic visual system.

Use:

- Teal for income
- Peach/orange for expenses
- Neutral supporting tones
- Soft chart surfaces
- Rounded chart containers
- Subtle animation
- Clear tooltips

Avoid default-looking Recharts visuals.

---

# 68. Responsive Dashboard

## Desktop

Use an editorial floating-card composition inspired by the supplied reference.

Suggested hierarchy:

```text
Couple / Navigation

Greeting + Month

OUR MONEY              OVERVIEW
Large Balance          Income / Expense / Balance / Savings

MONEY FLOW              SPENDING
Large chart             Donut/ring visualization

Budgets                Goals                 Together Activity
```

The exact layout should be adapted responsively and refined visually.

---

# 69. Mobile Dashboard

Suggested order:

```text
Couple header
Live sync

OUR MONEY
Large balance

Income / Expense / Savings

Money Flow

Quick Actions

Spending

Budgets

Goals

Together Activity

Bottom navigation
```

Use the reference's soft 3D visual language without overcrowding the small screen.

---

# 70. Component Architecture

Recommended:

```text
src/
  app/
  components/
    ui/
    layout/
    dashboard/
    transactions/
    income/
    expenses/
    budgets/
    goals/
    bills/
    accounts/
    reports/
    couple/
    notifications/
    forms/
    charts/
  contexts/
  hooks/
  lib/
    firebase/
  services/
  types/
```

Avoid giant page components.

Keep business logic separate from presentation.

---

# 71. Firebase Service Layer

Recommended modules:

```text
lib/firebase/
  config.ts
  auth.ts
  firestore.ts
  households.ts
  transactions.ts
  budgets.ts
  accounts.ts
  goals.ts
  bills.ts
  notifications.ts
  activity.ts
```

Exact architecture may differ if a cleaner implementation is justified.

---

# 72. Currency

Launch with:

**BDT / ৳**

Support future currencies through centralized formatting/configuration.

Normal dashboard display:

**৳184,250**

Avoid unnecessary decimal display.

---

# 73. Timezone

Store timestamps consistently.

Render according to configured user/household timezone.

Avoid browser-timezone inconsistencies.

---

# 74. Accessibility

Support:

- Keyboard navigation
- Focus states
- Semantic HTML
- Screen-reader labels
- Adequate contrast
- Accessible dialogs
- Accessible forms
- Chart descriptions
- Non-color-only financial indicators

Neumorphism must not reduce readability.

---

# 75. Animation

Use Framer Motion selectively.

Good:

- Card entrance
- Progress animation
- Chart transitions
- Modal transitions
- Notification appearance
- Navigation transitions

Avoid excessive movement.

The app should feel tactile, not distracting.

---

# 76. Performance

Prioritize:

- Fast initial load
- Efficient Firestore reads
- Proper query limits
- Pagination for transaction history
- Memoized financial calculations
- Lazy-loading reports where appropriate
- Optimized images
- No listener leaks

---

# 77. Security Testing

Verify:

- User cannot access another household.
- User cannot modify another user's private profile.
- Non-members cannot read household data.
- Unauthorized writes are rejected.
- Client-side manipulation cannot bypass Firestore rules.

---

# 78. Functional Testing

Test:

### Authentication
- Sign up
- Login
- Logout
- Password reset
- Invalid credentials

### Couple
- Create household
- Invite partner
- Join household
- Member permissions

### Transactions
- Add
- Edit
- Delete
- Search
- Filter
- Shared/personal
- Paid-by

### Budgets
- Create
- Edit
- Calculate spending
- Warning thresholds

### Goals
- Create
- Contribute
- Progress

### Bills
- Create
- Pay
- Recurring
- Reminder

### Real-time
Two browsers/devices must be logged into the same household.

Verify:

**Device A changes data → Device B updates without refresh.**

Repeat for:

- Expense
- Income
- Budget
- Goal
- Bill
- Household changes

---

# 79. Responsive Testing

Verify at:

- 360px
- 390px
- 768px
- 1024px
- 1280px
- 1440px
- 1920px

No horizontal scrolling on normal screens.

---

# 80. Browser Testing

Test:

- Chrome
- Edge
- Firefox
- Safari

Verify:

- Firebase authentication
- Charts
- PWA
- Responsive navigation
- Notifications
- Real-time synchronization

---

# 81. Visual Acceptance Criteria

The final product must clearly reflect the supplied visual reference.

The reviewer should see:

- Soft neumorphic surfaces
- Raised and recessed cards
- Rounded geometry
- Mint/teal + peach/orange palette
- Soft gray background
- Large financial typography
- Circular/ring visualizations
- Tactile controls
- Modern editorial dashboard composition
- Premium spacing
- Clean data hierarchy
- Sophisticated mobile adaptation

It must NOT look like the old DS001 dashboard.

---

# 82. UX Acceptance Criteria

The application must make these actions extremely easy:

1. See combined financial status.
2. Add an expense.
3. Add income.
4. See partner activity.
5. Check budget status.
6. Check goals.
7. See upcoming bills.
8. Search transactions.
9. Edit profile.
10. Invite/connect partner.

---

# 83. Product Differentiator

The application should consistently communicate:

> **This is OUR money.**

Not merely:

> My finance dashboard.

The product should visually reinforce:

- Two people
- Shared balance
- Shared goals
- Shared budgets
- Partner activity
- Contribution tracking
- Real-time collaboration

Keep the relationship design mature and elegant, not childish or overly romantic.

---

# 84. Implementation Phases

## Phase 1 — Audit

Inspect the complete DS001 repository.

Identify:

- Working functionality
- Broken functionality
- Firebase architecture
- Reusable services
- Existing types
- Existing security rules
- Existing components

## Phase 2 — Design System

Implement:

- Typography
- Color tokens
- Neumorphic surface system
- Buttons
- Inputs
- Cards
- Navigation
- Charts
- Progress indicators

## Phase 3 — Application Shell

Build:

- Desktop sidebar
- Mobile navigation
- Header
- Household/profile UI
- Theme handling

## Phase 4 — Authentication & Onboarding

Implement:

- Login
- Signup
- Password reset
- Profile
- Household creation
- Partner invitation

## Phase 5 — Couple System

Implement:

- Household
- Members
- Permissions
- Invitation
- Real-time member state

## Phase 6 — Dashboard

Build the new visual dashboard completely from real Firebase data.

## Phase 7 — Money Management

Implement:

- Transactions
- Income
- Expenses
- Accounts
- Transfers

## Phase 8 — Planning

Implement:

- Budgets
- Goals
- Bills
- Recurring transactions

## Phase 9 — Collaboration

Implement:

- Activity feed
- Notifications
- Real-time synchronization

## Phase 10 — Reports

Implement:

- Cash flow
- Spending
- Budgets
- Contributions
- Trends

## Phase 11 — PWA & Responsive

Complete:

- Mobile UX
- PWA
- Offline/read behavior
- Install experience

## Phase 12 — QA

Run:

- Build
- Lint
- Tests
- Security verification
- Two-device synchronization test
- Responsive testing

---

# 85. Definition of Done

The application is complete only when:

- Firebase authentication works.
- Two users can join one household.
- Household data is secure.
- Both partners see shared data.
- Real-time synchronization works.
- Income works.
- Expenses work.
- Transactions work.
- Transfers work.
- Accounts work.
- Budgets work.
- Goals work.
- Bills work.
- Recurring transactions work.
- Notifications work.
- Activity feed works.
- Profiles work.
- Settings work.
- Reports work.
- Charts use real data.
- PWA works.
- Mobile UI works.
- Desktop UI works.
- Firebase rules are implemented.
- No fake production data remains.
- No major console errors remain.
- No broken buttons remain.
- No placeholder pages remain.
- Visual design matches the supplied neumorphic soft-3D direction.

---

# 86. Critical Agent Instructions

Before coding:

1. Inspect the complete DS001 repository.
2. Inspect the supplied visual reference image.
3. Understand the existing Firebase architecture.
4. Identify reusable functionality.
5. Identify broken/weak functionality.
6. Establish the new design system first.
7. Build reusable components.
8. Implement real Firebase functionality.
9. Test each major feature.
10. Test synchronization using two clients.

Do not:

- Build only a visual mockup.
- Use fake dashboard numbers in production.
- Leave fake buttons.
- Leave placeholder pages.
- Use static chart data.
- Ignore Firebase security.
- Copy the reference image literally.
- Recreate the old DS001 dashboard.
- Turn every component into excessive 3D.
- Sacrifice readability for neumorphism.

---

# 87. Final Design Principle

The final app should feel like a **premium modern financial object**, not a spreadsheet.

The first impression should be:

> **Beautiful, calm, tactile, modern and easy to understand.**

The first financial question answered should be:

> **“How are we doing financially together?”**

The user should immediately see:

**Our Balance**

**Our Income**

**Our Spending**

**Our Savings**

**Our Budgets**

**Our Goals**

**What my partner recently changed**

And adding an expense should take only a few seconds.

---

# 88. Final Agent Prompt

Build the application from the existing `dolonhunt/DS001` repository using this PRD as the primary specification.

Use the supplied visual reference image together with this Markdown document.

The visual reference is mandatory for understanding the intended UI language:

**Modern Neumorphic Soft-3D Finance UI**

The implementation must be original but should reproduce the same design principles:

- Soft raised/sunken surfaces
- Light gray foundation
- Mint/teal
- Peach/orange
- Rounded panels
- Soft shadows
- Circular/ring visualizations
- Tactile controls
- Strong typography
- Premium spacing
- Editorial composition
- Modern responsive layouts

The application must be a real Firebase-backed product.

Do not stop at a mockup.

Do not declare completion until the major workflows work and the two-browser real-time synchronization test succeeds.

Run the available build, lint and test checks before completion.

The final result must be substantially better than the current DS001 interface and must feel like a polished, production-quality couple finance application.
