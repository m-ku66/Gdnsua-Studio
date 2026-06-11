// ─────────────────────────────────────────────
// Data entry point — merges all word files
// ─────────────────────────────────────────────
import alphabetData from './alphabet.json'
import baseWords from './base.json'
import domainWords from './domains.json'
import miscWords from './misc.json'
import numberWords from './numbers.json'
import type { Letter, Word } from './types'

export const letters = alphabetData as Letter[]

export const letterById = new Map(letters.map((l) => [l.id, l]))

export const words = [
  ...baseWords,
  ...domainWords,
  ...miscWords,
  ...numberWords
] as unknown as Word[]

export const wordById = new Map(words.map((w) => [w.id, w]))

export const categories = [...new Set(words.map((w) => w.category))].sort()
