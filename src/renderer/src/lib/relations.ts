// ─────────────────────────────────────────────
// Relations store — runtime CRUD for word relationships and
// promoted (Campaign II) roots, persisted to relations.local.json
// via IPC. Edits mutate the in-memory word objects directly so
// spelling, etymology, and detail views all update live; the file
// is re-applied over the JSON data on every app start.
// ─────────────────────────────────────────────
import { create } from 'zustand'
import { wordById } from '../data'

export interface WordPatch {
  derivedFrom?: string[]
  relatedTo?: string[]
  syllabicOnly?: boolean
}

interface RelationsFile {
  roots: string[]
  words: Record<string, WordPatch>
}

let file: RelationsFile = { roots: [], words: {} }

interface RelationsStoreState {
  version: number
  bump: () => void
}
/** Subscribe in components that render spellings or relationships */
export const useRelationsStore = create<RelationsStoreState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 }))
}))

const bump = (): void => useRelationsStore.getState().bump()
const persist = (): void => void window.api.saveRelations(file)

function applyPatch(id: string, patch: WordPatch): void {
  const w = wordById.get(id)
  if (!w) return
  if (patch.derivedFrom !== undefined) w.derivedFrom = patch.derivedFrom
  if (patch.relatedTo !== undefined) w.relatedTo = patch.relatedTo
  if (patch.syllabicOnly !== undefined) w.syllabicOnly = patch.syllabicOnly
}

/** Load persisted overrides and apply them over the JSON data */
export async function initRelations(): Promise<void> {
  try {
    const data = (await window.api.loadRelations()) as RelationsFile | null
    if (data && Array.isArray(data.roots) && data.words) {
      file = data
      for (const [id, patch] of Object.entries(file.words)) applyPatch(id, patch)
    }
  } catch {
    // first run / no file — fine
  }
  bump()
}

// ── Promoted roots (Campaign II) ──
export const promotedRoots = (): string[] => [...file.roots]

export function promoteRoot(id: string): void {
  if (!wordById.has(id) || file.roots.includes(id)) return
  file.roots.push(id)
  persist()
  bump()
}

export function demoteRoot(id: string): void {
  file.roots = file.roots.filter((r) => r !== id)
  persist()
  bump()
}

// ── Word relationship CRUD ──
/** Replace a word's relationship fields; records the FULL new value */
export function updateWord(id: string, patch: WordPatch): void {
  const w = wordById.get(id)
  if (!w) return
  applyPatch(id, patch)
  file.words[id] = {
    ...(file.words[id] ?? {}),
    ...(patch.derivedFrom !== undefined ? { derivedFrom: patch.derivedFrom } : {}),
    ...(patch.relatedTo !== undefined ? { relatedTo: patch.relatedTo } : {}),
    ...(patch.syllabicOnly !== undefined ? { syllabicOnly: patch.syllabicOnly } : {})
  }
  persist()
  bump()
}

export function addDerivedFrom(id: string, parentId: string): boolean {
  const w = wordById.get(id)
  if (!w || !wordById.has(parentId) || parentId === id) return false
  const cur = w.derivedFrom ?? []
  if (cur.includes(parentId)) return false
  updateWord(id, { derivedFrom: [...cur, parentId] })
  return true
}

export function removeDerivedFrom(id: string, parentId: string): void {
  const w = wordById.get(id)
  if (!w) return
  updateWord(id, { derivedFrom: (w.derivedFrom ?? []).filter((p) => p !== parentId) })
}

/** relatedTo is kept symmetric: links are written on both words */
export function addRelated(a: string, b: string): boolean {
  const wa = wordById.get(a)
  const wb = wordById.get(b)
  if (!wa || !wb || a === b) return false
  if ((wa.relatedTo ?? []).includes(b)) return false
  updateWord(a, { relatedTo: [...(wa.relatedTo ?? []), b] })
  updateWord(b, { relatedTo: [...(wb.relatedTo ?? []), a] })
  return true
}

export function removeRelated(a: string, b: string): void {
  const wa = wordById.get(a)
  const wb = wordById.get(b)
  if (wa) updateWord(a, { relatedTo: (wa.relatedTo ?? []).filter((x) => x !== b) })
  if (wb) updateWord(b, { relatedTo: (wb.relatedTo ?? []).filter((x) => x !== a) })
}

export function setSyllabicOnly(id: string, value: boolean): void {
  updateWord(id, { syllabicOnly: value })
}
