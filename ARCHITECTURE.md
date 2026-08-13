# Trip Le Planner — Architecture

This document describes the system architecture, domain model, and the design principles that make
Trip Le Planner a durable business platform rather than a calculator. It is the reference for every
future phase.

---

## 1. System architecture

Trip Le Planner uses a **layered / ports-and-adapters** architecture. The single most important rule:

> **The domain layer (`src/domain`) is pure TypeScript.** It imports nothing from Next.js, React, or
> Mongoose. All business truth — pricing and itinerary generation — lives here and is reusable from
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
│ Infrastructure    Mongoose models · DB connection · Auth        │  src/server/db, src/server/auth
│                   provider (adapters that satisfy ports)        │
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
- Swapping MongoDB for another store is an infrastructure change, not a rewrite.

---

## 2. Domain entities

All entities are defined as pure types in `src/domain/entities` and persisted via Mongoose models in
`src/server/db/models`. Canonical vocabularies (room types, transport modes, pricing units, …) live in
`src/domain/shared/enums.ts` and are shared by types, schemas, validators, and UI — **never** hard-coded
in components.

| Entity              | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| **User**            | Internal Trip Le employee, with a `Role`.                               |
| **Customer**        | The party a quote is for, plus embedded `Traveller`s.                   |
| **Destination**     | A place included in trips.                                              |
| **Trip**            | A reusable tour product with an embedded structured **itinerary**.      |
| **Accommodation**   | Property with `roomOptions` (room type × category × price).             |
| **Transportation**  | Mode + **capacity** + price (per vehicle / per person / …).             |
| **Activity**        | Sightseeing, adventure, tickets, guides, excursions (per-person price). |
| **Meal**            | Meal type + plan (EP/CP/MAP/AP/custom) + price.                         |
| **Addon**           | Optional extra service.                                                 |
| **PricingRule**     | Declarative condition→effect rule (evaluated by the engine in Phase 3). |
| **Quote**           | Versioned proposal with **embedded price snapshots** (see §6).          |

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
Browser → Next route (RSC) → guardPage(permission) → repository/service
        → Mongoose model → Mongo → domain-shaped data → DTO (internal fields
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

- A `Quote` holds `versions: QuoteVersion[]`. Each version embeds:
  - `selections` (what the operator chose),
  - `items: QuoteItemSnapshot[]` — each with the **frozen `unitPrice`, `lineTotal`, and internal
    margin** used at creation,
  - `totals` — frozen commercial totals,
  - `pricingEngineVersion`.
- Editing a quote **appends a new version**; it never mutates a previous one.
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
| Money as integer minor units          | Eliminates float rounding errors in prices/margins.              |
| Pure domain layer (no framework deps) | Reuse across planner/CRM/website/mobile; fast unit tests.        |
| Embedded quote snapshots + versions   | Historical accuracy; immune to master-data changes.             |
| Permission matrix (not role checks)   | New roles are data, not scattered code changes.                  |
| Auth.js (NextAuth v5) + JWT           | Standard, SSO-ready; split edge/node config for middleware.      |
| Deterministic engines; AI presenter-only | Commercial correctness; AI never invents facts or prices.    |
| Honest empty/placeholder states       | No fabricated data; unavailable metrics are labeled.            |

---

© Trip Le Tourism Pvt. Ltd. — Internal use only.
