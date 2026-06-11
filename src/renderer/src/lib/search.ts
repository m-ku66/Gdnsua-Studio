// ─────────────────────────────────────────────
// Tiered search engine
//   Tier 1 — exact alias / romanization match
//   Tier 2 — fuzzy match (Fuse.js)
//   Tier 3 — semantic ("interpreted") arrives later
// ─────────────────────────────────────────────
import Fuse from 'fuse.js'
import { words } from '../data'
import type { Word } from '../data/types'

export type MatchTier = 'exact' | 'close' | 'interpreted'

export interface SearchResult {
  word: Word
  tier: MatchTier
}

const norm = (s: string): string => s.toLowerCase().trim()

// Tier 1 index: every gloss maps straight to its words
const aliasMap = new Map<string, Word[]>()
for (const w of words) {
  for (const g of w.glosses) {
    const key = norm(g)
    const list = aliasMap.get(key) ?? []
    list.push(w)
    aliasMap.set(key, list)
  }
}

// Tier 2: fuzzy over glosses + romanization + notes
const fuse = new Fuse(words, {
  keys: [
    { name: 'glosses', weight: 2 },
    { name: 'romanization', weight: 1.5 },
    { name: 'notes', weight: 0.4 }
  ],
  threshold: 0.34,
  ignoreLocation: true
})

export function searchWords(query: string, limit = 14): SearchResult[] {
  const q = norm(query)
  if (!q) return []

  const out: SearchResult[] = []
  const seen = new Set<string>()
  const take = (w: Word, tier: MatchTier): void => {
    if (seen.has(w.id)) return
    out.push({ word: w, tier })
    seen.add(w.id)
  }

  // Tier 1 — exact gloss, then exact romanization (Gdnsua → English)
  for (const w of aliasMap.get(q) ?? []) take(w, 'exact')
  for (const w of words) {
    if (norm(w.romanization) === q) take(w, 'exact')
  }

  // Tier 2 — fuzzy fills the remainder
  for (const r of fuse.search(q, { limit: limit + seen.size })) {
    if (out.length >= limit) break
    take(r.item, 'close')
  }

  return out
}
