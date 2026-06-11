import { useEffect, useMemo } from 'react'
import { AppShell } from './components/AppShell'
import { ForgeView } from './components/ForgeView'
import { ResultsList } from './components/ResultsList'
import { SearchBar } from './components/SearchBar'
import { WordDetail } from './components/WordDetail'
import { wordById } from './data'
import { initRelations } from './lib/relations'
import { searchWords } from './lib/search'
import { useAppStore } from './store/useAppStore'

function DictionaryView(): React.JSX.Element {
  const query = useAppStore((s) => s.query)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)

  const results = useMemo(() => searchWords(query), [query])

  // Keep a sane selection: top result when the list changes
  useEffect(() => {
    if (results.length === 0) {
      select(null)
    } else if (!results.some((r) => r.word.id === selectedId)) {
      select(results[0].word.id)
    }
  }, [results, selectedId, select])

  const selected = selectedId ? wordById.get(selectedId) : undefined

  return (
    <div className="flex h-full flex-col gap-6 overflow-hidden p-6">
      <SearchBar />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[5fr_4fr]">
        <div className="min-h-0 overflow-y-auto pr-1">
          <ResultsList results={results} />
        </div>
        <div className="min-h-0 overflow-y-auto pr-1">
          {selected ? (
            <WordDetail word={selected} />
          ) : (
            <div className="text-dim pt-10 text-center text-[10px] tracking-[0.16em] uppercase">
              No record selected
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function App(): React.JSX.Element {
  const section = useAppStore((s) => s.section)
  useEffect(() => {
    void initRelations() // apply persisted relationship overrides once
  }, [])
  return <AppShell>{section === 'tools' ? <ForgeView /> : <DictionaryView />}</AppShell>
}

export default App
