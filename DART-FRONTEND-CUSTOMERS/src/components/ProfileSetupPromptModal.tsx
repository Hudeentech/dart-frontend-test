import React from "react"
import { X } from "lucide-react"
import { useAuth } from "../context/AuthContext"

interface ProfileSetupPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onSetupNow: () => void
}

export default function ProfileSetupPromptModal({
  isOpen,
  onClose,
  onSetupNow,
}: ProfileSetupPromptModalProps) {
  const { user } = useAuth()

  // Guard: Never show if the user account is already verified!
  if (!isOpen || user?.isProfileComplete) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      {/* Verification Prompt Card matching media_1789998437153.png */}
      <div
        className="w-full max-w-[360px] sm:max-w-[390px] bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl relative animate-in zoom-in-95 duration-200 z-10 text-gray-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Dark Circular Close Button (top-right) */}
        <button
          onClick={onClose}
          type="button"
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#71717a] hover:bg-[#52525b] text-white flex items-center justify-center transition-colors cursor-pointer shadow-xs"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>

        {/* Title */}
        <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white pr-10">
          Verify your Identity
        </h3>

        {/* Subtitle */}
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
          Unlock higher delivery limit &amp;
          <br className="hidden sm:inline" /> safer transactions.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-6">
          <button
            type="button"
            onClick={onSetupNow}
            className="px-5 py-2.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-95 text-gray-950 font-bold text-sm shadow-xs transition-all cursor-pointer"
          >
            Verify Now
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-900 dark:border-white/30 text-gray-900 dark:text-white font-medium text-sm hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            I’ll do it later
          </button>
        </div>
      </div>
    </div>
  )
}
