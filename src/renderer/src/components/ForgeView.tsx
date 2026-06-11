// ForgeView v3 — tabbed configurators: parametric Forge + manual Compose.
// Letter blacklist enforced at generation AND carve time.
import { useMemo, useState } from 'react'
import { wordById } from '../data'
import {
  barsToSvg,
  CAMPAIGN_ROOTS,
  COLX,
  defaultParams,
  generateDrafts,
  laneFree,
  placementsToBars,
  placementsToSegments,
  ROWY,
  SH,
  spansFor,
  SW,
  validBars,
  W,
  H,
  type Bar,
  type Draft,
  type GenParams,
  type Placement,
  type Side,
  type Tier
} from '../lib/logographGen'
import { letterMatch, logographMatch, parseRects } from '../lib/glyphBlacklist'
import {
  removeRuntimeLogograph,
  resolveLogograph,
  setRuntimeLogograph,
  useGlyphStore
} from '../lib/logographSource'
import { Diamond, SectionLabel } from './ui/primitives'
import { Panel } from './ui/Panel'
import { MixedScriptRegistry, PromotedRootBar, RootPromoter, FilterInput, wordMatches } from './CampaignTwo'
import { promotedRoots, useRelationsStore } from '../lib/relations'

const U = 58 // editor nudge step (half-grid for fine kiss alignment)
const PILOT_ROOTS = CAMPAIGN_ROOTS
const SIDES: Side[] = ['none', 'top', 'bottom', 'left', 'right']
const TIERS: { id: Tier; label: string }[] = [
  { id: 'cell', label: 'Cell' },
  { id: 'half', label: 'Half' },
  { id: 'two', label: 'Two' },
  { id: 'full', label: 'Full' }
]

const btn =
  'border-rule hover:bg-ink hover:text-sand cursor-pointer border px-2 py-1 text-[9px] tracking-[0.12em] uppercase transition-colors disabled:cursor-default disabled:opacity-40'
const btnOn = 'border-ink bg-ink text-sand cursor-pointer border px-2 py-1 text-[9px] tracking-[0.12em] uppercase'

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
      <svg viewBox={`0 0 ${W} ${H}`} className="border-rule h-56 w-56 shrink-0 border bg-white/20">
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

