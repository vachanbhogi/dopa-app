export function DopaMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      fill="currentColor"
      aria-hidden
    >
      <path d="M1.22541 61.5228c-.2225-.9485.90748-1.5459 1.59638-.857L39.3342 97.1782c.6889.6889.0915 1.8189-.857 1.5964C20.0515 94.4522 5.54779 79.9485 1.22541 61.5228ZM.00189135 46.8891c-.01764375.2833.03859463.567.16301064.8239l9.73549 20.067c.16608.3424.51651.565.90541.565.1526 0 .3043-.0358.4403-.1055L79.6274 34.2926c.5159-.2663.6652-.9089.3331-1.3617C71.8648 20.0236 58.7363 10.797 43.4519 8.86124L1.32468 45.8576c-.49959.4407-.82275 1.0647-.83128 1.7433-.00141.096-.00141.192.00189135.2882ZM55.5494 1.01612c-.9485-.2225-1.5459.90748-.857 1.59638L2.82185 39.3342c-.68891.6889-1.81891.0915-1.59638-.857C5.54779 20.0515 20.0515 5.54779 38.4772 1.22541c5.504-.84693 11.1293-.84693 16.0722-.20929Z" />
    </svg>
  );
}

export function ChevronDown({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRight({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3.5 8h9M8.5 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PriorityHigh({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="1.5" y="8" width="2.5" height="6" rx="0.5" opacity="0.35" />
      <rect x="5.5" y="5" width="2.5" height="9" rx="0.5" opacity="0.55" />
      <rect x="9.5" y="2.5" width="2.5" height="11.5" rx="0.5" className="text-[#f2994a]" fill="#f2994a" />
      <rect x="13.5" y="1" width="2.5" height="13" rx="0.5" opacity="0.2" />
    </svg>
  );
}

export function StatusInProgress({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.25" stroke="#f2c94c" strokeWidth="1.5" opacity="0.35" />
      <path d="M7 1.75a5.25 5.25 0 0 1 5.25 5.25H7V1.75Z" fill="#f2c94c" />
    </svg>
  );
}
