// ─────────────────────────────────────────────
// Logograph draft generator v2 — parametric, grid-based.
// Bars occupy cells on a 10×10 grid (U=116px): overlap is
// impossible by construction; shared edges = kissing.
// Params: strokes, dominantSide, cornerDetail, touching.
// ─────────────────────────────────────────────
export interface Bar {
  x: number
  y: number
  w: number
  h: number
}
export type Side = 'none' | 'top' | 'bottom' | 'left' | 'right'
export interface GenParams {
  strokes: number // target bar count
  dominantSide: Side // density bias
  cornerDetail: number // 0–1: small punctuation blocks
  touching: number // 0–1: probability a bar must kiss another
}

const COLS = 10
const ROWS = 10
const U = 116
const W = 1164
const H = 1160
const TH = 2 // bar thickness in cells (= 232px, matches letters)

interface GBar {
  gx: number
  gy: number
  gw: number
  gh: number
}

const toPx = (g: GBar): Bar => ({ x: g.gx * U, y: g.gy * U, w: g.gw * U, h: g.gh * U })

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

/** Strict-overlap test in px: touching edges (equal coords) do NOT overlap */
function overlaps(a: Bar, b: Bar): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** Editor validity: in-bounds, grid-snapped sizes, no pair overlapping */
export function validBars(bars: Bar[]): boolean {
  for (const b of bars) {
    if (b.w < U || b.h < U) return false
    if (b.x < 0 || b.y < 0 || b.x + b.w > W || b.y + b.h > H) return false
  }
  for (let i = 0; i < bars.length; i++)
    for (let j = i + 1; j < bars.length; j++) if (overlaps(bars[i], bars[j])) return false
  return true
}

// ── Grid occupancy ────────────────────────────
type Occ = boolean[][]
const newOcc = (): Occ => Array.from({ length: ROWS }, () => Array(COLS).fill(false))

function fits(g: GBar, occ: Occ): boolean {
  if (g.gx < 0 || g.gy < 0 || g.gx + g.gw > COLS || g.gy + g.gh > ROWS) return false
  for (let y = g.gy; y < g.gy + g.gh; y++)
    for (let x = g.gx; x < g.gx + g.gw; x++) if (occ[y][x]) return false
  return true
}

function stamp(g: GBar, occ: Occ): void {
  for (let y = g.gy; y < g.gy + g.gh; y++)
    for (let x = g.gx; x < g.gx + g.gw; x++) occ[y][x] = true
}

/** Coordinate sampling skewed toward the dominant side */
function biased(r: () => number, side: Side, axis: 'x' | 'y', max: number): number {
  let v = r()
  if (axis === 'y' && side === 'top') v = Math.pow(v, 1.9)
  if (axis === 'y' && side === 'bottom') v = 1 - Math.pow(v, 1.9)
  if (axis === 'x' && side === 'left') v = Math.pow(v, 1.9)
  if (axis === 'x' && side === 'right') v = 1 - Math.pow(v, 1.9)
  return Math.min(max, Math.floor(v * (max + 1)))
}

/** Candidate placements that share an edge with a host bar (a kiss) */
function touchSpots(host: GBar, g: GBar, r: () => number): [number, number][] {
  const spots: [number, number][] = []
  const along = (n: number): number => Math.floor(r() * n)
  // left / right of host
  spots.push([host.gx - g.gw, host.gy + along(host.gh)])
  spots.push([host.gx + host.gw, host.gy + along(host.gh)])
  // above / below host
  spots.push([host.gx + along(host.gw), host.gy - g.gh])
  spots.push([host.gx + along(host.gw), host.gy + host.gh])
  // shuffle
  for (let i = spots.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[spots[i], spots[j]] = [spots[j], spots[i]]
  }
  return spots
}

// ── Themes: seed structure + orientation bias + default params ──
interface Theme {
  orient: 'h' | 'v' | 'mixed'
  params: GenParams
  seed: (add: (g: GBar) => boolean, r: () => number) => void
}

const base = (over: Partial<GenParams> = {}): GenParams => ({
  strokes: 8,
  dominantSide: 'none',
  cornerDetail: 0.5,
  touching: 0.75,
  ...over
})

