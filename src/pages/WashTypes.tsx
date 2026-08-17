import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { nextCode, today, uid } from '../data/store'
import type { MachineSize, WashType } from '../data/types'
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

const sizes: (MachineSize | 'any')[] = ['any', 'small', 'medium', 'large']

export default function WashTypes() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const [q, setQ] = useState('')

  const blank = (): WashType => ({
    id: '',
    createdAt: today(),
    code: nextCode('W', db.washTypes.map((w) => w.code)),
    name: '',
    nameAr: '',
    machineSize: 'any',
    tempC: 60,
    durationMin: 45,
    liquorRatio: 10,
    steps: '',
    notes: '',
  })

  const ed = useEditor<WashType>(blank)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.washTypes
      .filter((w) =>
        !needle
          ? true
          : [w.code, w.name, w.nameAr].join(' ').toLowerCase().includes(needle),
      )
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [db.washTypes, q])

  const save = () => {
    if (!ed.draft) return
    const w = ed.draft
    if (!w.name.trim() && !w.code.trim()) return
    if (w.id) update('washTypes', w.id, w)
    else add('washTypes', { ...w, id: uid() })
    ed.close()
  }

  return (
    <>
      <PageHeader
        title={t('wash.title')}
        subtitle={`${db.washTypes.length}`}
      >
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('wash.new')}
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
                  <th>{t('wash.machineSize')}</th>
                  <th className="text-end">{t('c.temp')}</th>
                  <th className="text-end">{t('wash.duration')}</th>
                  <th className="text-end">{t('wash.liquorRatio')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((w) => (
                  <tr key={w.id}>
                    <td className="num font-semibold">{w.code}</td>
                    <td>{pick(w.name, w.nameAr)}</td>
                    <td>
                      <Badge tone="gray">{t(`msize.${w.machineSize}`)}</Badge>
                    </td>
                    <td className="num text-end">{num(w.tempC)} C</td>
                    <td className="num text-end">
                      {num(w.durationMin)} {t('c.min')}
                    </td>
                    <td className="num text-end">1:{num(w.liquorRatio)}</td>
                    <td>
                      <div className="flex justify-end gap-1">
                        <IconButton icon="edit" onClick={() => ed.openEdit(w)} />
                        <DeleteButton onConfirm={() => remove('washTypes', w.id)} />
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
        title={ed.isNew ? t('wash.new') : t('c.edit')}
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
                  className="input num"
                  value={ed.draft.code}
                  onChange={(e) => ed.set('code', e.target.value)}
                />
              </Field>
              <Field label={t('wash.machineSize')}>
                <select
                  className="input"
                  value={ed.draft.machineSize}
                  onChange={(e) =>
                    ed.set('machineSize', e.target.value as MachineSize | 'any')
                  }
                >
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {t(`msize.${s}`)}
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
            </Grid>

            <Grid cols={3}>
              <Field label={`${t('c.temp')} (C)`}>
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.tempC}
                  onChange={(e) => ed.set('tempC', toNum(e.target.value))}
                />
              </Field>
              <Field label={`${t('wash.duration')} (${t('c.min')})`}>
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.durationMin}
                  onChange={(e) => ed.set('durationMin', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('wash.liquorRatio')} hint="1 : X">
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.liquorRatio}
                  onChange={(e) => ed.set('liquorRatio', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            <Field label={t('wash.steps')}>
              <textarea
                className="input min-h-32"
                value={ed.draft.steps}
                onChange={(e) => ed.set('steps', e.target.value)}
              />
            </Field>
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
