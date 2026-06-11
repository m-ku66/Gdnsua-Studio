// ─────────────────────────────────────────────
// App state — Zustand
// ─────────────────────────────────────────────
import { create } from 'zustand'

export type Section = 'dictionary' | 'names' | 'numbers' | 'tools'

interface AppState {
  section: Section
  query: string
  selectedId: string | null
  setSection: (s: Section) => void
  setQuery: (q: string) => void
  select: (id: string | null) => void
}

export const useAppStore = create<AppState>((set) => ({
  section: 'dictionary',
  query: '',
  selectedId: null,
  setSection: (section) => set({ section }),
  setQuery: (query) => set({ query }),
  select: (selectedId) => set({ selectedId })
}))
