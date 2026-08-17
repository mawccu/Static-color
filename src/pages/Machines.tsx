import { useDb } from '../data/db'
import { today, uid } from '../data/store'
import type { Machine, MachineKind, MachineSize, MachineStatus } from '../data/types'
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
} from '../ui'
import { toNum, useEditor } from '../ui/useEditor'

const kinds: MachineKind[] = ['washer', 'dryer', 'press', 'iron', 'boiler', 'sample']
const sizes: MachineSize[] = ['small', 'medium', 'large']
const statuses: MachineStatus[] = ['idle', 'running', 'maintenance']

const statusTone: Record<MachineStatus, 'gray' | 'green' | 'amber'> = {
  idle: 'gray',
  running: 'green',
  maintenance: 'amber',
}

const blank = (): Machine => ({
  id: '',
  createdAt: today(),
  name: '',
  nameAr: '',
  kind: 'washer',
  size: 'medium',
  capacityKg: 0,
  rpm: 0,
  dayCost: 0,
  status: 'idle',
  notes: '',
})

export default function Machines() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const ed = useEditor<Machine>(blank)

  const save = () => {
    if (!ed.draft) return
    const m = ed.draft
    if (!m.name.trim() && !m.nameAr.trim()) return
    if (m.id) update('machines', m.id, m)
    else add('machines', { ...m, id: uid() })
    ed.close()
  }

  const cycle = (m: Machine) => {
    const next = statuses[(statuses.indexOf(m.status) + 1) % statuses.length]
    update('machines', m.id, { status: next })
  }

  return (
    <>
      <PageHeader title={t('mach.title')}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('mach.new')}
        </button>
      </PageHeader>

      {db.machines.length === 0 ? (
        <Card>
          <Empty />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {db.machines.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Icon
                      name={
                        m.kind === 'washer'
                          ? 'wash'
                          : m.kind === 'sample'
                            ? 'flask'
                            : 'machine'
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-ink-900">
                      {pick(m.name, m.nameAr)}
                    </p>
                    <p className="text-xs text-ink-500">
                      {t(`mkind.${m.kind}`)}
                      {m.size ? ` / ${t(`msize.${m.size}`)}` : ''}
                    </p>
                  </div>
                </div>
                <button onClick={() => cycle(m)} title={t('c.status')}>
                  <Badge tone={statusTone[m.status]}>{t(`mstatus.${m.status}`)}</Badge>
                </button>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                {!!m.capacityKg && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500">{t('mach.capacity')}</dt>
                    <dd className="num">
                      {num(m.capacityKg)} {t('c.kg')}
                    </dd>
                  </div>
                )}
                {!!m.rpm && (
                  <div className="flex justify-between">
                    <dt className="text-ink-500">{t('mach.rpm')}</dt>
                    <dd className="num">{num(m.rpm)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-ink-500">{t('mach.dayCost')}</dt>
                  <dd className="num font-semibold">{money(m.dayCost)}</dd>
                </div>
              </dl>

              {m.notes && <p className="mt-3 text-xs text-ink-400">{m.notes}</p>}

              <div className="mt-4 flex justify-end gap-1 border-t border-ink-100 pt-3">
                <IconButton icon="edit" onClick={() => ed.openEdit(m)} />
                <DeleteButton onConfirm={() => remove('machines', m.id)} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={ed.open}
        onClose={ed.close}
        title={ed.isNew ? t('mach.new') : t('c.edit')}
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
              <Field label={t('c.type')}>
                <select
                  className="input"
                  value={ed.draft.kind}
                  onChange={(e) => ed.set('kind', e.target.value as MachineKind)}
                >
                  {kinds.map((k) => (
                    <option key={k} value={k}>
                      {t(`mkind.${k}`)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('c.size')}>
                <select
                  className="input"
                  value={ed.draft.size ?? ''}
                  onChange={(e) =>
                    ed.set('size', (e.target.value || undefined) as MachineSize)
                  }
                >
                  <option value="">{t('c.none')}</option>
                  {sizes.map((s) => (
                    <option key={s} value={s}>
                      {t(`msize.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>

            <Grid cols={3}>
              <Field label={`${t('mach.capacity')} (${t('c.kg')})`}>
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.capacityKg ?? 0}
                  onChange={(e) => ed.set('capacityKg', toNum(e.target.value))}
                />
              </Field>
              <Field label={t('mach.rpm')}>
                <input
                  type="number"
                  className="input num"
                  value={ed.draft.rpm ?? 0}
                  onChange={(e) => ed.set('rpm', toNum(e.target.value))}
                />
              </Field>
              <Field
                label={t('mach.dayCost')}
                hint={t('job.dayCost')}
              >
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={ed.draft.dayCost}
                  onChange={(e) => ed.set('dayCost', toNum(e.target.value))}
                />
              </Field>
            </Grid>

            <Field label={t('c.status')}>
              <select
                className="input"
                value={ed.draft.status}
                onChange={(e) => ed.set('status', e.target.value as MachineStatus)}
              >
                {statuses.map((s) => (
                  <option key={s} value={s}>
                    {t(`mstatus.${s}`)}
                  </option>
                ))}
              </select>
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
