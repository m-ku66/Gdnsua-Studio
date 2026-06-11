// ─────────────────────────────────────────────
// Dozenal (base-12) math engine for the calculator.
// - safe recursive-descent expression evaluator (+ − × ÷ parens),
//   accepting decimal or dozenal literals (digits 0-9, A=10, B=11)
// - dozenal rendering with bounded fractional expansion
// - spoken readings per the source doc: 12=UZE, 24=IZE, 36=LIZE,
//   other dozens compose "DIGIT ZE"; 144=HA, 12^3=HAN, 12^4=HANIL,
//   12^5=HAZFIL, 12^6=HZ; a leading 1 uses the bare place name
//   (144 → "HA", like "a gross"). Negatives read with AN (negation).
// ─────────────────────────────────────────────
import { wordById } from '../data'

export const DOZENAL_DIGITS = '0123456789AB'

/** Word ids for digits 0–11, used for glyph + name lookups */
export const DIGIT_WORD_IDS = [
  'nhakt', 'uus', 'itz', 'lil', 'pd', 'kaz',
  'taz', 'win', 'xoh', 'ioh', 'eh-num', 'raj'
]

const digitName = (d: number): string =>
  wordById.get(DIGIT_WORD_IDS[d])?.romanization ?? DOZENAL_DIGITS[d]

const PLACE_IDS = ['', 'uze', 'ha-144', 'han', 'hanil', 'hazfil', 'hz']
const placeName = (p: number): string =>
  wordById.get(PLACE_IDS[p])?.romanization ?? PLACE_IDS[p].toUpperCase()

/** One unit of the spoken/written reading, mapped to a glyph source */
export interface ReadingToken {
  /** word id for numeral glyph lookup, 'an' for the negation mark, or null */
  id: string | null
  label: string
  isModifierMark?: boolean
}

/**
 * Reading as glyph-renderable tokens (same rules as dozenalReading).
 * "DIGIT ZE" composed dozens reuse the UZE glyph for the ZE part.
 */
export function dozenalReadingTokens(n: number): ReadingToken[] | null {
  if (!Number.isInteger(n) || Math.abs(n) >= 12 ** 7) return null
  const out: ReadingToken[] = []
  if (n < 0) out.push({ id: 'an', label: 'AN', isModifierMark: true })
  if (n === 0) {
    out.push({ id: DIGIT_WORD_IDS[0], label: digitName(0) })
    return out
  }
  let abs = Math.abs(n)
  const digits: number[] = []
  while (abs > 0) {
    digits.push(abs % 12)
    abs = Math.floor(abs / 12)
  }
  for (let p = digits.length - 1; p >= 0; p--) {
    const d = digits[p]
    if (d === 0) continue
    if (p === 0) out.push({ id: DIGIT_WORD_IDS[d], label: digitName(d) })
    else if (p === 1) {
      if (d === 1) out.push({ id: 'uze', label: placeName(1) })
      else if (d === 2) out.push({ id: 'ize', label: wordById.get('ize')?.romanization ?? 'IZE' })
      else if (d === 3) out.push({ id: 'lize', label: wordById.get('lize')?.romanization ?? 'LIZE' })
      else {
        out.push({ id: DIGIT_WORD_IDS[d], label: digitName(d) })
        out.push({ id: 'uze', label: 'ZE' })
      }
    } else {
      if (d !== 1) out.push({ id: DIGIT_WORD_IDS[d], label: digitName(d) })
      out.push({ id: PLACE_IDS[p], label: placeName(p) })
    }
  }
  return out
}

