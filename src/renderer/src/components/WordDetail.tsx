// WordDetail — glyph plate + record metadata + etymology chain
import { useState } from 'react'
import { words, wordById } from '../data'
import type { Word } from '../data/types'
import { addDerivedFrom, removeDerivedFrom, useRelationsStore } from '../lib/relations'
import { useAppStore } from '../store/useAppStore'
import { GlyphPlate } from './GlyphPlate'
import { wordMatches } from './CampaignTwo'
import { Diamond, SectionLabel } from './ui/primitives'

/**
 * Search-only modal for editing a word's derivedFrom: look up
 * EXISTING words and link/unlink them. No creation here — the
 * dictionary's contents stay authoritative.
 */
function EtymologyModal({ word, onClose }: { word: Word; onClose: () => void }): React.JSX.Element {
  const [query, setQuery] = useState('')
  const parents = word.derivedFrom ?? []
  const hits =
    query.trim().length < 2
      ? []
      : words
          .filter(
            (w) =>
              w.id !== word.id && !parents.includes(w.id) && wordMatches(w, query)
          )
          .slice(0, 8)
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 pt-24"
      onClick={onClose}
    >
      <div
        className="border-ink bg-sand w-[26rem] border p-4 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-baseline justify-between">
          <SectionLabel>
            Etymology of {word.romanization} — link existing words
          </SectionLabel>
          <button
            className="border-rule hover:bg-ink hover:text-sand cursor-pointer border px-2 py-0.5 text-[10px]"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {parents.length === 0 && (
            <span className="text-dim text-[10px]">No recorded derivation yet.</span>
          )}
          {parents.map((id) => {
            const p = wordById.get(id)
            return (
              <span
                key={id}
                className="border-rule bg-vellum flex items-center gap-1.5 border px-2 py-0.5 text-[10px]"
              >
                <span className="font-display font-semibold">{p?.romanization ?? id}</span>
                <span className="text-dim text-[9px]">{p?.glosses[0]}</span>
                <button
                  className="text-dim hover:text-seal cursor-pointer"
                  onClick={() => removeDerivedFrom(word.id, id)}
                  title="Unlink"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search words by spelling or meaning…"
          className="border-rule bg-vellum placeholder:text-dim mt-3 w-full border px-2 py-1.5 text-[11px] outline-none focus:border-ink"
        />
        <div className="mt-2 flex max-h-56 flex-col gap-px overflow-y-auto">
          {query.trim().length >= 2 && hits.length === 0 && (
            <div className="text-dim py-2 text-center text-[9px] tracking-[0.12em] uppercase">
              No existing words match
            </div>
          )}
          {hits.map((w) => (
            <button
              key={w.id}
              onClick={() => addDerivedFrom(word.id, w.id)}
              className="border-rule hover:bg-ink hover:text-sand flex cursor-pointer items-baseline gap-3 border px-2.5 py-1.5 text-left transition-colors"
            >
              <span className="font-display text-[12px] font-semibold">{w.romanization}</span>
              <span className="text-[10px] opacity-70">{w.glosses.join(', ')}</span>
            </button>
          ))}
        </div>
        <div className="text-dim mt-3 text-[9px] leading-relaxed">
          Links update etymology, logograph spelling, and the Loom instantly, and persist to
          relations.local.json. If a linked root&apos;s full letters aren&apos;t in this word, its
          logograph still applies as a clipped reading over the root&apos;s leading letters
          (ZIAVA ← ZIZI spells ⟨ZIZI⟩ over “ZI”) — provided the root is active in a campaign.
        </div>
      </div>
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="border-rule flex items-baseline gap-4 border-b py-2 last:border-b-0">
      <span className="text-dim w-24 shrink-0 text-[9px] tracking-[0.16em] uppercase">
        {label}
      </span>
      <span className="min-w-0 flex-1 text-[12px] leading-relaxed">{children}</span>
    </div>
  )
}

export function WordDetail({ word }: { word: Word }): React.JSX.Element {
  const select = useAppStore((s) => s.select)
  useRelationsStore((s) => s.version) // re-render when relationships change
  const [editingEtym, setEditingEtym] = useState(false)
  const derived = (word.derivedFrom ?? [])
    .map((id) => wordById.get(id))
    .filter((w): w is Word => Boolean(w))
  const related = (word.relatedTo ?? [])
    .map((id) => wordById.get(id))
    .filter((w): w is Word => Boolean(w))

  return (
    <div className="fade-up flex flex-col gap-5" key={word.id}>
      <GlyphPlate word={word} />

      <div>
        <SectionLabel>Record</SectionLabel>
        <div className="border-rule bg-vellum/60 border px-4 py-1">
          <MetaRow label="Meaning">{word.glosses.join(', ')}</MetaRow>
          <MetaRow label="Category">{word.category}</MetaRow>
          {word.tags && word.tags.length > 0 && (
            <MetaRow label="Tags">{word.tags.join(' · ')}</MetaRow>
          )}
          {word.regions && <MetaRow label="Regions">{word.regions.join(', ')}</MetaRow>}
          {'effect' in word && typeof word.effect === 'string' && (
            <MetaRow label="Effect">{word.effect}</MetaRow>
          )}
          {'standaloneForm' in word && typeof word.standaloneForm === 'string' && (
            <MetaRow label="Standalone">
              <span className="font-display text-[14px] font-semibold">
                {word.standaloneForm}
              </span>
              <span className="text-dim ml-2 text-[10px]">(mark doubles when used alone)</span>
            </MetaRow>
          )}
          {word.notes && <MetaRow label="Notes">{word.notes}</MetaRow>}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <SectionLabel>Etymology — the path</SectionLabel>
          <button
            onClick={() => setEditingEtym(true)}
            title="Link or unlink existing words this one derives from"
            className="border-rule hover:bg-ink hover:text-sand cursor-pointer border px-2 py-0.5 text-[9px] tracking-[0.12em] uppercase transition-colors"
          >
            ✎ Edit
          </button>
        </div>
        {derived.length === 0 ? (
          <div className="text-dim text-[10px] tracking-[0.1em] uppercase">
            No recorded derivation
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {derived.map((d, i) => (
              <span key={d.id} className="flex items-center gap-2">
                {i > 0 && <Diamond className="text-dim text-[7px]" />}
                <button
                  onClick={() => select(d.id)}
                  className="border-rule bg-vellum hover:bg-ink hover:text-sand cursor-pointer
                    border px-2.5 py-1 text-[11px] transition-colors focus-visible:outline-1
                    focus-visible:outline-ink"
                >
                  <span className="font-display text-[13px] font-semibold">{d.romanization}</span>
                  <span className="text-dim ml-2 text-[10px]">{d.glosses[0]}</span>
                </button>
              </span>
            ))}
            <span className="text-dim text-[11px]">→ {word.glosses[0]}</span>
          </div>
        )}
      </div>
      {editingEtym && <EtymologyModal word={word} onClose={() => setEditingEtym(false)} />}

      {related.length > 0 && (
        <div>
          <SectionLabel>Related — kindred meanings</SectionLabel>
          <div className="flex flex-wrap items-center gap-2">
            {related.map((d) => (
              <button
                key={d.id}
                onClick={() => select(d.id)}
                className="border-rule bg-vellum hover:bg-ink hover:text-sand cursor-pointer
                  border px-2.5 py-1 text-[11px] transition-colors focus-visible:outline-1
                  focus-visible:outline-ink"
              >
                <span className="font-display text-[13px] font-semibold">{d.romanization}</span>
                <span className="text-dim ml-2 text-[10px]">{d.glosses[0]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionLabel>Export</SectionLabel>
        <div className="flex gap-2">
          <button
            disabled
            title="Available once glyphs are carved (SVG import coming)"
            className="border-rule text-dim cursor-not-allowed border px-4 py-2 text-[10px] tracking-[0.14em] uppercase"
          >
            Export SVG
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(word.romanization)}
            className="border-ink bg-ink text-sand hover:opacity-75 cursor-pointer border px-4
              py-2 text-[10px] tracking-[0.14em] uppercase transition-opacity
              focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Copy romanization
          </button>
        </div>
      </div>
    </div>
  )
}
