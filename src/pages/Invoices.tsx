import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { nextCode, today, uid } from '../data/store'
import type { Invoice, InvoiceStatus } from '../data/types'
import { num, useMoney, useT } from '../i18n'
import {
  Badge,
  Card,
  DeleteButton,
  Empty,
  Field,
  Grid,
  Icon,
  IconButton,
  Modal,
  PageHeader,
  SearchInput,
} from '../ui'
import DocLines from '../ui/DocLines'
import { toNum, useEditor } from '../ui/useEditor'
import { docTotals, invoicePaid, invoiceTotal } from '../lib/calc'

const statuses: InvoiceStatus[] = ['draft', 'sent', 'partial', 'paid', 'void']

const statusTone: Record<InvoiceStatus, 'gray' | 'blue' | 'amber' | 'green' | 'red'> = {
  draft: 'gray',
  sent: 'blue',
  partial: 'amber',
  paid: 'green',
  void: 'red',
}

export default function Invoices() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const [q, setQ] = useState('')
  const [viewing, setViewing] = useState<Invoice | null>(null)
  const [paying, setPaying] = useState<Invoice | null>(null)
  const [payAmount, setPayAmount] = useState(0)

  const blank = (): Invoice => ({
    id: '',
    createdAt: today(),
    number: nextCode('INV', db.invoices.map((i) => i.number)),
    clientId: null,
    jobId: null,
    date: today(),
    dueDate: '',
    lines: [],
    taxPct: db.settings.taxPct,
    discount: 0,
    status: 'draft',
    notes: '',
  })

  const ed = useEditor<Invoice>(blank)
  const d = ed.draft

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.invoices
      .filter((i) => {
        if (!needle) return true
        const client = db.clients.find((c) => c.id === i.clientId)
        return [i.number, client?.name, client?.nameAr]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.number.localeCompare(a.number))
  }, [db.invoices, db.clients, q])

  const save = () => {
    if (!d) return
    if (d.id) update('invoices', d.id, d)
    else add('invoices', { ...d, id: uid() })
    ed.close()
  }

  const recordPayment = () => {
    if (!paying || payAmount <= 0) return
    add('transactions', {
      date: today(),
      direction: 'in',
      category: 'sales',
      amount: payAmount,
      method: 'cash',
      clientId: paying.clientId,
      jobId: paying.jobId,
      invoiceId: paying.id,
      reference: paying.number,
      notes: '',
    })
    const total = invoiceTotal(paying)
    const paid = invoicePaid(paying.id, db.transactions) + payAmount
    update('invoices', paying.id, {
      status: paid + 0.001 >= total ? 'paid' : 'partial',
    })
    setPaying(null)
    setPayAmount(0)
  }

  const openPay = (inv: Invoice) => {
    setPaying(inv)
    setPayAmount(
      Math.max(0, invoiceTotal(inv) - invoicePaid(inv.id, db.transactions)),
    )
  }

  const company = pick(db.settings.companyName, db.settings.companyNameAr)

  return (
    <>
      <PageHeader title={t('inv.title')} subtitle={`${db.invoices.length}`}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('inv.new')}
        </button>
      </PageHeader>

      <Card pad={false}>
        <div className="border-b border-ink-100 p-3">
          <SearchInput value={q} onChange={setQ} />
        </div>

        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('inv.number')}</th>
                  <th>{t('c.date')}</th>
                  <th>{t('c.client')}</th>
                  <th className="text-end">{t('c.total')}</th>
                  <th className="text-end">{t('inv.paid')}</th>
                  <th className="text-end">{t('inv.remaining')}</th>
                  <th>{t('c.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => {
                  const client = db.clients.find((c) => c.id === i.clientId)
                  const total = invoiceTotal(i)
                  const paid = invoicePaid(i.id, db.transactions)
                  return (
                    <tr key={i.id}>
                      <td className="num font-semibold">{i.number}</td>
                      <td className="num text-ink-500">{i.date}</td>
                      <td>{client ? pick(client.name, client.nameAr) : '-'}</td>
                      <td className="num text-end">{money(total)}</td>
                      <td className="num text-end text-brand-700">{money(paid)}</td>
                      <td className="num text-end font-semibold">
                        {money(Math.max(0, total - paid))}
                      </td>
                      <td>
                        <Badge tone={statusTone[i.status]}>
                          {t(`istatus.${i.status}`)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconButton
                            icon="cash"
                            title={t('inv.recordPayment')}
                            onClick={() => openPay(i)}
                          />
                          <IconButton
                            icon="eye"
                            title={t('c.view')}
                            onClick={() => setViewing(i)}
                          />
                          <IconButton icon="edit" onClick={() => ed.openEdit(i)} />
                          <DeleteButton onConfirm={() => remove('invoices', i.id)} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* --------------------------------------------------- editor */}
      <Modal
        open={ed.open}
        onClose={ed.close}
        wide
        title={ed.isNew ? t('inv.new') : `${t('c.edit')} ${d?.number ?? ''}`}
        footer={
          <>
            <button className="btn-ghost" onClick={ed.close}>
              {t('c.cancel')}
            </button>
            <button className="btn-primary" onClick={save}>
              {t('c.save')}
            </button>
          </>
        }
      >
        {d && (
          <div className="space-y-5">
            <Grid cols={3}>
              <Field label={t('inv.number')}>
                <input
                  className="input num"
                  value={d.number}
                  onChange={(e) => ed.set('number', e.target.value)}
                />
              </Field>
              <Field label={t('c.date')}>
                <input
                  type="date"
                  className="input num"
                  value={d.date}
                  onChange={(e) => ed.set('date', e.target.value)}
                />
              </Field>
              <Field label={t('inv.dueDate')}>
                <input
                  type="date"
                  className="input num"
                  value={d.dueDate}
                  onChange={(e) => ed.set('dueDate', e.target.value)}
                />
              </Field>
              <Field label={t('c.client')}>
                <select
                  className="input"
                  value={d.clientId ?? ''}
                  onChange={(e) => ed.set('clientId', e.target.value || null)}
                >
                  <option value="">{t('c.none')}</option>
                  {db.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {pick(c.name, c.nameAr)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('c.job')}>
                <select
                  className="input"
                  value={d.jobId ?? ''}
                  onChange={(e) => {
                    const jobId = e.target.value || null
                    const job = db.jobs.find((j) => j.id === jobId)
                    ed.setDraft({
                      ...d,
                      jobId,
                      clientId: job?.clientId ?? d.clientId,
                      lines:
                        job && d.lines.length === 0
                          ? [
                              {
                                description: job.description || job.code,
                                qty: job.quantityKg,
                                unit: 'kg',
                                unitPrice: job.pricePerKg,
                              },
                            ]
                          : d.lines,
                    })
                  }}
                >
                  <option value="">{t('c.none')}</option>
                  {db.jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.code} {j.description}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('c.status')}>
                <select
                  className="input"
                  value={d.status}
                  onChange={(e) => ed.set('status', e.target.value as InvoiceStatus)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {t(`istatus.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>

            <DocLines
              lines={d.lines}
              taxPct={d.taxPct}
              discount={d.discount}
              onChange={(lines) => ed.set('lines', lines)}
              onTax={(v) => ed.set('taxPct', v)}
              onDiscount={(v) => ed.set('discount', v)}
            />

            <Field label={t('c.notes')}>
              <textarea
                className="input"
                value={d.notes}
                onChange={(e) => ed.set('notes', e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* -------------------------------------------------- payment */}
      <Modal
        open={!!paying}
        onClose={() => setPaying(null)}
        title={t('inv.recordPayment')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setPaying(null)}>
              {t('c.cancel')}
            </button>
            <button className="btn-primary" onClick={recordPayment}>
              {t('c.save')}
            </button>
          </>
        }
      >
        {paying && (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              {paying.number} / {money(invoiceTotal(paying))}
            </p>
            <Field label={t('c.amount')}>
              <input
                type="number"
                step="0.01"
                className="input num"
                value={payAmount}
                onChange={(e) => setPayAmount(toNum(e.target.value))}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* ----------------------------------------------- print view */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        wide
        title={viewing?.number ?? ''}
        footer={
          <button className="btn-ghost" onClick={() => window.print()}>
            <Icon name="print" size={15} />
            {t('c.print')}
          </button>
        }
      >
        {viewing && (
          <div className="space-y-6">
            <div className="flex justify-between gap-6">
              <div>
                <p className="text-lg font-bold">{company}</p>
                <p className="text-xs text-ink-500">{db.settings.address}</p>
                <p className="num text-xs text-ink-500">{db.settings.phone}</p>
                {db.settings.taxNo && (
                  <p className="num text-xs text-ink-500">
                    {t('c.taxNo')}: {db.settings.taxNo}
                  </p>
                )}
              </div>
              <div className="text-end">
                <p className="num text-lg font-bold">{viewing.number}</p>
                <p className="num text-xs text-ink-500">{viewing.date}</p>
                {viewing.dueDate && (
                  <p className="num text-xs text-ink-500">
                    {t('inv.dueDate')}: {viewing.dueDate}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-ink-50 p-3">
              <p className="label mb-0.5">{t('c.client')}</p>
              {(() => {
                const c = db.clients.find((x) => x.id === viewing.clientId)
                return c ? (
                  <>
                    <p className="font-semibold">{pick(c.name, c.nameAr)}</p>
                    <p className="text-xs text-ink-500">{c.address}</p>
                    <p className="num text-xs text-ink-500">{c.phone}</p>
                  </>
                ) : (
                  <p className="text-ink-400">-</p>
                )
              })()}
            </div>

            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('c.description')}</th>
                  <th className="text-end">{t('c.qty')}</th>
                  <th>{t('c.unit')}</th>
                  <th className="text-end">{t('c.price')}</th>
                  <th className="text-end">{t('c.total')}</th>
                </tr>
              </thead>
              <tbody>
                {viewing.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.description}</td>
                    <td className="num text-end">{num(l.qty)}</td>
                    <td>{l.unit}</td>
                    <td className="num text-end">{num(l.unitPrice)}</td>
                    <td className="num text-end">{num(l.qty * l.unitPrice)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {(() => {
              const tt = docTotals(viewing.lines, viewing.taxPct, viewing.discount)
              const paid = invoicePaid(viewing.id, db.transactions)
              return (
                <div className="ms-auto w-full max-w-xs space-y-1 text-sm">
                  <PrintRow label={t('c.subtotal')} value={money(tt.subtotal)} />
                  {tt.discount > 0 && (
                    <PrintRow
                      label={t('c.discount')}
                      value={`- ${money(tt.discount)}`}
                    />
                  )}
                  <PrintRow
                    label={`${t('c.tax')} ${num(viewing.taxPct, 1)}%`}
                    value={money(tt.taxAmount)}
                  />
                  <div className="border-t border-ink-300 pt-1">
                    <PrintRow label={t('c.total')} value={money(tt.total)} strong />
                  </div>
                  {paid > 0 && (
                    <>
                      <PrintRow label={t('inv.paid')} value={money(paid)} />
                      <PrintRow
                        label={t('inv.remaining')}
                        value={money(Math.max(0, tt.total - paid))}
                        strong
                      />
                    </>
                  )}
                </div>
              )
            })()}

            {viewing.notes && (
              <p className="text-xs text-ink-500">{viewing.notes}</p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}

function PrintRow({
  label,
  value,
  strong,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex justify-between">
      <span className="text-ink-500">{label}</span>
      <span className={`num ${strong ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}
