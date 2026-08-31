import React from 'react'

export function RoughCircle({ className = '' }: { className?: string }) {
  return (
    <svg className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <path d="M5 49 C5 18 25 5 53 7 C83 4 97 22 95 52 C98 81 77 96 48 94 C17 97 2 79 5 49Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeDasharray="5 2 12 3" strokeLinecap="round" />
    </svg>
  )
}

export function RoughArrow({ className = '' }: { className?: string }) {
  return (
    <svg className={`scribble-arrow absolute ${className}`} viewBox="0 0 180 100" aria-hidden="true">
      <path d="M8 15 C74 12 112 30 136 73" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M119 70 L137 76 L137 56" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function PencilLoop({ className = '' }: { className?: string }) {
  return (
    <svg className={`pencil-loop ${className}`} viewBox="0 0 520 125" preserveAspectRatio="none" aria-hidden="true">
      <path d="M62 24 C174 45 330 43 443 62 C492 70 493 91 447 103 C345 128 170 119 78 99 C37 90 34 67 62 49 C111 18 191 10 284 8" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M62 25 C168 47 328 44 441 63" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}
