export function Flower({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" aria-hidden="true" className={className}>
      <g fill="currentColor">
        {[0, 72, 144, 216, 288].map((deg) => (
          <ellipse key={deg} cx="100" cy="48" rx="34" ry="52" transform={`rotate(${deg} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="26" />
      </g>
    </svg>
  );
}

export function Bow({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 140" aria-hidden="true" className={className}>
      <g fill="currentColor">
        <path d="M96 70C74 40 44 26 26 38 8 50 12 84 30 96c18 12 48 4 66-26Z" />
        <path d="M104 70c22-30 52-44 70-32 18 12 14 46-4 58-18 12-48 4-66-26Z" />
        <circle cx="100" cy="70" r="14" />
        <path d="M90 82c-8 20-20 34-34 44 18-2 32-12 42-28Z" />
        <path d="M110 82c8 20 20 34 34 44-18-2-32-12-42-28Z" />
      </g>
    </svg>
  );
}

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" className={className}>
      <g stroke="currentColor" strokeWidth="9" strokeLinecap="round">
        <line x1="50" y1="8" x2="50" y2="92" />
        <line x1="8" y1="50" x2="92" y2="50" />
        <line x1="20" y1="20" x2="80" y2="80" />
        <line x1="80" y1="20" x2="20" y2="80" />
      </g>
    </svg>
  );
}

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 120" aria-hidden="true" className={className}>
      <path
        d="M4 92c40-8 44-72 92-76 48-4 40 76 88 72 34-3 44-44 112-52"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="2 12"
      />
    </svg>
  );
}

export function PageDecor() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <Flower className="absolute -right-16 -top-24 w-64 text-blush opacity-90" />
      <Flower className="absolute -left-24 top-[38%] w-72 rotate-12 text-blush opacity-80" />
      <Flower className="absolute -bottom-20 right-[10%] w-56 -rotate-12 text-blush opacity-80" />
      <Squiggle className="absolute left-[18%] top-[8%] w-72 text-muted-foreground opacity-40" />
      <Squiggle className="absolute right-[6%] top-[54%] w-80 rotate-6 text-muted-foreground opacity-40" />
      <Bow className="absolute left-4 top-[20%] w-24 -rotate-12 text-blush" />
      <Bow className="absolute right-6 top-[74%] w-24 rotate-12 text-blush" />
    </div>
  );
}
