// Campaign II — promote any word to a logograph root, browse every
// mixed-script spelling, and CRUD word relationships (derivedFrom /
// relatedTo / force-syllabic), persisted via the relations store.
import { useMemo, useState } from 'react'
import { letterById, words, wordById } from '../data'
import type { Word } from '../data/types'
import {
  addDerivedFrom,
  addRelated,
  demoteRoot,
  promoteRoot,
  removeDerivedFrom,
  removeRelated,
  setSyllabicOnly,
  useRelationsStore
} from '../lib/relations'
import { activeRoots, derivesFrom, spellWord, type SpellToken } from '../lib/spelling'
import { SectionLabel } from './ui/primitives'
import { Panel } from './ui/Panel'

const btn =
  'border-rule hover:bg-ink hover:text-sand cursor-pointer border px-2 py-1 text-[9px] tracking-[0.12em] uppercase transition-colors disabled:cursor-default disabled:opacity-40'

/** "⟨TAUS⟩ M" caption for a token sequence */
function spellCaption(tokens: SpellToken[]): string {
  return tokens
    .map((t) =>
      t.type === 'logo'
        ? `⟨${t.rootRomanization}⟩`
        : (letterById.get(t.id)?.romanization ?? t.id.toUpperCase())
    )
    .join(' ')
}

/** Resolve user input to a word by id or exact romanization */
function resolveWordInput(input: string): Word | null {
  const s = input.trim()
  if (!s) return null
  const byId = wordById.get(s.toLowerCase())
  if (byId) return byId
  return words.find((w) => w.romanization.toUpperCase() === s.toUpperCase()) ?? null
}

/** Words that would gain this candidate's logograph in their spelling */
function familyOf(rootId: string): Word[] {
  const root = wordById.get(rootId)
  if (!root) return []
  const rom = root.romanization.toUpperCase()
  if (rom.length < 2) return []
  return words.filter(
    (w) =>
      w.id !== rootId &&
      derivesFrom(w.id, rootId) &&
      w.romanization.toUpperCase().includes(rom)
  )
}

