// ─────────────────────────────────────────────
// Logograph generator v4 — glyph_base catalog system.
// The lattice and every legal stroke placement are decoded
// from src/renderer/src/glyphs/glyph_base.svg:
//   3 column lanes (x: 0/448/896, width 264)
//   3 row lanes    (y: 0/456/911, height 253)
//   span tiers: cell / cell+gap / two-cell / full
// Multiple strokes may share a lane if their intervals
// don't overlap. Crossings are segmented to kisses.
// ─────────────────────────────────────────────
export interface Bar {
  x: number
  y: number
  w: number
  h: number
}
export type Side = 'none' | 'top' | 'bottom' | 'left' | 'right'
export interface GenParams {
  strokes: number // target stroke count
  dominantSide: Side // lane/anchor bias
  cornerDetail: number // 0–1: extra single-cell blocks
  touching: number // 0–1: weight toward full/long spans (more crossings)
}

// Canvas matches glyph_base (note: transposed vs letters)
const W = 1160
const H = 1164
const SW = 264 // vertical stroke width
const SH = 253 // horizontal stroke height
const COLX = [0, 448, 896] // column lane lefts
const ROWY = [0, 456, 911] // row lane tops
const MIN_SEG = 100

type Tier = 'cell' | 'half' | 'two' | 'full'
interface Span {
  a: number
  b: number
  tier: Tier
}

/** All legal spans along one axis, per the base glyph */
function buildSpans(starts: number[], size: number): Span[] {
  const ends = starts.map((s) => s + size)
  const out: Span[] = []
  for (let i = 0; i < 3; i++) out.push({ a: starts[i], b: ends[i], tier: 'cell' })
  for (let i = 0; i < 2; i++) out.push({ a: starts[i], b: starts[i + 1], tier: 'half' })
  for (let i = 1; i < 3; i++) out.push({ a: ends[i - 1], b: ends[i], tier: 'half' })
  for (let i = 0; i < 2; i++) out.push({ a: starts[i], b: ends[i + 1], tier: 'two' })
  out.push({ a: starts[0], b: ends[2], tier: 'full' })
  return out
}
const H_SPANS = buildSpans(COLX, SW) // x-spans for horizontal strokes
const V_SPANS = buildSpans(ROWY, SH) // y-spans for vertical strokes

/** Deterministic RNG (mulberry32) — same seed, same drafts */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function hashId(id: string): number {
  let h = 2166136261
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619)
  return h >>> 0
}

