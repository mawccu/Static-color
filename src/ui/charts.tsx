import { useState } from 'react'
import { useT } from '../i18n'

/**
 * Two categorical series, validated with the palette checker:
 * lightness band, chroma floor, CVD separation, normal vision, contrast - all pass
 * against a light surface. Do not swap these for lighter tints.
 */
export const SERIES = {
  in: '#12a189',
  out: '#d1541f',
} as const

/** Single hue magnitude bars with direct labels. No legend needed. */
export function BarRows({
  rows,
  color = SERIES.in,
  format,
}: {
  rows: { label: string; value: number }[]
  color?: string
  format: (n: number) => string
}) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.value)))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-ink-600">{r.label}</span>
            <span className="num shrink-0 font-semibold text-ink-900">
              {format(r.value)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(Math.abs(r.value) / max) * 100}%`,
                background: color,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Grouped vertical bars for two series over time.
 * Legend is always shown, and a table view carries the same numbers
 * so identity is never colour alone.
 */
export function GroupedBars({
  data,
  labels,
  format,
}: {
  data: { key: string; in: number; out: number }[]
  labels: { in: string; out: string }
  format: (n: number) => string
}) {
  const { t } = useT()
  const [table, setTable] = useState(false)
  const max = Math.max(1, ...data.flatMap((d) => [d.in, d.out]))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4 text-xs font-semibold text-ink-600">
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: SERIES.in }}
            />
            {labels.in}
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ background: SERIES.out }}
            />
            {labels.out}
          </span>
        </div>
        <button className="btn-quiet btn-sm" onClick={() => setTable((v) => !v)}>
          {table ? t('rep.monthly') : t('c.view')}
        </button>
      </div>

      {table ? (
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t('rep.period')}</th>
                <th className="text-end">{labels.in}</th>
                <th className="text-end">{labels.out}</th>
                <th className="text-end">{t('c.profit')}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.key}>
                  <td className="num">{d.key}</td>
                  <td className="num text-end">{format(d.in)}</td>
                  <td className="num text-end">{format(d.out)}</td>
                  <td className="num text-end font-semibold">
                    {format(d.in - d.out)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex h-52 items-end gap-2 overflow-x-auto pb-1" dir="ltr">
          {data.map((d) => (
            <div key={d.key} className="flex min-w-10 flex-1 flex-col items-center">
              <div className="flex h-44 w-full items-end justify-center gap-[2px]">
                <div
                  className="w-1/2 max-w-5 rounded-t transition-all"
                  style={{
                    height: `${Math.max(2, (d.in / max) * 100)}%`,
                    background: SERIES.in,
                  }}
                  title={`${d.key} ${labels.in}: ${format(d.in)}`}
                />
                <div
                  className="w-1/2 max-w-5 rounded-t transition-all"
                  style={{
                    height: `${Math.max(2, (d.out / max) * 100)}%`,
                    background: SERIES.out,
                  }}
                  title={`${d.key} ${labels.out}: ${format(d.out)}`}
                />
              </div>
              <span className="mt-1.5 text-[10px] font-medium text-ink-400">
                {d.key}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
