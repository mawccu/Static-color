import type {
  Client,
  DB,
  DocLine,
  Id,
  Invoice,
  Job,
  Machine,
  Sample,
  Settings,
  Transaction,
} from '../data/types'
import { isoDate } from '../data/store'

/** Local number formatting, kept here so this module stays free of React. */
const num = (v: number, dp = 2): string =>
  (Number.isFinite(v) ? v : 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: dp,
  })

export const sum = (ns: number[]): number => ns.reduce((a, b) => a + (b || 0), 0)

/* ------------------------------------------------------------ documents */

export interface DocTotals {
  subtotal: number
  discount: number
  taxAmount: number
  total: number
}

export function docTotals(
  lines: DocLine[],
  taxPct: number,
  discount: number,
): DocTotals {
  const subtotal = sum(lines.map((l) => (l.qty || 0) * (l.unitPrice || 0)))
  const afterDiscount = Math.max(0, subtotal - (discount || 0))
  const taxAmount = afterDiscount * ((taxPct || 0) / 100)
  return {
    subtotal,
    discount: discount || 0,
    taxAmount,
    total: afterDiscount + taxAmount,
  }
}

export const invoiceTotal = (inv: Invoice): number =>
  docTotals(inv.lines, inv.taxPct, inv.discount).total

export const invoicePaid = (invId: Id, txs: Transaction[]): number =>
  sum(
    txs
      .filter((t) => t.invoiceId === invId && t.direction === 'in')
      .map((t) => t.amount),
  )

export function invoiceStatusOf(
  inv: Invoice,
  txs: Transaction[],
): Invoice['status'] {
  if (inv.status === 'void' || inv.status === 'draft') return inv.status
  const total = invoiceTotal(inv)
  const paid = invoicePaid(inv.id, txs)
  if (paid <= 0) return inv.status === 'sent' ? 'sent' : inv.status
  if (paid + 0.001 >= total) return 'paid'
  return 'partial'
}

/* -------------------------------------------------------------- clients */

export interface ClientBalance {
  invoiced: number
  paid: number
  due: number
}

export function clientBalance(
  client: Client,
  invoices: Invoice[],
  txs: Transaction[],
): ClientBalance {
  const live = invoices.filter(
    (i) => i.clientId === client.id && i.status !== 'void' && i.status !== 'draft',
  )
  const invoiced = sum(live.map(invoiceTotal))
  const paid = sum(
    txs
      .filter((t) => t.clientId === client.id && t.direction === 'in')
      .map((t) => t.amount),
  )
  return {
    invoiced,
    paid,
    due: client.openingBalance + invoiced - paid,
  }
}

/* ----------------------------------------------------------------- jobs */

export interface JobCosting {
  /** cost of one full running day: workers plus every machine on the job */
  perDay: number
  labor: number
  machines: number
  running: number
  extras: number
  total: number
  revenue: number
  margin: number
  marginPct: number
  costPerKg: number
}

export function jobCosting(
  job: Job,
  allMachines: Machine[],
  settings: Settings,
): JobCosting {
  const days = Math.max(0, job.days || 0)
  const laborPerDay = (job.workers || 0) * (settings.workerDayRate || 0)
  const machinesPerDay = sum(
    job.machineIds
      .map((id) => allMachines.find((m) => m.id === id)?.dayCost ?? 0)
      .map(Number),
  )
  const perDay = laborPerDay + machinesPerDay
  const labor = laborPerDay * days
  const machines = machinesPerDay * days
  const running = labor + machines
  const e = job.extraCosts
  const extras = sum([e.dyes, e.chemicals, e.energy, e.other, e.labor, e.machines])
  const total = running + extras
  const revenue = (job.quantityKg || 0) * (job.pricePerKg || 0)
  const margin = revenue - total
  return {
    perDay,
    labor,
    machines,
    running,
    extras,
    total,
    revenue,
    margin,
    marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
    costPerKg: job.quantityKg > 0 ? total / job.quantityKg : 0,
  }
}

/* -------------------------------------------------------------- samples */

/** grams of a dye on a swatch, from percent on weight of fabric */
export const owfGrams = (percent: number, fabricWeightG: number): number =>
  ((percent || 0) / 100) * (fabricWeightG || 0)

/**
 * Grams of dye for a full batch, written the way it is worked out on the
 * calculator in the lab: percent on weight of fabric, times kilograms, times 10.
 *
 * A 2.2% shade on 46 kg is 2.2 x 46 x 10 = 1012 g. The 10 is the constant that
 * turns a percentage of kilograms into grams, not the litres of water per kilo,
 * even though both happen to be 10 here.
 */
export const owfBatchGrams = (percent: number, batchKg: number): number =>
  (percent || 0) * (batchKg || 0) * 10

