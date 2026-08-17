import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { today, uid } from '../data/store'
import type { PayMethod, Transaction, TxCategory, TxDirection } from '../data/types'
import { useMoney, useT } from '../i18n'
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
  Stat,
} from '../ui'
import { toNum, useEditor } from '../ui/useEditor'
import { cashSummary, inRange, monthStart } from '../lib/calc'

const incomeCats: TxCategory[] = ['sales', 'advance', 'other-income']
const expenseCats: TxCategory[] = [
  'dyes',
  'chemicals',
  'salaries',
  'fuel',
  'electricity',
  'water',
  'maintenance',
  'rent',
  'transport',
  'other-expense',
]
const methods: PayMethod[] = ['cash', 'bank', 'cheque']

export default function CashBook() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const [q, setQ] = useState('')
  const [dir, setDir] = useState<TxDirection | 'all'>('all')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState('')

  const blank = (): Transaction => ({
    id: '',
    createdAt: today(),
    date: today(),
    direction: 'out',
    category: 'other-expense',
    amount: 0,
    method: 'cash',
    clientId: null,
    jobId: null,
    invoiceId: null,
    reference: '',
    notes: '',
  })

  const ed = useEditor<Transaction>(blank)
  const d = ed.draft

  const openNew = (direction: TxDirection) => {
    ed.setDraft({
      ...blank(),
      direction,
      category: direction === 'in' ? 'sales' : 'other-expense',
    })
  }

  const scoped = useMemo(
    () => db.transactions.filter((x) => inRange(x.date, from, to)),
    [db.transactions, from, to],
  )

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return scoped
      .filter((x) => (dir === 'all' ? true : x.direction === dir))
      .filter((x) => {
        if (!needle) return true
        const client = db.clients.find((c) => c.id === x.clientId)
        return [x.reference, x.notes, client?.name, client?.nameAr, t(`cat.${x.category}`)]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
  }, [scoped, db.clients, q, dir, t])

  const totals = cashSummary(scoped)

  const save = () => {
    if (!d) return
    if (d.id) update('transactions', d.id, d)
    else add('transactions', { ...d, id: uid() })
    ed.close()
  }

  const cats = d?.direction === 'in' ? incomeCats : expenseCats

  return (
    <>
      <PageHeader title={t('acc.cashbook')}>
        <button className="btn-ghost" onClick={() => openNew('in')}>
          <Icon name="arrowDown" size={16} />
          {t('acc.newIn')}
        </button>
        <button className="btn-primary" onClick={() => openNew('out')}>
          <Icon name="arrowUp" size={16} />
          {t('acc.newOut')}
        </button>
      </PageHeader>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Stat label={t('acc.totalIn')} value={money(totals.in)} tone="good" />
        <Stat label={t('acc.totalOut')} value={money(totals.out)} tone="bad" />
        <Stat
          label={t('acc.net')}
          value={money(totals.net)}
          tone={totals.net >= 0 ? 'good' : 'bad'}
        />
      </div>

      <Card pad={false}>
        <div className="flex flex-wrap items-end gap-2 border-b border-ink-100 p-3">
          <div className="min-w-48 flex-1">
            <SearchInput value={q} onChange={setQ} />
          </div>
          <Field label={t('c.from')}>
            <input
              type="date"
              className="input num w-auto"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label={t('c.to')}>
            <input
              type="date"
              className="input num w-auto"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
          <select
            className="input w-auto"
            value={dir}
            onChange={(e) => setDir(e.target.value as TxDirection | 'all')}
          >
            <option value="all">{t('c.all')}</option>
            <option value="in">{t('acc.in')}</option>
            <option value="out">{t('acc.out')}</option>
          </select>
        </div>

        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('c.date')}</th>
                  <th>{t('c.category')}</th>
                  <th>{t('c.client')}</th>
                  <th>{t('c.reference')}</th>
                  <th>{t('c.method')}</th>
                  <th className="text-end">{t('acc.in')}</th>
                  <th className="text-end">{t('acc.out')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const client = db.clients.find((c) => c.id === x.clientId)
                  return (
                    <tr key={x.id}>
                      <td className="num text-ink-500">{x.date}</td>
                      <td>
                        <Badge tone={x.direction === 'in' ? 'green' : 'gray'}>
                          {t(`cat.${x.category}`)}
                        </Badge>
                      </td>
                      <td>{client ? pick(client.name, client.nameAr) : '-'}</td>
                      <td className="num text-ink-500">{x.reference || '-'}</td>
                      <td className="text-ink-500">{t(`pay.${x.method}`)}</td>
                      <td className="num text-end text-brand-700">
                        {x.direction === 'in' ? money(x.amount) : ''}
                      </td>
                      <td className="num text-end text-red-600">
                        {x.direction === 'out' ? money(x.amount) : ''}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconButton icon="edit" onClick={() => ed.openEdit(x)} />
                          <DeleteButton
                            onConfirm={() => remove('transactions', x.id)}
                          />
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

      <Modal
        open={ed.open}
        onClose={ed.close}
        title={d?.direction === 'in' ? t('acc.newIn') : t('acc.newOut')}
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
          <div className="space-y-4">
            <div className="flex gap-2">
              {(['in', 'out'] as TxDirection[]).map((x) => (
                <button
                  key={x}
                  onClick={() =>
                    ed.setDraft({
                      ...d,
                      direction: x,
                      category: x === 'in' ? 'sales' : 'other-expense',
                    })
                  }
                  className={`btn flex-1 border ${
                    d.direction === x
                      ? x === 'in'
                        ? 'border-brand-500 bg-brand-50 text-brand-800'
                        : 'border-red-400 bg-red-50 text-red-700'
                      : 'border-ink-200 bg-white text-ink-500'
                  }`}
                >
                  {x === 'in' ? t('acc.newIn') : t('acc.newOut')}
                </button>
              ))}
            </div>

            <Grid cols={2}>
              <Field label={t('c.date')}>
                <input
                  type="date"
                  className="input num"
                  value={d.date}
                  onChange={(e) => ed.set('date', e.target.value)}
                />
              </Field>
              <Field label={t('c.amount')}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={d.amount}
                  onChange={(e) => ed.set('amount', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('c.category')}>
                <select
                  className="input"
                  value={d.category}
                  onChange={(e) => ed.set('category', e.target.value as TxCategory)}
                >
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {t(`cat.${c}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('c.method')}>
                <select
                  className="input"
                  value={d.method}
                  onChange={(e) => ed.set('method', e.target.value as PayMethod)}
                >
                  {methods.map((m) => (
                    <option key={m} value={m}>
                      {t(`pay.${m}`)}
                    </option>
                  ))}
                </select>
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
                  onChange={(e) => ed.set('jobId', e.target.value || null)}
                >
                  <option value="">{t('c.none')}</option>
                  {db.jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.code} {j.description}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>

            <Field label={t('c.reference')}>
              <input
                className="input"
                value={d.reference}
                onChange={(e) => ed.set('reference', e.target.value)}
              />
            </Field>
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
    </>
  )
}
