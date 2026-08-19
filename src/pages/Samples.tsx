import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { nextCode, today, uid } from '../data/store'
import type { Basis, Sample, SampleStatus } from '../data/types'
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
import {
  gPerLGrams,
  mlToL,
  owfGrams,
  sampleCost,
  scaleRecipe,
  sum,
} from '../lib/calc'
import { deltaE, matchBand, type MatchBand } from '../lib/color'

const bandTone: Record<MatchBand, 'green' | 'blue' | 'amber' | 'gray'> = {
  exact: 'green',
  close: 'blue',
  near: 'amber',
  far: 'gray',
}

const statuses: SampleStatus[] = ['draft', 'running', 'done', 'approved', 'rejected']

const statusTone: Record<SampleStatus, 'gray' | 'blue' | 'green' | 'red' | 'amber'> = {
  draft: 'gray',
  running: 'blue',
  done: 'amber',
  approved: 'green',
  rejected: 'red',
}

const STEP_COUNT = 14

/**
 * One chemical on the sheet. Every one of them can be dosed either as grams per
 * litre of the bath or as a percentage on weight of fabric, and which applies
 * varies, so the basis is always a choice on the row and never an assumption in
 * the code. The grams that result are shown beside it either way.
 */
function ChemRow({
  label,
  hint,
  amount,
  basis,
  labG,
  labMl,
  onAmount,
  onBasis,
}: {
  label: string
  hint: string
  amount: number
  basis: Basis
  labG: number
  labMl: number
  onAmount: (v: number) => void
  onBasis: (v: Basis) => void
}) {
  const { t } = useT()
  const grams =
    basis === 'owf' ? owfGrams(amount, labG) : gPerLGrams(amount, mlToL(labMl))

  return (
    <div className="rounded-lg border border-ink-200 p-3">
      <p className="label mb-2">
        {label} <span className="font-normal text-ink-400">/ {hint}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="number"
          step="0.01"
          className="input num w-20"
          value={amount}
          onChange={(e) => onAmount(toNum(e.target.value))}
        />
        <select
          className="input flex-1"
          value={basis}
          onChange={(e) => onBasis(e.target.value as Basis)}
          aria-label={t('smp.basis')}
        >
          <option value="gPerL">{t('basis.gPerL')}</option>
          <option value="owf">{t('basis.owf')}</option>
        </select>
        <span className="num shrink-0 rounded-lg bg-brand-50 px-2.5 py-2 text-sm font-semibold text-brand-800">
          {num(grams, 3)} g
        </span>
      </div>
    </div>
  )
}

