import { ArrowRight } from "lucide-react"
import Confetti from "../components/Confetti"

export default function AccountCreationSuccessful({
  onNext,
  onSetupProfile,
}: {
  onNext?: () => void
  onSetupProfile?: () => void
}) {
  return (
    <div className="flex flex-col w-full min-h-[460px] sm:min-h-[540px] justify-between bg-transparent relative select-none py-2">
      {/* Crisp Vector Confetti (Framed on Sides, Zero Layer Artifacts) */}
      <div className="absolute top-0 left-0 right-0 h-60 pointer-events-none z-0 overflow-hidden flex justify-center">
        <Confetti className="w-full h-full max-w-md opacity-90 dark:opacity-40" />
      </div>

      {/* Center Content */}
      <div className="flex flex-col flex-1 relative z-10 px-4 pt-6 pb-6 justify-center items-center text-center">
        {/* Scalloped Green Rosette Badge */}
        <div className="relative mb-5 flex items-center justify-center">
          <svg
            width="112"
            height="112"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_12px_24px_rgba(22,163,74,0.30)] dark:drop-shadow-[0_12px_24px_rgba(34,197,94,0.25)] transition-transform hover:scale-105 duration-300"
          >
            <defs>
              <linearGradient
                id="scallopBadgeGrad"
                x1="18"
                y1="18"
                x2="102"
                y2="102"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="#22C55E" />
                <stop offset="46%" stopColor="#16A34A" />
                <stop offset="52%" stopColor="#15803D" />
                <stop offset="100%" stopColor="#146C34" />
              </linearGradient>
            </defs>

            {/* 8-Petal Scalloped Rosette Path */}
            <path
              d="M 43.2 19.3 Q 60.0 1.7 76.8 19.3 Q 101.2 18.8 100.7 43.2 Q 118.3 60.0 100.7 76.8 Q 101.2 101.2 76.8 100.7 Q 60.0 118.3 43.2 100.7 Q 18.8 101.2 19.3 76.8 Q 1.7 60.0 19.3 43.2 Q 18.8 18.8 43.2 19.3 Z"
              fill="url(#scallopBadgeGrad)"
            />

            {/* Crisp Bold White Checkmark */}
            <path
              d="M43 61 L54 72 L77 47"
              stroke="#ffffff"
              strokeWidth="8.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Small SUCCESSFUL Pill */}
        <div className="mb-4">
          <span className="inline-flex items-center px-4 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#15803D] dark:text-emerald-400 border border-[#BBF7D0]/60 dark:border-emerald-500/20 shadow-2xs">
            SUCCESSFUL
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-[28px] font-extrabold text-gray-950 dark:text-white mb-2 tracking-tight">
          Account creation successful
        </h1>

        {/* Subtitle */}
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-normal max-w-[270px] leading-relaxed mb-6">
          Welcome to dart.ng your favourite door to door delivery service
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="w-full flex flex-col gap-3 px-2 mt-auto">
        {/* Primary Yellow Button */}
        <button
          onClick={onNext}
          className="w-full h-14 bg-[#FFC700] hover:bg-[#F5BF00] active:scale-[0.99] text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm text-base"
        >
          <span>Continue to home</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Secondary Light Pill Button */}
        <button
          onClick={onSetupProfile ?? onNext}
          className="w-full h-14 bg-[#F8F9FA] dark:bg-[#18181b] hover:bg-gray-100 dark:hover:bg-[#202024] active:scale-[0.99] text-gray-900 dark:text-white font-bold rounded-2xl transition-all flex items-center justify-center shadow-xs text-base border border-transparent dark:border-white/5"
        >
          Set up your profile
        </button>
      </div>
    </div>
  )
}
