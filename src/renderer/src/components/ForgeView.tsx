// ForgeView — generate, judge, and carve logograph drafts
import { useMemo, useState } from 'react'
import { wordById } from '../data'
import { generateCandidates } from '../lib/logographGen'
import { resolveLogograph, setRuntimeLogograph, useGlyphStore } from '../lib/logographSource'
import { Diamond, SectionLabel } from './ui/primitives'
import { Panel } from './ui/Panel'

/** Elements pilot — the first carving campaign */
const PILOT_ROOTS = ['taus', 'fuia', 'iia', 'val', 'uii', 'zkas', 'hez', 'eld', 'huld']

function RootForge({ rootId }: { rootId: string }): React.JSX.Element | null {
  useGlyphStore((s) => s.version)
  const word = wordById.get(rootId)
  const [seed, setSeed] = useState(1)
  const [saving, setSaving] = useState(false)
  const candidates = useMemo(() => generateCandidates(rootId, seed, 4), [rootId, seed])
  if (!word) return null

  const carved = resolveLogograph(rootId)?.source === 'carved'

  const approve = async (svg: string): Promise<void> => {
    setSaving(true)
    setRuntimeLogograph(rootId, svg)
    await window.api.saveLogograph(rootId, svg)
    setSaving(false)
  }

  return (
    <Panel className="px-5 py-4">
      <div className="mb-3 flex items-baseline justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-xl font-semibold tracking-wide">
            {word.romanization}
          </span>
          <span className="text-dim text-[11px]">{word.glosses.join(', ')}</span>
        </div>
        <div className="flex items-center gap-3">
          {carved && (
            <span className="text-seal text-[9px] tracking-[0.16em] uppercase">◆ carved</span>
          )}
          <button
            onClick={() => setSeed((s) => s + 1)}
            className="border-rule hover:bg-ink hover:text-sand cursor-pointer border px-2.5
              py-1 text-[9px] tracking-[0.14em] uppercase transition-colors"
          >
            Reroll
          </button>
        </div>
      </div>
      <div className="flex gap-3">
        {candidates.map((svg, i) => (
          <button
            key={`${seed}-${i}`}
            onClick={() => approve(svg)}
            disabled={saving}
            title="Approve this draft — saves to glyphs/logographs/"
            className="border-rule bg-sand/60 hover:border-ink group flex h-24 w-24
              cursor-pointer items-center justify-center border p-2 transition-colors"
          >
            <div
              className="text-ink/85 group-hover:text-ink h-full w-full [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </button>
        ))}
      </div>
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
          Draft logographs for atomic roots — geometric, carved in the manner of the old wall.
          Click a draft to approve it; reroll for new candidates. Approved glyphs save to the
          drop zone and propagate to every compound that derives from the root.
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
