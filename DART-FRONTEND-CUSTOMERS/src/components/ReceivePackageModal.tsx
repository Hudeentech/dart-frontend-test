import React, { useEffect } from "react"
import { ChevronRight, X, Package } from "lucide-react"

interface ReceivePackageModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectOption?: (option: "pickup" | "inbound") => void
}

export default function ReceivePackageModal({
  isOpen,
  onClose,
  onSelectOption,
}: ReceivePackageModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div
        className="w-full sm:max-w-lg bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-8 border border-gray-100 dark:border-white/10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 ease-out transition-colors max-h-[92dvh] overflow-y-auto pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull handle bar for mobile */}
        <div
          className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 sm:hidden cursor-pointer"
          onClick={onClose}
        />

        {/* Close Button for Desktop */}
        <button
          onClick={onClose}
          className="hidden sm:flex absolute top-6 right-6 w-9 h-9 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Heading */}
        <h2 className="text-2xl sm:text-[28px] font-bold text-gray-900 dark:text-white tracking-tight leading-snug mb-2 pr-6 sm:pr-8">
          How would you like to receive your package
        </h2>
        <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-6 sm:mb-8 font-normal">
          choose the option that best suit your Situation.
        </p>

        {/* Options List */}
        <div className="flex flex-col gap-4">
          {/* Option 1: Request a Pickup */}
          <div
            onClick={() => {
              onSelectOption?.("pickup")
              onClose()
            }}
            className="group w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#202024] hover:bg-yellow-50/80 dark:hover:bg-yellow-400/10 hover:border-yellow-300/80 dark:hover:border-yellow-400/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              {/* Yellow Square Icon Box */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#fed766] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <svg
                  className="w-7 h-7 text-gray-950 stroke-[2.2]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 4v9" />
                  <path d="m8.5 9.5 3.5 3.5 3.5-3.5" />
                  <path d="M4 12v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4" />
                </svg>
              </div>

              {/* Text */}
              <div className="flex flex-col">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1 transition-colors">
                  Request a Pickup
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-snug">
                  Get a package sent to you from someone or a terminal.
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </div>

          {/* Option 2: Link an Inbound package */}
          <div
            onClick={() => {
              onSelectOption?.("inbound")
              onClose()
            }}
            className="group w-full flex items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#202024] hover:bg-yellow-50/80 dark:hover:bg-yellow-400/10 hover:border-yellow-300/80 dark:hover:border-yellow-400/30 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left cursor-pointer"
          >
            <div className="flex items-center gap-4">
              {/* Yellow Square Icon Box */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-[#fed766] flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Package className="w-7 h-7 text-gray-950 stroke-[2.2]" />
              </div>

              {/* Text */}
              <div className="flex flex-col">
                <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white mb-1 transition-colors">
                  Link an Inbound package
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-snug">
                  Someone has already shipped you a package? Link it instantly.
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
          </div>
        </div>
      </div>
    </div>
  )
}
