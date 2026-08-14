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
| Database           | Neon PostgreSQL                                     |
| ORM                | Prisma 6                                           |
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
│  ├─ db/                    # Prisma client singleton (server-only)
│  ├─ repositories/          # ports/ (interfaces) + prisma/ (implementations)
│  ├─ auth/                  # NextAuth config, RBAC, password, page guard
│  └─ actions/              # server actions (thin; call domain/services)
├─ lib/                      # errors, validation (Zod), utils (cn, format)
├─ config/                   # validated env, roles/permissions, navigation
└─ types/                    # cross-cutting types (next-auth augmentation)

prisma/                      # schema.prisma (relational model) + seed.ts
```

The **golden rule**: `src/domain` imports **nothing** from Next.js, React, or Prisma. It is the
reusable business core (pricing/itinerary) that the planner UI, CRM, website, and mobile app can all
call. Dependencies point **downward** (UI → application → domain ← infrastructure).

---

## Environment setup

Copy the example env file and fill in values:

```bash
cp .env.example .env
```

> Use `.env` (not `.env.local`): the Next.js app reads both, but the **Prisma CLI
> only reads `.env`**, so keeping everything in `.env` lets one file serve the app,
> migrations, and seeding. Both are git-ignored.

| Variable              | Required          | Purpose                                             |
| --------------------- | ----------------- | --------------------------------------------------- |
| `DATABASE_URL`        | for data features | Neon PostgreSQL connection string                   |
| `AUTH_SECRET`         | **production**    | Signs session JWTs — `npx auth secret` to generate  |
| `NEXT_PUBLIC_APP_URL` | optional          | Public base URL (default `http://localhost:3000`)   |

The app **boots and renders without a database** — data-backed pages show an honest "not connected"
state instead of crashing. `DATABASE_URL` is only needed for sign-in and (future) data features.

---

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without a database configured you can view the UI shell and the login
page; sign-in requires PostgreSQL + a seeded user.

### Useful scripts

| Script                | Purpose                                                    |
| --------------------- | ---------------------------------------------------------- |
| `npm run dev`         | Start the dev server                                       |
| `npm run build`       | Production build (type-checks; fails on errors)            |
| `npm run start`       | Run the production build                                   |
| `npm run lint`        | ESLint (flat config)                                       |
| `npm run typecheck`   | `tsc --noEmit`                                             |
| `npm run test`        | Vitest domain unit tests (database-independent)            |
| `npm run db:generate` | Generate the Prisma client (also runs on `postinstall`)    |
| `npm run db:push`     | Push the schema to the database (no migration history)     |
| `npm run db:migrate`  | Create/apply a dev migration                               |
| `npm run db:studio`   | Open Prisma Studio                                         |
| `npm run seed`        | Seed an initial admin user + sample destinations (needs DB)|

---

## Database setup (Neon PostgreSQL + Prisma)

Trip Le Planner uses a **dedicated PostgreSQL database inside your existing Neon project**
(separate from the other Trip Le app database). The specific database/branch is selected entirely
by `DATABASE_URL`, so dev/staging/prod simply point at different Neon branches.

1. In the Neon console, create (or pick) a branch/database for the planner and copy its **pooled**
   connection string into `DATABASE_URL` in `.env`.
2. Create the tables from the Prisma schema:

   ```bash
   npm run db:push
   ```

   (or `npm run db:migrate` if you want a tracked migration history).
3. Seed an admin user (credentials overridable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` /
   `SEED_ADMIN_NAME`):

   ```bash
   npm run seed
   ```

4. Start the app and sign in.

The seed (`prisma/seed.ts`) is idempotent (upserts by email/slug), creates **no fake production
pricing**, and clearly labels its sample destinations as dev data.

---

## Authentication architecture

- **Sessions**: JWT strategy via Auth.js (NextAuth v5), stored in an httpOnly cookie.
- **Credentials**: verified against PostgreSQL users via the `UserRepository`; passwords are
  bcrypt-hashed and the hash is never returned to the client.
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

A quote does **not** reference live master prices. When created, each `QuoteVersion` stores a **frozen
snapshot** (`QuoteItem` rows) of every selected component with the price captured at that moment, and
each edit inserts a new version. Master references are nullable with no FK, so editing/deleting master
data can't alter history. If a hotel's master price later changes ₹3,500 → ₹4,000, the existing quote
still shows ₹3,500.

---

## Deployment considerations

- Target host: `planner.trip-le.com` (separate from the existing Trip Le website and CRM).
- Set `AUTH_SECRET`, `DATABASE_URL`, and `NEXT_PUBLIC_APP_URL` in the production environment.
  `AUTH_SECRET` is mandatory at production runtime.
- Point `DATABASE_URL` at the **production Neon branch**; run `prisma migrate deploy` (or `db push`)
  during release. `postinstall` regenerates the Prisma client on install.
- `trustHost: true` is set for self-hosting behind a known host/reverse proxy.
- Never commit `.env*`. Supplier cost / margin must never be exposed through any public API.
- Health probe: `GET /api/health` (returns non-sensitive status only).

---

## Roadmap

| Phase   | Scope                                                                          |
| ------- | ------------------------------------------------------------------------------ |
| **1** ✅ | Foundation: architecture, engines (skeleton), Prisma/Postgres schema, auth, UI shell, routes |
| **2A** ◐ | Master-data management. **Done:** reusable UI library, repositories/actions pattern, Destinations, Trips + relational itinerary editor. **Next:** Accommodations/Room types/Pricing, Transport, Activities, Meals, Add-ons |
| 3       | Full pricing rule engine, quote builder, snapshotting, internal breakdown      |
| 3       | Full pricing rule engine, quote builder, snapshotting, internal breakdown      |
| 4       | Itinerary generation + customer-facing quote/itinerary output                  |
| 5       | AI presenter (rephrase-only), public/CRM APIs, mobile                          |

---

© Trip Le Tourism Pvt. Ltd. — Internal use only.
