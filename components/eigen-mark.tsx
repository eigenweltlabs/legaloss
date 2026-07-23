/** The eigen-square: three 32px squares on a 96 grid. Third square follows currentColor. */
export function EigenMark({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      aria-label="Eigenwelt Labs"
      viewBox="0 0 96 96"
      className={className}
      fill="none"
    >
      <rect x="14" y="14" width="32" height="32" fill="#2352DE" />
      <rect x="50" y="50" width="32" height="32" fill="#8669B9" />
      <rect x="50" y="14" width="32" height="32" fill="currentColor" />
    </svg>
  );
}
