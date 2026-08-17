import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Collection, DB, Id, Settings } from './types'
import { emptyDB, loadDB, saveDB, uid } from './store'

type Row<K extends Collection> = DB[K][number]
type NewRow<K extends Collection> = Omit<Row<K>, 'id' | 'createdAt'> &
  Partial<Pick<Row<K>, 'id' | 'createdAt'>>

interface DbApi {
  db: DB
  add<K extends Collection>(collection: K, item: NewRow<K>): Row<K>
  update<K extends Collection>(
    collection: K,
    id: Id,
    patch: Partial<Row<K>>,
  ): void
  remove(collection: Collection, id: Id): void
  setSettings(patch: Partial<Settings>): void
  replaceAll(next: DB): void
  reset(): void
}

const DbContext = createContext<DbApi | null>(null)

export function DbProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(() => loadDB())

  useEffect(() => {
    saveDB(db)
  }, [db])

  const add = useCallback(<K extends Collection>(collection: K, item: NewRow<K>) => {
    const row = {
      ...item,
      id: item.id ?? uid(),
      createdAt: item.createdAt ?? new Date().toISOString(),
    } as Row<K>
    setDb((prev) => ({
      ...prev,
      [collection]: [...(prev[collection] as Row<K>[]), row],
    }))
    return row
  }, [])

  const update = useCallback(
    <K extends Collection>(collection: K, id: Id, patch: Partial<Row<K>>) => {
      setDb((prev) => ({
        ...prev,
        [collection]: (prev[collection] as Row<K>[]).map((r) =>
          r.id === id ? { ...r, ...patch } : r,
        ),
      }))
    },
    [],
  )

  const remove = useCallback((collection: Collection, id: Id) => {
    setDb((prev) => ({
      ...prev,
      [collection]: (prev[collection] as { id: Id }[]).filter((r) => r.id !== id),
    }))
  }, [])

  const setSettings = useCallback((patch: Partial<Settings>) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  const replaceAll = useCallback((next: DB) => setDb(next), [])
  const reset = useCallback(() => setDb(emptyDB()), [])

  const api = useMemo<DbApi>(
    () => ({ db, add, update, remove, setSettings, replaceAll, reset }),
    [db, add, update, remove, setSettings, replaceAll, reset],
  )

  return <DbContext.Provider value={api}>{children}</DbContext.Provider>
}

export function useDb(): DbApi {
  const ctx = useContext(DbContext)
  if (!ctx) throw new Error('useDb must be used inside <DbProvider>')
  return ctx
}
