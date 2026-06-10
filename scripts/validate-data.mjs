// Validation: run with `node scripts/validate-data.mjs`
import { readFileSync, existsSync } from 'node:fs'

const root = new URL('../src/renderer/src/data/', import.meta.url)
const alphabet = JSON.parse(readFileSync(new URL('alphabet.json', root)))
const WORD_FILES = ['base.json', 'domains.json', 'misc.json', 'numbers.json']
const base = WORD_FILES.flatMap((f) => {
  const url = new URL(f, root)
  return existsSync(url) ? JSON.parse(readFileSync(url)) : []
})

const DIGRAPHS = ['MN', 'KS', 'VK', 'ZK']
const LETTERS = new Set(alphabet.map((l) => l.id))
const SKIP = new Set([' ', '-', '.', "'", '?', '!', '"', ','])

function tokenize(input) {
  const s = input.toUpperCase().replace(/\/ʍ\//gi, 'ʍ')
  const unknown = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (SKIP.has(ch)) { i++; continue }
    if (DIGRAPHS.includes(s.slice(i, i + 2))) { i += 2; continue }
    if (ch === 'ʍ' || ch === 'W') { i++; continue }
    if (LETTERS.has(ch.toLowerCase())) { i++; continue }
    unknown.push(ch); i++
  }
  return unknown
}

let errors = 0
const seen = new Map()
for (const w of base) {
  if (seen.has(w.id)) {
    console.error(`DUPLICATE ID: ${w.id}`); errors++
  }
  seen.set(w.id, w)
  if (w.romanization !== w.romanization.toUpperCase()) {
    console.error(`NOT ALL CAPS: ${w.id} → ${w.romanization}`); errors++
  }
  const unknown = tokenize(w.romanization)
  if (unknown.length) {
    console.error(`UNKNOWN CHARS in ${w.romanization}: ${unknown.join(' ')}`); errors++
  }
}
// derivedFrom references must resolve
for (const w of base) {
  for (const ref of w.derivedFrom ?? []) {
    if (!seen.has(ref)) { console.error(`BAD derivedFrom in ${w.id}: ${ref}`); errors++ }
  }
}
console.log(`Checked ${base.length} entries, ${alphabet.length} letters.`)
console.log(errors ? `${errors} error(s) found.` : 'All clear ✔')
process.exit(errors ? 1 : 0)
