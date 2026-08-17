import type { ReactNode } from 'react'
import { useLang } from '../i18n'

/** Applies lang + dir to the document. Must sit inside DbProvider. */
export default function LangGate({ children }: { children: ReactNode }) {
  useLang()
  return <>{children}</>
}
