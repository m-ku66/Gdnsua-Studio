// WordDetail — glyph plate + record metadata + etymology chain
import { wordById } from '../data'
import type { Word } from '../data/types'
import { useAppStore } from '../store/useAppStore'
import { GlyphPlate } from './GlyphPlate'
import { Diamond, SectionLabel } from './ui/primitives'

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
  const derived = (word.derivedFrom ?? [])
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

      {derived.length > 0 && (
        <div>
          <SectionLabel>Etymology — the path</SectionLabel>
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
