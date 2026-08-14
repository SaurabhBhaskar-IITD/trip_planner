# Trip Le Planner — Architecture

This document describes the system architecture, domain model, and the design principles that make
Trip Le Planner a durable business platform rather than a calculator. It is the reference for every
future phase.

---

## 1. System architecture

Trip Le Planner uses a **layered / ports-and-adapters** architecture. The single most important rule:

> **The domain layer (`src/domain`) is pure TypeScript.** It imports nothing from Next.js, React, or
> Prisma. All business truth — pricing and itinerary generation — lives here and is reusable from
> any caller.

```
┌──────────────────────────────────────────────────────────────┐
│ Presentation      Next.js App Router · RSC · shadcn/ui         │  src/app, src/components
│                   (renders data, collects input; no business   │
│                    logic beyond formatting)                     │
├──────────────────────────────────────────────────────────────┤
│ Application       Server Actions + Route Handlers              │  src/server/actions, src/app/api
│                   (authenticate, authorize, orchestrate,        │
│                    map domain results to safe DTOs)             │
├──────────────────────────────────────────────────────────────┤
│ Domain  (PURE)    Pricing Engine · Itinerary Engine            │  src/domain
│                   Entities · Money value object · Rule          │  ← framework-free, unit-tested
│                   contracts                                     │
├──────────────────────────────────────────────────────────────┤
│ Infrastructure    Prisma client · repositories · Auth provider  │  src/server/db, /repositories, /auth
│                   (adapters that satisfy the domain-facing ports)│
├──────────────────────────────────────────────────────────────┤
│ Shared            Zod schemas · Typed errors · Utils · Config   │  src/lib, src/config, src/types
└──────────────────────────────────────────────────────────────┘
```

**Dependency direction is downward only.** Presentation and infrastructure depend on the domain; the
domain depends on neither. This is what lets the CRM, public website, and mobile app reuse the exact
same pricing/itinerary code later.

### Why this matters commercially

- The pricing engine can be unit-tested in milliseconds with no database or browser.
- The same computation runs identically in the planner UI, a CRM background job, or a public API.
- The persistence store (PostgreSQL today) can be swapped as an infrastructure change, not a rewrite.
  This migration from MongoDB to Neon PostgreSQL touched only infrastructure — the domain and its
  tests were unchanged.

---

## 2. Domain entities

Domain entities are pure types in `src/domain/entities`; they are persisted through the relational
**Prisma schema** (`prisma/schema.prisma`) and accessed via repositories in `src/server/repositories`.
Canonical vocabularies (room types, transport modes, pricing units, …) live in
`src/domain/shared/enums.ts` **and** are mirrored as PostgreSQL enums in the Prisma schema — shared by
types, validators, and UI, **never** hard-coded in components.

| Table (Prisma model)                       | Purpose                                                            |
| ------------------------------------------ | ----------------------------------------------------------------- |
| **User**                                   | Internal Trip Le employee, with a `Role`.                         |
| **Customer**                               | The party a quote is for.                                         |
| **Destination**                            | Reusable place; many-to-many with Trip via `TripDestination`.    |
| **Trip**                                   | Reusable tour product (`slug`, `status`, `version`).             |
| **ItineraryDay → ItinerarySegment**        | Relational, explicitly ordered day-by-day structure.             |
| **Accommodation → RoomType → AccommodationPrice** | Property → occupancy/category room → season/validity prices. |
| **Transportation → TransportationPrice**   | Mode + structured `capacity` + price rows.                       |
| **Activity → ActivityPrice**               | Activities with per-person/group/fixed price rows.               |
| **Meal → MealPrice**                       | Meal type + plan (EP/CP/MAP/AP/custom) + price rows.             |
| **Addon → AddonPrice**                     | Optional services + price rows.                                  |
| **PricingRule**                            | Enum-typed effect + validated JSON conditions/params (Phase 3).  |
| **Quote → QuoteVersion → QuoteItem**       | Versioned proposal with **frozen price snapshots** (see §6).     |

