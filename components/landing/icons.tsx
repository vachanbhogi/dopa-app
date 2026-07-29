export function DopaMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 106 109"
      fill="none"
      aria-hidden
    >
      <g fill="currentColor">
        <path d="M2 2L60 23L78 63L26 48C20.5 46.4 16.2 42.4 13.9 37.3L2 2Z" />
        <path d="M61.5 23.7L78.3 63.2C84.7 59.8 88.4 53.6 88.8 46.2C89.2 39.7 90.8 35.4 94.5 32.8L104 32.3L96.4 28.1C93.9 22.1 88.2 20.1 83.4 22C79.1 23.8 76.1 28.1 73.3 33.1L61.5 23.7Z" />
        <path d="M28 54L78 63.3L4 101L28 54Z" />
        <path d="M4 103.7L30 91.1L27.4 107L4 103.7Z" />
      </g>
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
