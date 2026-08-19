/**
 * Colour distance, used to rank past recipes against a target shade.
 *
 * IMPORTANT: this works on the hex values stored in the app, which come from a
 * colour picker on a screen. It is not a spectrophotometer reading. Use it to
 * find candidate recipes to start from, never as a quality measurement or as a
 * pass/fail on a delivered batch.
 */

export interface Lab {
  L: number
  a: number
  b: number
}

const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v))

export function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || '').replace('#', '').trim()
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h.padEnd(6, '0').slice(0, 6)
  const n = Number.parseInt(full, 16)
  if (!Number.isFinite(n)) return [0, 0, 0]
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** sRGB to CIE Lab, D65 white point. */
export function hexToLab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255)

  const lin = (c: number): number =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4

  const R = lin(r)
  const G = lin(g)
  const B = lin(b)

  // sRGB D65 matrix
  const X = (R * 0.4124564 + G * 0.3575761 + B * 0.1804375) / 0.95047
  const Y = R * 0.2126729 + G * 0.7151522 + B * 0.072175
  const Z = (R * 0.0193339 + G * 0.119192 + B * 0.9503041) / 1.08883

  const f = (t: number): number =>
    t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116

  const fx = f(X)
  const fy = f(Y)
  const fz = f(Z)

  return {
    L: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  }
}

/** CIE76 colour difference. Roughly: under 1 is invisible, over 5 is obvious. */
export function deltaE(hexA: string, hexB: string): number {
  if (!hexA || !hexB) return Number.POSITIVE_INFINITY
  const A = hexToLab(hexA)
  const B = hexToLab(hexB)
  return Math.sqrt((A.L - B.L) ** 2 + (A.a - B.a) ** 2 + (A.b - B.b) ** 2)
}

/** Plain language band for a delta E, so the number is not read alone. */
export type MatchBand = 'exact' | 'close' | 'near' | 'far'

export function matchBand(d: number): MatchBand {
  if (d <= 2) return 'exact'
  if (d <= 6) return 'close'
  if (d <= 14) return 'near'
  return 'far'
}

/** Readable text colour for a swatch background. */
export function inkOn(hex: string): string {
  const { L } = hexToLab(hex)
  return clamp(L, 0, 100) > 60 ? '#14211e' : '#ffffff'
}
