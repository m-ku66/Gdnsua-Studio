// Reusable UI primitives — the Archive's shared vocabulary
import type { ReactNode } from 'react'

/** Tiny tracked uppercase label, e.g. "QUERY", "ETYMOLOGY" */
export function SectionLabel({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div className="text-dim mb-2 text-[9px] tracking-[0.18em] uppercase">{children}</div>
  )
}

/** NieR diamond separator */
export function Diamond({ className = '' }: { className?: string }): React.JSX.Element {
  return <span className={`select-none ${className}`}>◆</span>
}

/** Match-tier tag: CLOSE (dim) / INTERPRETED (seal red) */
export function TierTag({
  tier
}: {
  tier: 'exact' | 'close' | 'interpreted'
}): React.JSX.Element | null {
  if (tier === 'exact') return null
  const styles =
    tier === 'interpreted' ? 'text-seal border-seal/50' : 'text-dim border-rule'
  return (
    <span className={`border px-1.5 py-0.5 text-[8px] tracking-[0.14em] uppercase ${styles}`}>
      {tier}
    </span>
  )
}
