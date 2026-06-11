// ─────────────────────────────────────────────
// Logograph resolution + composition engine.
// Resolution order: runtime approvals → carved file →
// live composition from derivedFrom parts → null.
// Composition grammar (by part count):
//   2 → side-by-side halves
//   3 → first part left half, other two stacked right
//   4 → 2×2 grid
// ─────────────────────────────────────────────
import { create } from 'zustand'
import { wordById } from '../data'
import { getLogographGlyph } from './glyphRegistry'

const W = 1164
const H = 1160
const GAP = 80

// Runtime approvals (Forge) — render immediately, persisted via IPC.
// A null entry is a tombstone: explicitly uncarved this session.
const runtime = new Map<string, string | null>()

interface GlyphStoreState {
  version: number
  bump: () => void
}
/** Subscribe to this in components that render logographs */
export const useGlyphStore = create<GlyphStoreState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 }))
}))

export function setRuntimeLogograph(id: string, svg: string): void {
  runtime.set(id, svg)
  useGlyphStore.getState().bump()
}

/** Uncarve: tombstone the id so neither runtime nor file resolves */
export function removeRuntimeLogograph(id: string): void {
  runtime.set(id, null)
  useGlyphStore.getState().bump()
}

interface Slot {
  x: number
  y: number
  w: number
  h: number
}

function slots(n: number): Slot[] | null {
  const hw = (W - GAP) / 2
  const hh = (H - GAP) / 2
  if (n === 2)
    return [
      { x: 0, y: 0, w: hw, h: H },
      { x: hw + GAP, y: 0, w: hw, h: H }
    ]
  if (n === 3)
    return [
      { x: 0, y: 0, w: hw, h: H },
      { x: hw + GAP, y: 0, w: hw, h: hh },
      { x: hw + GAP, y: hh + GAP, w: hw, h: hh }
    ]
  if (n === 4)
    return [
      { x: 0, y: 0, w: hw, h: hh },
      { x: hw + GAP, y: 0, w: hw, h: hh },
      { x: 0, y: hh + GAP, w: hw, h: hh },
      { x: hw + GAP, y: hh + GAP, w: hw, h: hh }
    ]
  return null
}

/** Embed a part SVG into a slot, preserving its own viewBox scaling */
function embed(svg: string, s: Slot): string {
  const m = svg.match(/<svg([^>]*)>([\s\S]*)<\/svg>/)
  if (!m) return ''
  const vb = m[1].match(/viewBox="([^"]+)"/)?.[1] ?? `0 0 ${W} ${H}`
  return `<svg x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" viewBox="${vb}" preserveAspectRatio="xMidYMid meet">${m[2]}</svg>`
}

export interface ResolvedLogograph {
  svg: string
  source: 'carved' | 'composed'
}

/**
 * Resolve a word's logograph. Recursion lets compounds compose from
 * parts that are themselves composed (depth-limited).
 */
export function resolveLogograph(id: string, depth = 0): ResolvedLogograph | null {
  if (runtime.has(id)) {
    const rt = runtime.get(id)
    if (rt) return { svg: rt, source: 'carved' }
    // tombstone: skip the file, fall through to composition
  } else {
    const file = getLogographGlyph(id)
    if (file) return { svg: file, source: 'carved' }
  }

  if (depth >= 3) return null
  const word = wordById.get(id)
  const parts = word?.derivedFrom
  if (!parts || parts.length < 2 || parts.length > 4) return null

  const partSvgs: string[] = []
  for (const pid of parts) {
    const resolved = resolveLogograph(pid, depth + 1)
    if (!resolved) return null
    partSvgs.push(resolved.svg)
  }

  const layout = slots(partSvgs.length)
  if (!layout) return null
  const inner = partSvgs.map((svg, i) => embed(svg, layout[i])).join('')
  return {
    svg: `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`,
    source: 'composed'
  }
}
