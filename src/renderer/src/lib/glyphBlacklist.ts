// ─────────────────────────────────────────────
// Glyph blacklists.
// 1) Letters: logographs must never RESEMBLE a carved letter
//    (strict, IoU ≥ 0.86 on a coarse 12x12 occupancy signature).
// 2) Logographs: no two logographs may be (near-)IDENTICAL
//    (loose, IoU ≥ 0.98 — similar is fine, duplicates are not).
// ─────────────────────────────────────────────
import { letterGlyphs } from './glyphRegistry'
import { allCarvedLogographs } from './logographSource'
import { allNumeralGlyphs } from './numberSource'
import type { Bar } from './logographGen'

const N = 12
const THRESH = 0.86
const DUP_THRESH = 0.98

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(name + '="([^"]+)"'))
  return m ? m[1] : null
}

/** Parse <rect>s (handles rotate(±90/180) transforms) into axis-aligned rects */
export function parseRects(svg: string): Bar[] {
  const out: Bar[] = []
  for (const tag of svg.match(/<rect\b[^>]*>/g) ?? []) {
    const w = parseFloat(attr(tag, 'width') ?? '0')
    const h = parseFloat(attr(tag, 'height') ?? '0')
    if (!w || !h) continue
    const x = parseFloat(attr(tag, 'x') ?? '0')
    const y = parseFloat(attr(tag, 'y') ?? '0')
    const rot = attr(tag, 'transform')?.match(
      /rotate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/
    )
    if (!rot) {
      out.push({ x, y, w, h })
      continue
    }
    const a = ((parseFloat(rot[1]) % 360) + 360) % 360
    const cx = parseFloat(rot[2])
    const cy = parseFloat(rot[3])
    const c = Math.round(Math.cos((a * Math.PI) / 180))
    const s = Math.round(Math.sin((a * Math.PI) / 180))
    const pts: [number, number][] = (
      [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h]
      ] as [number, number][]
    ).map(([px, py]) => [cx + c * (px - cx) - s * (py - cy), cy + s * (px - cx) + c * (py - cy)])
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    const left = Math.min(...xs)
    const top = Math.min(...ys)
    out.push({ x: left, y: top, w: Math.max(...xs) - left, h: Math.max(...ys) - top })
  }
  return out
}

function signature(rects: Bar[], vw: number, vh: number): boolean[] {
  const sig: boolean[] = new Array(N * N).fill(false)
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const px = ((i + 0.5) * vw) / N
      const py = ((j + 0.5) * vh) / N
      sig[j * N + i] = rects.some(
        (r) => px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h
      )
    }
  return sig
}

function iou(a: boolean[], b: boolean[]): number {
  let inter = 0
  let uni = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] && b[i]) inter++
    if (a[i] || b[i]) uni++
  }
  return uni === 0 ? 0 : inter / uni
}

let letterSigs: { id: string; sig: boolean[] }[] | null = null
function getLetterSigs(): { id: string; sig: boolean[] }[] {
  if (letterSigs) return letterSigs
  letterSigs = []
  for (const [id, svg] of letterGlyphs) {
    const vb = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1164 1160').split(/\s+/).map(Number)
    const rects = parseRects(svg)
    if (rects.length) letterSigs.push({ id, sig: signature(rects, vb[2] || 1164, vb[3] || 1160) })
  }
  return letterSigs
}

/** Returns the id of the letter this shape matches, or null if it's clear */
export function letterMatch(bars: Bar[], threshold = THRESH): string | null {
  if (bars.length === 0) return null
  const sig = signature(bars, 1160, 1164)
  let best: string | null = null
  let bestV = threshold
  for (const l of getLetterSigs()) {
    const v = iou(sig, l.sig)
    if (v >= bestV) {
      bestV = v
      best = l.id
    }
  }
  return best
}

/**
 * Returns the id of an existing logograph this shape (near-)duplicates,
 * or null. Looser than the letter check by design: logographs may look
 * similar, they just can't be EXACTLY the same. excludeId lets a root
 * re-carve its own shape. Not cached — the carved set changes at runtime.
 */
export function logographMatch(bars: Bar[], excludeId: string): string | null {
  if (bars.length === 0) return null
  const sig = signature(bars, 1160, 1164)
  for (const { id, svg } of allCarvedLogographs()) {
    if (id === excludeId) continue
    const rects = parseRects(svg)
    if (!rects.length) continue
    const vb = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1160 1164').split(/\s+/).map(Number)
    if (iou(sig, signature(rects, vb[2] || 1160, vb[3] || 1164)) >= DUP_THRESH) return id
  }
  return null
}

/**
 * Same near-identical rule for numerals: a carved numeral may not
 * duplicate any existing numeral glyph (hand-made files included).
 * Hand-made SVGs without <rect>s can't be signatured and are skipped.
 */
export function numeralMatch(bars: Bar[], excludeId: string): string | null {
  if (bars.length === 0) return null
  const sig = signature(bars, 1160, 1164)
  for (const { id, svg } of allNumeralGlyphs()) {
    if (id === excludeId) continue
    const rects = parseRects(svg)
    if (!rects.length) continue
    const vb = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? '0 0 1160 1164').split(/\s+/).map(Number)
    if (iou(sig, signature(rects, vb[2] || 1160, vb[3] || 1164)) >= DUP_THRESH) return id
  }
  return null
}