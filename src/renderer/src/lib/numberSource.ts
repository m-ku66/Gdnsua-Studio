// ─────────────────────────────────────────────
// Numeral resolution — runtime Foundry carvings overlay the
// static registry files, with tombstones for uncarving.
// Shares useGlyphStore with logographs so consumers re-render.
// ─────────────────────────────────────────────
import { words } from '../data'
import { getNumberGlyph, numberGlyphs } from './glyphRegistry'
import { useGlyphStore } from './logographSource'

const runtime = new Map<string, string | null>()

export function setRuntimeNumber(id: string, svg: string): void {
  runtime.set(id, svg)
  useGlyphStore.getState().bump()
}

export function removeRuntimeNumber(id: string): void {
  runtime.set(id, null)
  useGlyphStore.getState().bump()
}

/** Resolve a numeral glyph: runtime carving → registry file → null */
export function resolveNumberGlyph(id: string): string | null {
  if (runtime.has(id)) return runtime.get(id) ?? null
  return getNumberGlyph(id)
}

/** Every currently-available numeral glyph (for uniqueness checks) */
export function allNumeralGlyphs(): { id: string; svg: string }[] {
  const out = new Map<string, string>()
  for (const [id, svg] of numberGlyphs) out.set(id, svg)
  for (const [id, svg] of runtime) {
    if (svg === null) out.delete(id)
    else out.set(id, svg)
  }
  return [...out.entries()].map(([id, svg]) => ({ id, svg }))
}

/** All number-word ids, in data order */
export const NUMBER_WORD_IDS = words.filter((w) => w.category === 'number').map((w) => w.id)

/** Live carving tally for the footer */
export function carvedNumeralCount(): number {
  return NUMBER_WORD_IDS.filter((id) => resolveNumberGlyph(id) !== null).length
}
