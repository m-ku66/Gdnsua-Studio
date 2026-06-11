// MazeBackdrop — the ancient wall, always faintly present
export function MazeBackdrop(): React.JSX.Element {
  return (
    <svg
      aria-hidden
      className="text-ink pointer-events-none fixed inset-0 h-full w-full opacity-[0.045]"
    >
      <defs>
        <pattern id="maze" width="120" height="120" patternUnits="userSpaceOnUse">
          <path
            d="M0 20 H80 V60 H40 V40 M120 20 H100 V100 H20 V80
               M60 120 V80 M80 100 H120 M0 60 H20 M40 0 V20 M100 0 V20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#maze)" />
    </svg>
  )
}
