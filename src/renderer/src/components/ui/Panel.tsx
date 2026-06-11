// Panel — vellum surface; optional NieR corner brackets
import type { ReactNode } from 'react'

interface PanelProps {
  children: ReactNode
  corners?: boolean
  className?: string
}

const corner = 'pointer-events-none absolute h-3.5 w-3.5 border-ink/70'

export function Panel({ children, corners = false, className = '' }: PanelProps): React.JSX.Element {
  return (
    <div className={`bg-vellum border-rule relative border ${className}`}>
      {corners && (
        <>
          <span className={`${corner} top-[-1px] left-[-1px] border-t-2 border-l-2`} />
          <span className={`${corner} top-[-1px] right-[-1px] border-t-2 border-r-2`} />
          <span className={`${corner} bottom-[-1px] left-[-1px] border-b-2 border-l-2`} />
          <span className={`${corner} right-[-1px] bottom-[-1px] border-r-2 border-b-2`} />
        </>
      )}
      {children}
    </div>
  )
}
