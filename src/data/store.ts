import type { Collection, DB, Settings } from './types'

const KEY = 'static-color-db-v1'

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

/**
 * Local calendar date as YYYY-MM-DD.
 * toISOString() would convert to UTC first, which shifts the day by one
 * for anyone east of Greenwich. Jordan is UTC+3, so that matters here.
 */
export const isoDate = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`

export const today = (): string => isoDate()

export const defaultSettings: Settings = {
  companyName: 'Static Color',
  companyNameAr: 'ستاتيك كلر',
  phone: '',
  address: '',
  taxNo: '',
  currency: 'JD',
  lang: 'ar',
  workerDayRate: 20,
  taxPct: 16,
  defaultAcid: 0.25,
  defaultCarrier: 0.25,
  defaultAntiCrease: 0.25,
}

/**
 * The machines that already exist on the floor. Seeded once so the app is
 * usable on first open; everything else starts empty and gets filled in
 * as the real lists are entered.
 */
const seedMachines = (): DB['machines'] => {
  const stamp = new Date().toISOString()
  const mk = (
    name: string,
    nameAr: string,
    kind: DB['machines'][number]['kind'],
    extra: Partial<DB['machines'][number]> = {},
  ): DB['machines'][number] => ({
    id: uid(),
    createdAt: stamp,
    name,
    nameAr,
    kind,
    dayCost: 0,
    status: 'idle',
    notes: '',
    ...extra,
  })

  return [
    mk('Washing machine - small', 'غسالة صغيرة', 'washer', { size: 'small' }),
    mk('Washing machine - medium', 'غسالة وسط', 'washer', { size: 'medium' }),
    mk('Washing machine - large', 'غسالة كبيرة', 'washer', { size: 'large' }),
    mk('Dryer', 'نشافة', 'dryer'),
    mk('Clothes press', 'مكبس', 'press', { rpm: 1800 }),
    mk('Ironing machine', 'مكواة', 'iron', { size: 'small' }),
    mk('Boiler', 'بويلر', 'boiler'),
    mk('Samples machine', 'جهاز العينات', 'sample'),
  ]
}

const seedChemicals = (): DB['chemicals'] => {
  const stamp = new Date().toISOString()
  const mk = (
    code: string,
    name: string,
    nameAr: string,
    kind: DB['chemicals'][number]['kind'],
  ): DB['chemicals'][number] => ({
    id: uid(),
    createdAt: stamp,
    code,
    name,
    nameAr,
    kind,
    costPerKg: 0,
    stockKg: 0,
    notes: '',
  })

  return [
    mk('ACD', 'Acid', 'حامض', 'acid'),
    mk('CAR', 'Carrier', 'كاريير', 'carrier'),
    mk('ANT', 'Anti crease', 'مضاد التجعد', 'antiCrease'),
  ]
}

export const emptyDB = (): DB => ({
  settings: { ...defaultSettings },
  dyes: [],
  chemicals: seedChemicals(),
  machines: seedMachines(),
  washTypes: [],
  fabrics: [],
  clients: [],
  samples: [],
  jobs: [],
  transactions: [],
  invoices: [],
  estimates: [],
  quality: [],
})

/** Fill in any collection added by a later version of the app. */
const migrate = (raw: Partial<DB>): DB => {
  const base = emptyDB()
  return {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
  }
}

export const loadDB = (): DB => {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyDB()
    return migrate(JSON.parse(raw) as Partial<DB>)
  } catch {
    return emptyDB()
  }
}

export const saveDB = (db: DB): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch (err) {
    console.error('[static-color] could not save', err)
  }
}

/** Sequential document numbers, e.g. INV-0007, SMP-0031. */
export const nextCode = (prefix: string, existing: string[]): string => {
  const nums = existing
    .map((c) => Number(c.split('-').pop()))
    .filter((n) => Number.isFinite(n)) as number[]
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}

export type { Collection }
