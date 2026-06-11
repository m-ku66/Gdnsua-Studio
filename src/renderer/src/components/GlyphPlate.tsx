// GlyphPlate — the signature element: a word rendered as a carving.
// Two anatomies:
//   words     → letter cells in sequence
//   modifiers → a mark attached to a grey host glyph (cf. dakuten)
import { letterById, wordById } from '../data'
import { isModifier, type MarkPosition, type Word } from '../data/types'
import { getLetterGlyph, getModifierInfo } from '../lib/glyphRegistry'
import { resolveLogograph, useGlyphStore } from '../lib/logographSource'
import { spellWord } from '../lib/spelling'
import { Panel } from './ui/Panel'

const markCell =
  'border-seal/70 flex items-center justify-center border border-dashed'

/** Grey host box + mark. With a carved SVG, renders the true composition:
 *  the SVG is scaled so its internal dummy rect equals the host box, and
 *  absolutely positioned over it — the mark lands itself. */
function ModifierAnatomy({
  position,
  modifierId
}: {
  position: MarkPosition
  modifierId: string
}): React.JSX.Element {
  const info = getModifierInfo(modifierId)
  const HOST_PX = 80

  // ── Carved: composition from the SVG's own coordinates ──
  if (info?.host) {
    const scale = HOST_PX / info.host.w
    const hostH = info.host.h * scale
    return (
      <div className="flex items-center justify-center">
        <div className="relative" style={{ width: HOST_PX, height: hostH }}>
          <div className="bg-dim/45 absolute inset-0 flex items-center justify-center">
            <span className="text-ink/45 text-[8px] tracking-[0.16em] uppercase">host</span>
          </div>
          <div
            className="text-ink pointer-events-none absolute [&_svg]:h-full [&_svg]:w-full"
            style={{
              width: info.viewBox.w * scale,
              height: info.viewBox.h * scale,
              left: -info.host.x * scale,
              top: -info.host.y * scale
            }}
            dangerouslySetInnerHTML={{ __html: info.svg }}
          />
        </div>
      </div>
    )
  }

  // ── Uncarved: dashed placeholder by declared/unknown position ──
  const host = (
    <div className="bg-dim/45 flex h-20 w-20 items-center justify-center">
      <span className="text-ink/45 text-[8px] tracking-[0.16em] uppercase">host</span>
    </div>
  )
  const vertical = position === 'top' || position === 'bottom'
  const mark = (
    <div
      title="Modifier mark — glyph pending"
      className={`${markCell} ${vertical ? 'h-4 w-20' : 'h-20 w-4'}`}
    />
  )
  const markFirst = position === 'top' || position === 'left' || position === 'unassigned'
  return (
    <div className={`flex items-center justify-center gap-2 ${vertical ? 'flex-col' : ''}`}>
      {markFirst ? mark : host}
      {markFirst ? host : mark}
    </div>
  )
}

export function GlyphPlate({ word }: { word: Word }): React.JSX.Element {
  // ── Modifier: a mark, never letters ──
  if (isModifier(word)) {
    const info = getModifierInfo(word.id)
    return (
      <Panel corners className="px-6 py-7">
        <ModifierAnatomy position={word.markPosition ?? 'unassigned'} modifierId={word.id} />
        <div className="font-display mt-5 text-center text-3xl leading-none font-semibold tracking-wide">
          {word.romanization}
        </div>
        <div className="text-dim mt-2 text-center text-[9px] tracking-[0.2em] uppercase">
          Modifier mark — attaches to a host glyph
          {info?.host
            ? ` · position: ${info.position} (derived)`
            : (!word.markPosition || word.markPosition === 'unassigned') &&
              ' · position unassigned'}
        </div>
      </Panel>
    )
  }

  // ── Standard word: logograph hero when available, else letters ──
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useGlyphStore((s) => s.version) // re-render when Forge approves a glyph
  const logo = resolveLogograph(word.id)
  const spell = spellWord(word, {
    trueW: word.regions?.includes('Kharmat') || word.regions?.includes('Haadfahuta')
  })
  const letterCount = spell.filter((t) => t.type === 'letter').length
  const logoCount = spell.length - letterCount

  return (
    <Panel corners className="px-6 py-7">
      {logo && (
        <div className="mb-5 flex justify-center">
          <div className="border-ink/40 flex h-36 w-36 items-center justify-center border p-3">
            <div
              className="text-ink h-full w-full [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: logo.svg }}
            />
          </div>
        </div>
      )}
      <div
        className={`flex flex-wrap items-center justify-center ${logo ? 'gap-1 opacity-80' : 'gap-2'}`}
      >
        {spell.map((tok, i) => {
          if (tok.type === 'logo') {
            const rootWord = wordById.get(tok.rootId)
            const rootLogo = resolveLogograph(tok.rootId)
            const title = rootWord
              ? `⟨${rootWord.romanization}⟩ logograph — ${rootWord.glosses.join(', ')}`
              : tok.rootRomanization
            return (
              <div
                key={`logo-${tok.rootId}-${i}`}
                title={title}
                className={`flex h-14 w-14 items-center justify-center border-2
                  ${rootLogo ? 'border-ink' : 'border-seal/70 border-dashed'}`}
              >
                {rootLogo ? (
                  <div
                    className="text-ink h-10 w-10 [&_svg]:h-full [&_svg]:w-full"
                    dangerouslySetInnerHTML={{ __html: rootLogo.svg }}
                  />
                ) : (
                  <div className="relative flex h-10 w-10 items-center justify-center">
                    <svg viewBox="0 0 40 40" className="text-seal/50 absolute inset-0 h-full w-full">
                      <rect x="1" y="1" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="3" y1="37" x2="37" y2="3" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                    <span className="text-seal bg-vellum relative px-0.5 text-[8px] font-medium">
                      {tok.rootRomanization}
                    </span>
                  </div>
                )}
              </div>
            )
          }
          const id = tok.id
          const letter = letterById.get(id)
          const svg = getLetterGlyph(id)
          return (
            <div
              key={`${id}-${i}`}
              title={letter ? `${letter.letterName} (${letter.sound})` : id}
              className={`flex h-14 w-14 items-center justify-center border
                ${svg ? 'border-ink/40 border-solid' : 'border-dim/60 border-dashed'}`}
            >
              {svg ? (
                <div
                  className="text-ink h-10 w-10 [&_svg]:h-full [&_svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: svg }}
                />
              ) : (
                <div className="relative flex h-10 w-10 items-center justify-center">
                  {/* Uncarved: empty slashed stone */}
                  <svg viewBox="0 0 40 40" className="text-dim/50 absolute inset-0 h-full w-full">
                    <rect x="1" y="1" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="3" y1="37" x2="37" y2="3" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span className="text-dim bg-vellum relative px-0.5 text-[9px] font-medium">
                    {letter?.romanization ?? id.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="font-display mt-5 text-center text-3xl leading-none font-semibold tracking-wide">
        {word.romanization}
      </div>
      <div className="text-dim mt-2 text-center text-[9px] tracking-[0.2em] uppercase">
        {logoCount > 0
          ? `spelled as ${spell
              .map((t) =>
                t.type === 'logo'
                  ? `⟨${t.rootRomanization}⟩`
                  : (letterById.get(t.id)?.romanization ?? t.id.toUpperCase())
              )
              .join(' ')}`
          : logo
            ? `logograph (${logo.source}) · spelled with ${letterCount} letters`
            : `${letterCount} letters${spell.some((t) => t.type === 'letter' && !getLetterGlyph(t.id)) ? ' — some glyphs uncarved' : ''}`}
      </div>
    </Panel>
  )
}
