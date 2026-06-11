// AppShell — top bar, left index rail, status footer
import type { ReactNode } from 'react'
import { words } from '../data'
import { useAppStore, type Section } from '../store/useAppStore'
import { Diamond } from './ui/primitives'
import { MazeBackdrop } from './MazeBackdrop'

const SECTIONS: { id: Section; label: string; ready: boolean }[] = [
  { id: 'dictionary', label: 'Dictionary', ready: true },
  { id: 'names', label: 'Names', ready: false },
  { id: 'numbers', label: 'Numbers', ready: false },
  { id: 'tools', label: 'Tools', ready: false }
]

function RailItem({ id, label, ready }: (typeof SECTIONS)[number]): React.JSX.Element {
  const active = useAppStore((s) => s.section) === id
  const setSection = useAppStore((s) => s.setSection)
  return (
    <button
      onClick={() => ready && setSection(id)}
      disabled={!ready}
      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-[10px]
        tracking-[0.16em] uppercase transition-colors focus-visible:outline-1
        focus-visible:outline-offset-[-1px] focus-visible:outline-ink
        ${active ? 'bg-ink text-sand' : ready ? 'text-ink hover:bg-vellum cursor-pointer' : 'text-dim/60 cursor-default'}`}
    >
      {active && <Diamond className="text-[7px]" />}
      <span>{label}</span>
      {!ready && <span className="ml-auto text-[7px] tracking-[0.1em]">SOON</span>}
    </button>
  )
}

export function AppShell({ children }: { children: ReactNode }): React.JSX.Element {
  const section = useAppStore((s) => s.section)
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <MazeBackdrop />

      {/* Top bar */}
      <header className="border-rule relative z-10 flex items-center justify-between border-b px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Diamond className="text-seal text-[9px]" />
          <span className="font-display text-lg font-semibold tracking-wide">Gdnsua</span>
          <span className="text-dim text-[10px] tracking-[0.2em] uppercase">— Archive</span>
        </div>
        <div className="text-dim text-[9px] tracking-[0.18em] uppercase">
          System <span className="px-1">{'//'}</span> {section}
        </div>
      </header>

      {/* Rail + content */}
      <div className="relative z-10 flex min-h-0 flex-1">
        <nav className="border-rule flex w-44 shrink-0 flex-col gap-px border-r py-3">
          {SECTIONS.map((s) => (
            <RailItem key={s.id} {...s} />
          ))}
        </nav>
        <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
      </div>

      {/* Status footer */}
      <footer className="border-rule text-dim relative z-10 flex items-center justify-between border-t px-5 py-2 text-[9px] tracking-[0.16em] uppercase">
        <span>
          {words.length} records <span className="px-1">{'//'}</span> archive stable
        </span>
        <span>v0.1.0</span>
      </footer>
    </div>
  )
}
