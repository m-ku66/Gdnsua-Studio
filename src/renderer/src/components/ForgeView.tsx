// ForgeView v2 — parametric drafts, pre-commit editor, uncarve
import { useMemo, useState } from 'react'
import { wordById } from '../data'
import {
  barsToSvg,
  defaultParams,
  generateCandidates,
  validBars,
  type Bar,
  type GenParams,
  type Side
} from '../lib/logographGen'
import {
  removeRuntimeLogograph,
  resolveLogograph,
  setRuntimeLogograph,
  useGlyphStore
} from '../lib/logographSource'
import { Diamond, SectionLabel } from './ui/primitives'
import { Panel } from './ui/Panel'

const U = 58 // editor nudge step (half-grid for fine kiss alignment)
const PILOT_ROOTS = ['taus', 'fuia', 'iia', 'val', 'uii', 'zkas', 'hez', 'eld', 'huld']
const SIDES: Side[] = ['none', 'top', 'bottom', 'left', 'right']

const btn =
  'border-rule hover:bg-ink hover:text-sand cursor-pointer border px-2 py-1 text-[9px] tracking-[0.12em] uppercase transition-colors disabled:cursor-default disabled:opacity-40'

/** − value + stepper, NieR-flat */
function Stepper({
  label,
  value,
  display,
  onChange,
  min,
  max,
  step
}: {
  label: string
  value: number
  display?: string
  onChange: (v: number) => void
  min: number
  max: number
  step: number
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-dim text-[8px] tracking-[0.14em] uppercase">{label}</span>
      <button className={btn} onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}>
        −
      </button>
      <span className="w-8 text-center text-[10px]">{display ?? value}</span>
      <button className={btn} onClick={() => onChange(Math.min(max, +(value + step).toFixed(2)))}>
        +
      </button>
    </div>
  )
}

