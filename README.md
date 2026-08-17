# Static Color

Management system for a fabric dyeing and finishing workshop: lab samples, wash
recipes, production jobs with day costing, and the money side (clients,
estimates, invoices, cash book, reports).

Interface is bilingual, Arabic (RTL) and English, switchable from the sidebar.

It runs as a **Windows desktop app**. No browser, no server, no internet.

## Getting the app

Two builds come out of `npm run dist`, both in `release/`:

| File | What it does |
|---|---|
| `StaticColor-portable-<version>.exe` | Single file. Copy it anywhere, double click, it runs. Nothing is installed. |
| `StaticColor-setup-<version>.exe` | Normal installer with Start menu and desktop shortcuts. |

Windows SmartScreen will warn the first time because the exe is not code
signed. Click **More info**, then **Run anyway**.

## Building it

```bash
npm install
npm run dist     # both exes into release/
npm run app      # build and open the desktop app without packaging
npm run app:dev  # browser dev server on http://localhost:5199, hot reload
```

If packaging fails with `EPERM ... win-unpacked.tmp`, Windows Defender is
holding the freshly extracted Electron files. Build with the already unpacked
copy instead:

```bash
npx electron-builder --win -c.electronDist=node_modules/electron/dist
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

The desktop app keeps everything in one plain JSON file:

```
C:\Users\<you>\AppData\Roaming\Static Color\static-color-data.json
```

Settings shows that path with an **Open folder** button. Writes go to a temp
file and are then renamed, so a crash mid save cannot corrupt it. Copying that
one file is a complete backup, and **Settings has Export and Import** which open
real Windows save and open dialogs.

Run in a browser instead and the same data goes to localStorage under
`static-color-db-v1`. The app detects which shell it is in and picks the right
one.

The data layer is deliberately isolated in `src/data/`:

- `types.ts` is the whole domain model
- `store.ts` handles persistence, seeding and migration
- `db.tsx` exposes `useDb()` with `add / update / remove / setSettings`
- `desktop.ts` is the typed bridge to the Electron shell

Swapping the file store for Supabase or any other backend means rewriting
`store.ts` and the body of `db.tsx` only. No page needs to change.

## Desktop shell

`electron/main.cjs` creates the window and owns the save, open and reveal
dialogs. `electron/preload.cjs` exposes a small `window.desktop` API over
`contextBridge` with `contextIsolation` on and `nodeIntegration` off, so the app
code never touches Node directly. Only one instance can run at a time, so two
windows can never fight over the data file. External links open in the real
browser rather than inside the app.

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

React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Electron. No backend,
no auth, no network calls.
