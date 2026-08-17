# Static Color

Management system for a fabric dyeing and finishing workshop: lab samples, wash
recipes, production jobs with day costing, and the money side (clients,
estimates, invoices, cash book, reports).

Interface is bilingual, Arabic (RTL) and English, switchable from the sidebar.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## What is inside

**Operations**

- **Dashboard** - month income, expenses, profit, receivables, running jobs,
  machine status, open samples, recent cash movements. Shows a setup checklist
  until the library lists are filled.
- **Jobs** - a production run. Pick client, fabric, approved sample, wash type,
  quantity in kg, machines used, number of workers and number of days. The cost
  of one running day is calculated as `workers x worker day rate + sum of the
  day cost of every machine on the job`, then multiplied by days, plus manual
  amounts for dyes, chemicals and energy. Shows cost per kg, job value and
  margin live.
- **Lab samples** - the recipe sheet. Cut weight (10 g by default), dye rows
  entered as % on weight of fabric with grams calculated both ways, acid,
  carrier, anti crease, water, machine, temperature and time. The 14 bench steps
  are a checklist you tick off as you go. A scaling panel turns the lab recipe
  into the amounts for a full production batch of any weight. Samples can be
  repeated, which copies the recipe into a fresh sheet linked to the original.
- **Quality** - neps and seed particles, yarn count, uniformity, hand feel and
  colour fastness, with a pass / hold / fail verdict.

**Library** (the lists that everything else references)

- **Dyes** - code, family, colour swatch, supplier, cost per kg, stock.
- **Chemicals** - acid, carrier, anti crease and anything else.
- **Wash types** - code, machine size, temperature, duration, liquor ratio.
- **Machines** - the 3 washers, dryer, press, ironing machine, boiler and
  samples machine are seeded on first open. Set a cost per day on each one,
  that is what drives job costing.
- **Fabrics** - composition, GSM, width, yarn count, and the lab measurement of
  how many meters one kilogram gives, with a kg to meters calculator.

**Accounting**

- **Clients** - contact details, opening balance, invoiced / paid / due, and a
  printable statement.
- **Estimates** - quotes with line items, tax and discount, convertible to an
  invoice in one click.
- **Invoices** - line items, tax, discount, payment recording, printable view
  with the company header.
- **Cash book** - every money in and money out movement, categorised, filtered
  by date range.
- **Reports** - revenue, expenses, profit and receivables for any period, a 12
  month bar chart, breakdowns by category and by client, and job profitability.

## Data

Everything is stored in the browser under the key `static-color-db-v1`. There is
no server yet. **Settings has Export and Import buttons, use Export regularly as
a backup.**

The data layer is deliberately isolated in `src/data/`:

- `types.ts` is the whole domain model
- `store.ts` handles persistence, seeding and migration
- `db.tsx` exposes `useDb()` with `add / update / remove / setSettings`

Swapping localStorage for Supabase or any other backend means rewriting
`store.ts` and the body of `db.tsx` only. No page needs to change.

## Assumptions worth confirming

These were guessed while building and should be checked against how the workshop
actually works:

1. **Acid, carrier and anti crease scale linearly with fabric weight.** The
   scaling panel multiplies them by the same factor as the dyes. If they are
   actually dosed per litre of liquor rather than on weight of fabric, the
   scaling for those three rows needs to change.
2. **Dye amounts are entered as % on weight of fabric.** Grams are derived from
   the swatch weight. Entering grams directly also works and back calculates the
   percent.
3. **Worker day rate is a single global number** in Settings, not per worker.
4. **Tax defaults to 16%** on new invoices and estimates, changeable per
   document and in Settings.

## Still to fill in

- The 63 wash types
- The dye library
- Real cost per day for each machine
- Real fabric meters per kg measurements

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router. No backend, no auth.
