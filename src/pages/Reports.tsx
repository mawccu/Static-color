import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { today } from '../data/store'
import type { TxCategory } from '../data/types'
import { num, useMoney, useT } from '../i18n'
import { Card, Empty, Field, PageHeader, SectionTitle, Stat } from '../ui'
import { BarRows, GroupedBars, SERIES } from '../ui/charts'
import {
  cashSummary,
  clientBalance,
  inRange,
  jobCosting,
  monthEnd,
  monthStart,
  sum,
  yearStart,
} from '../lib/calc'

type Preset = 'month' | 'lastMonth' | 'year' | 'custom'

export default function Reports() {
  const { db } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const [preset, setPreset] = useState<Preset>('month')
  const [from, setFrom] = useState(monthStart())
  const [to, setTo] = useState(monthEnd())

  const applyPreset = (p: Preset) => {
    setPreset(p)
    const now = new Date()
    if (p === 'month') {
      setFrom(monthStart(now))
      setTo(monthEnd(now))
    } else if (p === 'lastMonth') {
      const d = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      setFrom(monthStart(d))
      setTo(monthEnd(d))
    } else if (p === 'year') {
      setFrom(yearStart(now))
      setTo(today())
    }
  }

  const scoped = useMemo(
    () => db.transactions.filter((x) => inRange(x.date, from, to)),
    [db.transactions, from, to],
  )

  const totals = cashSummary(scoped)

  /* income and expense grouped by category */
  const byCategory = useMemo(() => {
    const group = (dir: 'in' | 'out') => {
      const map = new Map<TxCategory, number>()
      scoped
        .filter((x) => x.direction === dir)
        .forEach((x) => map.set(x.category, (map.get(x.category) ?? 0) + x.amount))
      return [...map.entries()]
        .map(([cat, value]) => ({ label: t(`cat.${cat}`), value }))
        .sort((a, b) => b.value - a.value)
    }
    return { income: group('in'), expense: group('out') }
  }, [scoped, t])

  /* last 12 months, whatever the period filter says */
  const monthly = useMemo(() => {
    const now = new Date()
    const out: { key: string; in: number; out: number }[] = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const start = monthStart(d)
      const end = monthEnd(d)
      const s = cashSummary(db.transactions, start, end)
      out.push({
        key: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
          d.getFullYear(),
        ).slice(2)}`,
        in: s.in,
        out: s.out,
      })
    }
    return out
  }, [db.transactions])

  /* revenue per client inside the period */
  const byClient = useMemo(
    () =>
      db.clients
        .map((c) => ({
          label: pick(c.name, c.nameAr),
          value: sum(
            scoped
              .filter((x) => x.clientId === c.id && x.direction === 'in')
              .map((x) => x.amount),
          ),
        }))
        .filter((r) => r.value > 0)
        .sort((a, b) => b.value - a.value)
        .slice(0, 10),
    [db.clients, scoped, pick],
  )

  const jobRows = useMemo(
    () =>
      db.jobs
        .filter((j) => inRange(j.startDate, from, to))
        .map((j) => ({ job: j, c: jobCosting(j, db.machines, db.settings) }))
        .sort((a, b) => b.c.margin - a.c.margin),
    [db.jobs, db.machines, db.settings, from, to],
  )

  const receivables = sum(
    db.clients.map((c) => clientBalance(c, db.invoices, db.transactions).due),
  )

  return (
    <>
      <PageHeader title={t('rep.title')} />

      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['month', 'rep.thisMonth'],
                ['lastMonth', 'rep.lastMonth'],
                ['year', 'rep.thisYear'],
                ['custom', 'rep.custom'],
              ] as [Preset, string][]
            ).map(([p, key]) => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`btn btn-sm border ${
                  preset === p
                    ? 'border-brand-500 bg-brand-50 text-brand-800'
                    : 'border-ink-200 bg-white text-ink-600'
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>
          <Field label={t('c.from')}>
            <input
              type="date"
              className="input num w-auto"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value)
                setPreset('custom')
              }}
            />
          </Field>
          <Field label={t('c.to')}>
            <input
              type="date"
              className="input num w-auto"
              value={to}
              onChange={(e) => {
                setTo(e.target.value)
                setPreset('custom')
              }}
            />
          </Field>
        </div>
      </Card>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t('c.revenue')} value={money(totals.in)} tone="good" />
        <Stat label={t('c.expenses')} value={money(totals.out)} tone="bad" />
        <Stat
          label={t('c.profit')}
          value={money(totals.net)}
          tone={totals.net >= 0 ? 'good' : 'bad'}
        />
        <Stat
          label={t('dash.receivables')}
          value={money(receivables)}
          tone="warn"
          hint={t('cli.due')}
        />
      </div>

      <Card className="mb-4">
        <SectionTitle>{t('rep.monthly')}</SectionTitle>
        <GroupedBars
          data={monthly}
          labels={{ in: t('c.revenue'), out: t('c.expenses') }}
          format={money}
        />
      </Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>{`${t('c.revenue')} - ${t('rep.byCategory')}`}</SectionTitle>
          {byCategory.income.length ? (
            <BarRows rows={byCategory.income} color={SERIES.in} format={money} />
          ) : (
            <Empty />
          )}
        </Card>
        <Card>
          <SectionTitle>{`${t('c.expenses')} - ${t('rep.byCategory')}`}</SectionTitle>
          {byCategory.expense.length ? (
            <BarRows rows={byCategory.expense} color={SERIES.out} format={money} />
          ) : (
            <Empty />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t('rep.byClient')}</SectionTitle>
          {byClient.length ? (
            <BarRows rows={byClient} color={SERIES.in} format={money} />
          ) : (
            <Empty />
          )}
        </Card>

        <Card pad={false}>
          <div className="p-4 pb-0">
            <SectionTitle>{t('rep.jobProfit')}</SectionTitle>
          </div>
          {jobRows.length === 0 ? (
            <Empty />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('c.code')}</th>
                    <th>{t('c.client')}</th>
                    <th className="text-end">{t('job.totalCost')}</th>
                    <th className="text-end">{t('job.revenue')}</th>
                    <th className="text-end">{t('job.margin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {jobRows.map(({ job, c }) => {
                    const client = db.clients.find((x) => x.id === job.clientId)
                    return (
                      <tr key={job.id}>
                        <td className="num font-semibold">{job.code}</td>
                        <td>{client ? pick(client.name, client.nameAr) : '-'}</td>
                        <td className="num text-end">{money(c.total)}</td>
                        <td className="num text-end">{money(c.revenue)}</td>
                        <td
                          className={`num text-end font-semibold ${
                            c.margin >= 0 ? 'text-brand-700' : 'text-red-600'
                          }`}
                        >
                          {money(c.margin)}
                          <span className="ms-1 text-xs opacity-60">
                            {num(c.marginPct, 0)}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
