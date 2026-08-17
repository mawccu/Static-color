/**
 * Bridge to the Electron shell. Undefined when the app runs in a browser,
 * so every caller must treat the desktop features as optional.
 */
export interface DesktopBridge {
  isDesktop: true
  dataFile: string
  read(): string | null
  write(json: string): boolean
  revealDataFile(): Promise<void>
  backup(json: string): Promise<string | null>
  restore(): Promise<string | null>
}

declare global {
  interface Window {
    desktop?: DesktopBridge
  }
}

export const desktop = (): DesktopBridge | undefined =>
  typeof window !== 'undefined' ? window.desktop : undefined

export const isDesktop = (): boolean => Boolean(desktop()?.isDesktop)
