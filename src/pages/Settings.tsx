import { useRef, useState } from 'react'
import { useDb } from '../data/db'
import { desktop } from '../data/desktop'
import { isoDate } from '../data/store'
import type { Basis, DB, Lang } from '../data/types'
import { useT } from '../i18n'
import { Card, Field, Grid, Icon, PageHeader, SectionTitle } from '../ui'
import { toNum } from '../ui/useEditor'

export default function SettingsPage() {
  const { db, setSettings, replaceAll, reset } = useDb()
  const { t } = useT()
  const s = db.settings
  const fileRef = useRef<HTMLInputElement>(null)
  const [armed, setArmed] = useState(false)
  const [message, setMessage] = useState('')

  const bridge = desktop()

  const applyJson = (text: string) => {
    try {
      const parsed = JSON.parse(text) as DB
      if (!parsed || typeof parsed !== 'object' || !parsed.settings) {
        throw new Error('bad file')
      }
      replaceAll(parsed)
      setMessage('OK')
    } catch {
      setMessage('ERROR')
    }
  }

  const exportData = async () => {
    const json = JSON.stringify(db, null, 2)

    // desktop build gets a real save dialog instead of a browser download
    if (bridge) {
      const saved = await bridge.backup(json)
      if (saved) setMessage(saved)
      return
    }

    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `static-color-backup-${isoDate()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importData = async () => {
    if (bridge) {
      const text = await bridge.restore()
      if (text) applyJson(text)
      return
    }
    fileRef.current?.click()
  }

  const readFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => applyJson(String(reader.result))
    reader.readAsText(file)
  }

  return (
    <>
      <PageHeader title={t('set.title')} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>{t('set.company')}</SectionTitle>
          <div className="space-y-4">
            <Grid cols={2}>
              <Field label={t('c.name')}>
                <input
                  className="input"
                  value={s.companyName}
                  onChange={(e) => setSettings({ companyName: e.target.value })}
                />
              </Field>
              <Field label={t('c.nameAr')}>
                <input
                  className="input"
                  value={s.companyNameAr}
                  onChange={(e) => setSettings({ companyNameAr: e.target.value })}
                />
              </Field>
              <Field label={t('c.phone')}>
                <input
                  className="input num"
                  value={s.phone}
                  onChange={(e) => setSettings({ phone: e.target.value })}
                />
              </Field>
              <Field label={t('c.taxNo')}>
                <input
                  className="input num"
                  value={s.taxNo}
                  onChange={(e) => setSettings({ taxNo: e.target.value })}
                />
              </Field>
            </Grid>
            <Field label={t('c.address')}>
              <input
                className="input"
                value={s.address}
                onChange={(e) => setSettings({ address: e.target.value })}
              />
            </Field>
            <Grid cols={2}>
              <Field label={t('c.language')}>
                <select
                  className="input"
                  value={s.lang}
                  onChange={(e) => setSettings({ lang: e.target.value as Lang })}
                >
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </Field>
              <Field label={t('set.currency')}>
                <input
                  className="input"
                  value={s.currency}
                  onChange={(e) => setSettings({ currency: e.target.value })}
                />
              </Field>
            </Grid>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <SectionTitle>{t('set.rates')}</SectionTitle>
            <Grid cols={2}>
              <Field label={t('set.workerDayRate')}>
                <input
                  type="number"
                  step="0.01"
                  className="input num"
                  value={s.workerDayRate}
                  onChange={(e) =>
                    setSettings({ workerDayRate: toNum(e.target.value) })
                  }
                />
              </Field>
              <Field label={t('set.taxPct')}>
                <input
                  type="number"
                  step="0.1"
                  className="input num"
                  value={s.taxPct}
                  onChange={(e) => setSettings({ taxPct: toNum(e.target.value) })}
                />
              </Field>
            </Grid>
          </Card>

          <Card>
            <SectionTitle>{t('set.defaults')}</SectionTitle>
            <Grid cols={2}>
              <Field label={t('set.acidAmount')} hint={t('smp.acidHint')}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    className="input num w-20"
                    value={s.acidAmount}
                    onChange={(e) => setSettings({ acidAmount: toNum(e.target.value) })}
                  />
                  <select
                    className="input"
                    value={s.acidBasis}
                    onChange={(e) => setSettings({ acidBasis: e.target.value as Basis })}
                  >
                    <option value="gPerL">{t('basis.gPerL')}</option>
                    <option value="owf">{t('basis.owf')}</option>
                  </select>
                </div>
              </Field>
              <Field label={t('set.litresPerKg')} hint={t('set.litresPerKgHint')}>
                <input
                  type="number"
                  className="input num"
                  value={s.litresPerKg}
                  onChange={(e) => setSettings({ litresPerKg: toNum(e.target.value) })}
                />
              </Field>
              <Field label={t('set.sampleFabricG')}>
                <input
                  type="number"
                  step="0.1"
                  className="input num"
                  value={s.sampleFabricG}
                  onChange={(e) =>
                    setSettings({ sampleFabricG: toNum(e.target.value) })
                  }
                />
              </Field>
              <Field label={t('set.sampleWaterMl')}>
                <input
                  type="number"
                  className="input num"
                  value={s.sampleWaterMl}
                  onChange={(e) =>
                    setSettings({ sampleWaterMl: toNum(e.target.value) })
                  }
                />
              </Field>
            </Grid>
          </Card>

          <Card>
            <SectionTitle
              hint={bridge ? t('set.storageNoteDesktop') : t('set.storageNote')}
            >
              {t('set.data')}
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              <button className="btn-ghost" onClick={exportData}>
                <Icon name="download" size={16} />
                {t('c.export')}
              </button>
              <button className="btn-ghost" onClick={importData}>
                <Icon name="upload" size={16} />
                {t('c.import')}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) readFile(f)
                  e.target.value = ''
                }}
              />
              {armed ? (
                <button
                  className="btn-danger"
                  onClick={() => {
                    reset()
                    setArmed(false)
                  }}
                >
                  {t('set.resetConfirm')}
                </button>
              ) : (
                <button className="btn-quiet" onClick={() => setArmed(true)}>
                  <Icon name="trash" size={16} />
                  {t('set.reset')}
                </button>
              )}
            </div>
            {message && (
              <p className="mt-3 break-all text-sm font-semibold text-brand-700">
                {message}
              </p>
            )}

            {bridge && (
              <div className="mt-4 rounded-lg bg-ink-50 p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="label mb-0">{t('set.dataFile')}</p>
                  <button
                    className="btn-quiet btn-sm"
                    onClick={() => bridge.revealDataFile()}
                  >
                    {t('set.openFolder')}
                  </button>
                </div>
                <p className="num break-all text-xs text-ink-500" dir="ltr">
                  {bridge.dataFile}
                </p>
              </div>
            )}
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-500 sm:grid-cols-3">
              <Count label={t('nav.dyes')} n={db.dyes.length} />
              <Count label={t('nav.washTypes')} n={db.washTypes.length} />
              <Count label={t('nav.fabrics')} n={db.fabrics.length} />
              <Count label={t('nav.clients')} n={db.clients.length} />
              <Count label={t('nav.lab')} n={db.samples.length} />
              <Count label={t('nav.jobs')} n={db.jobs.length} />
              <Count label={t('nav.invoices')} n={db.invoices.length} />
              <Count label={t('nav.cashbook')} n={db.transactions.length} />
              <Count label={t('nav.quality')} n={db.quality.length} />
            </dl>
          </Card>
        </div>
      </div>
    </>
  )
}

function Count({ label, n }: { label: string; n: number }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="num font-semibold text-ink-700">{n}</dd>
    </div>
  )
}