Every price table carries the relational `PriceSpec` fields: `amountMinor` (BigInt),
`supplierCostMinor` (internal), `unit`, `season`, `validFrom/validUntil`, `minPax/maxPax`, `active`.

### Pricing metadata (`PriceSpec`)

Every priceable component carries a `PriceSpec` that supports (per spec §5):
`amount`, `unit`, `supplierCost` (internal), `validFrom/validUntil`, `season`, `minPax/maxPax`.
Pricing **units** are modeled explicitly: `per_person`, `per_room`, `per_night`,
`per_room_per_night`, `per_person_per_night`, `per_vehicle`, `per_day`, `per_group`, `fixed`,
`percentage`.

---

## 3. Data flow

### Read (e.g. viewing a page)

```
Browser → Next route (RSC) → guardPage(permission) → repository (port)
        → Prisma adapter → PostgreSQL → domain-shaped data → DTO (internal fields
          stripped unless authorized) → rendered on the server
```

### Write (e.g. saving a quote — future)

```
Client form → Server Action → authorize (requirePermission)
            → Zod validation → domain service builds ResolvedLineInputs
            → computePrice() [pure, deterministic] → snapshot persisted
            → ActionResult { ok, data | message, fieldErrors }
```

The **ActionResult** shape (`src/server/actions/action-result.ts`) gives the client one predictable
contract and guarantees internal error details never reach the browser.

---

## 4. Pricing-engine concept

Location: `src/domain/pricing`. **Deterministic and pure** — this is the heart of commercial
integrity.

- **Inputs** (`PricingContext`): travel dates, nights, traveller count, pre-resolved base line inputs
  (each with unit price and optional supplier cost), and the applicable rules. Everything the engine
  needs is passed in — it reads no clock and performs no I/O.
- **Rule pipeline** (`RuleEvaluator`): declarative `PricingRule`s are translated into additional lines
  and adjustments. Rules are ordered deterministically (priority, then id). Examples the model
  supports:
  - `travellerCount >= 10` → 5% group discount
  - `accommodationCategory == deluxe` → +₹2,500 per person
  - `transportMode == flight` → replace the train component
  - `activityType == paragliding` → +₹1,800 per person
  - `mealPlan == MAP` → +₹700 per person per night
- **Output** (`PriceBreakdown`): itemized `lines`, `adjustments`, `subtotal`, `discountTotal`,
  `taxTotal`, `grandTotal`, and an **`internal`** block (`supplierCostTotal`, `marginTotal`,
  `marginPercentage`) that is omitted entirely when `includeInternal: false`.
- **Money** is always integer minor units via the `Money` value object. `0.1 + 0.2` is exactly `0.3`,
  proven by unit tests.
- **`engineVersion`** is stamped on every result (and stored on each quote version) so historical
  numbers are reproducible.

**Phase 1 delivers**: the `Money` VO, the full `PriceBreakdown` types, the engine core (a faithful
sum-of-snapshots with margin computation), a no-op `RuleEvaluator`, and passing unit tests. **Phase 3**
implements the declarative rule evaluation.

**AI is never the source of truth** for prices, taxes, supplier costs, margins, room math, vehicle
capacity, discounts, inclusions, exclusions, availability, or itinerary facts.

---

## 5. Itinerary-engine concept

Location: `src/domain/itinerary`. Two clean steps:

1. **`buildItinerary(trip)`** assembles a structured `ItineraryDocument` (days → ordered segments:
   transfer / meal / activity / stay / note) **strictly from database facts**. It never invents a
   place, time, or activity.
2. **`ItineraryPresenter`** renders the structured document to text. The default
   `TemplateItineraryPresenter` is **deterministic** ("After breakfast, depart for Solang Valley…").

A future **AI presenter** will implement the *same* `ItineraryPresenter` interface. Because it only
receives the already-built structured document, it can improve phrasing but **cannot add or alter a
fact**. This boundary is architectural, not a guideline.

---

## 6. Historical accuracy & versioning

