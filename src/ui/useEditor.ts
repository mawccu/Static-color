import { useCallback, useState } from 'react'

/**
 * Small modal-form state machine shared by every list page:
 * open a blank draft, open an existing row, patch fields, close.
 */
export function useEditor<T extends { id?: string }>(blank: () => T) {
  const [draft, setDraft] = useState<T | null>(null)

  const openNew = useCallback(() => setDraft(blank()), [blank])
  const openEdit = useCallback((row: T) => setDraft({ ...row }), [])
  const close = useCallback(() => setDraft(null), [])

  const set = useCallback(
    <K extends keyof T>(key: K, value: T[K]) =>
      setDraft((d) => (d ? { ...d, [key]: value } : d)),
    [],
  )

  return {
    draft,
    setDraft,
    set,
    open: draft !== null,
    isNew: !draft?.id,
    openNew,
    openEdit,
    close,
  }
}

/** Coerces an <input type="number"> value without turning empty into NaN. */
export const toNum = (v: string): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
