import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { today, uid } from '../data/store'
import type { NepLevel, QualityCheck } from '../data/types'
import { num, useT } from '../i18n'
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
import { toNum, useEditor } from '../ui/useEditor'

const nepLevels: NepLevel[] = ['none', 'few', 'many']
const verdicts: QualityCheck['verdict'][] = ['pass', 'hold', 'fail']

const nepTone: Record<NepLevel, 'green' | 'amber' | 'red'> = {
  none: 'green',
  few: 'amber',
  many: 'red',
}
const verdictTone: Record<QualityCheck['verdict'], 'green' | 'amber' | 'red'> = {
  pass: 'green',
  hold: 'amber',
  fail: 'red',
}

const blank = (): QualityCheck => ({
  id: '',
  createdAt: today(),
  date: today(),
  jobId: null,
  sampleId: null,
  fabricId: null,
  neps: 'none',
  yarnCount: 0,
  uniformity: 3,
  handFeel: 3,
  colorFastness: 3,
  verdict: 'pass',
  notes: '',
})

/** 1 to 5 dots, tappable. */
function Scale({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`h-9 flex-1 rounded-lg border text-sm font-semibold transition ${
            n <= value
              ? 'border-brand-500 bg-brand-500 text-white'
              : 'border-ink-200 bg-white text-ink-400 hover:border-ink-300'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

export default function Quality() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const ed = useEditor<QualityCheck>(blank)
  const [q, setQ] = useState('')
  const d = ed.draft

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.quality
      .filter((x) => {
        if (!needle) return true
        const job = db.jobs.find((j) => j.id === x.jobId)
        return [job?.code, x.notes].join(' ').toLowerCase().includes(needle)
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [db.quality, db.jobs, q])

  const save = () => {
    if (!d) return
    if (d.id) update('quality', d.id, d)
    else add('quality', { ...d, id: uid() })
    ed.close()
  }

  return (
    <>
      <PageHeader title={t('qc.title')} subtitle={t('qc.nepsHint')}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('qc.new')}
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
                  <th>{t('c.date')}</th>
                  <th>{t('c.job')}</th>
                  <th>{t('c.fabric')}</th>
                  <th>{t('qc.neps')}</th>
                  <th className="text-end">{t('fab.yarnCount')}</th>
                  <th className="text-end">{t('qc.uniformity')}</th>
                  <th className="text-end">{t('qc.handFeel')}</th>
                  <th className="text-end">{t('qc.fastness')}</th>
                  <th>{t('qc.verdict')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => {
                  const job = db.jobs.find((j) => j.id === x.jobId)
                  const fabric = db.fabrics.find((f) => f.id === x.fabricId)
                  return (
                    <tr key={x.id}>
                      <td className="num text-ink-500">{x.date}</td>
                      <td className="num">{job?.code ?? '-'}</td>
                      <td>{fabric ? pick(fabric.name, fabric.nameAr) : '-'}</td>
                      <td>
                        <Badge tone={nepTone[x.neps]}>{t(`neps.${x.neps}`)}</Badge>
                      </td>
                      <td className="num text-end">
                        {x.yarnCount ? `Ne ${num(x.yarnCount)}` : '-'}
                      </td>
                      <td className="num text-end">{x.uniformity}/5</td>
                      <td className="num text-end">{x.handFeel}/5</td>
                      <td className="num text-end">{x.colorFastness}/5</td>
                      <td>
                        <Badge tone={verdictTone[x.verdict]}>
                          {t(`verdict.${x.verdict}`)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconButton icon="edit" onClick={() => ed.openEdit(x)} />
                          <DeleteButton onConfirm={() => remove('quality', x.id)} />
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
        title={ed.isNew ? t('qc.new') : t('c.edit')}
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
            <Grid cols={2}>
              <Field label={t('c.date')}>
                <input
                  type="date"
                  className="input num"
                  value={d.date}
                  onChange={(e) => ed.set('date', e.target.value)}
                />
              </Field>
              <Field label={t('qc.verdict')}>
                <select
                  className="input"
                  value={d.verdict}
                  onChange={(e) =>
                    ed.set('verdict', e.target.value as QualityCheck['verdict'])
                  }
                >
                  {verdicts.map((v) => (
                    <option key={v} value={v}>
                      {t(`verdict.${v}`)}
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
            </Grid>

            <Grid cols={2}>
              <Field label={t('qc.neps')} hint={t('qc.nepsHint')}>
                <select
                  className="input"
                  value={d.neps}
                  onChange={(e) => ed.set('neps', e.target.value as NepLevel)}
                >
                  {nepLevels.map((n) => (
                    <option key={n} value={n}>
                      {t(`neps.${n}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('fab.yarnCount')} hint={t('fab.yarnCountHint')}>
                <input
                  type="number"
                  className="input num"
                  value={d.yarnCount}
                  onChange={(e) => ed.set('yarnCount', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            <Field label={t('qc.uniformity')}>
              <Scale value={d.uniformity} onChange={(v) => ed.set('uniformity', v)} />
            </Field>
            <Field label={t('qc.handFeel')}>
              <Scale value={d.handFeel} onChange={(v) => ed.set('handFeel', v)} />
            </Field>
            <Field label={t('qc.fastness')}>
              <Scale
                value={d.colorFastness}
                onChange={(v) => ed.set('colorFastness', v)}
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
