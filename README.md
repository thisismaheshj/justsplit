# JustSplit

A minimal, frictionless expense-splitting app — a lightweight Splitwise alternative.
No accounts, no backend, no payments. Everything runs client-side and persists to
`localStorage`.

**Live app: https://thisismaheshj.github.io/justsplit/**

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest unit + component tests
npm run build    # type-check + production build
```

Append `?seed=1` to the URL (or use **Settings → Load demo data**) to populate a
realistic "Goa Trip" demo group.

## Stack

React 18 · TypeScript · Vite · React Router v6 · Zustand (`persist`) · Tailwind CSS ·
Radix primitives (shadcn-style wrappers) · lucide-react · date-fns · framer-motion ·
Vitest + React Testing Library.

## How it is put together

```
src/
  lib/          pure business logic — no React, no store, fully unit-tested
  store/        Zustand store (commits) + selectors (derives)
  hooks/        balances, recurring check, media queries
  components/   UI primitives + feature components
  pages/        thin route-level compositions
  tests/        Vitest suites
```

Three rules keep the app honest:

1. **All money is integer minor units.** Amounts are stored as paise/cents and only
   converted for display (`lib/currency.ts`). Currencies with 0 decimal places (JPY)
   are handled through a metadata table.
2. **All maths lives in `lib/`.** `calculations.ts`, `debtSimplification.ts` and
   `recurring.ts` are pure functions. Store actions call them and commit the result;
   the store contains no inline calculation.
3. **Balances are never persisted.** They are always derived from
   `expenses` + `settlements` + `people` via `store/selectors.ts`, so they cannot
   drift out of sync with the ledger.

### Splitting

Four methods — equal, exact, percentage, shares. Every one guarantees
`sum(participant.amountOwed) === expense.amount` exactly. Equal gives the leftover
minor units to the first N participants in order; percentage and shares use the
largest-remainder method, ties broken by participant order, so results are
deterministic.

### Balances and settling up

`computeBalances` credits the payer and debits each participant; a settlement moves
the payer back towards zero. The sum of all balances is always exactly 0 — there is a
test asserting that invariant over randomly generated ledgers.

`simplifyDebts` greedily matches the largest debtor against the largest creditor,
which settles at least one person per step and therefore emits at most `n-1` transfers.
This powers both the Home "who owes who" summary and the one-tap suggestions in
Settle Up.

### Dates and recurring expenses

Dates are plain `"YYYY-MM-DD"` strings parsed in **local** time
(`lib/date.ts`) — `new Date("2026-03-01")` parses as UTC and shifts the day for
negative offsets, so it is never used for date-only values.

Monthly templates clamp to the last valid day of a short month and remember their
anchor day, so Jan 31 → Feb 28 → **Mar 31**, not Mar 28. On mount and on window focus,
`runDueRecurringCheck()` walks each active template forward, generating every missed
occurrence, so an app left closed for months catches up correctly.

Generated expenses are ordinary `Expense` records: editing or deleting one affects
only that occurrence, and editing the template affects only future ones.

### Removing people

Someone with history is **archived**, not deleted — historical participant references
stay valid so past balances remain correct. They disappear from new expense pickers
but keep their detail page and history. Someone with no history at all is deleted
outright, and the last remaining person can never be removed.

## Testing

93 tests across 6 files: the four split algorithms and their rounding, the
balance-nets-to-zero invariant, debt simplification (`n-1` bound, clears the ledger),
recurring date maths and catch-up generation, currency round-trips and formatting,
form validators, and component tests for the Add Expense form, Settle Up
pre-filling, and person removal.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which installs
dependencies, runs the test suite, builds, and publishes to GitHub Pages. A failing
test fails the deploy, so a broken build never reaches the live site.

Because Pages serves the app from `/justsplit/` rather than the domain root, the
build reads a `GITHUB_PAGES=true` environment variable to set Vite's `base`, and the
router takes its `basename` from `import.meta.env.BASE_URL`. Local `npm run dev` and
`npm run build` are unaffected and still use `/`.

GitHub Pages has no server-side routing, so a build step also writes `dist/404.html`
as a copy of `index.html`. Pages serves that file for any unknown path, which boots
the app and lets React Router handle the URL — without it, opening
`/justsplit/expenses` directly would 404.

## Out of scope

No auth, payments, AI, OCR, charts, social features, multi-currency conversion, or
server. Clearing browser site data deletes everything.
