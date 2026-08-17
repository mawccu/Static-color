import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDb } from '../data/db'
import { useMoney, useT } from '../i18n'
import { Badge, Card, Empty, Icon, PageHeader, SectionTitle, Stat, Swatch } from '../ui'
import {
  cashSummary,
  clientBalance,
  jobCosting,
  monthEnd,
  monthStart,
  sum,
} from '../lib/calc'

export default function Dashboard() {
  const { db } = useDb()
  const { t, pick } = useT()
  const money = useMoney()

  const month = useMemo(
    () => cashSummary(db.transactions, monthStart(), monthEnd()),
    [db.transactions],
  )
  const allTime = useMemo(() => cashSummary(db.transactions), [db.transactions])

  const receivables = useMemo(
    () =>
      sum(db.clients.map((c) => clientBalance(c, db.invoices, db.transactions).due)),
    [db.clients, db.invoices, db.transactions],
  )

  const runningJobs = db.jobs.filter((j) => j.status === 'running')
  const openSamples = db.samples.filter(
    (s) => s.status === 'draft' || s.status === 'running',
  )
  const lowStock = db.dyes.filter((d) => d.stockKg <= 0)
  const recent = [...db.transactions]
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)

  const setupSteps = [
    { to: '/dyes', key: 'nav.dyes', done: db.dyes.length > 0 },
    { to: '/wash-types', key: 'nav.washTypes', done: db.washTypes.length > 0 },
    { to: '/fabrics', key: 'nav.fabrics', done: db.fabrics.length > 0 },
    { to: '/machines', key: 'nav.machines', done: db.machines.some((m) => m.dayCost > 0) },
    { to: '/clients', key: 'nav.clients', done: db.clients.length > 0 },
  ]
  const showSetup = setupSteps.some((s) => !s.done)

  return (
    <>
      <PageHeader
        title={t('dash.title')}
        subtitle={pick(db.settings.companyName, db.settings.companyNameAr)}
      >
        <Link to="/jobs" className="btn-ghost">
          <Icon name="plus" size={16} />
          {t('job.new')}
        </Link>
        <Link to="/samples" className="btn-primary">
          <Icon name="plus" size={16} />
          {t('smp.new')}
        </Link>
      </PageHeader>

      {showSetup && (
        <Card className="mb-4 border-brand-200 bg-brand-50/50">
          <SectionTitle hint={t('dash.setupHint')}>{t('dash.setupTitle')}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {setupSteps.map((s) => (
              <Link
                key={s.to}
                to={s.to}
                className={`chip border transition ${
                  s.done
                    ? 'border-brand-300 bg-white text-brand-700'
                    : 'border-ink-200 bg-white text-ink-500 hover:border-brand-400'
                }`}
              >
                {s.done ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}
                {t(s.key)}
              </Link>
            ))}
          </div>
        </Card>
      )}

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={t('dash.monthIncome')}
          value={money(month.in)}
          tone="good"
          icon={<Icon name="arrowDown" size={16} />}
        />
        <Stat
          label={t('dash.monthExpense')}
          value={money(month.out)}
          tone="bad"
          icon={<Icon name="arrowUp" size={16} />}
        />
        <Stat
          label={t('dash.monthProfit')}
          value={money(month.net)}
          tone={month.net >= 0 ? 'good' : 'bad'}
          icon={<Icon name="chart" size={16} />}
        />
        <Stat
          label={t('dash.receivables')}
          value={money(receivables)}
          tone="warn"
          hint={`${t('dash.cashOnHand')}: ${money(allTime.net)}`}
          icon={<Icon name="users" size={16} />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* --------------------------------------------- active jobs */}
        <Card className="lg:col-span-2" pad={false}>
          <div className="flex items-center justify-between p-4 pb-2">
            <SectionTitle>{t('dash.activeJobs')}</SectionTitle>
            <Link to="/jobs" className="text-xs font-semibold text-brand-700">
              {t('c.all')}
            </Link>
          </div>
          {runningJobs.length === 0 ? (
            <Empty label={t('c.empty')} hint={t('dash.setupHint')} />
          ) : (
            <div className="table-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('c.code')}</th>
                    <th>{t('c.client')}</th>
                    <th className="text-end">{t('job.quantity')}</th>
                    <th className="text-end">{t('job.dayCost')}</th>
                    <th className="text-end">{t('job.margin')}</th>
                  </tr>
                </thead>
                <tbody>
                  {runningJobs.map((j) => {
                    const c = jobCosting(j, db.machines, db.settings)
                    const client = db.clients.find((x) => x.id === j.clientId)
                    return (
                      <tr key={j.id}>
                        <td className="num font-semibold">{j.code}</td>
                        <td>{client ? pick(client.name, client.nameAr) : '-'}</td>
                        <td className="num text-end">{j.quantityKg} {t('c.kg')}</td>
                        <td className="num text-end">{money(c.perDay)}</td>
                        <td
                          className={`num text-end font-semibold ${
                            c.margin >= 0 ? 'text-brand-700' : 'text-red-600'
                          }`}
                        >
                          {money(c.margin)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* ------------------------------------------ machine status */}
        <Card>
          <SectionTitle>{t('dash.machineStatus')}</SectionTitle>
          <ul className="space-y-2">
            {db.machines.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2">
                <span className="truncate text-sm text-ink-700">
                  {pick(m.name, m.nameAr)}
                </span>
                <Badge
                  tone={
                    m.status === 'running'
                      ? 'green'
                      : m.status === 'maintenance'
                        ? 'amber'
                        : 'gray'
                  }
                >
                  {t(`mstatus.${m.status}`)}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>

        {/* ------------------------------------------- open samples */}
        <Card pad={false}>
          <div className="flex items-center justify-between p-4 pb-2">
            <SectionTitle>{t('dash.openSamples')}</SectionTitle>
            <Link to="/samples" className="text-xs font-semibold text-brand-700">
              {t('c.all')}
            </Link>
          </div>
          {openSamples.length === 0 ? (
            <Empty label={t('c.empty')} hint=" " />
          ) : (
            <ul className="divide-y divide-ink-100">
              {openSamples.slice(0, 6).map((s) => (
                <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Swatch hex={s.targetHex} size={22} />
                  <div className="min-w-0 flex-1">
                    <p className="num truncate text-sm font-semibold">{s.code}</p>
                    <p className="truncate text-xs text-ink-400">
                      {s.targetName || '-'}
                    </p>
                  </div>
                  <Badge tone={s.status === 'running' ? 'blue' : 'gray'}>
                    {t(`sstatus.${s.status}`)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* ---------------------------------------- recent movements */}
        <Card className="lg:col-span-2" pad={false}>
          <div className="flex items-center justify-between p-4 pb-2">
            <SectionTitle>{t('dash.recentTx')}</SectionTitle>
            <Link to="/cashbook" className="text-xs font-semibold text-brand-700">
              {t('c.all')}
            </Link>
          </div>
          {recent.length === 0 ? (
            <Empty label={t('c.empty')} hint=" " />
          ) : (
            <ul className="divide-y divide-ink-100">
              {recent.map((x) => {
                const client = db.clients.find((c) => c.id === x.clientId)
                return (
                  <li key={x.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                        x.direction === 'in'
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      <Icon
                        name={x.direction === 'in' ? 'arrowDown' : 'arrowUp'}
                        size={15}
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {t(`cat.${x.category}`)}
                      </p>
                      <p className="num truncate text-xs text-ink-400">
                        {x.date}
                        {client ? ` / ${pick(client.name, client.nameAr)}` : ''}
                      </p>
                    </div>
                    <span
                      className={`num text-sm font-semibold ${
                        x.direction === 'in' ? 'text-brand-700' : 'text-red-600'
                      }`}
                    >
                      {money(x.amount)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {lowStock.length > 0 && (
          <Card>
            <SectionTitle>{t('dash.lowStock')}</SectionTitle>
            <ul className="space-y-2">
              {lowStock.slice(0, 8).map((d) => (
                <li key={d.id} className="flex items-center gap-2">
                  <Swatch hex={d.colorHex} size={18} />
                  <span className="num truncate text-sm">{d.code}</span>
                  <span className="ms-auto text-xs text-red-600">
                    <Icon name="alert" size={14} />
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  )
}
