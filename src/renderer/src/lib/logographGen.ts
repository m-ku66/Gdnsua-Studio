// ─────────────────────────────────────────────
// Logograph generator v3 — lane-based composition.
// Strokes: fixed thickness (~263px), quantized lengths
// (short 270 / mid 706 / full), one bar per lane.
// Crossings are SEGMENTED: pieces kiss the perpendicular
// bar's edges — looks like a crossing, never overlaps.
// ─────────────────────────────────────────────
export interface Bar {
  x: number
  y: number
  w: number
  h: number
}
export type Side = 'none' | 'top' | 'bottom' | 'left' | 'right'
export interface GenParams {
  strokes: number // target bar count (max 8: 4 H + 4 V lanes)
  dominantSide: Side // lane/anchor bias
  cornerDetail: number // 0–1: block accents at free crossings
  touching: number // 0–1: probability a bar runs FULL length (more crossings)
}

const W = 1164
const H = 1160
const T = 262 // stroke thickness (spec: 262.87)
const LEN_S = 270 // spec: 270.9
const LEN_M = 706 // spec: 706.52
const LANES = 4
const CELL_Y = H / LANES // 290
const CELL_X = W / LANES // 291
const MIN_SEG = 116 // segments shorter than this are dropped

const hCenter = (lane: number): number => Math.round(lane * CELL_Y + CELL_Y / 2)
const vCenter = (lane: number): number => Math.round(lane * CELL_X + CELL_X / 2)

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

/** Split a bar where perpendicular bars cross it — pieces kiss their edges */
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
/** Lane/anchor bias toward the dominant side */
function biasLane(r: () => number, side: Side, horiz: boolean): number {
  let v = r()
  if (horiz && side === 'top') v = Math.pow(v, 1.8)
  if (horiz && side === 'bottom') v = 1 - Math.pow(v, 1.8)
  if (!horiz && side === 'left') v = Math.pow(v, 1.8)
  if (!horiz && side === 'right') v = 1 - Math.pow(v, 1.8)
  return Math.min(LANES - 1, Math.floor(v * LANES))
}

/** Pick a start for a partial bar: ends or gridlines, side-biased */
function startOf(r: () => number, horiz: boolean, len: number, side: Side): number {
  const axis = horiz ? W : H
  const cell = horiz ? CELL_X : CELL_Y
  if (len >= axis) return 0
  const lowSide = horiz ? 'left' : 'top'
  const highSide = horiz ? 'right' : 'bottom'
  if (side === lowSide && r() < 0.7) return 0
  if (side === highSide && r() < 0.7) return axis - len
  const opts: number[] = [0, axis - len]
  for (let k = 1; k < LANES; k++) {
    const s = Math.round(k * cell)
    if (s + len <= axis && !opts.includes(s)) opts.push(s)
  }
  return opts[Math.floor(r() * opts.length)]
}

