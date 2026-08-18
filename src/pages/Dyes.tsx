import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { today, uid } from '../data/store'
import type { Dye, DyeFamily } from '../data/types'
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
  Swatch,
} from '../ui'
import { toNum, useEditor } from '../ui/useEditor'

const families: DyeFamily[] = [
  'reactive',
  'disperse',
  'acid',
  'vat',
  'direct',
  'basic',
  'sulphur',
  'pigment',
  'other',
]

const blank = (): Dye => ({
  id: '',
  createdAt: today(),
  code: '',
  name: '',
  nameAr: '',
  family: 'disperse',
  category: '',
  colorHex: '#3b82f6',
  supplier: '',
  costPerKg: 0,
  stockKg: 0,
  hasBulk: false,
  notes: '',
})

/**
 * Parses a pasted list. One dye per line, and where a line has commas they are
 * read as name, category, supplier. Anything else is taken as a bare name,
 * which is how most of the shelf will get entered.
 */
function parseDyeList(text: string): Pick<Dye, 'name' | 'category' | 'supplier'>[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, category = '', supplier = ''] = line.split(',').map((p) => p.trim())
      return { name, category, supplier }
    })
    .filter((d) => d.name)
}

export default function Dyes() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const ed = useEditor<Dye>(blank)
  const [q, setQ] = useState('')
  const [family, setFamily] = useState<DyeFamily | 'all'>('all')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkText, setBulkText] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.dyes
      .filter((d) => (family === 'all' ? true : d.family === family))
      .filter((d) =>
        !needle
          ? true
          : [d.code, d.name, d.nameAr, d.category, d.supplier]
              .join(' ')
              .toLowerCase()
              .includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [db.dyes, q, family])

  const save = () => {
    if (!ed.draft) return
    const d = ed.draft
    if (!d.name.trim() && !d.code.trim()) return
    if (d.id) update('dyes', d.id, d)
    else add('dyes', { ...d, id: uid() })
    ed.close()
  }

  const parsed = useMemo(() => parseDyeList(bulkText), [bulkText])

  const saveBulk = () => {
    parsed.forEach((p) =>
      add('dyes', { ...blank(), ...p, id: uid(), createdAt: today() }),
    )
    setBulkText('')
    setBulkOpen(false)
  }

  return (
    <>
      <PageHeader
        title={t('dye.title')}
        subtitle={t('dye.count', { n: db.dyes.length })}
      >
        <button className="btn-ghost" onClick={() => setBulkOpen(true)}>
          <Icon name="upload" size={16} />
          {t('dye.bulkAdd')}
        </button>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('dye.new')}
        </button>
      </PageHeader>

      <Card pad={false}>
        <div className="flex flex-wrap gap-2 border-b border-ink-100 p-3">
          <div className="min-w-56 flex-1">
            <SearchInput value={q} onChange={setQ} />
          </div>
          <select
            className="input w-auto"
            value={family}
            onChange={(e) => setFamily(e.target.value as DyeFamily | 'all')}
          >
            <option value="all">{t('c.all')}</option>
            {families.map((f) => (
              <option key={f} value={f}>
                {t(`family.${f}`)}
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
                  <th style={{ width: 46 }}></th>
                  <th>{t('c.name')}</th>
                  <th>{t('c.code')}</th>
                  <th>{t('dye.category')}</th>
                  <th>{t('c.supplier')}</th>
                  <th className="text-end">{t('c.cost')}</th>
                  <th className="text-end">{t('c.stock')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <Swatch hex={d.colorHex} size={24} />
                    </td>
                    <td className="font-semibold">{pick(d.name, d.nameAr)}</td>
                    <td className="num text-ink-500">{d.code || '-'}</td>
                    <td className="text-ink-500">
                      {d.category || t(`family.${d.family}`)}
                    </td>
                    <td className="text-ink-500">{d.supplier || '-'}</td>
                    <td className="num text-end">{money(d.costPerKg)}</td>
                    <td className="num text-end">
                      {d.hasBulk ? (
                        <span className={d.stockKg <= 0 ? 'text-amber-600' : ''}>
                          {num(d.stockKg)} {t('c.kg')}
                        </span>
                      ) : (
                        <Badge tone="gray">{t('dye.bottleOnly')}</Badge>
                      )}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton icon="edit" onClick={() => ed.openEdit(d)} />
                        <DeleteButton onConfirm={() => remove('dyes', d.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={ed.open}
        onClose={ed.close}
        title={ed.isNew ? t('dye.new') : t('c.edit')}
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
            <Field label={t('c.name')}>
              <input
                className="input"
                value={ed.draft.name}
                onChange={(e) => ed.set('name', e.target.value)}
                placeholder="Dianix Blue S-BG"
              />
            </Field>

            <Grid cols={2}>
              <Field label={t('c.nameAr')}>
                <input
                  className="input"
                  value={ed.draft.nameAr}
                  onChange={(e) => ed.set('nameAr', e.target.value)}
                />
              </Field>
              <Field label={`${t('c.code')} (${t('smp.optional')})`}>
                <input
                  className="input"
                  value={ed.draft.code}
                  onChange={(e) => ed.set('code', e.target.value)}
                />
              </Field>
              <Field label={t('dye.category')}>
                <input
                  className="input"
                  value={ed.draft.category}
                  onChange={(e) => ed.set('category', e.target.value)}
                />
              </Field>
              <Field label={t('dye.family')}>
                <select
                  className="input"
                  value={ed.draft.family}
                  onChange={(e) => ed.set('family', e.target.value as DyeFamily)}
                >
                  {families.map((f) => (
                    <option key={f} value={f}>
                      {t(`family.${f}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>

            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-600"
                checked={ed.draft.hasBulk}
                onChange={(e) => ed.set('hasBulk', e.target.checked)}
              />
              {t('dye.hasBulk')}
            </label>

            <Field label={t('dye.color')}>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-10 w-16 cursor-pointer rounded-lg border border-ink-200 bg-white p-1"
                  value={ed.draft.colorHex}
                  onChange={(e) => ed.set('colorHex', e.target.value)}
                />
                <input
                  className="input num w-32"
                  value={ed.draft.colorHex}
                  onChange={(e) => ed.set('colorHex', e.target.value)}
                />
              </div>
            </Field>

            <Grid cols={3}>
              <Field label={t('c.supplier')}>
                <input
                  className="input"
                  value={ed.draft.supplier}
                  onChange={(e) => ed.set('supplier', e.target.value)}
                />
              </Field>
              <Field label={`${t('c.cost')} / ${t('c.kg')}`}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={ed.draft.costPerKg}
                  onChange={(e) => ed.set('costPerKg', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('c.stock')} (${t('c.kg')})`}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={ed.draft.stockKg}
                  onChange={(e) => ed.set('stockKg', toNum(e.target.value))}
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

      {/* ------------------------------------------------ bulk paste */}
      <Modal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        title={t('dye.bulkTitle')}
        footer={
          <>
            <button className="btn-ghost" onClick={() => setBulkOpen(false)}>
              {t('c.cancel')}
            </button>
            <button
              className="btn-primary"
              onClick={saveBulk}
              disabled={parsed.length === 0}
            >
              {t('dye.bulkPreview', { n: parsed.length })}
            </button>
          </>
        }
      >
        <Field hint={t('dye.bulkHint')}>
          <textarea
            className="input min-h-64 font-mono text-sm"
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={'Dianix Blue S-BG, disperse, Dystar\nDianix Red CC\nTerasil Yellow W-4G'}
            dir="ltr"
          />
        </Field>
      </Modal>
    </>
  )
}