// ── Compose: manual stroke placement on the glyph_base lattice ──
function ComposeEditor({
  rootId,
  placements,
  onChange,
  onCarve,
  drafts
}: {
  rootId: string
  placements: Placement[]
  onChange: (p: Placement[]) => void
  onCarve: () => void
  drafts: Draft[]
}): React.JSX.Element {
  const [horiz, setHoriz] = useState(true)
  const [tier, setTier] = useState<Tier>('full')
  const [sel, setSel] = useState(-1)
  const [ghost, setGhost] = useState<{ pl: Placement; ok: boolean } | null>(null)

  const segments = useMemo(() => placementsToSegments(placements), [placements])
  const match = useMemo(() => letterMatch(segments.map((s) => s.bar)), [segments])
  const dup = useMemo(
    () => logographMatch(segments.map((s) => s.bar), rootId),
    [segments, rootId]
  )

  const plRect = (pl: Placement): Bar =>
    pl.horiz
      ? { x: pl.a, y: ROWY[pl.lane], w: pl.b - pl.a, h: SH }
      : { x: COLX[pl.lane], y: pl.a, w: SW, h: pl.b - pl.a }

  /** Snap a cursor position to the nearest legal placement of the active tier */
  const ghostAt = (px: number, py: number): { pl: Placement; ok: boolean } => {
    const laneStarts = horiz ? ROWY : COLX
    const laneSize = horiz ? SH : SW
    const v = horiz ? py : px // lane axis
    const u = horiz ? px : py // span axis
    let lane = 0
    let bestL = Infinity
    laneStarts.forEach((s, i) => {
      const d = Math.abs(v - (s + laneSize / 2))
      if (d < bestL) {
        bestL = d
        lane = i
      }
    })
    const pool = spansFor(horiz).filter((s) => s.tier === tier)
    let span = pool[0]
    let bestS = Infinity
    for (const s of pool) {
      const d = u >= s.a && u < s.b ? Math.abs(u - (s.a + s.b) / 2) * 0.01 : Math.abs(u - (s.a + s.b) / 2)
      if (d < bestS) {
        bestS = d
        span = s
      }
    }
    const pl = { horiz, lane, a: span.a, b: span.b }
    return { pl, ok: laneFree(placements, horiz, lane, span.a, span.b) }
  }

  const svgPos = (e: React.MouseEvent<SVGSVGElement>): { x: number; y: number } => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H }
  }

  const placeGhost = (): void => {
    if (!ghost?.ok) return
    onChange([...placements, ghost.pl])
    setSel(placements.length)
  }
  const removeSel = (): void => {
    if (sel < 0) return
    onChange(placements.filter((_, i) => i !== sel))
    setSel(-1)
  }
  const importDraft = (d: Draft): void => {
    onChange(d.placements.map((p) => ({ ...p })))
    setSel(-1)
  }

  return (
    <div className="border-rule bg-sand/50 mt-3 flex gap-4 border p-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="border-rule h-64 w-64 shrink-0 cursor-crosshair border bg-white/20"
        onMouseMove={(e) => {
          const { x, y } = svgPos(e)
          setGhost(ghostAt(x, y))
        }}
        onMouseLeave={() => setGhost(null)}
        onClick={placeGhost}
      >
        {/* glyph_base lattice ghost */}
        {ROWY.map((ry) =>
          COLX.map((cx) => (
            <rect
              key={`${cx}-${ry}`}
              x={cx}
              y={ry}
              width={SW}
              height={SH}
              fill="none"
              stroke="var(--color-ink)"
              strokeOpacity={0.15}
              strokeWidth={6}
              strokeDasharray="24 24"
            />
          ))
        )}
        {/* placed strokes (kiss-segmented) */}
        {segments.map((s, i) => (
          <rect
            key={i}
            x={s.bar.x}
            y={s.bar.y}
            width={s.bar.w}
            height={s.bar.h}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              setSel(s.idx)
            }}
            fill={s.idx === sel ? 'var(--color-seal)' : 'var(--color-ink)'}
          />
        ))}
        {/* hover ghost */}
        {ghost && (
          <rect
            x={plRect(ghost.pl).x}
            y={plRect(ghost.pl).y}
            width={plRect(ghost.pl).w}
            height={plRect(ghost.pl).h}
            fill={ghost.ok ? 'var(--color-seal)' : 'var(--color-ink)'}
            fillOpacity={ghost.ok ? 0.45 : 0.12}
            stroke={ghost.ok ? 'var(--color-seal)' : 'var(--color-ink)'}
            strokeOpacity={0.6}
            strokeWidth={6}
            pointerEvents="none"
          />
        )}
      </svg>
      <div className="flex min-w-0 flex-col gap-2.5">
        <SectionLabel>Compose — hover the lattice, click to place</SectionLabel>
        <div className="flex flex-wrap items-center gap-1.5">
          <button className={horiz ? btnOn : btn} onClick={() => setHoriz(true)}>H stroke</button>
          <button className={!horiz ? btnOn : btn} onClick={() => setHoriz(false)}>V stroke</button>
          <span className="text-dim mx-1 text-[8px] tracking-[0.14em] uppercase">Span</span>
          {TIERS.map((t) => (
            <button key={t.id} className={tier === t.id ? btnOn : btn} onClick={() => setTier(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button className={btn} disabled={sel < 0} onClick={removeSel}>Delete</button>
          <button className={btn} disabled={placements.length === 0} onClick={() => { onChange([]); setSel(-1) }}>Clear</button>
          {drafts.map((d, i) => (
            <button key={i} className={btn} onClick={() => importDraft(d)}>⇩ Draft {i + 1}</button>
          ))}
        </div>
        <div className="text-dim text-[9px] leading-relaxed">
          Strokes snap to the base-glyph catalog: 3 lanes per axis, spans of cell / half / two /
          full. Same-lane collisions are refused; crossings segment to kisses automatically.
          Click a stroke to select it.
        </div>
        {match && (
          <div className="text-seal text-[9px] tracking-[0.08em] uppercase">
            ⚠ Too close to letter “{match}” — carving is locked until it differs
          </div>
        )}
        {!match && dup && (
          <div className="text-seal text-[9px] tracking-[0.08em] uppercase">
            ⚠ Identical to “{wordById.get(dup)?.romanization ?? dup}”&apos;s logograph — change at
            least one stroke
          </div>
        )}
        <div className="mt-auto flex gap-2">
          <button
            onClick={onCarve}
            disabled={placements.length === 0 || match !== null || dup !== null}
            className="border-ink bg-ink text-sand cursor-pointer border px-4 py-1.5 text-[9px] tracking-[0.14em] uppercase transition-opacity hover:opacity-75 disabled:cursor-default disabled:opacity-40"
          >
            ◆ Carve
          </button>
        </div>
      </div>
    </div>
  )
}

function RootForge({ rootId }: { rootId: string }): React.JSX.Element | null {
  const glyphVersion = useGlyphStore((s) => s.version)
  const word = wordById.get(rootId)
  const [tab, setTab] = useState<'forge' | 'compose'>('forge')
  const [seed, setSeed] = useState(1)
  const [params, setParams] = useState<GenParams>(() => defaultParams(rootId))
  const [editing, setEditing] = useState<Bar[] | null>(null)
  const [composition, setComposition] = useState<Placement[]>([])
  const [warn, setWarn] = useState<string | null>(null)
  const drafts = useMemo(
    () => generateDrafts(rootId, seed, params, 4),
    // glyphVersion: reroll drafts that would duplicate a newly carved logograph
    [rootId, seed, params, glyphVersion]
  )
  if (!word) return null

  const current = resolveLogograph(rootId)
  const carved = current?.source === 'carved'
  const set = (patch: Partial<GenParams>): void => setParams((p) => ({ ...p, ...patch }))

  const commit = async (bars: Bar[]): Promise<boolean> => {
    const hit = letterMatch(bars)
    if (hit) {
      setWarn(`Refused — this shape matches the letter “${hit}”. Adjust it and try again.`)
      return false
    }
    const dup = logographMatch(bars, rootId)
    if (dup) {
      const dupRom = wordById.get(dup)?.romanization ?? dup
      setWarn(`Refused — identical to the logograph already carved for “${dupRom}”. Change at least one stroke.`)
      return false
    }
    setWarn(null)
    const svg = barsToSvg(bars)
    setRuntimeLogograph(rootId, svg)
    await window.api.saveLogograph(rootId, svg)
    return true
  }

  const carveDraft = async (): Promise<void> => {
    if (!editing) return
    if (await commit(editing)) setEditing(null)
  }
  const carveComposition = async (): Promise<void> => {
    await commit(placementsToBars(composition))
  }
  const uncarve = async (): Promise<void> => {
    removeRuntimeLogograph(rootId)
    setEditing(null)
    setWarn(null)
    await window.api.deleteLogograph(rootId)
  }

  // ── Carved state: one unified compact view, however it was made ──
  if (carved && current) {
    const startEdit = (): void => {
      setWarn(null)
      setEditing(parseRects(current.svg).map((b) => ({ ...b })))
    }
    return (
      <Panel className="px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <div className="border-rule bg-sand/60 flex h-20 w-20 shrink-0 items-center justify-center border p-2">
              <div
                className="text-ink h-full w-full [&_svg]:h-full [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: current.svg }}
              />
            </div>
            <div>
              <div className="flex items-baseline gap-3">
                <span className="font-display text-xl font-semibold tracking-wide">
                  {word.romanization}
                </span>
                <span className="text-seal text-[9px] tracking-[0.16em] uppercase">◆ carved</span>
              </div>
              <div className="text-dim mt-0.5 text-[11px]">{word.glosses.join(', ')}</div>
            </div>
          </div>
          {!editing && (
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex gap-2">
                <button className={btn} onClick={startEdit} title="Reopen the carved bars in the editor">
                  Edit
                </button>
                <button className={btn} onClick={uncarve} title="Delete this glyph and reopen the configurator">
                  Uncarve
                </button>
              </div>
              <span className="text-dim text-[8px] tracking-[0.1em] uppercase">
                In use by every derived spelling
              </span>
            </div>
          )}
        </div>
        {editing && (
          <DraftEditor
            bars={editing}
            onChange={setEditing}
            onCarve={carveDraft}
            onCancel={() => {
              setEditing(null)
              setWarn(null)
            }}
          />
        )}
        {warn && (
          <div className="text-seal mt-2 text-[9px] tracking-[0.08em] uppercase">⚠ {warn}</div>
        )}
      </Panel>
    )
  }

  return (
    <Panel className="px-5 py-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold tracking-wide">
            {word.romanization}
          </span>
          <span className="text-dim text-[11px]">{word.glosses.join(', ')}</span>
          <span className="border-rule mx-1 hidden h-3 border-l sm:block" />
          <button className={tab === 'forge' ? btnOn : btn} onClick={() => setTab('forge')}>
            Forge
          </button>
          <button className={tab === 'compose' ? btnOn : btn} onClick={() => setTab('compose')}>
            Compose
          </button>
        </div>
        {tab === 'forge' && (
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
          </div>
        )}
      </div>
      {tab === 'forge' && (
        <>
          <div className="flex gap-3">
            {drafts.map((d, i) => (
              <button
                key={`${seed}-${i}`}
                onClick={() => setEditing(d.bars.map((b) => ({ ...b })))}
                title="Open in editor"
                className="border-rule bg-sand/60 hover:border-ink group flex h-24 w-24 cursor-pointer items-center justify-center border p-2 transition-colors"
              >
                <div
                  className="text-ink/85 group-hover:text-ink h-full w-full [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: barsToSvg(d.bars) }}
                />
              </button>
            ))}
          </div>
          <div className="text-dim mt-2 text-[9px] leading-relaxed">
            Four drafts per roll — click one to fine-tune, then carve.{' '}
            <span className="text-ink/70">Strokes</span> sets how many strokes the generator aims
            for · <span className="text-ink/70">Cross</span> is how often strokes cross each other
            · <span className="text-ink/70">Blocks</span> adds single-cell accents ·{' '}
            <span className="text-ink/70">Side</span> biases strokes toward one edge ·{' '}
            <span className="text-ink/70">Reroll</span> draws four fresh drafts. Drafts that match
            a letter or duplicate an existing logograph reroll themselves automatically.
          </div>
          {editing && (
            <DraftEditor bars={editing} onChange={setEditing} onCarve={carveDraft} onCancel={() => { setEditing(null); setWarn(null) }} />
          )}
        </>
      )}
      {tab === 'compose' && (
        <ComposeEditor
          rootId={rootId}
          placements={composition}
          onChange={setComposition}
          onCarve={carveComposition}
          drafts={drafts}
        />
      )}
      {warn && (
        <div className="text-seal mt-2 text-[9px] tracking-[0.08em] uppercase">⚠ {warn}</div>
      )}
    </Panel>
  )
}

export function ForgeView(): React.JSX.Element {
  useRelationsStore((s) => s.version)
  const promoted = promotedRoots()
  const [filterOne, setFilterOne] = useState('')
  const [filterTwo, setFilterTwo] = useState('')
  const byFilter = (q: string) => (id: string) => {
    const w = wordById.get(id)
    return w ? wordMatches(w, q) : false
  }
  const visibleOne = PILOT_ROOTS.filter(byFilter(filterOne))
  const visibleTwo = promoted.filter(byFilter(filterTwo))
  return (
    <div className="fade-up flex h-full flex-col gap-5 overflow-y-auto p-6">
      <div>
        <div className="flex items-center gap-2.5">
          <Diamond className="text-seal text-[9px]" />
          <span className="font-display text-2xl font-semibold tracking-wide">The Forge</span>
        </div>
        <p className="text-dim mt-1.5 max-w-2xl text-[11px] leading-relaxed">
          The logograph workshop, in three acts. <span className="text-ink">Campaign I</span>{' '}
          holds the fixed elemental roots. <span className="text-ink">Campaign II</span> lets you
          promote any dictionary word into a new root. <span className="text-ink">The Loom</span>{' '}
          shows every word whose spelling now embeds a root logograph, and lets you edit the
          relationships that drive those spellings. Carved glyphs save to the drop zone, persist
          across restarts, and re-spell every derived word instantly. Two laws rule all of it:
          no logograph may resemble an existing letter, and no two logographs may be identical —
          generated drafts reroll themselves, and the carve button refuses offenders. Similar
          logographs are fine; exact twins are not.
        </p>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>
            Campaign I — The Elements
            {filterOne ? ` — ${visibleOne.length} of ${PILOT_ROOTS.length}` : ''}
          </SectionLabel>
          <FilterInput value={filterOne} onChange={setFilterOne} placeholder="Filter elements by word or meaning…" />
        </div>
        <p className="text-dim mb-2 max-w-2xl text-[10px] leading-relaxed">
          The eleven core concepts: earth, water, fire, wind, ice, lightning, sky, flora, fauna,
          dark, light. Each panel has two tabs — <span className="text-ink">Forge</span> rolls
          parametric drafts seeded by the root&apos;s elemental theme;{' '}
          <span className="text-ink">Compose</span> is freehand placement on the same lattice.
          Once carved, the panel collapses to a compact card with Edit / Uncarve.
        </p>
        <div className="flex flex-col gap-3">
          {visibleOne.length === 0 && (
            <div className="text-dim py-2 text-[10px] tracking-[0.12em] uppercase">
              No elements match “{filterOne}”
            </div>
          )}
          {visibleOne.map((id) => (
            <RootForge key={id} rootId={id} />
          ))}
        </div>
      </div>
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionLabel>
            Campaign II — Chosen Roots
            {filterTwo ? ` — ${visibleTwo.length} of ${promoted.length}` : ''}
          </SectionLabel>
          {promoted.length > 0 && (
            <FilterInput value={filterTwo} onChange={setFilterTwo} placeholder="Filter promoted roots…" />
          )}
        </div>
        <p className="text-dim mb-2 max-w-2xl text-[10px] leading-relaxed">
          Promote any word into a root: it gains a configurator here, joins the spelling system,
          and every word that derives from it (and contains its letters) re-spells with its
          logograph. Promotions persist to <span className="text-ink">relations.local.json</span>{' '}
          and can be demoted anytime — demoting only retires the root from spellings, it deletes
          nothing.
        </p>
        <div className="flex flex-col gap-3">
          <RootPromoter />
          {filterTwo && visibleTwo.length === 0 && promoted.length > 0 && (
            <div className="text-dim py-2 text-[10px] tracking-[0.12em] uppercase">
              No promoted roots match “{filterTwo}”
            </div>
          )}
          {visibleTwo.map((id) => (
            <div key={id} className="flex flex-col gap-2">
              <PromotedRootBar rootId={id} />
              <RootForge rootId={id} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionLabel>The Loom — relationships &amp; spellings</SectionLabel>
        <p className="text-dim mb-2 max-w-2xl text-[10px] leading-relaxed">
          The audit table for mixed-script spelling. A word appears here when its derivation
          chain reaches an active root <span className="text-ink">and</span> that root&apos;s
          letters appear contiguously in the word — then the root portion is written with the
          logograph, kanji-style. Wrongly logographed? Hit{' '}
          <span className="text-ink">Letters only</span> to force syllabic spelling, or open{' '}
          <span className="text-ink">Relations</span> and fix the links themselves.
        </p>
        <MixedScriptRegistry />
      </div>
    </div>
  )
}
