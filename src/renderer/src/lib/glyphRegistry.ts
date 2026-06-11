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

// ── Modifier SVG analysis ─────────────────────
// Modifier exports include a near-invisible "dummy" rect marking where
// the host glyph sits (1164×1160 in source canvases). Its offset inside
// the viewBox tells us the mark's position — the SVG is self-describing.

export interface ModifierGlyphInfo {
  svg: string
  viewBox: { w: number; h: number }
  /** The dummy host rect, in viewBox coordinates */
  host: { x: number; y: number; w: number; h: number } | null
  position: 'left' | 'right' | 'top' | 'bottom' | 'overlay'
}

function parseModifier(svg: string): ModifierGlyphInfo {
  const vb = svg.match(/viewBox="([\d.\s-]+)"/)
  const [, , vbW = 100, vbH = 100] = (vb?.[1] ?? '').split(/\s+/).map(Number)

  // Host = the rect covering the majority of the canvas
  let host: ModifierGlyphInfo['host'] = null
  const rects = [...svg.matchAll(/<rect\b[^>]*>/g)].map((m) => m[0])
  for (const r of rects) {
    const attr = (name: string): number =>
      Number(r.match(new RegExp(`(?:^|[\\s"<])${name}="([\\d.-]+)"`))?.[1] ?? 0)
    const cand = { x: attr('x'), y: attr('y'), w: attr('width'), h: attr('height') }
    if (cand.w * cand.h > vbW * vbH * 0.4 && (!host || cand.w * cand.h > host.w * host.h)) {
      host = cand
    }
  }

  // Position = the side of the host with the most free canvas space
  let position: ModifierGlyphInfo['position'] = 'overlay'
  if (host) {
    const space = {
      left: host.x,
      right: vbW - (host.x + host.w),
      top: host.y,
      bottom: vbH - (host.y + host.h)
    }
    const [side, max] = Object.entries(space).sort((a, b) => b[1] - a[1])[0] as [
      ModifierGlyphInfo['position'],
      number
    ]
    if (max > Math.min(vbW, vbH) * 0.02) position = side
  }

  return { svg, viewBox: { w: vbW, h: vbH }, host, position }
}

const modifierInfoCache = new Map<string, ModifierGlyphInfo>()
for (const [id, svg] of modifierGlyphs) {
  modifierInfoCache.set(id, parseModifier(svg))
}

export const getModifierInfo = (id: string): ModifierGlyphInfo | null =>
  modifierInfoCache.get(id) ?? null
