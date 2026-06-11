// ResultsList — the record index
import type { SearchResult } from '../lib/search'
import { useAppStore } from '../store/useAppStore'
import { SectionLabel, TierTag } from './ui/primitives'

export function ResultsList({ results }: { results: SearchResult[] }): React.JSX.Element {
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const query = useAppStore((s) => s.query)

  if (!query.trim()) {
    return (
      <div className="text-dim pt-10 text-center text-[10px] tracking-[0.16em] uppercase">
        Awaiting query
      </div>
    )
  }
  if (results.length === 0) {
    return (
      <div className="text-dim pt-10 text-center text-[10px] tracking-[0.16em] uppercase">
        No record found <span className="px-1">{'//'}</span> try fewer letters
      </div>
    )
  }

  return (
    <div className="fade-up">
      <SectionLabel>
        Records — {results.length} found
      </SectionLabel>
      <div className="border-rule flex flex-col gap-px border">
        {results.map(({ word, tier }) => {
          const active = word.id === selectedId
          return (
            <button
              key={word.id}
              onClick={() => select(word.id)}
              className={`flex items-baseline gap-3 px-3.5 py-2.5 text-left transition-colors
                focus-visible:outline-1 focus-visible:outline-offset-[-1px] focus-visible:outline-ink
                ${active ? 'bg-ink text-sand' : 'bg-vellum hover:bg-sand cursor-pointer'}`}
            >
              <span className="font-display min-w-0 shrink-0 text-[17px] leading-none font-semibold tracking-wide">
                {word.romanization}
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-[11px] ${active ? 'text-sand/70' : 'text-dim'}`}
              >
                {word.glosses.join(', ')}
              </span>
              <TierTag tier={tier} />
              <span
                className={`shrink-0 text-[8px] tracking-[0.14em] uppercase ${active ? 'text-sand/50' : 'text-dim/70'}`}
              >
                {word.category}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
