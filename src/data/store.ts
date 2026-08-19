import type { Collection, DB, Settings } from './types'
import { desktop } from './desktop'

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
  acidAmount: 2,
  acidBasis: 'gPerL',
  defaultCarrier: 0,
  defaultAntiCrease: 0,
  sampleFabricG: 10,
  sampleWaterMl: 250,
  litresPerKg: 10,
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
    mk('ANT', 'Anti break', 'مضاد تكسر', 'antiCrease'),
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

const n = (v: unknown, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback

/**
 * Fill in anything a later version of the app added, at collection level and
 * at row level, so older saved data never surfaces as undefined or NaN.
 */
const migrate = (raw: Partial<DB>): DB => {
  const base = emptyDB()
  const db: DB = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...(raw.settings ?? {}) },
  }

  db.dyes = db.dyes.map((d) => ({
    ...d,
    category: d.category ?? '',
    hasBulk: d.hasBulk ?? true,
  }))

  db.fabrics = db.fabrics.map((f) => ({
    ...f,
    defaultTempC: n(f.defaultTempC, 130),
    defaultTimeMin: n(f.defaultTimeMin, 45),
    litresPerKg: n(f.litresPerKg, db.settings.litresPerKg),
    waterUnit: f.waterUnit ?? 'lPerKg',
    needsCarrier:
      f.needsCarrier ?? /poly|بولي/i.test(f.composition ?? ''),
  }))

  // the acid field has been through two shapes; carry whichever is present
  db.samples = db.samples.map((s) => {
    const prev = s as unknown as { acidGPerL?: number }
    return {
      ...s,
      acid: n(s.acid, n(prev.acidGPerL, db.settings.acidAmount)),
      acidBasis: s.acidBasis ?? db.settings.acidBasis,
      waterMl: n(s.waterMl, db.settings.sampleWaterMl),
      carrierBasis: s.carrierBasis ?? 'gPerL',
      antiCreaseBasis: s.antiCreaseBasis ?? 'gPerL',
      trials: (s.trials ?? []).map((tr) => ({
        ...tr,
        acid: n(tr.acid, 0),
        acidBasis: tr.acidBasis ?? 'gPerL',
      })),
    }
  })

  return db
}

/**
 * On the desktop build the data lives in a JSON file the user can copy.
 * In a browser it falls back to localStorage. Same shape either way.
 */
export const loadDB = (): DB => {
  try {
    const raw = desktop()?.read() ?? localStorage.getItem(KEY)
    if (!raw) return emptyDB()
    return migrate(JSON.parse(raw) as Partial<DB>)
  } catch {
    return emptyDB()
  }
}

export const saveDB = (db: DB): void => {
  const json = JSON.stringify(db)
  try {
    const bridge = desktop()
    if (bridge) bridge.write(json)
    else localStorage.setItem(KEY, json)
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