/** Pick a root: ranked candidate pool from relationships, or free search */
export function RootPromoter(): React.JSX.Element {
  useRelationsStore((s) => s.version)
  const [query, setQuery] = useState('')
  const [warn, setWarn] = useState<string | null>(null)

  const active = new Set(activeRoots())
  const candidates = useMemo(() => {
    void query // not a dep; recompute is cheap and version drives it
    return words
      .filter((w) => !active.has(w.id) && w.category !== 'modifier')
      .map((w) => ({ word: w, family: familyOf(w.id).length }))
      .filter((c) => c.family >= 2)
      .sort((a, b) => b.family - a.family)
      .slice(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRelationsStore.getState().version])

  const searchHits = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (q.length < 2) return []
    return words
      .filter(
        (w) =>
          !active.has(w.id) &&
          w.category !== 'modifier' &&
          (w.romanization.toUpperCase().includes(q) ||
            w.glosses.some((g) => g.toUpperCase().includes(q)))
      )
      .slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const promote = (id: string): void => {
    const fam = familyOf(id).length
    promoteRoot(id)
    setWarn(fam === 0 ? 'Promoted — no derived words spell with it yet; link some below.' : null)
    setQuery('')
  }

  return (
    <Panel className="px-5 py-4">
      <SectionLabel>Choose a root — pool of related words, or pick freely</SectionLabel>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {candidates.map(({ word, family }) => (
          <button key={word.id} className={btn} onClick={() => promote(word.id)} title={word.glosses.join(', ')}>
            {word.romanization} <span className="opacity-60">×{family}</span>
          </button>
        ))}
        {candidates.length === 0 && (
          <span className="text-dim text-[10px]">No unpromoted candidates with 2+ derived words.</span>
        )}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any word to promote…"
          className="border-rule bg-vellum placeholder:text-dim w-64 border px-2 py-1 text-[11px] outline-none focus:border-ink"
        />
        {searchHits.map((w) => (
          <button key={w.id} className={btn} onClick={() => promote(w.id)} title={w.glosses.join(', ')}>
            ◆ {w.romanization}
          </button>
        ))}
      </div>
      {warn && <div className="text-seal mt-2 text-[9px] tracking-[0.08em] uppercase">⚠ {warn}</div>}
      <div className="text-dim mt-2 text-[9px] leading-relaxed">
        ×N = words that would immediately spell with this logograph. Promoted roots get a full
        configurator below and join the spelling system everywhere.
      </div>
    </Panel>
  )
}

/** Chip with × remove */
function Chip({ label, sub, onRemove }: { label: string; sub?: string; onRemove: () => void }): React.JSX.Element {
  return (
    <span className="border-rule bg-vellum flex items-center gap-1.5 border px-2 py-0.5 text-[10px]">
      <span className="font-display font-semibold">{label}</span>
      {sub && <span className="text-dim text-[9px]">{sub}</span>}
      <button className="text-dim hover:text-seal cursor-pointer" onClick={onRemove} title="Remove link">
        ×
      </button>
    </span>
  )
}

/** Chips + add-input for one relationship list */
function RelationRow({
  label,
  ids,
  onAdd,
  onRemove
}: {
  label: string
  ids: string[]
  onAdd: (targetId: string) => boolean
  onRemove: (targetId: string) => void
}): React.JSX.Element {
  const [input, setInput] = useState('')
  const [bad, setBad] = useState(false)
  const tryAdd = (): void => {
    const target = resolveWordInput(input)
    if (target && onAdd(target.id)) {
      setInput('')
      setBad(false)
    } else setBad(true)
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-dim w-20 shrink-0 text-[8px] tracking-[0.14em] uppercase">{label}</span>
      {ids.map((id) => (
        <Chip key={id} label={wordById.get(id)?.romanization ?? id} sub={wordById.get(id)?.glosses[0]} onRemove={() => onRemove(id)} />
      ))}
      <input
        value={input}
        onChange={(e) => { setInput(e.target.value); setBad(false) }}
        onKeyDown={(e) => e.key === 'Enter' && tryAdd()}
        placeholder="word or id…"
        className={`bg-vellum w-28 border px-1.5 py-0.5 text-[10px] outline-none ${bad ? 'border-seal' : 'border-rule focus:border-ink'}`}
      />
      <button className={btn} onClick={tryAdd}>+ Link</button>
    </div>
  )
}

/** Browse every word currently spelled with a logograph; edit or suppress */
export function MixedScriptRegistry(): React.JSX.Element {
  useRelationsStore((s) => s.version)
  const [open, setOpen] = useState<string | null>(null)

  const rows = useMemo(() => {
    return words
      .map((w) => ({ word: w, tokens: spellWord(w) }))
      .filter(
        ({ word, tokens }) => word.syllabicOnly || tokens.some((t) => t.type === 'logo')
      )
      .sort((a, b) => a.word.romanization.localeCompare(b.word.romanization))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useRelationsStore.getState().version])

  return (
    <Panel className="px-5 py-4">
      <SectionLabel>Mixed-script registry — {rows.length} words</SectionLabel>
      <div className="mt-2 flex max-h-96 flex-col gap-1 overflow-y-auto pr-1">
        {rows.map(({ word, tokens }) => (
          <div key={word.id} className="border-rule border-b pb-1 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2 py-1">
              <span className="font-display w-32 shrink-0 text-[13px] font-semibold">
                {word.romanization}
              </span>
              <span className={`w-44 shrink-0 text-[10px] ${word.syllabicOnly ? 'text-dim line-through' : 'text-seal'}`}>
                {spellCaption(word.syllabicOnly ? spellWord({ ...word, syllabicOnly: false }) : tokens)}
              </span>
              <span className="text-dim min-w-0 flex-1 truncate text-[10px]">
                {word.glosses.join(', ')}
              </span>
              <button className={btn} onClick={() => setSyllabicOnly(word.id, !word.syllabicOnly)}>
                {word.syllabicOnly ? 'Use logograph' : 'Letters only'}
              </button>
              <button className={btn} onClick={() => setOpen(open === word.id ? null : word.id)}>
                {open === word.id ? 'Close' : 'Relations'}
              </button>
            </div>
            {open === word.id && (
              <div className="bg-sand/50 border-rule mb-1 flex flex-col gap-2 border p-3">
                <RelationRow
                  label="Derived from"
                  ids={word.derivedFrom ?? []}
                  onAdd={(t) => addDerivedFrom(word.id, t)}
                  onRemove={(t) => removeDerivedFrom(word.id, t)}
                />
                <RelationRow
                  label="Related to"
                  ids={word.relatedTo ?? []}
                  onAdd={(t) => addRelated(word.id, t)}
                  onRemove={(t) => removeRelated(word.id, t)}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </Panel>
  )
}

/** Demote bar shown above each promoted root's configurator */
export function PromotedRootBar({ rootId }: { rootId: string }): React.JSX.Element {
  const fam = familyOf(rootId).length
  return (
    <div className="-mb-2 flex items-center justify-between">
      <span className="text-dim text-[9px] tracking-[0.16em] uppercase">
        Promoted root · {fam} derived spelling{fam === 1 ? '' : 's'}
      </span>
      <button className={btn} onClick={() => demoteRoot(rootId)}>
        Demote
      </button>
    </div>
  )
}
