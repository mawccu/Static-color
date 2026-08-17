import { useEffect } from 'react'
import { useDb } from '../data/db'
import { dict, type DictKey } from './dict'
import type { Lang } from '../data/types'

export type { DictKey }

/**
 * Applies language + direction to <html> so CSS logical properties and the
 * browser's own form controls flip correctly.
 */
export function useLang() {
  const { db, setSettings } = useDb()
  const lang = db.settings.lang
  const dir: 'rtl' | 'ltr' = lang === 'ar' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  return {
    lang,
    dir,
    isRtl: lang === 'ar',
    setLang: (next: Lang) => setSettings({ lang: next }),
    toggle: () => setSettings({ lang: lang === 'ar' ? 'en' : 'ar' }),
  }
}

export function useT() {
  const { db } = useDb()
  const lang = db.settings.lang
  const i = lang === 'ar' ? 1 : 0

  /**
   * t('job.title') or t('dye.count', { n: 12 }).
   * Accepts a plain string too, for keys built at runtime like `family.${x}`.
   */
  const t = (
    key: DictKey | (string & {}),
    vars?: Record<string, string | number>,
  ): string => {
    const entry = dict[key as DictKey]
    let out = entry ? entry[i] : String(key)
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        out = out.replace(`{${k}}`, String(v))
      }
    }
    return out
  }

  /** Picks the Arabic name when in Arabic and one exists. */
  const pick = (en: string | undefined, ar: string | undefined): string =>
    (lang === 'ar' ? ar || en : en || ar) ?? ''

  return { t, pick, lang }
}

/** Money, always Latin digits so scale is unambiguous on the floor. */
export function useMoney() {
  const { db } = useDb()
  const cur = db.settings.currency || 'JD'
  return (n: number, opts?: { sign?: boolean }) => {
    const v = Number.isFinite(n) ? n : 0
    const s = v.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${opts?.sign && v > 0 ? '+' : ''}${s} ${cur}`
  }
}

export const num = (n: number, dp = 2): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: dp,
  })
