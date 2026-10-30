import React from "react"

export default function Confetti({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`pointer-events-none select-none ${className}`}
      aria-hidden="true"
    >
      {/* LEFT SIDE CONFETTI (Static, zero animation, no curl lines, compact) */}
      <g>
        {/* Floating Confetti Shapes */}
        <rect
          x="18"
          y="32"
          width="5"
          height="3"
          rx="0.6"
          transform="rotate(25 18 32)"
          fill="#3B82F6"
        />
        <rect
          x="52"
          y="12"
          width="4.5"
          height="2.5"
          rx="0.6"
          transform="rotate(-15 52 12)"
          fill="#10B981"
        />
        <rect
          x="76"
          y="42"
          width="4"
          height="2.5"
          rx="0.6"
          transform="rotate(40 76 42)"
          fill="#F59E0B"
        />
        <rect
          x="22"
          y="78"
          width="4.5"
          height="3"
          rx="0.6"
          transform="rotate(-30 22 78)"
          fill="#8B5CF6"
        />
        <rect
          x="44"
          y="108"
          width="5"
          height="2.5"
          rx="0.6"
          transform="rotate(20 44 108)"
          fill="#EF4444"
        />
        <rect
          x="82"
          y="128"
          width="4"
          height="3"
          rx="0.6"
          transform="rotate(-45 82 128)"
          fill="#06B6D4"
        />
        <rect
          x="14"
          y="142"
          width="4.5"
          height="2.5"
          rx="0.6"
          transform="rotate(15 14 142)"
          fill="#FBBF24"
        />
        <rect
          x="66"
          y="168"
          width="5"
          height="3"
          rx="0.6"
          transform="rotate(-20 66 168)"
          fill="#EC4899"
        />
        <rect
          x="34"
          y="192"
          width="4"
          height="2.5"
          rx="0.6"
          transform="rotate(35 34 192)"
          fill="#10B981"
        />
        <rect
          x="92"
          y="182"
          width="4.5"
          height="2.5"
          rx="0.6"
          transform="rotate(-10 92 182)"
          fill="#3B82F6"
        />

        {/* Small Spark Dots */}
        <circle cx="36" cy="52" r="1.4" fill="#F59E0B" />
        <circle cx="68" cy="28" r="1.2" fill="#EC4899" />
        <circle cx="16" cy="112" r="1.3" fill="#10B981" />
        <circle cx="86" cy="92" r="1.1" fill="#3B82F6" />
        <circle cx="52" cy="148" r="1.3" fill="#8B5CF6" />
        <circle cx="76" cy="208" r="1.2" fill="#F59E0B" />
      </g>

      {/* RIGHT SIDE CONFETTI (Static, zero animation, no curl lines, compact) */}
      <g>
        {/* Floating Confetti Shapes */}
        <rect
          x="400"
          y="24"
          width="5"
          height="3"
          rx="0.6"
          transform="rotate(-35 400 24)"
          fill="#10B981"
        />
        <rect
          x="364"
          y="14"
          width="4.5"
          height="2.5"
          rx="0.6"
          transform="rotate(20 364 14)"
          fill="#EC4899"
        />
        <rect
          x="338"
          y="52"
          width="4"
          height="2.5"
          rx="0.6"
          transform="rotate(-15 338 52)"
          fill="#06B6D4"
        />
        <rect
          x="404"
          y="74"
          width="4.5"
          height="3"
          rx="0.6"
          transform="rotate(45 404 74)"
          fill="#F59E0B"
        />
        <rect
          x="372"
          y="102"
          width="5"
          height="2.5"
          rx="0.6"
          transform="rotate(-25 372 102)"
          fill="#3B82F6"
        />
        <rect
          x="332"
          y="132"
          width="4"
          height="3"
          rx="0.6"
          transform="rotate(30 332 132)"
          fill="#EF4444"
        />
        <rect
          x="388"
          y="142"
          width="4.5"
          height="2.5"
          rx="0.6"
          transform="rotate(-40 388 142)"
          fill="#8B5CF6"
        />
        <rect
          x="356"
          y="178"
          width="5"
          height="3"
          rx="0.6"
          transform="rotate(15 356 178)"
          fill="#10B981"
        />
        <rect
          x="398"
          y="198"
          width="4"
          height="2.5"
          rx="0.6"
          transform="rotate(-30 398 198)"
          fill="#F59E0B"
        />
        <rect
          x="322"
          y="168"
          width="4.5"
          height="2.5"
          rx="0.6"
          transform="rotate(25 322 168)"
          fill="#EC4899"
        />

        {/* Small Spark Dots */}
        <circle cx="384" cy="58" r="1.4" fill="#06B6D4" />
        <circle cx="348" cy="32" r="1.2" fill="#EF4444" />
        <circle cx="408" cy="118" r="1.3" fill="#F59E0B" />
        <circle cx="328" cy="92" r="1.1" fill="#10B981" />
        <circle cx="378" cy="162" r="1.3" fill="#EC4899" />
        <circle cx="342" cy="208" r="1.2" fill="#3B82F6" />
      </g>
    </svg>
  )
}
