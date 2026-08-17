import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { useT } from '../i18n'

/* --------------------------------------------------------------- layout */

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2 no-print">{children}</div>
    </div>
  )
}

export function Card({
  children,
  className = '',
  pad = true,
}: {
  children: ReactNode
  className?: string
  pad?: boolean
}) {
  return (
    <div className={`card ${pad ? 'card-pad' : ''} ${className}`}>{children}</div>
  )
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode
  hint?: string
}) {
  return (
    <div className="mb-3">
      <h2 className="text-sm font-bold uppercase tracking-wide text-ink-600">
        {children}
      </h2>
      {hint && <p className="mt-0.5 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

/* ---------------------------------------------------------------- stats */

const toneMap: Record<string, string> = {
  neutral: 'text-ink-900',
  good: 'text-brand-700',
  bad: 'text-red-600',
  warn: 'text-accent-600',
}

export function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
  icon,
}: {
  label: string
  value: string
  hint?: string
  tone?: keyof typeof toneMap
  icon?: ReactNode
}) {
  return (
    <div className="card card-pad">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          {label}
        </p>
        {icon && <span className="text-ink-300">{icon}</span>}
      </div>
      <p className={`num mt-2 text-2xl font-bold ${toneMap[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

/* ---------------------------------------------------------------- forms */

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label?: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label && <label className="label">{label}</label>}
      {children}
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </div>
  )
}

export function Grid({
  children,
  cols = 2,
}: {
  children: ReactNode
  cols?: 1 | 2 | 3 | 4
}) {
  const map = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  }
  return <div className={`grid gap-4 ${map[cols]}`}>{children}</div>
}

/* --------------------------------------------------------------- badges */

const badgeTones: Record<string, string> = {
  gray: 'bg-ink-100 text-ink-600',
  green: 'bg-brand-100 text-brand-800',
  blue: 'bg-sky-100 text-sky-800',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-violet-100 text-violet-800',
}

export function Badge({
  children,
  tone = 'gray',
}: {
  children: ReactNode
  tone?: keyof typeof badgeTones
}) {
  return <span className={`chip ${badgeTones[tone]}`}>{children}</span>
}

export function Swatch({ hex, size = 28 }: { hex: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-md border border-ink-200 shadow-inner"
      style={{ width: size, height: size, background: hex || '#ffffff' }}
      title={hex}
    />
  )
}

/* ---------------------------------------------------------------- modal */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  wide = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/40 p-4 backdrop-blur-[2px]">
      <div
        className={`card my-8 w-full ${wide ? 'max-w-4xl' : 'max-w-2xl'} shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3.5">
          <h3 className="text-base font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} className="btn-quiet btn-sm" aria-label="close">
            <Icon name="x" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-ink-100 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- empty */

export function Empty({ label, hint }: { label?: string; hint?: string }) {
  const { t } = useT()
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-4 py-14 text-center">
      <div className="mb-2 rounded-full bg-ink-100 p-3 text-ink-300">
        <Icon name="inbox" size={22} />
      </div>
      <p className="text-sm font-semibold text-ink-600">{label ?? t('c.empty')}</p>
      <p className="text-xs text-ink-400">{hint ?? t('c.emptyHint')}</p>
    </div>
  )
}

/* --------------------------------------------------------------- search */

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const { t } = useT()
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-ink-300">
        <Icon name="search" size={16} />
      </span>
      <input
        className="input ps-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? t('c.search')}
      />
    </div>
  )
}

/* -------------------------------------------------------- delete button */

/** Two step delete so no browser dialog is ever needed. */
export function DeleteButton({
  onConfirm,
  small = true,
}: {
  onConfirm: () => void
  small?: boolean
}) {
  const { t } = useT()
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(id)
  }, [armed])

  if (armed) {
    return (
      <button
        className={`btn-danger ${small ? 'btn-sm' : ''}`}
        onClick={() => {
          setArmed(false)
          onConfirm()
        }}
      >
        {t('c.confirmDelete')}
      </button>
    )
  }
  return (
    <button
      className={`btn-quiet ${small ? 'btn-sm' : ''}`}
      onClick={() => setArmed(true)}
      title={t('c.delete')}
    >
      <Icon name="trash" size={15} />
    </button>
  )
}

export function IconButton({
  icon,
  ...rest
}: { icon: IconName } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`btn-quiet btn-sm ${rest.className ?? ''}`}>
      <Icon name={icon} size={15} />
    </button>
  )
}

/* ---------------------------------------------------------------- icons */

const paths = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm9 0h7v-9h-7v9Zm0-16v5h7V4h-7Z',
  job: 'M4 7h16M4 12h16M4 17h10',
  flask: 'M9 3h6M10 3v6L5 19a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 19l-5-10V3',
  dye: 'M12 3s6 6.4 6 10a6 6 0 1 1-12 0c0-3.6 6-10 6-10Z',
  chem: 'M6 3h12M8 3v5l-4 8a3 3 0 0 0 2.7 4.5h10.6A3 3 0 0 0 20 16l-4-8V3',
  wash: 'M4 4h16v16H4zM8 8h.01M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  machine: 'M4 5h16v14H4zM8 9h8M8 13h5',
  fabric: 'M3 6h18v12H3zM7 6v12M12 6v12M17 6v12',
  users: 'M16 20v-2a4 4 0 0 0-8 0v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  doc: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5',
  cash: 'M3 7h18v10H3zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  check: 'M20 6 9 17l-5-5',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z',
  plus: 'M12 5v14M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5 5h14l3 7v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-6l3-7Z',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5h20v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  arrowDown: 'M12 5v14M19 12l-7 7-7-7',
  copy: 'M9 9h10v12H9zM5 15H3V3h12v2',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z',
  download: 'M12 3v12M7 10l5 5 5-5M4 21h16',
  upload: 'M12 21V9M7 14l5-5 5 5M4 3h16',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.7 3.8 5.8 3.8 9S14.5 18.3 12 21c-2.5-2.7-3.8-5.8-3.8-9S9.5 5.7 12 3Z',
  alert: 'M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
} as const

export type IconName = keyof typeof paths

export function Icon({
  name,
  size = 18,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  )
}