// ── Themes: lane-based seed compositions ──────
interface SeedCtx {
  place: (horiz: boolean, lane: number, len: number, start: number) => boolean
  addBlock: (vLane: number, hLane: number) => boolean
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
    seed: ({ place }) => void place(true, 3, W, 0)
  },
  sky: {
    orient: 'h',
    params: p({ dominantSide: 'top' }),
    seed: ({ place }) => void place(true, 0, W, 0)
  },
  water: {
    orient: 'h',
    params: p({ strokes: 5, touching: 0.25, cornerDetail: 0 }),
    seed: ({ place }) => {
      place(true, 1, LEN_M, 0)
      place(true, 2, LEN_M, W - LEN_M)
    }
  },
  fire: {
    orient: 'v',
    params: p({ dominantSide: 'bottom', touching: 0.4 }),
    seed: ({ place }) => {
      place(false, 2, H, 0)
      place(false, 1, LEN_M, H - LEN_M)
    }
  },
  wind: {
    orient: 'h',
    params: p({ strokes: 5, touching: 0.2, cornerDetail: 0 }),
    seed: ({ place }) => {
      place(true, 0, LEN_M, W - LEN_M)
      place(true, 2, LEN_M, 0)
    }
  },
  ice: {
    orient: 'mixed',
    params: p({ cornerDetail: 0.5 }),
    seed: ({ place }) => {
      place(false, 2, H, 0)
      place(true, 1, LEN_S, 0)
      place(true, 3, LEN_S, W - LEN_S)
    }
  },
  lightning: {
    orient: 'v',
    params: p({ strokes: 5, touching: 0.4 }),
    seed: ({ place }) => {
      place(false, 1, LEN_S, 0)
      place(true, 1, LEN_M, Math.round(CELL_X))
      place(false, 2, LEN_S, H - LEN_S)
    }
  },
  dark: {
    orient: 'mixed',
    params: p({ strokes: 8, touching: 0.9, cornerDetail: 0 }),
    seed: ({ place, addBlock }) => {
      place(true, 0, W, 0)
      place(true, 3, W, 0)
      place(false, 0, H, 0)
      place(false, 3, H, 0)
      addBlock(1, 1)
      addBlock(2, 2)
    }
  },
  light: {
    orient: 'mixed',
    params: p({ strokes: 5, touching: 0.1, cornerDetail: 0.5 }),
    seed: ({ place, addBlock }) => {
      place(false, 2, LEN_S, 0)
      place(false, 1, LEN_S, H - LEN_S)
      place(true, 2, LEN_S, 0)
      place(true, 1, LEN_S, W - LEN_S)
      addBlock(0, 0)
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
/** Generate one draft: lane-placed bars, crossings segmented to kisses */
export function generateBars(rootId: string, seed: number, params: GenParams): Bar[] {
  const theme = THEMES[ROOT_THEMES[rootId] ?? 'abstract']
  const r = rng(hashId(rootId) ^ Math.imul(seed, 2654435761))
  const usedH = new Set<number>()
  const usedV = new Set<number>()
  const hLog: Bar[] = []
  const vLog: Bar[] = []
  const out: Bar[] = []
  const blocks: Bar[] = []
  let placed = 0

  const place = (horiz: boolean, lane: number, len: number, start: number): boolean => {
    if (lane < 0 || lane >= LANES) return false
    if ((horiz ? usedH : usedV).has(lane)) return false
    let x: number, y: number, w: number, h: number
    if (horiz) {
      w = Math.min(len, W)
      x = Math.max(0, Math.min(start, W - w))
      y = hCenter(lane) - T / 2
      h = T
    } else {
      h = Math.min(len, H)
      y = Math.max(0, Math.min(start, H - h))
      x = vCenter(lane) - T / 2
      w = T
    }
    const rect: Bar = { x, y, w, h }
    const segs = segmentRect(rect, horiz, horiz ? vLog : hLog)
    if (segs.length === 0) return false
    ;(horiz ? usedH : usedV).add(lane)
    ;(horiz ? hLog : vLog).push(rect)
    out.push(...segs)
    placed++
    return true
  }

  /** Block accent at a free lane crossing; claims both lanes */
  const addBlock = (vLane: number, hLane: number): boolean => {
    if (usedV.has(vLane) || usedH.has(hLane)) return false
    const b: Bar = { x: vCenter(vLane) - T / 2, y: hCenter(hLane) - T / 2, w: T, h: T }
    for (const ex of blocks) if (overlaps(b, ex)) return false
    blocks.push(b)
    usedV.add(vLane)
    usedH.add(hLane)
    return true
  }

  theme.seed({ place, addBlock, r })

  const target = Math.min(params.strokes, LANES * 2)
  let guard = 80
  while (placed < target && guard-- > 0) {
    const horiz =
      theme.orient === 'h' ? r() < 0.8 : theme.orient === 'v' ? r() < 0.2 : r() < 0.5
    const lane = biasLane(r, params.dominantSide, horiz)
    const full = r() < params.touching
    const len = full ? (horiz ? W : H) : r() < 0.5 ? LEN_S : LEN_M
    const start = full ? 0 : startOf(r, horiz, len, params.dominantSide)
    place(horiz, lane, len, start)
  }

  // Block accents from cornerDetail
  const tries = Math.round(params.cornerDetail * (1 + r() * 3))
  for (let i = 0; i < tries; i++) {
    addBlock(Math.floor(r() * LANES), Math.floor(r() * LANES))
  }

  return [...out, ...blocks]
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