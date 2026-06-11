// SearchBar — the QUERY line
import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/useAppStore'
import { SectionLabel } from './ui/primitives'

export function SearchBar(): React.JSX.Element {
  const query = useAppStore((s) => s.query)
  const setQuery = useAppStore((s) => s.setQuery)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === '/' && document.activeElement !== ref.current) {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div>
      <SectionLabel>Query — English or Gdnsua</SectionLabel>
      <div className="flex items-baseline gap-3">
        <input
          ref={ref}
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="type a word…"
          spellCheck={false}
          className="border-rule placeholder:text-dim/70 focus:border-ink w-full border-b
            bg-transparent pb-2 font-mono text-base outline-none transition-colors"
        />
        <kbd className="border-rule text-dim shrink-0 border px-1.5 py-0.5 text-[9px]">/</kbd>
      </div>
    </div>
  )
}