export default function Samples() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<SampleStatus | 'all'>('all')
  const [fabricFilter, setFabricFilter] = useState('')
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
    fabricWeightG: db.settings.sampleFabricG,
    dyes: [],
    acid: db.settings.acidAmount,
    acidBasis: db.settings.acidBasis,
    carrier: 0,
    carrierBasis: 'gPerL',
    antiCrease: 0,
    antiCreaseBasis: 'gPerL',
    waterMl: db.settings.sampleWaterMl,
    machineId: db.machines.find((m) => m.kind === 'sample')?.id ?? null,
    tempC: 130,
    timeMin: 45,
    status: 'draft',
    resultHex: '',
    matched: false,
    stepsDone: [],
    trials: [],
    repeatOf: null,
    notes: '',
  })

  const ed = useEditor<Sample>(blank)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.samples
      .filter((s) => (status === 'all' ? true : s.status === status))
      .filter((s) => (fabricFilter ? s.fabricId === fabricFilter : true))
      .filter((s) => {
        if (!needle) return true
        const client = db.clients.find((c) => c.id === s.clientId)
        // searching by the dyes used is how an old recipe actually gets found
        const dyeNames = s.dyes
          .map((x) => db.dyes.find((y) => y.id === x.dyeId))
          .flatMap((y) => (y ? [y.code, y.name, y.nameAr] : []))
        return [s.code, s.targetName, s.notes, client?.name, client?.nameAr, ...dyeNames]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.code.localeCompare(a.code))
  }, [db.samples, db.clients, db.dyes, q, status, fabricFilter])

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
      trials: [],
      repeatOf: s.id,
    })
  }

  /* -------------------------------------------------- recipe helpers */

  const d = ed.draft

  /**
   * A failed sample is adjusted, not replaced, so each go is snapshotted into
   * the trial log and the sheet above stays live for the next adjustment.
   */
  const logTrial = () => {
    if (!d) return
    ed.set('trials', [
      ...d.trials,
      {
        n: d.trials.length + 1,
        date: today(),
        dyes: d.dyes.map((x) => ({ ...x })),
        acid: d.acid,
        acidBasis: d.acidBasis,
        carrier: d.carrier,
        antiCrease: d.antiCrease,
        waterMl: d.waterMl,
        tempC: d.tempC,
        timeMin: d.timeMin,
        resultHex: d.resultHex,
        matched: d.matched,
        notes: '',
      },
    ])
  }

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

  const sampleFabric = d ? db.fabrics.find((f) => f.id === d.fabricId) : undefined
  const litresPerKg = sampleFabric?.litresPerKg || db.settings.litresPerKg
  const scaled = d ? scaleRecipe(d, batchKg, litresPerKg, db) : null

  /**
   * The recipe knowledge base, which is the thing that replaces searching
   * through paper. Past approved samples on the same fabric, ranked by how
   * close their result came to the shade being aimed at now. Plain colour
   * arithmetic on the stored values, no measurement and no guessing.
   */
  const similar = useMemo(() => {
    if (!d || !d.fabricId) return []
    return db.samples
      .filter(
        (s) =>
          s.id !== d.id &&
          s.fabricId === d.fabricId &&
          s.status === 'approved' &&
          s.dyes.length > 0,
      )
      .map((s) => {
        const shade = s.resultHex || s.targetHex
        return { sample: s, shade, distance: deltaE(d.targetHex, shade) }
      })
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5)
  }, [d, db.samples])

  /** Copies a past recipe onto the sheet as the starting point. */
  const startFrom = (source: Sample) => {
    if (!d) return
    ed.setDraft({
      ...d,
      dyes: source.dyes.map((x) => ({ ...x })),
      acid: source.acid,
      acidBasis: source.acidBasis,
      carrier: source.carrier,
      carrierBasis: source.carrierBasis,
      antiCrease: source.antiCrease,
      antiCreaseBasis: source.antiCreaseBasis,
      waterMl: source.waterMl,
      tempC: source.tempC,
      timeMin: source.timeMin,
      notes: d.notes,
    })
  }

  /** Picking a fabric pulls its usual temperature, time and carrier need. */
  const pickFabric = (fabricId: string | null) => {
    if (!d) return
    const f = db.fabrics.find((x) => x.id === fabricId)
    ed.setDraft({
      ...d,
      fabricId,
      tempC: f?.defaultTempC || d.tempC,
      timeMin: f?.defaultTimeMin || d.timeMin,
    })
  }

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
            value={fabricFilter}
            onChange={(e) => setFabricFilter(e.target.value)}
          >
            <option value="">{t('smp.anyFabric')}</option>
            {db.fabrics.map((f) => (
              <option key={f.id} value={f.id}>
                {f.code} {pick(f.name, f.nameAr)}
              </option>
            ))}
          </select>
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
          <button
            className={`btn btn-sm border ${
              status === 'approved'
                ? 'border-brand-500 bg-brand-50 text-brand-800'
                : 'border-ink-200 bg-white text-ink-600'
            }`}
            onClick={() => setStatus(status === 'approved' ? 'all' : 'approved')}
          >
            {t('smp.onlyApproved')}
          </button>
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
                  <th>{t('c.fabric')}</th>
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
                      <td className="text-ink-500">
                        {(() => {
                          const f = db.fabrics.find((x) => x.id === s.fabricId)
                          return f ? pick(f.name, f.nameAr) : '-'
                        })()}
                      </td>
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
                  onChange={(e) => pickFabric(e.target.value || null)}
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

            {/* ------------------------------------- past recipes */}
            <div className="rounded-xl border border-ink-200 bg-ink-50/60 p-4">
              <SectionTitle hint={t('smp.similarHint')}>
                {t('smp.similar')}
              </SectionTitle>

              {!d.fabricId ? (
                <p className="text-sm text-ink-400">{t('smp.pickFabricFirst')}</p>
              ) : similar.length === 0 ? (
                <p className="text-sm text-ink-400">{t('smp.similarNone')}</p>
              ) : (
                <>
                  <ul className="space-y-2">
                    {similar.map(({ sample, shade, distance }) => {
                      const band = matchBand(distance)
                      return (
                        <li
                          key={sample.id}
                          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-white px-3 py-2"
                        >
                          <div className="flex items-center gap-1">
                            <Swatch hex={d.targetHex} size={20} />
                            <Swatch hex={shade} size={20} />
                          </div>
                          <span className="num text-sm font-semibold">
                            {sample.code}
                          </span>
                          <span className="truncate text-sm text-ink-500">
                            {sample.targetName || '-'}
                          </span>
                          <Badge tone={bandTone[band]}>{t(`match.${band}`)}</Badge>
                          <span className="num text-xs text-ink-400">
                            {t('smp.distance')} {num(distance, 1)}
                          </span>
                          <button
                            className="btn-ghost btn-sm ms-auto"
                            onClick={() => startFrom(sample)}
                          >
                            {t('smp.useRecipe')}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-ink-400">
                    {t('smp.distanceHint')}
                  </p>
                </>
              )}
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
            <div>
              <SectionTitle>{t('smp.chemicals')}</SectionTitle>

              <Field label={`${t('smp.water')} (${t('c.ml')})`} className="max-w-48">
                <input
                  type="number"
                  className="input num"
                  value={d.waterMl}
                  onChange={(e) => ed.set('waterMl', toNum(e.target.value))}
                />
              </Field>

              {sampleFabric?.needsCarrier && d.carrier <= 0 && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  {t('smp.carrierSuggest')}
                </p>
              )}

              <div className="mt-3 grid gap-3 lg:grid-cols-3">
                <ChemRow
                  label={t('smp.acid')}
                  hint={t('smp.acidHint')}
                  amount={d.acid}
                  basis={d.acidBasis}
                  labG={d.fabricWeightG}
                  labMl={d.waterMl}
                  onAmount={(v) => ed.set('acid', v)}
                  onBasis={(v) => ed.set('acidBasis', v)}
                />
                <ChemRow
                  label={t('smp.carrier')}
                  hint={t('smp.carrierHint')}
                  amount={d.carrier}
                  basis={d.carrierBasis}
                  labG={d.fabricWeightG}
                  labMl={d.waterMl}
                  onAmount={(v) => ed.set('carrier', v)}
                  onBasis={(v) => ed.set('carrierBasis', v)}
                />
                <ChemRow
                  label={t('smp.antiCrease')}
                  hint={t('smp.antiCreaseHint')}
                  amount={d.antiCrease}
                  basis={d.antiCreaseBasis}
                  labG={d.fabricWeightG}
                  labMl={d.waterMl}
                  onAmount={(v) => ed.set('antiCrease', v)}
                  onBasis={(v) => ed.set('antiCreaseBasis', v)}
                />
              </div>
            </div>

            <Grid cols={3}>
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

            {/* ------------------------------- take down to the machine */}
            <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
              <SectionTitle hint={t('smp.scaleHint')}>{t('smp.scaleTo')}</SectionTitle>

              <Grid cols={3}>
                <Field label={`${t('smp.batchKg')} (${t('c.kg')})`}>
                  <input
                    type="number"
                    step="0.1"
                    className="input num"
                    value={batchKg}
                    onChange={(e) => setBatchKg(toNum(e.target.value))}
                  />
                </Field>
                <Field
                  label={t('smp.litresPerKg')}
                  hint={sampleFabric ? pick(sampleFabric.name, sampleFabric.nameAr) : undefined}
                >
                  <input
                    type="number"
                    className="input num"
                    value={litresPerKg}
                    disabled
                  />
                </Field>
                <Field label={t('smp.totalWater')}>
                  <div className="num rounded-lg bg-white px-3 py-2 text-sm font-bold text-brand-800">
                    {num(scaled?.litres ?? 0, 0)} L
                  </div>
                </Field>
              </Grid>

              {scaled && (scaled.dyes.length > 0 || scaled.chemicals.length > 0) ? (
                <div className="table-wrap mt-3 rounded-lg bg-white">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>{t('smp.recipe')}</th>
                        <th className="text-end">{t('smp.inBottle')}</th>
                        <th>{t('smp.how')}</th>
                        <th className="text-end">{t('smp.inMachine')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scaled.dyes.map((l, i) => (
                        <tr key={i}>
                          <td>
                            <div className="flex items-center gap-2">
                              <Swatch hex={l.hex ?? '#fff'} size={18} />
                              {l.label}
                            </div>
                          </td>
                          <td className="num text-end text-ink-500">
                            {num(l.lab, 4)} g
                          </td>
                          <td className="num text-xs text-ink-400">{l.how}</td>
                          <td className="num text-end font-bold">
                            {num(l.batch, 1)} g
                          </td>
                        </tr>
                      ))}
                      {scaled.chemicals.map((l, i) => (
                        <tr key={`c${i}`} className="bg-ink-50">
                          <td className="font-semibold">{t(`smp.${l.label}`)}</td>
                          <td className="num text-end text-ink-500">
                            {num(l.lab, 3)} g
                          </td>
                          <td className="num text-xs text-ink-400">{l.how}</td>
                          <td className="num text-end font-bold">
                            {num(l.batch, 1)} g
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-400">{t('c.empty')}</p>
              )}
            </div>

            {/* ---------------------------------------------- attempts */}
            <div>
              <div className="mb-3 flex items-end justify-between gap-3">
                <SectionTitle hint={t('smp.trialsHint')}>
                  {t('smp.trials')}
                </SectionTitle>
                <button className="btn-ghost btn-sm" onClick={logTrial}>
                  <Icon name="plus" size={14} />
                  {t('smp.logTrial')}
                </button>
              </div>

              {d.trials.length === 0 ? (
                <p className="rounded-lg bg-ink-50 px-4 py-4 text-center text-sm text-ink-400">
                  {t('smp.noTrials')}
                </p>
              ) : (
                <ul className="space-y-2">
                  {d.trials.map((tr) => (
                    <li
                      key={tr.n}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-ink-200 px-3 py-2 text-sm"
                    >
                      <span className="num font-semibold text-ink-700">
                        {t('smp.trialNo', { n: tr.n })}
                      </span>
                      <span className="num text-xs text-ink-400">{tr.date}</span>
                      {tr.resultHex && <Swatch hex={tr.resultHex} size={18} />}
                      <span className="num text-xs text-ink-500">
                        {num(sum(tr.dyes.map((x) => x.percent)), 3)} %
                      </span>
                      <span className="num text-xs text-ink-500">
                        {num(tr.tempC, 0)} C / {num(tr.timeMin, 0)} min
                      </span>
                      {tr.matched && (
                        <span className="ms-auto text-brand-600">
                          <Icon name="check" size={15} />
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
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
