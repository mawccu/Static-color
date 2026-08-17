import type { DocLine } from '../data/types'
import { num, useMoney, useT } from '../i18n'
import { Field, Icon, IconButton } from '.'
import { docTotals } from '../lib/calc'
import { toNum } from './useEditor'

/** Shared line item editor for invoices and estimates. */
export default function DocLines({
  lines,
  taxPct,
  discount,
  onChange,
  onTax,
  onDiscount,
}: {
  lines: DocLine[]
  taxPct: number
  discount: number
  onChange: (lines: DocLine[]) => void
  onTax: (v: number) => void
  onDiscount: (v: number) => void
}) {
  const { t } = useT()
  const money = useMoney()
  const totals = docTotals(lines, taxPct, discount)

  const setLine = (i: number, patch: Partial<DocLine>) =>
    onChange(lines.map((l, ix) => (ix === i ? { ...l, ...patch } : l)))

  const addLine = () =>
    onChange([...lines, { description: '', qty: 1, unit: 'kg', unitPrice: 0 }])

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="label mb-0">{t('inv.lines')}</p>
        <button className="btn-ghost btn-sm" onClick={addLine}>
          <Icon name="plus" size={14} />
          {t('inv.addLine')}
        </button>
      </div>

      <div className="table-wrap rounded-lg border border-ink-200">
        <table className="tbl">
          <thead>
            <tr>
              <th className="min-w-56">{t('c.description')}</th>
              <th className="w-24 text-end">{t('c.qty')}</th>
              <th className="w-24">{t('c.unit')}</th>
              <th className="w-28 text-end">{t('c.price')}</th>
              <th className="w-28 text-end">{t('c.total')}</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-ink-400">
                  {t('inv.addLine')}
                </td>
              </tr>
            )}
            {lines.map((l, i) => (
              <tr key={i}>
                <td>
                  <input
                    className="input"
                    value={l.description}
                    onChange={(e) => setLine(i, { description: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    className="input num text-end"
                    value={l.qty}
                    onChange={(e) => setLine(i, { qty: toNum(e.target.value) })}
                  />
                </td>
                <td>
                  <input
                    className="input"
                    value={l.unit}
                    onChange={(e) => setLine(i, { unit: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    className="input num text-end"
                    value={l.unitPrice}
                    onChange={(e) => setLine(i, { unitPrice: toNum(e.target.value) })}
                  />
                </td>
                <td className="num text-end font-semibold">
                  {num(l.qty * l.unitPrice)}
                </td>
                <td>
                  <IconButton
                    icon="x"
                    onClick={() => onChange(lines.filter((_, ix) => ix !== i))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_18rem]">
        <div className="grid grid-cols-2 gap-3">
          <Field label={`${t('c.tax')} %`}>
            <input
              type="number"
              step="0.1"
              className="input num"
              value={taxPct}
              onChange={(e) => onTax(toNum(e.target.value))}
            />
          </Field>
          <Field label={t('c.discount')}>
            <input
              type="number"
              step="0.01"
              className="input num"
              value={discount}
              onChange={(e) => onDiscount(toNum(e.target.value))}
            />
          </Field>
        </div>

        <div className="rounded-lg bg-ink-50 p-3 text-sm">
          <Line label={t('c.subtotal')} value={money(totals.subtotal)} />
          {discount > 0 && (
            <Line label={t('c.discount')} value={`- ${money(totals.discount)}`} />
          )}
          <Line label={t('c.tax')} value={money(totals.taxAmount)} />
          <div className="mt-2 border-t border-ink-200 pt-2">
            <Line label={t('c.total')} value={money(totals.total)} strong />
          </div>
        </div>
      </div>
    </div>
  )
}

function Line({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between py-0.5">
      <span className="text-ink-500">{label}</span>
      <span className={`num ${strong ? 'text-base font-bold' : ''}`}>{value}</span>
    </div>
  )
}
