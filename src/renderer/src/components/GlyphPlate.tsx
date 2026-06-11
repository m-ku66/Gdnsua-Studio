// GlyphPlate — the signature element: a word rendered as a carving
import { letterById } from '../data'
import type { Word } from '../data/types'
import { tokenizeRomanization } from '../lib/tokenize'
import { Panel } from './ui/Panel'

export function GlyphPlate({ word }: { word: Word }): React.JSX.Element {
  const { tokens } = tokenizeRomanization(word.romanization, {
    trueW: word.regions?.includes('Kharmat') || word.regions?.includes('Haadfahuta')
  })

  return (
    <Panel corners className="px-6 py-7">
      {/* Glyph cells — dashed = not yet carved (awaiting SVG import) */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        {tokens.map((id, i) => {
          const letter = letterById.get(id)
          return (
            <div
              key={`${id}-${i}`}
              title={letter ? `${letter.letterName} (${letter.sound})` : id}
              className="border-dim/60 text-ink/80 flex h-14 w-12 items-center
                justify-center border border-dashed"
            >
              <span className="font-display text-xl font-medium">
                {letter?.romanization ?? id.toUpperCase()}
              </span>
            </div>
          )
        })}
      </div>

      {/* Romanization beneath the carving */}
      <div className="font-display mt-5 text-center text-3xl leading-none font-semibold tracking-wide">
        {word.romanization}
      </div>
      <div className="text-dim mt-2 text-center text-[9px] tracking-[0.2em] uppercase">
        {tokens.length} letters — glyphs uncarved
      </div>
    </Panel>
  )
}