/** Click-to-select bar editor: nudge, resize, add, delete — overlap-proof */
function DraftEditor({
  bars,
  onChange,
  onCarve,
  onCancel
}: {
  bars: Bar[]
  onChange: (b: Bar[]) => void
  onCarve: () => void
  onCancel: () => void
}): React.JSX.Element {
  const [sel, setSel] = useState(-1)

  const tryBars = (next: Bar[]): void => {
    if (validBars(next)) onChange(next)
  }
  const transform = (fn: (b: Bar) => Bar): void => {
    if (sel < 0 || sel >= bars.length) return
    tryBars(bars.map((b, i) => (i === sel ? fn({ ...b }) : b)))
  }
  const move = (dx: number, dy: number): void =>
    transform((b) => ({ ...b, x: b.x + dx * U, y: b.y + dy * U }))
  const resize = (d: number): void =>
    transform((b) => (b.w >= b.h ? { ...b, w: b.w + d * U } : { ...b, h: b.h + d * U }))
  const remove = (): void => {
    if (sel < 0) return
    onChange(bars.filter((_, i) => i !== sel))
    setSel(-1)
  }
  const addBar = (vertical: boolean): void => {
    const size = vertical ? { w: 2 * U, h: 4 * U } : { w: 4 * U, h: 2 * U }
    for (let gy = 0; gy <= 10 - (vertical ? 4 : 2); gy++) {
      for (let gx = 0; gx <= 10 - (vertical ? 2 : 4); gx++) {
        const next = [...bars, { x: gx * U, y: gy * U, ...size }]
        if (validBars(next)) {
          onChange(next)
          setSel(next.length - 1)
          return
        }
      }
    }
  }

  return (
    <div className="border-rule bg-sand/50 mt-3 flex gap-4 border p-4">
      <svg viewBox="0 0 1164 1160" className="border-rule h-56 w-56 shrink-0 border bg-white/20">
        {bars.map((b, i) => (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            onClick={() => setSel(i)}
            className="cursor-pointer"
            fill={i === sel ? 'var(--color-seal)' : 'var(--color-ink)'}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-2.5">
        <SectionLabel>Edit draft — click a bar to select</SectionLabel>
        <div className="flex flex-wrap gap-1.5">
          <button className={btn} disabled={sel < 0} onClick={() => move(-1, 0)}>←</button>
          <button className={btn} disabled={sel < 0} onClick={() => move(1, 0)}>→</button>
          <button className={btn} disabled={sel < 0} onClick={() => move(0, -1)}>↑</button>
          <button className={btn} disabled={sel < 0} onClick={() => move(0, 1)}>↓</button>
          <button className={btn} disabled={sel < 0} onClick={() => resize(1)}>Longer</button>
          <button className={btn} disabled={sel < 0} onClick={() => resize(-1)}>Shorter</button>
          <button className={btn} disabled={sel < 0} onClick={remove}>Delete</button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className={btn} onClick={() => addBar(false)}>+ H bar</button>
          <button className={btn} onClick={() => addBar(true)}>+ V bar</button>
        </div>
        <div className="text-dim text-[9px] leading-relaxed">
          Moves that would overlap are silently refused — bars may only kiss.
        </div>
        <div className="mt-auto flex gap-2">
          <button
            onClick={onCarve}
            className="border-ink bg-ink text-sand cursor-pointer border px-4 py-1.5 text-[9px] tracking-[0.14em] uppercase transition-opacity hover:opacity-75"
          >
            ◆ Carve
          </button>
          <button className={btn} onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function RootForge({ rootId }: { rootId: string }): React.JSX.Element | null {
  useGlyphStore((s) => s.version)
  const word = wordById.get(rootId)
  const [seed, setSeed] = useState(1)
  const [params, setParams] = useState<GenParams>(() => defaultParams(rootId))
  const [editing, setEditing] = useState<Bar[] | null>(null)
  const candidates = useMemo(
    () => generateCandidates(rootId, seed, params, 4),
    [rootId, seed, params]
  )
  if (!word) return null

  const carved = resolveLogograph(rootId)?.source === 'carved'
  const set = (patch: Partial<GenParams>): void => setParams((p) => ({ ...p, ...patch }))

  const carve = async (): Promise<void> => {
    if (!editing) return
    const svg = barsToSvg(editing)
    setRuntimeLogograph(rootId, svg)
    setEditing(null)
    await window.api.saveLogograph(rootId, svg)
  }
  const uncarve = async (): Promise<void> => {
    removeRuntimeLogograph(rootId)
    await window.api.deleteLogograph(rootId)
  }

  return (
    <Panel className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold tracking-wide">
            {word.romanization}
          </span>
          <span className="text-dim text-[11px]">{word.glosses.join(', ')}</span>
          {carved && (
            <span className="text-seal text-[9px] tracking-[0.16em] uppercase">◆ carved</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Stepper label="Strokes" value={params.strokes} onChange={(v) => set({ strokes: v })} min={2} max={12} step={1} />
          <Stepper label="Cross" value={params.touching} display={`${Math.round(params.touching * 100)}%`} onChange={(v) => set({ touching: v })} min={0} max={1} step={0.25} />
          <Stepper label="Blocks" value={params.cornerDetail} display={`${Math.round(params.cornerDetail * 100)}%`} onChange={(v) => set({ cornerDetail: v })} min={0} max={1} step={0.25} />
          <button
            className={btn}
            onClick={() => set({ dominantSide: SIDES[(SIDES.indexOf(params.dominantSide) + 1) % SIDES.length] })}
          >
            Side: {params.dominantSide}
          </button>
          <button className={btn} onClick={() => setSeed((s) => s + 1)}>
            Reroll
          </button>
          {carved && (
            <button className={btn} onClick={uncarve}>
              Uncarve
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-3">
        {candidates.map((bars, i) => (
          <button
            key={`${seed}-${i}`}
            onClick={() => setEditing(bars.map((b) => ({ ...b })))}
            title="Open in editor"
            className="border-rule bg-sand/60 hover:border-ink group flex h-24 w-24 cursor-pointer items-center justify-center border p-2 transition-colors"
          >
            <div
              className="text-ink/85 group-hover:text-ink h-full w-full [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: barsToSvg(bars) }}
            />
          </button>
        ))}
      </div>
      {editing && (
        <DraftEditor bars={editing} onChange={setEditing} onCarve={carve} onCancel={() => setEditing(null)} />
      )}
    </Panel>
  )
}

export function ForgeView(): React.JSX.Element {
  return (
    <div className="fade-up flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <div className="flex items-center gap-2.5">
          <Diamond className="text-seal text-[9px]" />
          <span className="font-display text-2xl font-semibold tracking-wide">The Forge</span>
        </div>
        <p className="text-dim mt-1.5 max-w-xl text-[11px] leading-relaxed">
          Parametric logograph drafts — bars on a strict grid, kissing but never overlapping.
          Tune the parameters, reroll, then click a draft to refine it in the editor before
          carving. Carved glyphs save to the drop zone and propagate to every derived compound.
        </p>
      </div>
      <div>
        <SectionLabel>Campaign I — The Elements</SectionLabel>
        <div className="flex flex-col gap-3">
          {PILOT_ROOTS.map((id) => (
            <RootForge key={id} rootId={id} />
          ))}
        </div>
      </div>
    </div>
  )
}