const THEMES: Record<string, Theme> = {
  ground: {
    orient: 'h',
    params: base({ dominantSide: 'bottom', strokes: 7 }),
    seed: (add) => add({ gx: 0, gy: 8, gw: 10, gh: 2 })
  },
  water: {
    orient: 'h',
    params: base({ strokes: 9, touching: 0.5 }),
    seed: (add, r) => {
      add({ gx: 0, gy: 1, gw: 5 + Math.floor(r() * 3), gh: 2 })
      add({ gx: 3 + Math.floor(r() * 2), gy: 6, gw: 5, gh: 2 })
    }
  },
  fire: {
    orient: 'v',
    params: base({ dominantSide: 'bottom', strokes: 8 }),
    seed: (add, r) => {
      add({ gx: 4, gy: 1 + Math.floor(r() * 2), gw: 2, gh: 7 })
      add({ gx: 1, gy: 4, gw: 2, gh: 6 })
      add({ gx: 7, gy: 4 + Math.floor(r() * 2), gw: 2, gh: 4 })
    }
  },
  wind: {
    orient: 'h',
    params: base({ strokes: 9, touching: 0.4 }),
    seed: (add, r) => {
      add({ gx: 0, gy: 2, gw: 4 + Math.floor(r() * 2), gh: 2 })
      add({ gx: 4, gy: 5 + Math.floor(r() * 2), gw: 5, gh: 2 })
    }
  },
  ice: {
    orient: 'mixed',
    params: base({ strokes: 9, cornerDetail: 0.7 }),
    seed: (add) => {
      add({ gx: 4, gy: 0, gw: 2, gh: 10 })
      add({ gx: 0, gy: 2, gw: 4, gh: 2 })
      add({ gx: 6, gy: 6, gw: 4, gh: 2 })
    }
  },
  lightning: {
    orient: 'v',
    params: base({ strokes: 7, touching: 0.85 }),
    seed: (add, r) => {
      const drop = Math.floor(r() * 2)
      add({ gx: 1, gy: 0, gw: 2, gh: 4 + drop })
      add({ gx: 1, gy: 4 + drop, gw: 7, gh: 2 })
      add({ gx: 6, gy: 6 + drop, gw: 2, gh: 4 - drop })
    }
  },
  sky: {
    orient: 'h',
    params: base({ dominantSide: 'top', strokes: 7 }),
    seed: (add) => add({ gx: 0, gy: 0, gw: 10, gh: 2 })
  },
  dark: {
    orient: 'mixed',
    params: base({ strokes: 10, touching: 0.9, cornerDetail: 0.3 }),
    seed: (add) => {
      add({ gx: 0, gy: 0, gw: 10, gh: 2 })
      add({ gx: 0, gy: 8, gw: 10, gh: 2 })
      add({ gx: 0, gy: 2, gw: 2, gh: 6 })
      add({ gx: 8, gy: 2, gw: 2, gh: 6 })
      add({ gx: 3, gy: 3, gw: 4, gh: 4 })
    }
  },
  light: {
    orient: 'mixed',
    params: base({ strokes: 9, touching: 0.2, cornerDetail: 0.6 }),
    seed: (add) => {
      add({ gx: 4, gy: 4, gw: 2, gh: 2 })
      add({ gx: 4, gy: 0, gw: 2, gh: 3 })
      add({ gx: 4, gy: 7, gw: 2, gh: 3 })
      add({ gx: 0, gy: 4, gw: 3, gh: 2 })
      add({ gx: 7, gy: 4, gw: 3, gh: 2 })
    }
  },
  abstract: {
    orient: 'mixed',
    params: base(),
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

/** Generate one draft as bars (editable form) */
export function generateBars(rootId: string, seed: number, params: GenParams): Bar[] {
  const theme = THEMES[ROOT_THEMES[rootId] ?? 'abstract']
  const r = rng(hashId(rootId) ^ Math.imul(seed, 2654435761))
  const occ = newOcc()
  const gbars: GBar[] = []
  const add = (g: GBar): boolean => {
    if (!fits(g, occ)) return false
    stamp(g, occ)
    gbars.push(g)
    return true
  }

  theme.seed(add, r)

  let guard = 300
  while (gbars.length < params.strokes && guard-- > 0) {
    const vertical = theme.orient === 'v' ? true : theme.orient === 'h' ? false : r() < 0.5
    const len = 2 + Math.floor(r() * 5)
    const shape = vertical ? { gw: TH, gh: len } : { gw: len, gh: TH }

    if (gbars.length > 0 && r() < params.touching) {
      const host = gbars[Math.floor(r() * gbars.length)]
      let placed = false
      for (const [gx, gy] of touchSpots(host, { gx: 0, gy: 0, ...shape }, r)) {
        if (add({ ...shape, gx, gy })) {
          placed = true
          break
        }
      }
      if (placed) continue
    }
    add({
      ...shape,
      gx: biased(r, params.dominantSide, 'x', COLS - shape.gw),
      gy: biased(r, params.dominantSide, 'y', ROWS - shape.gh)
    })
  }

  // Corner punctuation: 1×1 blocks kissing existing bar corners
  const detail = Math.round(params.cornerDetail * (2 + r() * 4))
  for (let k = 0; k < detail && gbars.length > 0; k++) {
    const b = gbars[Math.floor(r() * gbars.length)]
    const corners: [number, number][] = [
      [b.gx - 1, b.gy],
      [b.gx + b.gw, b.gy],
      [b.gx - 1, b.gy + b.gh - 1],
      [b.gx + b.gw, b.gy + b.gh - 1],
      [b.gx, b.gy - 1],
      [b.gx + b.gw - 1, b.gy - 1],
      [b.gx, b.gy + b.gh],
      [b.gx + b.gw - 1, b.gy + b.gh]
    ]
    const [gx, gy] = corners[Math.floor(r() * corners.length)]
    add({ gx, gy, gw: 1, gh: 1 })
  }

  return gbars.map(toPx)
}

/** A row of editable candidates */
export function generateCandidates(
  rootId: string,
  baseSeed: number,
  params: GenParams,
  count = 4
): Bar[][] {
  const out: Bar[][] = []
  for (let i = 0; i < count; i++) out.push(generateBars(rootId, baseSeed * 31 + i, params))
  return out
}
