import React, { useState } from "react"
import { ArrowLeft, ChevronRight, Check } from "lucide-react"

export interface ChooseAccountTypeProps {
  onBack?: () => void
  onContinue?: (accountType: "customer" | "rider" | "business") => void
  currentType?: "customer" | "rider" | "business"
}

export default function ChooseAccountType({
  onBack,
  onContinue,
  currentType = "customer",
}: ChooseAccountTypeProps) {
  const [selectedType, setSelectedType] = useState<"customer" | "rider" | "business">(currentType)
  const [notice, setNotice] = useState<string | null>(null)

  const handleSelect = (type: "customer" | "rider" | "business") => {
    if (type === "business") {
      setNotice("Business accounts are coming soon! We will notify you when available.")
      setTimeout(() => setNotice(null), 3500)
      return
    }
    setNotice(null)
    setSelectedType(type)
  }

  const handleContinueClick = () => {
    if (selectedType === "business") {
      setNotice("Business accounts are coming soon!")
      setTimeout(() => setNotice(null), 3000)
      return
    }

    if (onContinue) {
      onContinue(selectedType)
      return
    }

    // Default actions
    if (selectedType === "rider") {
      // Connect to Rider application (running on port 8444 or rider domain)
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
      const riderUrl = isLocal ? "http://localhost:8444/#/onboarding" : "/rider"
      window.location.href = riderUrl
    } else {
      // Personal Account
      onBack?.()
    }
  }

  return (
    <div className="w-full min-h-[100dvh] flex flex-col bg-[#121417] text-white">
      {/* Top Header Section */}
      <div className="pt-8 pb-6 px-6 max-w-md mx-auto w-full">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer mb-6"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
          </button>
        )}

        <h1 className="text-2xl sm:text-[28px] font-bold text-white tracking-tight leading-snug">
          How would you like to use DART?
        </h1>
        <p className="text-sm text-gray-300 mt-2 font-normal">
          Choose the account type that best describes you.
        </p>
      </div>

      {/* Main Content White Container */}
      <div className="flex-1 bg-white dark:bg-[#1a1c22] rounded-t-[32px] px-6 pt-7 pb-8 flex flex-col justify-between max-w-md mx-auto w-full shadow-2xl transition-colors">
        <div className="space-y-4">
          {/* Notification toast if business tapped */}
          {notice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-medium text-amber-800 dark:text-amber-200 animate-fadeIn">
              {notice}
            </div>
          )}

          {/* Option 1: Personal Account */}
          <div
            onClick={() => handleSelect("customer")}
            className={`w-full p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              selectedType === "customer"
                ? "border-[#FFCC00] bg-[#FFFDF5] dark:bg-[#25231a] ring-2 ring-[#FFCC00]/40 shadow-xs"
                : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#1f222a] hover:border-gray-200 dark:hover:border-white/10"
            }`}
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 rounded-2xl bg-[#FFE48E] flex items-center justify-center shrink-0 shadow-xs">
                {/* Tray with downward arrow */}
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#121417"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 14v2a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-2" />
                  <path d="M12 3v11" />
                  <path d="m8 10 4 4 4-4" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-950 dark:text-white text-base">
                    Personal Account
                  </h2>
                  {selectedType === "customer" && (
                    <span className="w-5 h-5 rounded-full bg-[#FFCC00] flex items-center justify-center text-gray-950">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                  Send and receive packages with ease, wherever you are.
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0 ml-2" />
          </div>

          {/* Option 2: Become a Rider */}
          <div
            onClick={() => handleSelect("rider")}
            className={`w-full p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
              selectedType === "rider"
                ? "border-[#FFCC00] bg-[#FFFDF5] dark:bg-[#25231a] ring-2 ring-[#FFCC00]/40 shadow-xs"
                : "border-gray-100 dark:border-white/5 bg-white dark:bg-[#1f222a] hover:border-gray-200 dark:hover:border-white/10"
            }`}
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 rounded-2xl bg-[#FFE48E] flex items-center justify-center shrink-0 shadow-xs">
                {/* 3D Isometric box */}
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#121417"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 12v9" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold text-gray-950 dark:text-white text-base">
                    Become a Rider
                  </h2>
                  {selectedType === "rider" && (
                    <span className="w-5 h-5 rounded-full bg-[#FFCC00] flex items-center justify-center text-gray-950">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                  Deliver packages, earn money, and grow with DART.
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0 ml-2" />
          </div>

          {/* Option 3: Business Account */}
          <div
            onClick={() => handleSelect("business")}
            className="w-full p-4 rounded-2xl border border-gray-100 dark:border-white/5 bg-gray-50/60 dark:bg-white/[0.02] flex items-center justify-between cursor-pointer group opacity-90 transition-all hover:bg-gray-100/60 dark:hover:bg-white/[0.04]"
          >
            <div className="flex items-center gap-4 text-left">
              <div className="w-14 h-14 rounded-2xl bg-[#FFF9E6] dark:bg-[#2a271d] border border-[#FFE7A0]/60 dark:border-[#FFCC00]/20 flex items-center justify-center shrink-0">
                <svg
                  width="26"
                  height="26"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#9CA3AF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
                  <path d="m3.3 7 8.7 5 8.7-5" />
                  <path d="M12 12v9" />
                </svg>
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-gray-700 dark:text-gray-300 text-base">
                    Business Account
                  </h2>
                  <span className="bg-[#FFCC00] text-gray-950 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    COMING SOON
                  </span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-snug">
                  Manage your business deliveries and connect with reliable logistics providers.
                </p>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 ml-2" />
          </div>
        </div>

        {/* Bottom CTA Button */}
        <div className="pt-8">
          <button
            type="button"
            onClick={handleContinueClick}
            className="w-full bg-[#FFCC00] hover:bg-[#E6B800] active:scale-[0.98] text-gray-950 font-bold py-4 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer text-base"
          >
            <span>Continue</span>
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  )
}
