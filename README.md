# Trip Le Planner

Internal trip **customization, pricing, and quotation console** for **Trip Le Tourism Pvt. Ltd.**

Trip Le Planner lets the team select a tour product, customize it (accommodation, room occupancy,
transport, activities, meals, transfers, add-ons, discounts), compute a complete price with an
**internal cost/selling/margin breakdown**, generate a **structured day-by-day itinerary**, and save
**versioned, price-snapshotted quotes**.

> **Status: Phase 1 — Foundation & Architecture.** This repository currently contains the
> production-grade foundation: architecture, domain engines (pricing + itinerary), data models,
> authentication/authorization, the UI shell, and all routes as honest empty/placeholder states.
> Feature CRUD and the live quote builder arrive in later phases (see [Roadmap](#roadmap)).
> **No data is faked** — unavailable metrics are marked as such.

This is an **internal team tool only**. The public customer-facing version is intentionally **not**
built yet, but the architecture is designed so the same engines can later power the CRM, the public
website, and a mobile app.

---

## Technology stack

| Concern            | Choice                                             |
| ------------------ | -------------------------------------------------- |
| Framework          | Next.js 15 (App Router, React 19 Server Components)|
| Language           | TypeScript (strict, `noUncheckedIndexedAccess`)    |
| Styling            | Tailwind CSS v3.4 + design tokens                  |
| UI primitives      | shadcn/ui pattern (Radix UI, hand-added)           |
| Database           | MongoDB via Mongoose 8                              |
| Validation         | Zod                                                |
| Auth               | Auth.js (NextAuth v5) — credentials + JWT sessions |
| Passwords          | bcryptjs (work factor 12)                          |
| Tests              | Vitest (pure domain unit tests)                    |
| Lint / Format      | ESLint 9 (flat config) + Prettier                  |

---

## Folder structure

```
src/
├─ app/                      # Next.js App Router
│  ├─ (auth)/login/          # public sign-in
│  ├─ (dashboard)/           # protected route group (shared shell)
│  │  ├─ dashboard/  trips/  trips/[id]/
│  │  ├─ accommodations/  transport/  activities/  pricing/
│  │  ├─ quotes/  quotes/[id]/  customers/  settings/
│  ├─ api/                   # route handlers (auth, health)
│  ├─ error.tsx  global-error.tsx  not-found.tsx  layout.tsx
├─ components/
│  ├─ ui/                    # shadcn primitives (button, card, table, dialog…)
│  ├─ layout/                # sidebar, topbar, shell, brand, user menu
│  └─ common/                # page-header, stat-card, empty/access/phase states
├─ domain/                   # ⭐ PURE, framework-free business core
│  ├─ shared/                # Money value object, Result, enums
│  ├─ entities/              # domain types (Trip, Quote, Accommodation…)
│  ├─ pricing/               # deterministic pricing engine + rule contracts
│  └─ itinerary/             # itinerary builder + presenter (template/AI-ready)
├─ server/                   # server-only infrastructure & application layer
│  ├─ db/                    # mongoose connection + models
│  ├─ auth/                  # NextAuth config, RBAC, password, page guard
│  └─ actions/              # server actions (thin; call domain/services)
├─ lib/                      # errors, validation (Zod), utils (cn, format)
├─ config/                   # validated env, roles/permissions, navigation
└─ types/                    # cross-cutting types (next-auth augmentation)
```

The **golden rule**: `src/domain` imports **nothing** from Next.js, React, or Mongoose. It is the
reusable business core (pricing/itinerary) that the planner UI, CRM, website, and mobile app can all
call. Dependencies point **downward** (UI → application → domain ← infrastructure).

---

## Environment setup

Copy the example env file and fill in values:

```bash
cp .env.example .env.local
```

| Variable              | Required          | Purpose                                             |
| --------------------- | ----------------- | --------------------------------------------------- |
| `MONGODB_URI`         | for data features | MongoDB connection string                           |
| `MONGODB_DB_NAME`     | optional          | Logical DB name (default `trip_le_planner`)         |
| `AUTH_SECRET`         | **production**    | Signs session JWTs — `npx auth secret` to generate  |
| `NEXT_PUBLIC_APP_URL` | optional          | Public base URL (default `http://localhost:3000`)   |

The app **boots and renders without a database** — data-backed pages show an honest "not connected"
state instead of crashing. `MONGODB_URI` is only needed for sign-in and (future) data features.

---

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without a database configured you can view the UI shell and the login
page; sign-in requires MongoDB + a seeded user.

### Useful scripts

| Script              | Purpose                                        |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the dev server                           |
| `npm run build`     | Production build (type-checks; fails on errors)|
| `npm run start`     | Run the production build                       |
| `npm run lint`      | ESLint (flat config)                           |
| `npm run typecheck` | `tsc --noEmit`                                 |
| `npm run test`      | Vitest domain unit tests                       |
| `npm run seed`      | Seed an initial admin user (needs DB)          |

---

## Database setup

1. Provision MongoDB (Atlas or local) and set `MONGODB_URI` in `.env.local`.
2. Seed an admin user so you can sign in:

```bash
npm run seed -- "admin@trip-le.com" "YourStrongPassword#123" "Admin Name"
```

3. Start the app and sign in with those credentials.

The seed script (`scripts/seed.mjs`) is dependency-light (mongoose + bcryptjs) and idempotent
(upserts by email).

---

## Authentication architecture

- **Sessions**: JWT strategy via Auth.js (NextAuth v5), stored in an httpOnly cookie.
- **Credentials**: verified against MongoDB users; passwords are bcrypt-hashed and never selected by
  default or returned to the client.
- **Two-layer enforcement** (defence in depth):
  1. **Edge middleware** (`middleware.ts`) guards route groups using an edge-safe config
     (`server/auth/auth.config.ts` — no DB/bcrypt imports).
  2. **Server checks**: every protected page/action re-verifies via `guardPage` / `requirePermission`
     against a **permission matrix** (`config/roles.ts`). UI hiding is cosmetic only.
- **Roles** (Admin, Manager, Sales, Operations) are bundles of fine-grained **permissions** and are
  extensible without touching call sites.

---

## Pricing-engine architecture (foundation)

The pricing engine (`src/domain/pricing`) is **pure and deterministic**:

- Same input ⇒ same output. No `Date.now()`, randomness, or I/O inside the engine.
- **Money is integer minor units (paise)** via the `Money` value object — never floats.
- Input is a fully-resolved `PricingContext`; output is a `PriceBreakdown` with per-line and total
  figures, plus an **internal** `{ supplierCost, margin, marginPercentage }` block that public
  serializers strip.
- A `RuleEvaluator` interface models declarative rules (e.g. "travellers ≥ 10 → 5% group discount").
  Phase 1 ships a no-op evaluator + the sum-of-snapshots core + unit tests; the full rule DSL is
  Phase 3.

**AI is never in this path.** It is not the source of truth for any price, tax, cost, margin, room
math, capacity, discount, inclusion, or availability.

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full detail.

---

## Historical accuracy (why old quotes never change)

A quote does **not** reference live master prices. When created, it **embeds a snapshot** of every
selected component with the price frozen at that moment, and each edit appends a new version. If a
hotel's master price later changes ₹3,500 → ₹4,000, the existing quote still shows ₹3,500.

---

## Deployment considerations

- Target host: `planner.trip-le.com` (separate from the existing Trip Le website and CRM).
- Set `AUTH_SECRET`, `MONGODB_URI`, and `NEXT_PUBLIC_APP_URL` in the production environment.
  `AUTH_SECRET` is mandatory at production runtime.
- `trustHost: true` is set for self-hosting behind a known host/reverse proxy.
- Never commit `.env*`. Supplier cost / margin must never be exposed through any public API.
- Health probe: `GET /api/health` (returns non-sensitive status only).

---

## Roadmap

| Phase   | Scope                                                                          |
| ------- | ------------------------------------------------------------------------------ |
| **1** ✅ | Foundation: architecture, engines (skeleton), models, auth, UI shell, routes  |
| 2       | Master-data CRUD (trips, accommodations, transport, activities, meals, add-ons)|
| 3       | Full pricing rule engine, quote builder, snapshotting, internal breakdown      |
| 4       | Itinerary generation + customer-facing quote/itinerary output                  |
| 5       | AI presenter (rephrase-only), public/CRM APIs, mobile                          |

---

© Trip Le Tourism Pvt. Ltd. — Internal use only.
