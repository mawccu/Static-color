import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { nextCode, today, uid } from '../data/store'
import type { Job, JobStatus } from '../data/types'
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
  SectionTitle,
} from '../ui'
import { toNum, useEditor } from '../ui/useEditor'
import { jobCosting } from '../lib/calc'

const statuses: JobStatus[] = ['planned', 'running', 'done', 'delivered', 'cancelled']

const statusTone: Record<JobStatus, 'gray' | 'blue' | 'amber' | 'green' | 'red'> = {
  planned: 'gray',
  running: 'blue',
  done: 'amber',
  delivered: 'green',
  cancelled: 'red',
}

export default function Jobs() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<JobStatus | 'all'>('all')

  const blank = (): Job => ({
    id: '',
    createdAt: today(),
    code: nextCode('JOB', db.jobs.map((j) => j.code)),
    clientId: null,
    fabricId: null,
    sampleId: null,
    washTypeId: null,
    description: '',
    quantityKg: 0,
    startDate: today(),
    endDate: '',
    status: 'planned',
    machineIds: [],
    workers: 2,
    days: 1,
    pricePerKg: 0,
    extraCosts: {
      labor: 0,
      machines: 0,
      dyes: 0,
      chemicals: 0,
      energy: 0,
      other: 0,
    },
    notes: '',
  })

  const ed = useEditor<Job>(blank)
  const d = ed.draft

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.jobs
      .filter((j) => (status === 'all' ? true : j.status === status))
      .filter((j) => {
        if (!needle) return true
        const client = db.clients.find((c) => c.id === j.clientId)
        return [j.code, j.description, client?.name, client?.nameAr]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
  }, [db.jobs, db.clients, q, status])

  const save = () => {
    if (!ed.draft) return
    const j = ed.draft
    if (j.id) update('jobs', j.id, j)
    else add('jobs', { ...j, id: uid() })
    ed.close()
  }

  const toggleMachine = (id: string) => {
    if (!d) return
    ed.set(
      'machineIds',
      d.machineIds.includes(id)
        ? d.machineIds.filter((x) => x !== id)
        : [...d.machineIds, id],
    )
  }

  const costing = d ? jobCosting(d, db.machines, db.settings) : null
  const fabric = d ? db.fabrics.find((f) => f.id === d.fabricId) : undefined

  const setExtra = (key: keyof Job['extraCosts'], value: number) => {
    if (!d) return
    ed.set('extraCosts', { ...d.extraCosts, [key]: value })
  }

  return (
    <>
      <PageHeader title={t('job.title')} subtitle={`${db.jobs.length}`}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('job.new')}
        </button>
      </PageHeader>

      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b border-ink-100 p-3">
          <div className="min-w-56 flex-1">
            <SearchInput value={q} onChange={setQ} />
          </div>
          <select
            className="input w-auto"
            value={status}
            onChange={(e) => setStatus(e.target.value as JobStatus | 'all')}
          >
            <option value="all">{t('c.all')}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t(`jstatus.${s}`)}
              </option>
            ))}
          </select>
        </div>

        {rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('c.code')}</th>
                  <th>{t('c.client')}</th>
                  <th>{t('c.description')}</th>
                  <th className="text-end">{t('job.quantity')}</th>
                  <th className="text-end">{t('job.days')}</th>
                  <th className="text-end">{t('job.totalCost')}</th>
                  <th className="text-end">{t('job.revenue')}</th>
                  <th className="text-end">{t('job.margin')}</th>
                  <th>{t('c.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((j) => {
                  const c = jobCosting(j, db.machines, db.settings)
                  const client = db.clients.find((x) => x.id === j.clientId)
                  return (
                    <tr key={j.id}>
                      <td className="num font-semibold">{j.code}</td>
                      <td>{client ? pick(client.name, client.nameAr) : '-'}</td>
                      <td className="max-w-56 truncate text-ink-600">
                        {j.description || '-'}
                      </td>
                      <td className="num text-end">
                        {num(j.quantityKg)} {t('c.kg')}
                      </td>
                      <td className="num text-end">{num(j.days)}</td>
                      <td className="num text-end">{money(c.total)}</td>
                      <td className="num text-end">{money(c.revenue)}</td>
                      <td
                        className={`num text-end font-semibold ${
                          c.margin >= 0 ? 'text-brand-700' : 'text-red-600'
                        }`}
                      >
                        {money(c.margin)}
                      </td>
                      <td>
                        <Badge tone={statusTone[j.status]}>
                          {t(`jstatus.${j.status}`)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconButton icon="edit" onClick={() => ed.openEdit(j)} />
                          <DeleteButton onConfirm={() => remove('jobs', j.id)} />
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
        wide
        title={ed.isNew ? t('job.new') : `${t('c.edit')} ${d?.code ?? ''}`}
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
        {d && costing && (
          <div className="space-y-6">
            <Grid cols={3}>
              <Field label={t('c.code')}>
                <input
                  className="input num"
                  value={d.code}
                  onChange={(e) => ed.set('code', e.target.value)}
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
              <Field label={t('c.status')}>
                <select
                  className="input"
                  value={d.status}
                  onChange={(e) => ed.set('status', e.target.value as JobStatus)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {t(`jstatus.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>

            <Field label={t('c.description')}>
              <input
                className="input"
                value={d.description}
                onChange={(e) => ed.set('description', e.target.value)}
              />
            </Field>

            <Grid cols={3}>
              <Field label={t('c.fabric')}>
                <select
                  className="input"
                  value={d.fabricId ?? ''}
                  onChange={(e) => ed.set('fabricId', e.target.value || null)}
                >
                  <option value="">{t('c.none')}</option>
                  {db.fabrics.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} {pick(f.name, f.nameAr)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('job.sample')}>
                <select
                  className="input"
                  value={d.sampleId ?? ''}
                  onChange={(e) => ed.set('sampleId', e.target.value || null)}
                >
                  <option value="">{t('c.none')}</option>
                  {db.samples
                    .filter((s) => s.status === 'approved' || s.id === d.sampleId)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} {s.targetName}
                      </option>
                    ))}
                </select>
              </Field>
              <Field label={t('job.washType')}>
                <select
                  className="input"
                  value={d.washTypeId ?? ''}
                  onChange={(e) => ed.set('washTypeId', e.target.value || null)}
                >
                  <option value="">{t('c.none')}</option>
                  {db.washTypes.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.code} {pick(w.name, w.nameAr)}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>

            <Grid cols={4}>
              <Field
                label={`${t('job.quantity')} (${t('c.kg')})`}
                hint={
                  fabric && fabric.metersPerKg
                    ? `${t('job.estimatedMeters')}: ${num(
                        d.quantityKg * fabric.metersPerKg,
                        0,
                      )}`
                    : undefined
                }
              >
                <input
                  type="number"
                  step="0.1"
                  className="input num"
                  value={d.quantityKg}
                  onChange={(e) => ed.set('quantityKg', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('job.pricePerKg')}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={d.pricePerKg}
                  onChange={(e) => ed.set('pricePerKg', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('job.start')}>
                <input
                  type="date"
                  className="input num"
                  value={d.startDate}
                  onChange={(e) => ed.set('startDate', e.target.value)}
                />
              </Field>
              <Field label={t('job.end')}>
                <input
                  type="date"
                  className="input num"
                  value={d.endDate}
                  onChange={(e) => ed.set('endDate', e.target.value)}
                />
              </Field>
            </Grid>

            {/* ------------------------------------------ resources */}
            <div>
              <SectionTitle hint={t('job.dayCost')}>{t('job.machines')}</SectionTitle>
              <div className="flex flex-wrap gap-2">
                {db.machines.map((m) => {
                  const on = d.machineIds.includes(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggleMachine(m.id)}
                      className={`chip border transition ${
                        on
                          ? 'border-brand-500 bg-brand-50 text-brand-800'
                          : 'border-ink-200 bg-white text-ink-500 hover:border-ink-300'
                      }`}
                    >
                      {on && <Icon name="check" size={13} />}
                      {pick(m.name, m.nameAr)}
                      <span className="num opacity-60">{num(m.dayCost)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <Grid cols={2}>
              <Field label={t('job.workers')}>
                <input
                  type="number"
                  className="input num"
                  value={d.workers}
                  onChange={(e) => ed.set('workers', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('job.days')}>
                <input
                  type="number"
                  step="0.5"
                  className="input num"
                  value={d.days}
                  onChange={(e) => ed.set('days', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            {/* -------------------------------------------- costing */}
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <SectionTitle>{t('job.costing')}</SectionTitle>

              <div className="mb-4 flex items-baseline justify-between rounded-lg bg-white px-4 py-3">
                <span className="text-sm font-semibold text-ink-600">
                  {t('job.dayCost')}
                </span>
                <span className="num text-xl font-bold text-ink-900">
                  {money(costing.perDay)}
                </span>
              </div>

              <div className="mb-4 grid gap-2 sm:grid-cols-2">
                <Row label={t('job.labor')} value={money(costing.labor)} />
                <Row label={t('job.machineCost')} value={money(costing.machines)} />
              </div>

              <p className="label">{t('job.other')}</p>
              <Grid cols={4}>
                <Field label={t('job.dyeCost')}>
                  <input
                    type="number"
                    step="0.01"
                    className="input num"
                    value={d.extraCosts.dyes}
                    onChange={(e) => setExtra('dyes', toNum(e.target.value))}
                  />
                </Field>
                <Field label={t('job.chemCost')}>
                  <input
                    type="number"
                    step="0.01"
                    className="input num"
                    value={d.extraCosts.chemicals}
                    onChange={(e) => setExtra('chemicals', toNum(e.target.value))}
                  />
                </Field>
                <Field label={t('job.energy')}>
                  <input
                    type="number"
                    step="0.01"
                    className="input num"
                    value={d.extraCosts.energy}
                    onChange={(e) => setExtra('energy', toNum(e.target.value))}
                  />
                </Field>
                <Field label={t('job.other')}>
                  <input
                    type="number"
                    step="0.01"
                    className="input num"
                    value={d.extraCosts.other}
                    onChange={(e) => setExtra('other', toNum(e.target.value))}
                  />
                </Field>
              </Grid>

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Row
                  label={t('job.totalCost')}
                  value={money(costing.total)}
                  strong
                />
                <Row label={t('job.costPerKg')} value={money(costing.costPerKg)} />
                <Row label={t('job.revenue')} value={money(costing.revenue)} />
                <Row
                  label={`${t('job.margin')} (${num(costing.marginPct, 1)}%)`}
                  value={money(costing.margin)}
                  strong
                  tone={costing.margin >= 0 ? 'good' : 'bad'}
                />
              </div>
            </div>

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

function Row({
  label,
  value,
  strong,
  tone,
}: {
  label: string
  value: string
  strong?: boolean
  tone?: 'good' | 'bad'
}) {
  const color =
    tone === 'good' ? 'text-brand-700' : tone === 'bad' ? 'text-red-600' : 'text-ink-900'
  return (
    <div className="flex items-baseline justify-between rounded-lg bg-white px-3 py-2">
      <span className="text-sm text-ink-500">{label}</span>
      <span className={`num text-sm ${strong ? 'font-bold' : ''} ${color}`}>
        {value}
      </span>
    </div>
  )
}