Per spec §4, previously generated quotes must never change when master data changes.

- A `Quote` has many `QuoteVersion` rows. Each version stores:
  - `selectionsSnapshot` (what the operator chose, as JSON),
  - many `QuoteItem` rows — each a full snapshot: `componentNameSnapshot`, `descriptionSnapshot`,
    `quantity`, `unit`, **frozen `unitPriceMinor` / `lineTotalMinor`**, internal
    `supplierCostMinor` / `marginMinor`, and `pricingMetadataSnapshot` (JSON),
  - frozen commercial totals (`subtotalMinor`, `grandTotalMinor`, internal margin fields),
  - `pricingEngineVersion`.
- `QuoteItem.componentId` is a **nullable soft reference with no FK** — editing or deleting the
  master accommodation/activity later cannot alter or break a historical line.
- Editing a quote **inserts a new version**; existing versions are immutable.
- Result: master price ₹3,500 → ₹4,000 later leaves the original quote showing ₹3,500, with a full
  price-change trail across versions.

---

## 7. Security boundaries

- **Authorization is server-side and permission-based.** Roles map to permissions
  (`config/roles.ts`); code checks `can(user, "quote:create")`, never `role === "sales"`.
- **Defence in depth**: edge middleware guards route groups; every page/action independently
  re-checks. Hiding a UI control is never treated as access control.
- **Internal commercial data is a hard boundary.** `supplierCost`, `markup`, `margin` are gated by the
  dedicated `pricing:viewInternal` permission and stripped by DTO mappers / `includeInternal: false`
  before any customer-facing surface. This is the rule that protects Trip Le's margins when the same
  engine is later exposed publicly.
- **Secrets** live only in env (validated in `config/env.ts`); none are referenced from client code
  (only `NEXT_PUBLIC_*` is client-safe). `.env*` is git-ignored.
- **Errors** are normalized to a typed `AppError` hierarchy; users see friendly messages, never stack
  traces.

---

## 8. Future CRM integration

The CRM is a **separate application** and must not be coupled to planner internals. Integration path:

- Expose planner capabilities as **route handlers under `src/app/api`** (versioned, e.g. `/api/v1/...`),
  authenticated via service tokens/OAuth (added when needed).
- The CRM calls these APIs; it reuses the **same domain engines** server-side, guaranteeing identical
  pricing.
- Internal fields are included **only** for CRM callers holding `pricing:viewInternal`-equivalent
  scope — enforced by the same authorization layer.

---

## 9. Future public-website integration

- The public site consumes a **strictly public API** built on the same engine with
  `computePrice(..., { includeInternal: false })`, so supplier cost and margin can never leak.
- Public responses are produced by dedicated public DTO mappers — allow-list serialization, never
  "hide a field in the UI".
- The pricing/itinerary determinism means a customer sees exactly the number the team sees (minus
  internal figures), building trust and eliminating reconciliation bugs.

---

## 10. Key design decisions (log)

| Decision                              | Rationale                                                        |
| ------------------------------------- | ---------------------------------------------------------------- |
| Money as integer minor units (BigInt) | Eliminates float rounding errors; `Money` VO converts at the boundary. |
| Pure domain layer (no framework deps) | Reuse across planner/CRM/website/mobile; fast unit tests.        |
| Relational quote snapshots + versions | Historical accuracy; immune to master-data changes.             |
| Prisma + Neon PostgreSQL              | Relational integrity, one Neon project, env-selected DB/branch.  |
| ORM isolated behind repository ports  | Domain never imports Prisma; store is swappable (see §1).        |
| Permission matrix (not role checks)   | New roles are data, not scattered code changes.                  |
| Auth.js (NextAuth v5) + JWT           | Standard, SSO-ready; split edge/node config for middleware.      |
| Deterministic engines; AI presenter-only | Commercial correctness; AI never invents facts or prices.    |
| Honest empty/placeholder states       | No fabricated data; unavailable metrics are labeled.            |

---

© Trip Le Tourism Pvt. Ltd. — Internal use only.
