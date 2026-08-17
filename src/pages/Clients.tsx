import { useMemo, useState } from 'react'
import { useDb } from '../data/db'
import { today, uid } from '../data/store'
import type { Client } from '../data/types'
import { useMoney, useT } from '../i18n'
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
import { clientBalance, invoiceTotal } from '../lib/calc'

const blank = (): Client => ({
  id: '',
  createdAt: today(),
  name: '',
  nameAr: '',
  phone: '',
  email: '',
  address: '',
  taxNo: '',
  openingBalance: 0,
  notes: '',
})

export default function Clients() {
  const { db, add, update, remove } = useDb()
  const { t, pick } = useT()
  const money = useMoney()
  const ed = useEditor<Client>(blank)
  const [q, setQ] = useState('')
  const [statement, setStatement] = useState<Client | null>(null)

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return db.clients
      .filter((c) =>
        !needle
          ? true
          : [c.name, c.nameAr, c.phone, c.email]
              .join(' ')
              .toLowerCase()
              .includes(needle),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [db.clients, q])

  const save = () => {
    if (!ed.draft) return
    const c = ed.draft
    if (!c.name.trim() && !c.nameAr.trim()) return
    if (c.id) update('clients', c.id, c)
    else add('clients', { ...c, id: uid() })
    ed.close()
  }

  /* rows for the statement modal: invoices and payments interleaved */
  const statementRows = useMemo(() => {
    if (!statement) return []
    const invoices = db.invoices
      .filter(
        (i) =>
          i.clientId === statement.id && i.status !== 'draft' && i.status !== 'void',
      )
      .map((i) => ({
        date: i.date,
        ref: i.number,
        label: t('inv.title'),
        debit: invoiceTotal(i),
        credit: 0,
      }))
    const payments = db.transactions
      .filter((x) => x.clientId === statement.id && x.direction === 'in')
      .map((x) => ({
        date: x.date,
        ref: x.reference || '-',
        label: t('acc.newIn'),
        debit: 0,
        credit: x.amount,
      }))
    return [...invoices, ...payments].sort((a, b) => a.date.localeCompare(b.date))
  }, [statement, db.invoices, db.transactions, t])

  return (
    <>
      <PageHeader title={t('cli.title')} subtitle={`${db.clients.length}`}>
        <button className="btn-primary" onClick={ed.openNew}>
          <Icon name="plus" size={16} />
          {t('cli.new')}
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
                  <th>{t('c.name')}</th>
                  <th>{t('c.phone')}</th>
                  <th className="text-end">{t('cli.invoiced')}</th>
                  <th className="text-end">{t('cli.paid')}</th>
                  <th className="text-end">{t('cli.due')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => {
                  const b = clientBalance(c, db.invoices, db.transactions)
                  return (
                    <tr key={c.id}>
                      <td>
                        <p className="font-semibold text-ink-900">
                          {pick(c.name, c.nameAr)}
                        </p>
                        {c.address && (
                          <p className="text-xs text-ink-400">{c.address}</p>
                        )}
                      </td>
                      <td className="num text-ink-600">{c.phone || '-'}</td>
                      <td className="num text-end">{money(b.invoiced)}</td>
                      <td className="num text-end">{money(b.paid)}</td>
                      <td
                        className={`num text-end font-semibold ${
                          b.due > 0.001 ? 'text-accent-600' : 'text-brand-700'
                        }`}
                      >
                        {money(b.due)}
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <IconButton
                            icon="doc"
                            title={t('cli.statement')}
                            onClick={() => setStatement(c)}
                          />
                          <IconButton icon="edit" onClick={() => ed.openEdit(c)} />
                          <DeleteButton onConfirm={() => remove('clients', c.id)} />
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

      {/* ------------------------------------------------- editor */}
      <Modal
        open={ed.open}
        onClose={ed.close}
        title={ed.isNew ? t('cli.new') : t('c.edit')}
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
              <Field label={t('c.phone')}>
                <input
                  className="input num"
                  value={ed.draft.phone}
                  onChange={(e) => ed.set('phone', e.target.value)}
                />
              </Field>
              <Field label={t('c.email')}>
                <input
                  className="input"
                  value={ed.draft.email}
                  onChange={(e) => ed.set('email', e.target.value)}
                />
              </Field>
              <Field label={t('c.taxNo')}>
                <input
                  className="input num"
                  value={ed.draft.taxNo}
                  onChange={(e) => ed.set('taxNo', e.target.value)}
                />
              </Field>
              <Field label={t('c.openingBalance')}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={ed.draft.openingBalance}
                  onChange={(e) => ed.set('openingBalance', toNum(e.target.value))}
                />
              </Field>
            </Grid>
            <Field label={t('c.address')}>
              <input
                className="input"
                value={ed.draft.address}
                onChange={(e) => ed.set('address', e.target.value)}
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

      {/* ---------------------------------------------- statement */}
      <Modal
        open={!!statement}
        onClose={() => setStatement(null)}
        wide
        title={`${t('cli.statement')} - ${
          statement ? pick(statement.name, statement.nameAr) : ''
        }`}
        footer={
          <button className="btn-ghost" onClick={() => window.print()}>
            <Icon name="print" size={15} />
            {t('c.print')}
          </button>
        }
      >
        {statement && (
          <>
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t('c.date')}</th>
                  <th>{t('c.reference')}</th>
                  <th>{t('c.type')}</th>
                  <th className="text-end">{t('cli.invoiced')}</th>
                  <th className="text-end">{t('cli.paid')}</th>
                  <th className="text-end">{t('c.balance')}</th>
                </tr>
              </thead>
              <tbody>
                {statement.openingBalance !== 0 && (
                  <tr>
                    <td className="num">-</td>
                    <td>-</td>
                    <td>{t('c.openingBalance')}</td>
                    <td className="num text-end">{money(statement.openingBalance)}</td>
                    <td className="num text-end">-</td>
                    <td className="num text-end">{money(statement.openingBalance)}</td>
                  </tr>
                )}
                {statementRows.map((r, i) => {
                  const running =
                    statement.openingBalance +
                    statementRows
                      .slice(0, i + 1)
                      .reduce((a, x) => a + x.debit - x.credit, 0)
                  return (
                    <tr key={i}>
                      <td className="num">{r.date}</td>
                      <td className="num">{r.ref}</td>
                      <td>{r.label}</td>
                      <td className="num text-end">
                        {r.debit ? money(r.debit) : '-'}
                      </td>
                      <td className="num text-end">
                        {r.credit ? money(r.credit) : '-'}
                      </td>
                      <td className="num text-end font-semibold">{money(running)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {statementRows.length === 0 && statement.openingBalance === 0 && <Empty />}
          </>
        )}
      </Modal>
    </>
  )
}