/** Grams of a chemical dosed at a concentration in the bath. */
export const gPerLGrams = (gPerL: number, litres: number): number =>
  (gPerL || 0) * (litres || 0)

export const mlToL = (ml: number): number => (ml || 0) / 1000

/** Total water in the machine for a batch, litres. */
export const batchLitres = (batchKg: number, litresPerKg: number): number =>
  (batchKg || 0) * (litresPerKg || 0)

export interface ScaledLine {
  label: string
  hex?: string
  /** what goes in the steel bottle, grams */
  lab: number
  /** what goes in the machine, grams */
  batch: number
  /** how the amount was arrived at, shown so it can be checked by hand */
  how: string
}

export interface ScaledRecipe {
  /** litres of water in the machine */
  litres: number
  dyes: ScaledLine[]
  chemicals: ScaledLine[]
  totalDyeLab: number
  totalDyeBatch: number
}

/**
 * Turns the lab sheet into the amounts to carry down to the machine.
 *
 * Dyes are on weight of fabric, so they scale with the kilograms.
 * A chemical follows whichever basis its row is set to: on weight of fabric it
 * scales with the kilograms too, as grams per litre it scales with the litres
 * of water instead. Those are different rules and mixing them up is the mistake
 * this function exists to prevent, so the basis is never assumed here.
 */
export function scaleRecipe(
  sample: Sample,
  batchKg: number,
  litresPerKg: number,
  db: Pick<DB, 'dyes'>,
): ScaledRecipe {
  const labG = sample.fabricWeightG || 10
  const labL = mlToL(sample.waterMl)
  const litres = batchLitres(batchKg, litresPerKg)

  const dyes: ScaledLine[] = sample.dyes.map((d) => {
    const dye = db.dyes.find((x) => x.id === d.dyeId)
    const percent = d.percent || 0
    return {
      label: dye ? [dye.code, dye.name].filter(Boolean).join(' ') : '-',
      hex: dye?.colorHex,
      lab: d.grams || owfGrams(percent, labG),
      batch: owfBatchGrams(percent, batchKg),
      how: `${num(percent, 3)} x ${num(batchKg, 2)} x 10`,
    }
  })

  const chem = (
    label: string,
    amount: number,
    basis: 'gPerL' | 'owf',
  ): ScaledLine => {
    if (basis === 'owf') {
      return {
        label,
        lab: owfGrams(amount, labG),
        batch: owfBatchGrams(amount, batchKg),
        how: `${num(amount, 3)} x ${num(batchKg, 2)} x 10`,
      }
    }
    return {
      label,
      lab: gPerLGrams(amount, labL),
      batch: gPerLGrams(amount, litres),
      how: `${num(amount, 3)} g/L x ${num(litres, 1)} L`,
    }
  }

  const chemicals: ScaledLine[] = [
    chem('acid', sample.acid, sample.acidBasis),
    ...(sample.carrier > 0
      ? [chem('carrier', sample.carrier, sample.carrierBasis)]
      : []),
    ...(sample.antiCrease > 0
      ? [chem('antiCrease', sample.antiCrease, sample.antiCreaseBasis)]
      : []),
  ]

  return {
    litres,
    dyes,
    chemicals,
    totalDyeLab: sum(dyes.map((l) => l.lab)),
    totalDyeBatch: sum(dyes.map((l) => l.batch)),
  }
}

export function sampleCost(sample: Sample, dyes: DB['dyes']): number {
  return sum(
    sample.dyes.map((d) => {
      const dye = dyes.find((x) => x.id === d.dyeId)
      if (!dye) return 0
      const grams = d.grams || owfGrams(d.percent, sample.fabricWeightG)
      return (grams / 1000) * (dye.costPerKg || 0)
    }),
  )
}

/* ----------------------------------------------------------- cash flows */

export const inRange = (date: string, from: string, to: string): boolean =>
  (!from || date >= from) && (!to || date <= to)

export interface CashSummary {
  in: number
  out: number
  net: number
}

export function cashSummary(
  txs: Transaction[],
  from = '',
  to = '',
): CashSummary {
  const scoped = txs.filter((t) => inRange(t.date, from, to))
  const cashIn = sum(scoped.filter((t) => t.direction === 'in').map((t) => t.amount))
  const cashOut = sum(scoped.filter((t) => t.direction === 'out').map((t) => t.amount))
  return { in: cashIn, out: cashOut, net: cashIn - cashOut }
}

export const monthStart = (d = new Date()): string =>
  isoDate(new Date(d.getFullYear(), d.getMonth(), 1))

export const monthEnd = (d = new Date()): string =>
  isoDate(new Date(d.getFullYear(), d.getMonth() + 1, 0))

export const yearStart = (d = new Date()): string =>
  isoDate(new Date(d.getFullYear(), 0, 1))
