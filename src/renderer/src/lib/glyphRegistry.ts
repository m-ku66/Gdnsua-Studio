// ─────────────────────────────────────────────
// Glyph registry — auto-loads SVGs dropped into
// src/renderer/src/glyphs/{letters,modifiers,logographs}
// Files are keyed by filename: "mn.svg" → letter id "mn"
// ─────────────────────────────────────────────

const letterFiles = import.meta.glob('../glyphs/letters/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const modifierFiles = import.meta.glob('../glyphs/modifiers/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

const logographFiles = import.meta.glob('../glyphs/logographs/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>

/** Recolor fills/strokes to currentColor so glyphs inherit UI ink */
function normalize(svg: string): string {
  return svg
    .replace(/fill="(?!none)[^"]*"/gi, 'fill="currentColor"')
    .replace(/stroke="(?!none)[^"]*"/gi, 'stroke="currentColor"')
    .replace(/fill:\s*(?!none|currentColor)[^;"']+/gi, 'fill:currentColor')
}

function buildMap(files: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>()
  for (const [path, raw] of Object.entries(files)) {
    const name = path.split('/').pop()?.replace(/\.svg$/i, '').toLowerCase()
    if (name) map.set(name, normalize(raw))
  }
  return map
}

export const letterGlyphs = buildMap(letterFiles)
export const modifierGlyphs = buildMap(modifierFiles)
export const logographGlyphs = buildMap(logographFiles)

export const getLetterGlyph = (id: string): string | null => letterGlyphs.get(id) ?? null

export const getModifierGlyph = (id: string): string | null => modifierGlyphs.get(id) ?? null

export const getLogographGlyph = (id: string): string | null => logographGlyphs.get(id) ?? null

/** Carving progress, e.g. for the footer or plate captions */
export const glyphCounts = {
  letters: letterGlyphs.size,
  modifiers: modifierGlyphs.size,
  logographs: logographGlyphs.size
}
