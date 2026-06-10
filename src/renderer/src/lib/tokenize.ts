// ─────────────────────────────────────────────
// Gdnsua tokenizer — romanization → letter ids
// Greedy longest-match: digraphs (MN, KS, VK, ZK)
// take priority over single letters.
// ─────────────────────────────────────────────
import alphabet from '../data/alphabet.json'

const DIGRAPHS = ['MN', 'KS', 'VK', 'ZK'] as const

const LETTER_IDS = new Set(alphabet.map((l) => l.id))

export interface TokenizeResult {
  /** Letter ids in order, e.g. TAUS → ["t","a","u","s"] */
  tokens: string[]
  /** Characters we couldn't map — signals typos or schema gaps */
  unknown: string[]
}

export interface TokenizeOptions {
  /**
   * Kharmat/Haadfahuta mode: W is the regional letter "wan".
   * Default false: written W = /ʍ/ (hirs), per the guide.
   */
  trueW?: boolean
}

/** Separators we skip: hyphens, spaces, dots, apostrophes */
const SKIP = new Set([' ', '-', '.', "'", '?', '!', '"', ','])

export function tokenizeRomanization(
  input: string,
  opts: TokenizeOptions = {}
): TokenizeResult {
  // Normalize: uppercase, /ʍ/ notation → single placeholder char
  const s = input.toUpperCase().replace(/\/ʍ\//gi, 'ʍ')
  const tokens: string[] = []
  const unknown: string[] = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (SKIP.has(ch)) { i++; continue }
    const two = s.slice(i, i + 2)
    if ((DIGRAPHS as readonly string[]).includes(two)) {
      tokens.push(two.toLowerCase()); i += 2; continue
    }
    if (ch === 'ʍ' || (ch === 'W' && !opts.trueW)) {
      tokens.push('hw'); i++; continue
    }
    const id = ch.toLowerCase()
    if (LETTER_IDS.has(id)) { tokens.push(id); i++; continue }
    unknown.push(ch); i++
  }
  return { tokens, unknown }
}
