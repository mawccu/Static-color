import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { today, uid } from '../data/store'
import type { Fabric } from '../data/types'
import { num, useT } from '../i18n'
import {
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

const blank = (): Fabric => ({
  id: '',
  createdAt: today(),
  code: '',
  name: '',
  nameAr: '',
  composition: '',
  gsm: 0,
  widthCm: 0,
  metersPerKg: 0,
  yarnCount: 0,
  stockKg: 0,
  notes: '',
})

/** Quality read on yarn count, straight from the shop floor rule of thumb. */
function countGrade(count: number): { label: string; tone: string } {
  if (!count) return { label: '-', tone: 'text-ink-300' }
  if (count >= 60) return { label: 'fine', tone: 'text-brand-700' }
  if (count >= 30) return { label: 'medium', tone: 'text-ink-600' }
  return { label: 'coarse', tone: 'text-accent-600' }
}

export default function Fabrics() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const ed = useEditor<Fabric>(blank)
  const [q, setQ] = useState('')
  const [calcKg, setCalcKg] = useState(1)
  const [calcFabric, setCalcFabric] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.fabrics
      .filter((f) =>
        !needle
          ? true
          : [f.code, f.name, f.nameAr, f.composition]
              .join(' ')
              .toLowerCase()
              .includes(needle),
      )
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [db.fabrics, q])

  const picked = db.fabrics.find((f) => f.id === calcFabric)

  const save = () => {
    if (!ed.draft) return
    const f = ed.draft
    if (!f.name.trim() && !f.code.trim()) return
    if (f.id) update('fabrics', f.id, f)
    else add('fabrics', { ...f, id: uid() })
    ed.close()
  }

  return (
    <>
      <PageHeader title={t('fab.title')}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('fab.new')}
        </button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
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
                    <th>{t('c.code')}</th>
                    <th>{t('c.name')}</th>
                    <th>{t('fab.composition')}</th>
                    <th className="text-end">{t('fab.gsm')}</th>
                    <th className="text-end">{t('fab.width')}</th>
                    <th className="text-end">{t('fab.metersPerKg')}</th>
                    <th className="text-end">{t('fab.yarnCount')}</th>
                    <th className="text-end">{t('c.stock')}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((f) => {
                    const g = countGrade(f.yarnCount)
                    return (
                      <tr key={f.id}>
                        <td className="num font-semibold">{f.code}</td>
                        <td>{pick(f.name, f.nameAr)}</td>
                        <td className="text-ink-500">{f.composition || '-'}</td>
                        <td className="num text-end">{num(f.gsm)}</td>
                        <td className="num text-end">{num(f.widthCm)}</td>
                        <td className="num text-end font-semibold">
                          {num(f.metersPerKg)}
                        </td>
                        <td className={`num text-end ${g.tone}`}>
                          {f.yarnCount ? `Ne ${num(f.yarnCount)}` : '-'}
                        </td>
                        <td className="num text-end">
                          {num(f.stockKg)} {t('c.kg')}
                        </td>
                        <td>
                          <div className="flex justify-end gap-1">
                            <IconButton icon="edit" onClick={() => ed.openEdit(f)} />
                            <DeleteButton onConfirm={() => remove('fabrics', f.id)} />
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

        <Card>
          <SectionTitle hint={t('fab.metersPerKgHint')}>{t('fab.calc')}</SectionTitle>
          <div className="space-y-3">
            <Field label={t('c.fabric')}>
              <select
                className="input"
                value={calcFabric}
                onChange={(e) => setCalcFabric(e.target.value)}
              >
                <option value="">{t('c.none')}</option>
                {db.fabrics.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.code} {pick(f.name, f.nameAr)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('c.kg')}>
              <input
                type="number"
                step="0.1"
                className="input num"
                value={calcKg}
                onChange={(e) => setCalcKg(toNum(e.target.value))}
              />
            </Field>
            <div className="rounded-lg bg-brand-50 p-4 text-center">
              <p className="num text-3xl font-bold text-brand-800">
                {picked ? num(calcKg * picked.metersPerKg, 1) : '-'}
              </p>
              <p className="mt-1 text-xs font-semibold text-brand-700">
                {t('c.meters')}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Modal
        open={ed.open}
        onClose={ed.close}
        title={ed.isNew ? t('fab.new') : t('c.edit')}
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
        {ed.draft && (
          <div className="space-y-4">
            <Grid cols={2}>
              <Field label={t('c.code')}>
                <input
                  className="input"
                  value={ed.draft.code}
                  onChange={(e) => ed.set('code', e.target.value)}
                />
              </Field>
              <Field label={t('fab.composition')}>
                <input
                  className="input"
                  value={ed.draft.composition}
                  onChange={(e) => ed.set('composition', e.target.value)}
                  placeholder="100% cotton"
                />
              </Field>
              <Field label={t('c.name')}>
                <input
                  className="input"
                  value={ed.draft.name}
                  onChange={(e) => ed.set('name', e.target.value)}
                />
              </Field>
              <Field label={t('c.nameAr')}>
                <input
                  className="input"
                  value={ed.draft.nameAr}
                  onChange={(e) => ed.set('nameAr', e.target.value)}
                />
              </Field>
            </Grid>

            <Grid cols={3}>
              <Field label={t('fab.gsm')}>
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.gsm}
                  onChange={(e) => ed.set('gsm', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('fab.width')} (cm)`}>
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.widthCm}
                  onChange={(e) => ed.set('widthCm', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('c.stock')} (${t('c.kg')})`}>
                <input
                  type="number"
                  step="0.1"
                  className="input num"
                  value={ed.draft.stockKg}
                  onChange={(e) => ed.set('stockKg', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            <Grid cols={2}>
              <Field label={t('fab.metersPerKg')} hint={t('fab.metersPerKgHint')}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={ed.draft.metersPerKg}
                  onChange={(e) => ed.set('metersPerKg', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('fab.yarnCount')} hint={t('fab.yarnCountHint')}>
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.yarnCount}
                  onChange={(e) => ed.set('yarnCount', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            <Field label={t('c.notes')}>
              <textarea
                className="input"
                value={ed.draft.notes}
                onChange={(e) => ed.set('notes', e.target.value)}
              />
            </Field>
          </div>
        )}
      </Modal>
    </>
  )
}
