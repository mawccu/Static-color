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

export interface ScaledLine {
  label: string
  hex?: string
  /** amount for the lab swatch, in grams */
  lab: number
  /** amount for the scaled batch, in grams */
  batch: number
}

/**
 * Turns a 10 g lab recipe into the amounts needed for a real batch.
 * Everything scales linearly with fabric weight.
 */
export function scaleRecipe(
  sample: Sample,
  batchKg: number,
  db: Pick<DB, 'dyes'>,
): { factor: number; lines: ScaledLine[]; totalDyeLab: number } {
  const labG = sample.fabricWeightG || 10
  const factor = (batchKg * 1000) / labG
  const lines: ScaledLine[] = sample.dyes.map((d) => {
    const dye = db.dyes.find((x) => x.id === d.dyeId)
    const lab = d.grams || owfGrams(d.percent, labG)
    return {
      label: dye ? `${dye.code} ${dye.name}` : '—',
      hex: dye?.colorHex,
      lab,
      batch: lab * factor,
    }
  })
  return {
    factor,
    lines,
    totalDyeLab: sum(lines.map((l) => l.lab)),
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
