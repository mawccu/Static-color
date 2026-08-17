/**
 * Static Color - domain model
 *
 * Every record carries `id` and `createdAt`. Ids are generated locally so the
 * same objects can later be pushed to a real backend without reshaping.
 */

export type Id = string

export interface Base {
  id: Id
  createdAt: string
}

/* ------------------------------------------------------------------ dyes */

export type DyeFamily =
  | 'reactive'
  | 'disperse'
  | 'acid'
  | 'vat'
  | 'direct'
  | 'basic'
  | 'sulphur'
  | 'pigment'
  | 'other'

export interface Dye extends Base {
  code: string
  name: string
  nameAr: string
  family: DyeFamily
  colorHex: string
  supplier: string
  costPerKg: number
  stockKg: number
  notes: string
}

/* ---------------------------------------------------------- chemicals */

export type ChemicalKind = 'acid' | 'carrier' | 'antiCrease' | 'softener' | 'other'

export interface Chemical extends Base {
  code: string
  name: string
  nameAr: string
  kind: ChemicalKind
  costPerKg: number
  stockKg: number
  notes: string
}

/* ------------------------------------------------------------ machines */

export type MachineKind =
  | 'washer'
  | 'dryer'
  | 'press'
  | 'iron'
  | 'boiler'
  | 'sample'

export type MachineSize = 'small' | 'medium' | 'large'
export type MachineStatus = 'idle' | 'running' | 'maintenance'

export interface Machine extends Base {
  name: string
  nameAr: string
  kind: MachineKind
  size?: MachineSize
  capacityKg?: number
  rpm?: number
  /** cost of running this machine for one full working day, in JD */
  dayCost: number
  status: MachineStatus
  notes: string
}

/* ---------------------------------------------------------- wash types */

export interface WashType extends Base {
  code: string
  name: string
  nameAr: string
  /** which machine size this wash is normally run on */
  machineSize: MachineSize | 'any'
  tempC: number
  durationMin: number
  /** liquor ratio, e.g. 10 means 1:10 fabric to water */
  liquorRatio: number
  steps: string
  notes: string
}

/* -------------------------------------------------------------- fabric */

export interface Fabric extends Base {
  code: string
  name: string
  nameAr: string
  composition: string
  gsm: number
  widthCm: number
  /** lab measurement: how many meters one kilogram of this fabric gives */
  metersPerKg: number
  /** yarn count, higher = finer thread = better quality */
  yarnCount: number
  stockKg: number
  notes: string
}

/* ------------------------------------------------------------- clients */

export interface Client extends Base {
  name: string
  nameAr: string
  phone: string
  email: string
  address: string
  taxNo: string
  openingBalance: number
  notes: string
}

/* -------------------------------------------------------------- samples */

export type SampleStatus = 'draft' | 'running' | 'done' | 'approved' | 'rejected'

export interface SampleDye {
  dyeId: Id
  /** percent on weight of fabric (o.w.f.) */
  percent: number
  grams: number
}

export interface Sample extends Base {
  code: string
  date: string
  clientId: Id | null
  fabricId: Id | null
  targetName: string
  targetHex: string
  /** weight of the cut swatch, grams. Standard is 10 g. */
  fabricWeightG: number
  dyes: SampleDye[]
  acid: number
  carrier: number
  antiCrease: number
  waterMl: number
  liquorRatio: number
  machineId: Id | null
  tempC: number
  timeMin: number
  status: SampleStatus
  resultHex: string
  matched: boolean
  /** ids of the procedure steps ticked off */
  stepsDone: number[]
  repeatOf: Id | null
  notes: string
}

/* ----------------------------------------------------------------- jobs */

export type JobStatus =
  | 'planned'
  | 'running'
  | 'done'
  | 'delivered'
  | 'cancelled'

export interface JobCosts {
  labor: number
  machines: number
  dyes: number
  chemicals: number
  energy: number
  other: number
}

export interface Job extends Base {
  code: string
  clientId: Id | null
  fabricId: Id | null
  sampleId: Id | null
  washTypeId: Id | null
  description: string
  quantityKg: number
  startDate: string
  endDate: string
  status: JobStatus
  machineIds: Id[]
  workers: number
  days: number
  /** agreed selling price per kg, JD */
  pricePerKg: number
  /** manual additions on top of the calculated running cost */
  extraCosts: JobCosts
  notes: string
}

/* ----------------------------------------------------------- accounting */

export type TxDirection = 'in' | 'out'
export type PayMethod = 'cash' | 'bank' | 'cheque'

export type TxCategory =
  | 'sales'
  | 'advance'
  | 'other-income'
  | 'dyes'
  | 'chemicals'
  | 'salaries'
  | 'fuel'
  | 'electricity'
  | 'water'
  | 'maintenance'
  | 'rent'
  | 'transport'
  | 'other-expense'

export interface Transaction extends Base {
  date: string
  direction: TxDirection
  category: TxCategory
  amount: number
  method: PayMethod
  clientId: Id | null
  jobId: Id | null
  invoiceId: Id | null
  reference: string
  notes: string
}

export interface DocLine {
  description: string
  qty: number
  unit: string
  unitPrice: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'void'

export interface Invoice extends Base {
  number: string
  clientId: Id | null
  jobId: Id | null
  date: string
  dueDate: string
  lines: DocLine[]
  taxPct: number
  discount: number
  status: InvoiceStatus
  notes: string
}

export type EstimateStatus = 'draft' | 'sent' | 'accepted' | 'rejected'

export interface Estimate extends Base {
  number: string
  clientId: Id | null
  date: string
  validUntil: string
  lines: DocLine[]
  taxPct: number
  discount: number
  status: EstimateStatus
  convertedInvoiceId: Id | null
  notes: string
}

/* ------------------------------------------------------------- quality */

export type NepLevel = 'none' | 'few' | 'many'

export interface QualityCheck extends Base {
  date: string
  jobId: Id | null
  sampleId: Id | null
  fabricId: Id | null
  neps: NepLevel
  yarnCount: number
  /** 1 to 5 */
  uniformity: number
  handFeel: number
  colorFastness: number
  verdict: 'pass' | 'hold' | 'fail'
  notes: string
}

/* ------------------------------------------------------------ settings */

export type Lang = 'ar' | 'en'

export interface Settings {
  companyName: string
  companyNameAr: string
  phone: string
  address: string
  taxNo: string
  currency: string
  lang: Lang
  /** cost of one worker for one full day, JD */
  workerDayRate: number
  /** default tax percent used on new invoices */
  taxPct: number
  /** default acid amount on a 10 g sample */
  defaultAcid: number
  defaultCarrier: number
  defaultAntiCrease: number
}

/* ------------------------------------------------------------ database */

export interface DB {
  settings: Settings
  dyes: Dye[]
  chemicals: Chemical[]
  machines: Machine[]
  washTypes: WashType[]
  fabrics: Fabric[]
  clients: Client[]
  samples: Sample[]
  jobs: Job[]
  transactions: Transaction[]
  invoices: Invoice[]
  estimates: Estimate[]
  quality: QualityCheck[]
}

export type Collection = Exclude<keyof DB, 'settings'>
