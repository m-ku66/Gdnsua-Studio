// Logograph strategy analysis: how many atomic roots vs composable compounds?
import { readFileSync } from 'node:fs'
const root = new URL('../src/renderer/src/data/', import.meta.url)
const files = ['base.json', 'domains.json', 'misc.json', 'numbers.json']
const words = files.flatMap((f) => JSON.parse(readFileSync(new URL(f, root))))
const byId = new Map(words.map((w) => [w.id, w]))

const compounds = words.filter((w) => w.derivedFrom?.length)
const componentIds = new Set(compounds.flatMap((w) => w.derivedFrom))
const atomicRoots = [...componentIds].filter((id) => !byId.get(id)?.derivedFrom?.length)
const modifiers = words.filter((w) => w.category === 'modifier').length

// Long words (5+ letters in romanization, rough proxy) that are NOT compounds
// — these benefit most from a logograph but can't be composed
const longAtoms = words.filter(
  (w) =>
    !w.derivedFrom?.length &&
    w.category !== 'modifier' &&
    w.romanization.replace(/[^A-Zʍ/]/gi, '').length >= 7
)

console.log('total words:', words.length)
console.log('compounds (auto-composable):', compounds.length)
console.log('unique component roots referenced:', componentIds.size)
console.log('  of which atomic (hand-carve targets):', atomicRoots.length)
console.log('modifiers (already designed):', modifiers)
console.log('long atomic words (7+ letters, logograph candidates):', longAtoms.length)
console.log('\nTop 20 most-referenced roots (carve these first):')
const refCount = new Map()
for (const w of compounds) for (const d of w.derivedFrom) refCount.set(d, (refCount.get(d) ?? 0) + 1)
const top = [...refCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
for (const [id, n] of top) console.log(`  ${byId.get(id)?.romanization ?? id} (${n} compounds)`)
