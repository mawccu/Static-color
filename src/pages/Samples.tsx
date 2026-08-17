import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { nextCode, today, uid } from '../data/store'
import type { Sample, SampleStatus } from '../data/types'
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
  Swatch,
} from '../ui'
import { toNum, useEditor } from '../ui/useEditor'
import { owfGrams, sampleCost, scaleRecipe, sum } from '../lib/calc'

const statuses: SampleStatus[] = ['draft', 'running', 'done', 'approved', 'rejected']

const statusTone: Record<SampleStatus, 'gray' | 'blue' | 'green' | 'red' | 'amber'> = {
  draft: 'gray',
  running: 'blue',
  done: 'amber',
  approved: 'green',
  rejected: 'red',
}

const STEP_COUNT = 14

export default function Samples() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<SampleStatus | 'all'>('all')
  const [batchKg, setBatchKg] = useState(50)

  const blank = (): Sample => ({
    id: '',
    createdAt: today(),
    code: nextCode('SMP', db.samples.map((s) => s.code)),
    date: today(),
    clientId: null,
    fabricId: null,
    targetName: '',
    targetHex: '#8b5cf6',
    fabricWeightG: 10,
    dyes: [],
    acid: db.settings.defaultAcid,
    carrier: 0,
    antiCrease: 0,
    waterMl: 200,
    liquorRatio: 20,
    machineId: db.machines.find((m) => m.kind === 'sample')?.id ?? null,
    tempC: 130,
    timeMin: 45,
    status: 'draft',
    resultHex: '',
    matched: false,
    stepsDone: [],
    repeatOf: null,
    notes: '',
  })

  const ed = useEditor<Sample>(blank)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.samples
      .filter((s) => (status === 'all' ? true : s.status === status))
      .filter((s) => {
        if (!needle) return true
        const client = db.clients.find((c) => c.id === s.clientId)
        return [s.code, s.targetName, client?.name, client?.nameAr]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code))
  }, [db.samples, db.clients, q, status])

  const save = () => {
    if (!ed.draft) return
    const s = ed.draft
    if (s.id) update('samples', s.id, s)
    else add('samples', { ...s, id: uid() })
    ed.close()
  }

  const repeat = (s: Sample) => {
    ed.setDraft({
      ...s,
      id: '',
      code: nextCode('SMP', db.samples.map((x) => x.code)),
      date: today(),
      status: 'draft',
      resultHex: '',
      matched: false,
      stepsDone: [],
      repeatOf: s.id,
    })
  }

  /* -------------------------------------------------- recipe helpers */

  const d = ed.draft
  const setDyeRow = (i: number, patch: Partial<Sample['dyes'][number]>) => {
    if (!d) return
    const dyes = d.dyes.map((row, ix) => (ix === i ? { ...row, ...patch } : row))
    ed.set('dyes', dyes)
  }
  const addDyeRow = () => {
    if (!d) return
    ed.set('dyes', [...d.dyes, { dyeId: db.dyes[0]?.id ?? '', percent: 0, grams: 0 }])
  }
  const removeDyeRow = (i: number) => {
    if (!d) return
    ed.set(
      'dyes',
      d.dyes.filter((_, ix) => ix !== i),
    )
  }

  const toggleStep = (n: number) => {
    if (!d) return
    ed.set(
      'stepsDone',
      d.stepsDone.includes(n)
        ? d.stepsDone.filter((x) => x !== n)
        : [...d.stepsDone, n],
    )
  }

  const scaled = d ? scaleRecipe(d, batchKg, db) : null

  return (
    <>
      <PageHeader title={t('smp.title')} subtitle={`${db.samples.length}`}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('smp.new')}
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
            onChange={(e) => setStatus(e.target.value as SampleStatus | 'all')}
          >
            <option value="all">{t('c.all')}</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {t(`sstatus.${s}`)}
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
                  <th>{t('c.date')}</th>
                  <th>{t('c.client')}</th>
                  <th>{t('smp.target')}</th>
                  <th>{t('smp.result')}</th>
                  <th className="text-end">{t('smp.totalDye')}</th>
                  <th>{t('c.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const client = db.clients.find((c) => c.id === s.clientId)
                  const totalDye = sum(
                    s.dyes.map((x) => x.grams || owfGrams(x.percent, s.fabricWeightG)),
                  )
                  return (
                    <tr key={s.id}>
                      <td className="num font-semibold">{s.code}</td>
                      <td className="num text-ink-500">{s.date}</td>
                      <td>{client ? pick(client.name, client.nameAr) : '-'}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Swatch hex={s.targetHex} size={22} />
                          <span className="text-ink-600">{s.targetName || '-'}</span>
                        </div>
                      </td>
                      <td>
                        {s.resultHex ? (
                          <div className="flex items-center gap-2">
                            <Swatch hex={s.resultHex} size={22} />
                            {s.matched && (
                              <span className="text-brand-600">
                                <Icon name="check" size={15} />
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-ink-300">-</span>
                        )}
                      </td>
                      <td className="num text-end">{num(totalDye, 3)} g</td>
                      <td>
                        <Badge tone={statusTone[s.status]}>
                          {t(`sstatus.${s.status}`)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconButton
                            icon="copy"
                            title={t('smp.repeatSample')}
                            onClick={() => repeat(s)}
                          />
                          <IconButton icon="edit" onClick={() => ed.openEdit(s)} />
                          <DeleteButton onConfirm={() => remove('samples', s.id)} />
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
        title={ed.isNew ? t('smp.new') : `${t('c.edit')} ${d?.code ?? ''}`}
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
          <div className="space-y-6">
            {/* ---------------------------------------------- header */}
            <Grid cols={3}>
              <Field label={t('c.code')}>
                <input
                  className="input num"
                  value={d.code}
                  onChange={(e) => ed.set('code', e.target.value)}
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
              <Field label={t('c.status')}>
                <select
                  className="input"
                  value={d.status}
                  onChange={(e) => ed.set('status', e.target.value as SampleStatus)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {t(`sstatus.${s}`)}
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
              <Field label={`${t('smp.weight')} (${t('c.g')})`}>
                <input
                  type="number"
                  step="0.1"
                  className="input num"
                  value={d.fabricWeightG}
                  onChange={(e) => ed.set('fabricWeightG', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            {/* ---------------------------------------------- colours */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-ink-200 p-4">
                <SectionTitle>{t('smp.target')}</SectionTitle>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-12 w-16 cursor-pointer rounded-lg border border-ink-200 p-1"
                    value={d.targetHex}
                    onChange={(e) => ed.set('targetHex', e.target.value)}
                  />
                  <input
                    className="input"
                    placeholder={t('c.name')}
                    value={d.targetName}
                    onChange={(e) => ed.set('targetName', e.target.value)}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-ink-200 p-4">
                <SectionTitle>{t('smp.result')}</SectionTitle>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-12 w-16 cursor-pointer rounded-lg border border-ink-200 p-1"
                    value={d.resultHex || '#ffffff'}
                    onChange={(e) => ed.set('resultHex', e.target.value)}
                  />
                  <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-brand-600"
                      checked={d.matched}
                      onChange={(e) => ed.set('matched', e.target.checked)}
                    />
                    {t('smp.matched')}
                  </label>
                </div>
              </div>
            </div>

            {/* ----------------------------------------------- recipe */}
            <div>
              <div className="mb-3 flex items-end justify-between">
                <SectionTitle>{t('smp.recipe')}</SectionTitle>
                <button className="btn-ghost btn-sm" onClick={addDyeRow}>
                  <Icon name="plus" size={14} />
                  {t('smp.addDye')}
                </button>
              </div>

              {d.dyes.length === 0 ? (
                <p className="rounded-lg bg-ink-50 px-4 py-6 text-center text-sm text-ink-400">
                  {db.dyes.length === 0 ? t('c.emptyHint') : t('smp.addDye')}
                </p>
              ) : (
                <div className="table-wrap rounded-lg border border-ink-200">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>{t('nav.dyes')}</th>
                        <th className="w-28 text-end">{t('smp.owf')}</th>
                        <th className="w-28 text-end">{t('c.g')}</th>
                        <th className="w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.dyes.map((row, i) => {
                        const dye = db.dyes.find((x) => x.id === row.dyeId)
                        return (
                          <tr key={i}>
                            <td>
                              <div className="flex items-center gap-2">
                                <Swatch hex={dye?.colorHex ?? '#fff'} size={20} />
                                <select
                                  className="input"
                                  value={row.dyeId}
                                  onChange={(e) =>
                                    setDyeRow(i, { dyeId: e.target.value })
                                  }
                                >
                                  <option value="">{t('c.none')}</option>
                                  {db.dyes.map((x) => (
                                    <option key={x.id} value={x.id}>
                                      {x.code} {pick(x.name, x.nameAr)}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.001"
                                className="input num text-end"
                                value={row.percent}
                                onChange={(e) => {
                                  const percent = toNum(e.target.value)
                                  setDyeRow(i, {
                                    percent,
                                    grams: owfGrams(percent, d.fabricWeightG),
                                  })
                                }}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.0001"
                                className="input num text-end"
                                value={row.grams}
                                onChange={(e) => {
                                  const grams = toNum(e.target.value)
                                  setDyeRow(i, {
                                    grams,
                                    percent: d.fabricWeightG
                                      ? (grams / d.fabricWeightG) * 100
                                      : 0,
                                  })
                                }}
                              />
                            </td>
                            <td>
                              <IconButton
                                icon="x"
                                onClick={() => removeDyeRow(i)}
                              />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 rounded-lg bg-ink-50 px-4 py-2.5 text-sm">
                <span className="font-semibold text-ink-700">
                  {t('smp.totalDye')}
                </span>
                <span className="flex flex-wrap items-center gap-x-5 gap-y-1">
                  <span className="num font-semibold text-ink-900">
                    {num(sum(d.dyes.map((x) => x.percent)), 3)} %
                  </span>
                  <span className="num font-semibold text-ink-900">
                    {num(sum(d.dyes.map((x) => x.grams)), 4)} g
                  </span>
                  <span className="inline-flex items-baseline gap-1.5 text-ink-500">
                    {t('smp.recipeCost')}
                    <span className="num font-semibold text-ink-900">
                      {money(sampleCost(d, db.dyes))}
                    </span>
                  </span>
                </span>
              </div>
            </div>

            {/* -------------------------------------------- chemicals */}
            <Grid cols={4}>
              <Field label={t('smp.acid')}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={d.acid}
                  onChange={(e) => ed.set('acid', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('smp.carrier')} (${t('smp.optional')})`}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={d.carrier}
                  onChange={(e) => ed.set('carrier', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('smp.antiCrease')} (${t('smp.optional')})`}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={d.antiCrease}
                  onChange={(e) => ed.set('antiCrease', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('smp.water')} (${t('c.ml')})`}>
                <input
                  type="number"
                  className="input num"
                  value={d.waterMl}
                  onChange={(e) => ed.set('waterMl', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            <Grid cols={4}>
              <Field label={t('c.machine')}>
                <select
                  className="input"
                  value={d.machineId ?? ''}
                  onChange={(e) => ed.set('machineId', e.target.value || null)}
                >
                  <option value="">{t('c.none')}</option>
                  {db.machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {pick(m.name, m.nameAr)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={`${t('c.temp')} (C)`}>
                <input
                  type="number"
                  className="input num"
                  value={d.tempC}
                  onChange={(e) => ed.set('tempC', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('c.time')} (${t('c.min')})`}>
                <input
                  type="number"
                  className="input num"
                  value={d.timeMin}
                  onChange={(e) => ed.set('timeMin', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('wash.liquorRatio')} hint="1 : X">
                <input
                  type="number"
                  className="input num"
                  value={d.liquorRatio}
                  onChange={(e) => ed.set('liquorRatio', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            {/* -------------------------------------------- procedure */}
            <div>
              <SectionTitle>{t('smp.procedure')}</SectionTitle>
              <ol className="space-y-1">
                {Array.from({ length: STEP_COUNT }, (_, i) => i + 1).map((n) => {
                  const done = d.stepsDone.includes(n)
                  return (
                    <li key={n}>
                      <button
                        onClick={() => toggleStep(n)}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm transition ${
                          done
                            ? 'bg-brand-50 text-brand-800'
                            : 'hover:bg-ink-50 text-ink-700'
                        }`}
                      >
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-bold ${
                            done
                              ? 'border-brand-500 bg-brand-500 text-white'
                              : 'border-ink-300 text-ink-400'
                          }`}
                        >
                          {done ? <Icon name="check" size={13} /> : n}
                        </span>
                        <span className={done ? 'line-through opacity-70' : ''}>
                          {t(`step.${n}`)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ol>
            </div>

            {/* ------------------------------------------ scale to bulk */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <SectionTitle hint={t('smp.scaleHint')}>{t('smp.scaleTo')}</SectionTitle>
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="number"
                  className="input num w-32"
                  value={batchKg}
                  onChange={(e) => setBatchKg(toNum(e.target.value))}
                />
                <span className="text-sm font-semibold text-ink-600">
                  {t('c.kg')}
                </span>
                <span className="num ms-auto text-xs text-ink-500">
                  x{num(scaled?.factor ?? 0, 0)}
                </span>
              </div>
              {scaled && scaled.lines.length > 0 ? (
                <table className="tbl bg-white">
                  <thead>
                    <tr>
                      <th>{t('nav.dyes')}</th>
                      <th className="text-end">{t('c.g')} (lab)</th>
                      <th className="text-end">{t('c.g')} (batch)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scaled.lines.map((l, i) => (
                      <tr key={i}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Swatch hex={l.hex ?? '#fff'} size={18} />
                            {l.label}
                          </div>
                        </td>
                        <td className="num text-end">{num(l.lab, 4)}</td>
                        <td className="num text-end font-semibold">
                          {num(l.batch, 1)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-ink-50 font-semibold">
                      <td>{t('smp.acid')}</td>
                      <td className="num text-end">{num(d.acid, 3)}</td>
                      <td className="num text-end">
                        {num(d.acid * (scaled.factor || 0), 1)}
                      </td>
                    </tr>
                    {d.carrier > 0 && (
                      <tr className="bg-ink-50 font-semibold">
                        <td>{t('smp.carrier')}</td>
                        <td className="num text-end">{num(d.carrier, 3)}</td>
                        <td className="num text-end">
                          {num(d.carrier * (scaled.factor || 0), 1)}
                        </td>
                      </tr>
                    )}
                    {d.antiCrease > 0 && (
                      <tr className="bg-ink-50 font-semibold">
                        <td>{t('smp.antiCrease')}</td>
                        <td className="num text-end">{num(d.antiCrease, 3)}</td>
                        <td className="num text-end">
                          {num(d.antiCrease * (scaled.factor || 0), 1)}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-ink-400">{t('c.empty')}</p>
              )}
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