// ── Expression evaluation ──
/** Evaluate +−×÷() over literals in the given base. Throws on bad input. */
export function evaluate(expr: string, base: 10 | 12): number {
  const src = expr.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-')
  if (!src) throw new Error('empty')
  let pos = 0

  const isDigit = (c: string): boolean =>
    base === 12 ? /[0-9ABab]/.test(c) : /[0-9]/.test(c)

  const number = (): number => {
    let intPart = 0
    let seen = false
    while (pos < src.length && isDigit(src[pos])) {
      intPart = intPart * base + DOZENAL_DIGITS.indexOf(src[pos].toUpperCase())
      pos++
      seen = true
    }
    let frac = 0
    if (src[pos] === '.') {
      pos++
      let scale = 1 / base
      while (pos < src.length && isDigit(src[pos])) {
        frac += DOZENAL_DIGITS.indexOf(src[pos].toUpperCase()) * scale
        scale /= base
        pos++
        seen = true
      }
    }
    if (!seen) throw new Error('expected a number')
    return intPart + frac
  }

  const factor = (): number => {
    if (src[pos] === '-') {
      pos++
      return -factor()
    }
    if (src[pos] === '(') {
      pos++
      const v = sum()
      if (src[pos] !== ')') throw new Error('missing )')
      pos++
      return v
    }
    return number()
  }

  const term = (): number => {
    let v = factor()
    while (src[pos] === '*' || src[pos] === '/') {
      const op = src[pos++]
      const r = factor()
      v = op === '*' ? v * r : v / r
    }
    return v
  }

  const sum = (): number => {
    let v = term()
    while (src[pos] === '+' || src[pos] === '-') {
      const op = src[pos++]
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  const result = sum()
  if (pos < src.length) throw new Error(`unexpected “${src[pos]}”`)
  if (!Number.isFinite(result)) throw new Error('not a finite number')
  return result
}

// ── Dozenal rendering ──
export interface DozenalForm {
  text: string // e.g. "-A8B.6" (digits 0-9 A B)
  truncated: boolean // fractional part cut at maxFrac places
}

export function toDozenal(n: number, maxFrac = 4): DozenalForm {
  if (!Number.isFinite(n)) return { text: '∞', truncated: false }
  const neg = n < 0
  let abs = Math.abs(n)
  let int = Math.floor(abs)
  let frac = abs - int

  let intText = ''
  if (int === 0) intText = '0'
  while (int > 0) {
    intText = DOZENAL_DIGITS[int % 12] + intText
    int = Math.floor(int / 12)
  }

  let fracText = ''
  let truncated = false
  if (frac > 1e-12) {
    for (let i = 0; i < maxFrac; i++) {
      frac *= 12
      const d = Math.floor(frac + 1e-9)
      fracText += DOZENAL_DIGITS[Math.min(d, 11)]
      frac -= d
      if (frac < 1e-9) break
    }
    truncated = frac >= 1e-9
    fracText = fracText.replace(/0+$/, '')
  }

  return {
    text: (neg ? '-' : '') + intText + (fracText ? '.' + fracText : ''),
    truncated
  }
}

/** Digit values (0–11) for each dozenal char; '.' and '-' pass through */
export function dozenalTokens(text: string): (number | '.' | '-')[] {
  return [...text].map((c) =>
    c === '.' || c === '-' ? c : DOZENAL_DIGITS.indexOf(c)
  ) as (number | '.' | '-')[]
}

// ── Spoken reading ──
/**
 * Reading for whole numbers, |n| < 12^7. Per the doc:
 *   13 → "UZE-UUS", 24 → "IZE", 34 → "IZE-EDZ(EH)"-style: groups
 *   hyphen-joined, zero digits skipped. Dozens place uses attested
 *   contractions (UZE/IZE/LIZE) then composes "DIGIT ZE". Higher
 *   places: "DIGIT PLACE", with a bare place name when the digit
 *   is 1 (144 → "HA"). Negatives prefix AN (the negation modifier).
 */
export function dozenalReading(n: number): string | null {
  if (!Number.isInteger(n) || Math.abs(n) >= 12 ** 7) return null
  if (n === 0) return digitName(0)
  const neg = n < 0
  let abs = Math.abs(n)

  const digits: number[] = [] // index = place (0 = units)
  while (abs > 0) {
    digits.push(abs % 12)
    abs = Math.floor(abs / 12)
  }

  const groups: string[] = []
  for (let p = digits.length - 1; p >= 0; p--) {
    const d = digits[p]
    if (d === 0) continue
    if (p === 0) groups.push(digitName(d))
    else if (p === 1) {
      if (d === 1) groups.push(placeName(1)) // UZE
      else if (d === 2) groups.push(wordById.get('ize')?.romanization ?? 'IZE')
      else if (d === 3) groups.push(wordById.get('lize')?.romanization ?? 'LIZE')
      else groups.push(`${digitName(d)} ZE`)
    } else {
      groups.push(d === 1 ? placeName(p) : `${digitName(d)} ${placeName(p)}`)
    }
  }
  return (neg ? 'AN ' : '') + groups.join('-')
}
