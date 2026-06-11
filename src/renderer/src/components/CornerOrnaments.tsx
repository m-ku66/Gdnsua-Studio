// CornerOrnaments — four quiet flourishes; the wall recedes to the edges
const ORNAMENT_PATH =
  'M4 64 V4 H64 M14 50 V14 H50 M4 4 l0 0 M24 36 V24 H36 M64 14 H78 M14 64 V78'

function Ornament({ rotate }: { rotate: number }): React.JSX.Element {
  return (
    <svg
      aria-hidden
      viewBox="0 0 84 84"
      className="text-ink h-28 w-28 opacity-[0.07]"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path d={ORNAMENT_PATH} fill="none" stroke="currentColor" strokeWidth="2.5" />
      <rect x="20" y="20" width="7" height="7" transform="rotate(45 23.5 23.5)" fill="currentColor" />
    </svg>
  )
}

export function CornerOrnaments(): React.JSX.Element {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0">
      <div className="absolute top-2 left-2"><Ornament rotate={0} /></div>
      <div className="absolute top-2 right-2"><Ornament rotate={90} /></div>
      <div className="absolute right-2 bottom-2"><Ornament rotate={180} /></div>
      <div className="absolute bottom-2 left-2"><Ornament rotate={270} /></div>
    </div>
  )
}
