import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { today, uid } from '../data/store'
import type { Chemical, ChemicalKind } from '../data/types'
import { num, useMoney, useT } from '../i18n'
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
} from '../ui'
import { toNum, useEditor } from '../ui/useEditor'

const kinds: ChemicalKind[] = ['acid', 'carrier', 'antiCrease', 'softener', 'other']

const blank = (): Chemical => ({
  id: '',
  createdAt: today(),
  code: '',
  name: '',
  nameAr: '',
  kind: 'other',
  costPerKg: 0,
  stockKg: 0,
  notes: '',
})

export default function Chemicals() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const ed = useEditor<Chemical>(blank)
  const [q, setQ] = useState('')

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.chemicals
      .filter((c) =>
        !needle
          ? true
          : [c.code, c.name, c.nameAr].join(' ').toLowerCase().includes(needle),
      )
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [db.chemicals, q])

  const save = () => {
    if (!ed.draft) return
    const c = ed.draft
    if (!c.name.trim() && !c.code.trim()) return
    if (c.id) update('chemicals', c.id, c)
    else add('chemicals', { ...c, id: uid() })
    ed.close()
  }

  return (
    <>
      <PageHeader title={t('chem.title')}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('chem.new')}
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
                  <th>{t('c.code')}</th>
                  <th>{t('c.name')}</th>
                  <th>{t('chem.kind')}</th>
                  <th className="text-end">{t('c.cost')}</th>
                  <th className="text-end">{t('c.stock')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td className="num font-semibold">{c.code}</td>
                    <td>{pick(c.name, c.nameAr)}</td>
                    <td className="text-ink-500">{t(`kind.${c.kind}`)}</td>
                    <td className="num text-end">{money(c.costPerKg)}</td>
                    <td className="num text-end">
                      {num(c.stockKg)} {t('c.kg')}
                    </td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton icon="edit" onClick={() => ed.openEdit(c)} />
                        <DeleteButton onConfirm={() => remove('chemicals', c.id)} />
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
        title={ed.isNew ? t('chem.new') : t('c.edit')}
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
              <Field label={t('chem.kind')}>
                <select
                  className="input"
                  value={ed.draft.kind}
                  onChange={(e) => ed.set('kind', e.target.value as ChemicalKind)}
                >
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {t(`kind.${k}`)}
                    </option>
                  ))}
                </select>
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
    </>
  )
}
