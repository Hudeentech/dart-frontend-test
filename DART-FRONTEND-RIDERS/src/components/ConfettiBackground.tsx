export function ConfettiBackground({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={`pointer-events-none select-none ${className}`}
      viewBox="0 0 400 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMin meet"
    >
      <rect x="22" y="32" width="4" height="9" rx="1" transform="rotate(35 22 32)" fill="#00B4D8" />
      <rect x="38" y="70" width="4" height="9" rx="1" transform="rotate(35 38 70)" fill="#10B981" />
      <rect x="52" y="105" width="6" height="3" rx="1" transform="rotate(-15 52 105)" fill="#EF4444" />
      <rect x="70" y="48" width="4" height="8" rx="1" transform="rotate(-25 70 48)" fill="#F59E0B" />
      <rect x="88" y="155" width="4" height="8" rx="1" transform="rotate(20 88 155)" fill="#3B82F6" />
      <rect x="111" y="80" width="5" height="3" rx="1" transform="rotate(35 111 80)" fill="#EC4899" />
      <rect x="130" y="183" width="4" height="8" rx="1" transform="rotate(-20 130 183)" fill="#10B981" />
      <rect x="154" y="39" width="4" height="8" rx="1" transform="rotate(18 154 39)" fill="#F59E0B" />
      <rect x="246" y="57" width="4" height="8" rx="1" transform="rotate(-28 246 57)" fill="#3B82F6" />
      <rect x="270" y="176" width="5" height="3" rx="1" transform="rotate(18 270 176)" fill="#EF4444" />
      <rect x="291" y="92" width="4" height="8" rx="1" transform="rotate(30 291 92)" fill="#EC4899" />
      <rect x="318" y="140" width="4" height="8" rx="1" transform="rotate(-20 318 140)" fill="#00B4D8" />
      <rect x="344" y="61" width="4" height="8" rx="1" transform="rotate(25 344 61)" fill="#F59E0B" />
      <rect x="370" y="166" width="5" height="3" rx="1" transform="rotate(-15 370 166)" fill="#10B981" />
      <circle cx="18" cy="128" r="2" fill="#EC4899" />
      <circle cx="65" cy="188" r="2" fill="#00B4D8" />
      <circle cx="103" cy="30" r="2" fill="#10B981" />
      <circle cx="145" cy="122" r="2" fill="#EF4444" />
      <circle cx="180" cy="196" r="2" fill="#3B82F6" />
      <circle cx="220" cy="28" r="2" fill="#F59E0B" />
      <circle cx="260" cy="122" r="2" fill="#EC4899" />
      <circle cx="305" cy="34" r="2" fill="#10B981" />
      <circle cx="338" cy="194" r="2" fill="#00B4D8" />
      <circle cx="388" cy="111" r="2" fill="#EF4444" />
      <path d="M30 90c10 5 10 14 0 19m0-19c-10 5-10 14 0 19" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      <path d="M115 48c10 5 10 14 0 19m0-19c-10 5-10 14 0 19" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
      <path d="M280 70c10 5 10 14 0 19m0-19c-10 5-10 14 0 19" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
      <path d="M365 32c10 5 10 14 0 19m0-19c-10 5-10 14 0 19" stroke="#EC4899" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
