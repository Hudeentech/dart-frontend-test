import React from "react"

export default function ConfettiBackground({
  className = "",
}: {
  className?: string
}) {
  return (
    <svg
      className={`w-full h-full pointer-events-none select-none ${className}`}
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin meet"
    >
      {/* ================= LEFT SIDE CONFETTI (Reduced size chips & dots) ================= */}
      {/* Confetti rect chips (tilted, compact) */}
      <rect
        x="22"
        y="32"
        width="3.5"
        height="6.5"
        rx="0.8"
        transform="rotate(35 22 32)"
        fill="#00B4D8"
      />
      <rect
        x="38"
        y="70"
        width="3.5"
        height="6.5"
        rx="0.8"
        transform="rotate(35 38 70)"
        fill="#10B981"
      />
      <rect
        x="52"
        y="105"
        width="5.5"
        height="3"
        rx="0.6"
        transform="rotate(-15 52 105)"
        fill="#EF4444"
      />
      <rect
        x="18"
        y="160"
        width="3"
        height="6"
        rx="0.6"
        transform="rotate(25 18 160)"
        fill="#EC4899"
      />
      <rect
        x="75"
        y="38"
        width="3.5"
        height="7"
        rx="0.8"
        transform="rotate(-30 75 38)"
        fill="#0284C7"
      />
      <rect
        x="92"
        y="12"
        width="3"
        height="6"
        rx="0.6"
        transform="rotate(40 92 12)"
        fill="#F59E0B"
      />
      <rect
        x="95"
        y="72"
        width="3.5"
        height="6.5"
        rx="0.8"
        transform="rotate(18 95 72)"
        fill="#3B82F6"
      />
      <rect
        x="42"
        y="195"
        width="5"
        height="3"
        rx="0.6"
        transform="rotate(-20 42 195)"
        fill="#F43F5E"
      />
      <rect
        x="88"
        y="162"
        width="3"
        height="6.5"
        rx="0.6"
        transform="rotate(48 88 162)"
        fill="#10B981"
      />
      <rect
        x="64"
        y="130"
        width="4.5"
        height="6"
        rx="0.8"
        transform="rotate(-22 64 130)"
        fill="#10B981"
      />
      <rect
        x="112"
        y="165"
        width="3.5"
        height="6"
        rx="0.6"
        transform="rotate(30 112 165)"
        fill="#EF4444"
      />

      {/* Confetti circles & dots (compact) */}
      <circle cx="28" cy="18" r="1.4" fill="#F43F5E" />
      <circle cx="45" cy="42" r="1.6" fill="#00B4D8" />
      <circle cx="85" cy="50" r="1.8" fill="#F59E0B" />
      <circle cx="58" cy="18" r="1.4" fill="#EC4899" />
      <circle cx="72" cy="72" r="1.2" fill="#10B981" />
      <circle cx="20" cy="115" r="1.4" fill="#3B82F6" />
      <circle cx="68" cy="132" r="1.6" fill="#00B4D8" />
      <circle cx="82" cy="108" r="1.4" fill="#10B981" />
      <circle cx="34" cy="155" r="1.2" fill="#0284C7" />
      <circle cx="108" cy="138" r="1.8" fill="#10B981" />
      <circle cx="95" cy="188" r="1.6" fill="#10B981" />
      <circle cx="70" cy="208" r="1.4" fill="#3B82F6" />

      {/* Center ambient tiny confetti */}
      <circle cx="138" cy="78" r="1.4" fill="#EC4899" />
      <circle cx="152" cy="48" r="1.3" fill="#00B4D8" />
      <circle cx="168" cy="120" r="1.6" fill="#10B981" />
      <rect
        x="185"
        y="65"
        width="2.5"
        height="4.5"
        rx="0.6"
        transform="rotate(30 185 65)"
        fill="#F59E0B"
      />
      <circle cx="215" cy="135" r="1.6" fill="#00B4D8" />
      <rect
        x="225"
        y="55"
        width="2.5"
        height="4.5"
        rx="0.6"
        transform="rotate(-25 225 55)"
        fill="#EF4444"
      />
      <circle cx="248" cy="85" r="1.3" fill="#F59E0B" />
      <circle cx="260" cy="115" r="1.2" fill="#10B981" />

      {/* ================= RIGHT SIDE CONFETTI (Reduced size chips & dots) ================= */}
      {/* Confetti rect chips (tilted, compact) */}
      <rect
        x="372"
        y="65"
        width="3.5"
        height="6.5"
        rx="0.8"
        transform="rotate(28 372 65)"
        fill="#EF4444"
      />
      <rect
        x="328"
        y="62"
        width="3.5"
        height="6.5"
        rx="0.8"
        transform="rotate(-35 328 62)"
        fill="#EC4899"
      />
      <rect
        x="372"
        y="24"
        width="5"
        height="3"
        rx="0.6"
        transform="rotate(22 372 24)"
        fill="#00B4D8"
      />
      <rect
        x="312"
        y="142"
        width="3.5"
        height="7"
        rx="0.8"
        transform="rotate(45 312 142)"
        fill="#3B82F6"
      />
      <rect
        x="358"
        y="162"
        width="3"
        height="6.5"
        rx="0.6"
        transform="rotate(-28 358 162)"
        fill="#10B981"
      />
      <rect
        x="375"
        y="92"
        width="5.5"
        height="3"
        rx="0.6"
        transform="rotate(15 375 92)"
        fill="#F59E0B"
      />
      <rect
        x="385"
        y="145"
        width="4"
        height="7"
        rx="0.8"
        transform="rotate(-40 385 145)"
        fill="#F59E0B"
      />
      <rect
        x="355"
        y="195"
        width="3.5"
        height="6.5"
        rx="0.8"
        transform="rotate(32 355 195)"
        fill="#0284C7"
      />
      <rect
        x="345"
        y="130"
        width="3.5"
        height="6.5"
        rx="0.6"
        transform="rotate(-18 345 130)"
        fill="#F59E0B"
      />
      <rect
        x="382"
        y="200"
        width="3"
        height="5.5"
        rx="0.6"
        transform="rotate(-15 382 200)"
        fill="#10B981"
      />

      {/* Confetti circles & dots (compact) */}
      <circle cx="348" cy="38" r="1.4" fill="#10B981" />
      <circle cx="365" cy="45" r="1.4" fill="#EC4899" />
      <circle cx="328" cy="85" r="1.6" fill="#00B4D8" />
      <circle cx="344" cy="108" r="1.6" fill="#F59E0B" />
      <circle cx="388" cy="115" r="1.4" fill="#10B981" />
      <circle cx="322" cy="128" r="1.4" fill="#3B82F6" />
      <circle cx="368" cy="142" r="1.8" fill="#EF4444" />
      <circle cx="318" cy="172" r="1.2" fill="#EC4899" />
      <circle cx="344" cy="180" r="1.6" fill="#00B4D8" />
      <circle cx="385" cy="178" r="1.4" fill="#EC4899" />
      <circle cx="372" cy="214" r="1.6" fill="#F59E0B" />
      <circle cx="330" cy="208" r="1.4" fill="#10B981" />
    </svg>
  )
}
