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
- **Lab samples** - the recipe sheet. A 10 g swatch in 250 ml of water, dye rows
  entered as % on weight of fabric with grams calculated both ways, acid at a
  concentration in the bath, carrier and anti break, machine, temperature and
  time. Picking a fabric pulls its usual temperature and time, and warns when a
  polyester needs carrier. The 14 bench steps are a checklist. The machine
  hand-off panel turns the sheet into the amounts to carry down to the floor,
  printing the working beside each line. A failed sample is adjusted in place and
  each go is snapshotted into an attempts log.
- **Quality** - neps and seed particles, yarn count, uniformity, hand feel and
  colour fastness, with a pass / hold / fail verdict.

**Recipe knowledge base**

The lab sample sheet retrieves past work instead of leaving it on paper. Choose
a fabric and a target shade and it lists the approved samples already run on
that fabric, closest shade first, with a colour difference and a plain language
band beside each one. **Start from this** copies that recipe onto the sheet as
the opening point.

The difference is computed in CIE Lab from the colour values stored in the app,
which come from a picker on a screen. It is a way of ordering candidates, not a
measurement. Without a spectrophotometer it must never be used to pass or fail a
delivered batch, and the panel says so on screen.

**Library** (the lists that everything else references)

- **Dyes** - commercial name first, optional code, category, colour swatch,
  supplier, cost per kg, and whether there is bulk or only a testing bottle.
  A bulk paste importer takes a pasted list, one dye per line.
- **Chemicals** - acid, carrier, anti break and anything else.
- **Wash types** - code, machine size, temperature, duration, liquor ratio.
- **Machines** - the 3 washers, dryer, press, ironing machine, boiler and
  samples machine are seeded on first open. Set a cost per day on each one,
  that is what drives job costing.
- **Fabrics** - composition, GSM, width, yarn count, the lab measurement of how
  many meters one kilogram gives with a converter, plus the usual machine
  temperature, time, litres of water per kilogram and whether it needs carrier.

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

## How the recipe maths works

Two different rules, and mixing them up is the mistake the code exists to
prevent:

- **Dyes scale with the fabric.** A percentage on weight of fabric becomes grams
  by `percent x kilograms x 10`. A 2.2 percent shade on 46 kg is
  `2.2 x 46 x 10 = 1012 g`. The machine hand-off panel prints that working next
  to every line so it can be checked by hand.
- **A chemical follows whichever basis its row is set to.** Grams per litre
  scales with the water: 2 g/L of acid is 0.5 g in a 250 ml lab bottle and 920 g
  in a 460 litre machine. Percent on weight of fabric scales with the kilograms,
  the same as a dye. Acid, carrier and anti break are each used both ways in the
  workshop, so every one of them carries its own basis selector and the code
  never assumes.

Water per kilogram of fabric varies by fabric, and can be typed either as litres
per kilogram or as a percentage on weight of fabric. 10 litres per kilogram and
1000 percent are the same bath.

Sources for all of this are in `docs/workshop-answers.md`, which is the
specification. Where the code and that file disagree, the file is right.

## Still to fill in

- The 63 wash types
- The dye library, 3000 or so, via the bulk paste importer on the dyes screen
- Real cost per day for each machine
- Real fabric meters per kg measurements
- Sessions 3 to 7 of the field guide, see the open questions in
  `docs/workshop-answers.md`

## Stack

React 19, TypeScript, Vite, Tailwind CSS v4, React Router, Electron. No backend,
no auth, no network calls.
