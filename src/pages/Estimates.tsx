import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { nextCode, today, uid } from '../data/store'
import type { Estimate, EstimateStatus } from '../data/types'
import { useMoney, useT } from '../i18n'
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
import DocLines from '../ui/DocLines'
import { useEditor } from '../ui/useEditor'
import { docTotals } from '../lib/calc'

const statuses: EstimateStatus[] = ['draft', 'sent', 'accepted', 'rejected']

const statusTone: Record<EstimateStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  draft: 'gray',
  sent: 'blue',
  accepted: 'green',
  rejected: 'red',
}

export default function Estimates() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const [q, setQ] = useState('')

  const blank = (): Estimate => ({
    id: '',
    createdAt: today(),
    number: nextCode('EST', db.estimates.map((e) => e.number)),
    clientId: null,
    date: today(),
    validUntil: '',
    lines: [],
    taxPct: db.settings.taxPct,
    discount: 0,
    status: 'draft',
    convertedInvoiceId: null,
    notes: '',
  })

  const ed = useEditor<Estimate>(blank)
  const d = ed.draft

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.estimates
      .filter((e) => {
        if (!needle) return true
        const client = db.clients.find((c) => c.id === e.clientId)
        return [e.number, client?.name, client?.nameAr]
          .join(' ')
          .toLowerCase()
          .includes(needle)
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [db.estimates, db.clients, q])

  const save = () => {
    if (!d) return
    if (d.id) update('estimates', d.id, d)
    else add('estimates', { ...d, id: uid() })
    ed.close()
  }

  const convert = (e: Estimate) => {
    const inv = add('invoices', {
      number: nextCode('INV', db.invoices.map((i) => i.number)),
      clientId: e.clientId,
      jobId: null,
      date: today(),
      dueDate: '',
      lines: e.lines,
      taxPct: e.taxPct,
      discount: e.discount,
      status: 'sent',
      notes: `${t('est.number')} ${e.number}`,
    })
    update('estimates', e.id, { status: 'accepted', convertedInvoiceId: inv.id })
  }

  return (
    <>
      <PageHeader title={t('est.title')} subtitle={`${db.estimates.length}`}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('est.new')}
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
                  <th>{t('est.number')}</th>
                  <th>{t('c.date')}</th>
                  <th>{t('c.client')}</th>
                  <th>{t('est.validUntil')}</th>
                  <th className="text-end">{t('c.total')}</th>
                  <th>{t('c.status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((e) => {
                  const client = db.clients.find((c) => c.id === e.clientId)
                  const total = docTotals(e.lines, e.taxPct, e.discount).total
                  return (
                    <tr key={e.id}>
                      <td className="num font-semibold">{e.number}</td>
                      <td className="num text-ink-500">{e.date}</td>
                      <td>{client ? pick(client.name, client.nameAr) : '-'}</td>
                      <td className="num text-ink-500">{e.validUntil || '-'}</td>
                      <td className="num text-end">{money(total)}</td>
                      <td>
                        <Badge tone={statusTone[e.status]}>
                          {t(`estatus.${e.status}`)}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          {e.convertedInvoiceId ? (
                            <Badge tone="green">{t('est.converted')}</Badge>
                          ) : (
                            <button
                              className="btn-ghost btn-sm"
                              onClick={() => convert(e)}
                            >
                              {t('est.convert')}
                            </button>
                          )}
                          <IconButton icon="edit" onClick={() => ed.openEdit(e)} />
                          <DeleteButton onConfirm={() => remove('estimates', e.id)} />
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
        title={ed.isNew ? t('est.new') : `${t('c.edit')} ${d?.number ?? ''}`}
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
          <div className="space-y-5">
            <Grid cols={4}>
              <Field label={t('est.number')}>
                <input
                  className="input num"
                  value={d.number}
                  onChange={(e) => ed.set('number', e.target.value)}
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
              <Field label={t('est.validUntil')}>
                <input
                  type="date"
                  className="input num"
                  value={d.validUntil}
                  onChange={(e) => ed.set('validUntil', e.target.value)}
                />
              </Field>
              <Field label={t('c.status')}>
                <select
                  className="input"
                  value={d.status}
                  onChange={(e) => ed.set('status', e.target.value as EstimateStatus)}
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {t(`estatus.${s}`)}
                    </option>
                  ))}
                </select>
              </Field>
            </Grid>

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

            <DocLines
              lines={d.lines}
              taxPct={d.taxPct}
              discount={d.discount}
              onChange={(lines) => ed.set('lines', lines)}
              onTax={(v) => ed.set('taxPct', v)}
              onDiscount={(v) => ed.set('discount', v)}
            />

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
