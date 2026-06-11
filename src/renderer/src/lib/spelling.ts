// ─────────────────────────────────────────────
// Mixed-script spelling — kanji-style readings.
// When a word's derivation chain reaches a campaign root AND that
// root's romanization appears contiguously in the word, the root
// portion is written with its logograph and the remainder with
// syllabary letters (cf. kanji + okurigana: TAUSM → ⟨TAUS⟩ + M).
// Derivation gating prevents false friends: NAMN contains "AMN"
// but does not derive from it, so it stays fully syllabic.
// ─────────────────────────────────────────────
import { wordById } from '../data'
import type { Word } from '../data/types'
import { ROOT_THEMES } from './logographGen'
import { promotedRoots } from './relations'
import { tokenizeRomanization, type TokenizeOptions } from './tokenize'

/** Roots eligible to appear inside spellings: Campaign I + promoted (Campaign II) */
export const activeRoots = (): string[] => [
  ...Object.keys(ROOT_THEMES),
  ...promotedRoots().filter((r) => !(r in ROOT_THEMES))
]

export type SpellToken =
  | { type: 'letter'; id: string }
  | { type: 'logo'; rootId: string; rootRomanization: string }

/** Does this word's derivation chain reach rootId? (transitive, depth-limited) */
export function derivesFrom(wordId: string, rootId: string, depth = 0): boolean {
  if (depth > 4) return false
  const parts = wordById.get(wordId)?.derivedFrom
  if (!parts) return false
  return parts.some((p) => p === rootId || derivesFrom(p, rootId, depth + 1))
}

interface RootMatch {
  start: number
  end: number
  rootId: string
  rom: string
}

/**
 * Spell a word as mixed script: logograph tokens for embedded roots
 * the word actually derives from, letter tokens for everything else.
 * Longest roots claim their span first; occurrences never overlap.
 */
export function spellWord(word: Word, opts: TokenizeOptions = {}): SpellToken[] {
  const rom = word.romanization.toUpperCase()
  const roots = word.syllabicOnly
    ? []
    : activeRoots()
        .filter((r) => r !== word.id && derivesFrom(word.id, r))
        .map((r) => ({ id: r, rom: (wordById.get(r)?.romanization ?? '').toUpperCase() }))
        .filter((r) => r.rom.length > 0)
        .sort((a, b) => b.rom.length - a.rom.length)

  const matches: RootMatch[] = []
  for (const root of roots) {
    let from = 0
    for (;;) {
      const i = rom.indexOf(root.rom, from)
      if (i === -1) break
      const end = i + root.rom.length
      if (!matches.some((m) => i < m.end && m.start < end)) {
        matches.push({ start: i, end, rootId: root.id, rom: root.rom })
      }
      from = i + 1
    }
  }
  matches.sort((a, b) => a.start - b.start)

  const out: SpellToken[] = []
  let cursor = 0
  const pushLetters = (s: string): void => {
    if (!s) return
    for (const id of tokenizeRomanization(s, opts).tokens) out.push({ type: 'letter', id })
  }
  for (const m of matches) {
    pushLetters(rom.slice(cursor, m.start))
    out.push({ type: 'logo', rootId: m.rootId, rootRomanization: m.rom })
    cursor = m.end
  }
  pushLetters(rom.slice(cursor))
  return out
}