export function barsToSvg(bars: Bar[]): string {
  const rects = bars
    .map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="currentColor"/>`)
    .join('')
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
}

/** Strict-overlap test: touching edges (equal coords) do NOT overlap */
function overlaps(a: Bar, b: Bar): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** Editor validity: in-bounds, sane minimum size, no pair overlapping */
export function validBars(bars: Bar[]): boolean {
  for (const b of bars) {
    if (b.w < 58 || b.h < 58) return false
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) return false
  }
  for (let i = 0; i < bars.length; i++)
    for (let j = i + 1; j < bars.length; j++) if (overlaps(bars[i], bars[j])) return false
  return true
}

/** Cut [a0,a1] by intervals; keep pieces >= MIN_SEG */
function cutIntervals(a0: number, a1: number, cuts: [number, number][]): [number, number][] {
  let iv: [number, number][] = [[a0, a1]]
  for (const [c0, c1] of cuts) {
    const next: [number, number][] = []
    for (const [s0, s1] of iv) {
      if (c1 <= s0 || c0 >= s1) {
        next.push([s0, s1])
        continue
      }
      if (c0 > s0) next.push([s0, c0])
      if (c1 < s1) next.push([c1, s1])
    }
    iv = next
  }
  return iv.filter(([s0, s1]) => s1 - s0 >= MIN_SEG)
}

/** Split a stroke where perpendicular strokes cross it — pieces kiss their edges */
function segmentRect(rect: Bar, horiz: boolean, perp: Bar[]): Bar[] {
  const cuts: [number, number][] = []
  for (const p of perp) {
    if (horiz) {
      if (p.y < rect.y + rect.h && rect.y < p.y + p.h) cuts.push([p.x, p.x + p.w])
    } else {
      if (p.x < rect.x + rect.w && rect.x < p.x + p.w) cuts.push([p.y, p.y + p.h])
    }
  }
  const s0 = horiz ? rect.x : rect.y
  const s1 = horiz ? rect.x + rect.w : rect.y + rect.h
  return cutIntervals(s0, s1, cuts).map(([a, b]) =>
    horiz ? { x: a, y: rect.y, w: b - a, h: rect.h } : { x: rect.x, y: a, w: rect.w, h: b - a }
  )
}
/** Lane choice (0–2) biased toward the dominant side */
function biasLane(r: () => number, side: Side, horiz: boolean): number {
  let v = r()
  if (horiz && side === 'top') v = Math.pow(v, 1.8)
  if (horiz && side === 'bottom') v = 1 - Math.pow(v, 1.8)
  if (!horiz && side === 'left') v = Math.pow(v, 1.8)
  if (!horiz && side === 'right') v = 1 - Math.pow(v, 1.8)
  return Math.min(2, Math.floor(v * 3))
}

// ── Themes: catalog-based seed compositions ──
interface SeedCtx {
  place: (horiz: boolean, lane: number, a: number, b: number) => boolean
  cell: (col: number, row: number) => boolean
  r: () => number
}
interface Theme {
  orient: 'h' | 'v' | 'mixed'
  params: GenParams
  seed: (ctx: SeedCtx) => void
}

const p = (over: Partial<GenParams> = {}): GenParams => ({
  strokes: 6,
  dominantSide: 'none',
  cornerDetail: 0.25,
  touching: 0.5,
  ...over
})

const THEMES: Record<string, Theme> = {
  ground: {
    orient: 'h',
    params: p({ dominantSide: 'bottom' }),
    seed: ({ place }) => void place(true, 2, 0, 1160)
  },
  sky: {
    orient: 'h',
    params: p({ dominantSide: 'top' }),
    seed: ({ place }) => void place(true, 0, 0, 1160)
  },
  water: {
    orient: 'h',
    params: p({ strokes: 5, touching: 0.3, cornerDetail: 0 }),
    seed: ({ place }) => {
      place(true, 0, 0, 712)
      place(true, 1, 448, 1160)
    }
  },
  fire: {
    orient: 'v',
    params: p({ dominantSide: 'bottom', touching: 0.4 }),
    seed: ({ place }) => {
      place(false, 1, 0, 1164)
      place(false, 0, 456, 1164)
      place(false, 2, 911, 1164)
    }
  },
  wind: {
    orient: 'h',
    params: p({ strokes: 5, touching: 0.25, cornerDetail: 0 }),
    seed: ({ place }) => {
      place(true, 0, 264, 712)
      place(true, 1, 448, 1160)
    }
  },
  ice: {
    orient: 'mixed',
    params: p({ cornerDetail: 0.5 }),
    seed: ({ place, cell }) => {
      place(false, 1, 0, 1164)
      cell(0, 0)
      cell(2, 2)
    }
  },
  lightning: {
    orient: 'v',
    params: p({ strokes: 5, touching: 0.4 }),
    seed: ({ place }) => {
      place(false, 0, 0, 456)
      place(true, 1, 0, 712)
      place(false, 2, 709, 1164)
    }
  },
  dark: {
    orient: 'mixed',
    params: p({ strokes: 7, touching: 0.9, cornerDetail: 0 }),
    seed: ({ place, cell }) => {
      place(true, 0, 0, 1160)
      place(true, 2, 0, 1160)
      place(false, 0, 0, 1164)
      place(false, 2, 0, 1164)
      cell(1, 1)
    }
  },
  light: {
    orient: 'mixed',
    params: p({ strokes: 5, touching: 0.1, cornerDetail: 0.5 }),
    seed: ({ place, cell }) => {
      cell(1, 1)
      place(false, 1, 0, 253)
      place(false, 1, 911, 1164)
      place(true, 1, 0, 264)
      place(true, 1, 896, 1160)
    }
  },
  abstract: {
    orient: 'mixed',
    params: p({ touching: 0.6 }),
    seed: () => undefined
  }
}

export const ROOT_THEMES: Record<string, keyof typeof THEMES> = {
  taus: 'ground',
  fuia: 'water',
  iia: 'fire',
  val: 'wind',
  uii: 'ice',
  zkas: 'lightning',
  hez: 'sky',
  eld: 'dark',
  huld: 'light'
}

export function defaultParams(rootId: string): GenParams {
  return { ...THEMES[ROOT_THEMES[rootId] ?? 'abstract'].params }
}
/** Generate one draft: catalog strokes on the base lattice */
export function generateBars(rootId: string, seed: number, params: GenParams): Bar[] {
  const theme = THEMES[ROOT_THEMES[rootId] ?? 'abstract']
  const r = rng(hashId(rootId) ^ Math.imul(seed, 2654435761))
  // per-lane occupied intervals (multiple strokes per lane allowed)
  const ivH: [number, number][][] = [[], [], []]
  const ivV: [number, number][][] = [[], [], []]
  const hLog: Bar[] = []
  const vLog: Bar[] = []
  const out: Bar[] = []
  let placed = 0

  const free = (list: [number, number][], a: number, b: number): boolean =>
    !list.some(([x, y]) => a < y && x < b)

  const place = (horiz: boolean, lane: number, a: number, b: number): boolean => {
    if (lane < 0 || lane > 2 || b <= a) return false
    const ivs = horiz ? ivH[lane] : ivV[lane]
    if (!free(ivs, a, b)) return false
    const rect: Bar = horiz
      ? { x: a, y: ROWY[lane], w: b - a, h: SH }
      : { x: COLX[lane], y: a, w: SW, h: b - a }
    const segs = segmentRect(rect, horiz, horiz ? vLog : hLog)
    if (segs.length === 0) return false
    ivs.push([a, b])
    ;(horiz ? hLog : vLog).push(rect)
    out.push(...segs)
    placed++
    return true
  }

  /** Single-cell block at (col,row) — placed as a 1-cell horizontal stroke */
  const cell = (col: number, row: number): boolean => {
    if (col < 0 || col > 2 || row < 0 || row > 2) return false
    const a = COLX[col]
    const rect: Bar = { x: a, y: ROWY[row], w: SW, h: SH }
    // a block must survive whole: skip if any vertical would cut it
    for (const v of vLog) if (overlaps(rect, v)) return false
    return place(true, row, a, a + SW)
  }

  theme.seed({ place, cell, r })

  const pickSpan = (spans: Span[], horiz: boolean): Span => {
    const roll = r()
    const tier: Tier =
      roll < params.touching * 0.5
        ? 'full'
        : roll < params.touching
          ? 'two'
          : r() < 0.5
            ? 'cell'
            : 'half'
    const pool = spans.filter((s) => s.tier === tier)
    const lowSide = horiz ? 'left' : 'top'
    const highSide = horiz ? 'right' : 'bottom'
    if (params.dominantSide === lowSide && r() < 0.7)
      return pool.reduce((m, s) => (s.a < m.a ? s : m))
    if (params.dominantSide === highSide && r() < 0.7)
      return pool.reduce((m, s) => (s.b > m.b ? s : m))
    return pool[Math.floor(r() * pool.length)]
  }

  const target = Math.min(params.strokes, 12)
  let guard = 90
  while (placed < target && guard-- > 0) {
    const horiz =
      theme.orient === 'h' ? r() < 0.8 : theme.orient === 'v' ? r() < 0.2 : r() < 0.5
    const lane = biasLane(r, params.dominantSide, horiz)
    const span = pickSpan(horiz ? H_SPANS : V_SPANS, horiz)
    place(horiz, lane, span.a, span.b)
  }

  // Extra block accents from cornerDetail
  const tries = Math.round(params.cornerDetail * (1 + r() * 3))
  for (let i = 0; i < tries; i++) {
    cell(Math.floor(r() * 3), Math.floor(r() * 3))
  }

  return out
}

/** A row of editable candidates */
export function generateCandidates(
  rootId: string,
  baseSeed: number,
  params: GenParams,
  count = 4
): Bar[][] {
  const result: Bar[][] = []
  for (let i = 0; i < count; i++) result.push(generateBars(rootId, baseSeed * 31 + i, params))
  return result
}