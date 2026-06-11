// ─────────────────────────────────────────────
// Logograph draft generator — geometric, grid-snapped,
// pictographic in spirit. Canvas matches hand-carved
// glyphs: 1164x1160, filled rects, right angles only.
// ─────────────────────────────────────────────
const W = 1164
const H = 1160
const U = 116 // grid unit
const T = 232 // standard bar thickness (matches letter exports)

interface Bar {
  x: number
  y: number
  w: number
  h: number
}

const snap = (v: number): number => Math.max(0, Math.round(v / U) * U)

/** Deterministic RNG (mulberry32) so drafts are reproducible per seed */
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

function toSvg(bars: Bar[]): string {
  const rects = bars
    .map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="currentColor"/>`)
    .join('')
  return `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${rects}</svg>`
}

type Template = (r: () => number) => Bar[]
const templates: Record<string, Template> = {
  // TAUS — ground: heavy base, a stone or two resting above
  ground: (r) => {
    const bars: Bar[] = [{ x: 0, y: H - T, w: W, h: T }]
    const stones = 1 + Math.floor(r() * 2)
    for (let i = 0; i < stones; i++) {
      const w = snap(U * (2 + r() * 2))
      bars.push({ x: snap(r() * (W - w)), y: H - T - U - T, w, h: T })
    }
    if (r() > 0.5) bars.push({ x: snap(r() * 2 * U), y: H - T * 2 - U * 4, w: snap(W * 0.4), h: T })
    return bars
  },
  // FUIA — water: broken horizontals, staggered like waves
  water: (r) => {
    const bars: Bar[] = []
    for (let i = 0; i < 3; i++) {
      const w = snap(W * (0.55 + r() * 0.35))
      const x = i % 2 === 0 ? 0 : W - w
      bars.push({ x: snap(x), y: snap(U + i * (H / 3)), w, h: T })
    }
    return bars
  },
  // IIA — fire: verticals rising from the ground, center tallest
  fire: (r) => {
    const bars: Bar[] = []
    const n = 3 + Math.floor(r() * 2)
    const span = W / n
    for (let i = 0; i < n; i++) {
      const center = Math.abs(i - (n - 1) / 2) / ((n - 1) / 2)
      const h = snap(H * (0.9 - center * (0.35 + r() * 0.2)))
      bars.push({ x: snap(i * span + (span - T) / 2), y: H - h, w: T, h })
    }
    return bars
  },
  // VAL — wind: horizontals drifting, each further along
  wind: (r) => {
    const bars: Bar[] = []
    for (let i = 0; i < 3; i++) {
      const w = snap(W * (0.45 + r() * 0.2))
      bars.push({ x: snap(i * U * (1.5 + r()), ), y: snap(U + i * (H / 3)), w: Math.min(w, W - snap(i * U * 1.5)), h: T })
    }
    return bars
  },
  // UII — ice: frozen water, a crystal bar locking the waves
  ice: (r) => {
    const bars: Bar[] = [
      { x: 0, y: snap(H / 4), w: snap(W * (0.6 + r() * 0.3)), h: T },
      { x: snap(W * 0.25), y: snap((H / 4) * 2.6), w: snap(W * 0.75), h: T }
    ]
    const cx = snap(W / 2 - T / 2 + (r() - 0.5) * 2 * U)
    bars.push({ x: cx, y: 0, w: T, h: H })
    return bars
  },
  // ZKAS — lightning: a stair-step strike, top to bottom
  lightning: (r) => {
    const x1 = snap(U * (1 + r() * 2))
    const x2 = snap(W - U * (1 + r() * 2) - T)
    const yMid = snap(H * (0.35 + r() * 0.3))
    return [
      { x: x1, y: 0, w: T, h: yMid + T },
      { x: x1, y: yMid, w: x2 - x1 + T, h: T },
      { x: x2, y: yMid, w: T, h: H - yMid }
    ]
  },
  // HEZ — sky: mass above, open below, a far thin horizon
  sky: (r) => {
    const bars: Bar[] = [{ x: 0, y: 0, w: W, h: T }]
    const w = snap(W * (0.5 + r() * 0.3))
    bars.push({ x: snap((W - w) / 2), y: T + U, w, h: T })
    if (r() > 0.4) bars.push({ x: snap(r() * (W - U * 2)), y: H - T, w: U * 2, h: T })
    return bars
  },
  // ELD — darkness: a heavy frame closing on a heavy heart
  dark: (r) => {
    const m = snap(U * (1.5 + r()))
    return [
      { x: 0, y: 0, w: W, h: T },
      { x: 0, y: H - T, w: W, h: T },
      { x: 0, y: 0, w: T, h: H },
      { x: W - T, y: 0, w: T, h: H },
      { x: T + m, y: T + m, w: W - 2 * (T + m), h: H - 2 * (T + m) }
    ]
  },
  // HULD — light: a small heart, rays held apart by space
  light: (r) => {
    const c = snap(U * (1 + r()))
    const heart = U * 2
    const hx = (W - heart) / 2
    const hy = (H - heart) / 2
    return [
      { x: hx, y: hy, w: heart, h: heart },
      { x: hx + heart / 2 - T / 2, y: 0, w: T, h: hy - c },
      { x: hx + heart / 2 - T / 2, y: hy + heart + c, w: T, h: hy - c },
      { x: 0, y: hy + heart / 2 - T / 2, w: hx - c, h: T },
      { x: hx + heart + c, y: hy + heart / 2 - T / 2, w: hx - c, h: T }
    ]
  },
  // Fallback — maze fragment: orthogonal bars from the old wall
  abstract: (r) => {
    const bars: Bar[] = []
    const n = 3 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const vertical = r() > 0.5
      const len = snap(U * 3 + r() * U * 5)
      if (vertical) bars.push({ x: snap(r() * (W - T)), y: snap(r() * (H - len)), w: T, h: len })
      else bars.push({ x: snap(r() * (W - len)), y: snap(r() * (H - T)), w: len, h: T })
    }
    return bars
  }
}

/** Which template a pilot root uses; everything else gets maze fragments */
export const ROOT_TEMPLATES: Record<string, keyof typeof templates> = {
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

export function generateCandidates(rootId: string, baseSeed: number, count = 4): string[] {
  const template = templates[ROOT_TEMPLATES[rootId] ?? 'abstract']
  const out: string[] = []
  for (let i = 0; i < count; i++) {
    const r = rng(hashId(rootId) ^ (baseSeed * 7919 + i * 104729))
    out.push(toSvg(template(r)))
  }
  return out
}