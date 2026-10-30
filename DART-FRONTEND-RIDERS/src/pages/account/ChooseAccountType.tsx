import React, { useState } from "react"
import { ArrowLeft, ChevronRight, Check, Loader2 } from "lucide-react"

export interface ChooseAccountTypeProps {
  onBack?: () => void
  onContinue?: (accountType: "customer" | "rider" | "business") => void
  currentType?: "customer" | "rider" | "business"
}

export default function ChooseAccountType({
  onBack,
  onContinue,
  currentType = "rider",
}: ChooseAccountTypeProps) {
  const [selectedType, setSelectedType] = useState<"customer" | "rider" | "business">(currentType)
  const [notice, setNotice] = useState<string | null>(null)
  const [isSwitching, setIsSwitching] = useState<boolean>(false)
  const [switchingTarget, setSwitchingTarget] = useState<"customer" | "rider" | null>(null)

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

    if (selectedType === currentType && onBack && !onContinue) {
      onBack()
      return
    }

    if (onContinue) {
      onContinue(selectedType)
      return
    }

    // Trigger smooth loading state and transition
    setIsSwitching(true)
    setSwitchingTarget(selectedType)

    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"

    if (selectedType === "customer") {
      let token = ""
      let refresh = ""
      try {
        token = localStorage.getItem("dart_rider_access_token") || localStorage.getItem("dart_access_token") || ""
        refresh = localStorage.getItem("dart_rider_refresh_token") || localStorage.getItem("dart_refresh_token") || ""
        if (token) localStorage.setItem("dart_access_token", token)
        if (refresh) localStorage.setItem("dart_refresh_token", refresh)
        const user = localStorage.getItem("dart_rider_user")
        if (user) localStorage.setItem("dart_user", user)
      } catch (err) {
        console.warn("[ChooseAccountType] Token transfer note:", err)
      }

      const targetBase = isLocal ? "http://localhost:8443" : "/"
      const ssoQuery = token
        ? `?sso_token=${encodeURIComponent(token)}&sso_refresh=${encodeURIComponent(refresh)}`
        : ""
      const destination = `${targetBase}${ssoQuery}`

      setTimeout(() => {
        window.location.href = destination
      }, 1000)
    } else {
      // Stay on rider
      setTimeout(() => {
        setIsSwitching(false)
        onBack?.()
      }, 800)
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-[#fcfcfc] dark:bg-[#0c0c0e] text-gray-900 dark:text-white transition-colors relative">
      {/* Account Switching Loading Overlay */}
      {isSwitching && (
        <div className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#1a1c22] p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-sm w-full text-center border border-gray-100 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#FFCC00]/15 dark:bg-[#FFCC00]/25 flex items-center justify-center text-[#FFCC00] mb-5 relative shadow-inner">
              <Loader2 className="w-8 h-8 text-[#FFCC00] animate-spin" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 tracking-tight">
              {switchingTarget === "customer"
                ? "Switching to Personal Account"
                : "Switching to Rider Portal"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs">
              {switchingTarget === "customer"
                ? "Connecting to your personal packages, orders and wallet..."
                : "Connecting to your driver dashboard and syncing jobs..."}
            </p>
            <div className="w-full bg-gray-100 dark:bg-white/5 h-1.5 rounded-full mt-6 overflow-hidden">
              <div className="h-full bg-[#FFCC00] rounded-full animate-pulse w-3/4" />
            </div>
          </div>
        </div>
      )}

      {/* Top Header Bar for Desktop & Mobile */}
      <div className="px-4 sm:px-8 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3.5 sm:pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-sm z-10 w-full">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
        ) : (
          <div className="w-10" />
        )}

        <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Account Type
        </h2>

        <div className="w-10" />
      </div>

      {/* Main Content: 100% width on Desktop Middle Layout */}
      <div className="flex-1 w-full px-4 sm:px-6 md:px-8 py-5 sm:py-6 flex flex-col justify-between max-w-4xl 2xl:max-w-5xl mx-auto">
        <div className="space-y-6 w-full">
          {/* Clean Headline Section */}
          <div className="w-full pt-1 pb-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white leading-snug">
              How would you like to use DART?
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
              Choose the account type that best describes you.
            </p>
          </div>

          {/* Toast / Notification Notice */}
          {notice && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-2xl text-xs font-semibold text-amber-800 dark:text-amber-200 animate-in fade-in slide-in-from-top-1 duration-200 shadow-xs">
              {notice}
            </div>
          )}

          {/* Account Options Stack - 100% width */}
          <div className="w-full space-y-4">
            {/* Option 1: Personal Account */}
            <div
              onClick={() => handleSelect("customer")}
              className={`w-full p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                selectedType === "customer"
                  ? "border-[#FFCC00] bg-amber-500/[0.04] dark:bg-[#FFCC00]/[0.08] ring-2 ring-[#FFCC00] shadow-sm"
                  : "border-gray-200/80 dark:border-white/5 bg-white dark:bg-[#16181d] hover:border-gray-300 dark:hover:border-white/15 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center gap-4 sm:gap-5 text-left">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#FFE48E] flex items-center justify-center shrink-0 shadow-xs">
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
                    <h3 className="font-bold text-gray-950 dark:text-white text-base sm:text-lg">
                      Personal Account
                    </h3>
                    {currentType === "customer" && (
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full uppercase">
                        Current
                      </span>
                    )}
                    {selectedType === "customer" && (
                      <span className="w-5 h-5 rounded-full bg-[#FFCC00] flex items-center justify-center text-gray-950">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                    Send and receive packages with ease, wherever you are.
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0 ml-2" />
            </div>

            {/* Option 2: Become a Rider */}
            <div
              onClick={() => handleSelect("rider")}
              className={`w-full p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${
                selectedType === "rider"
                  ? "border-[#FFCC00] bg-amber-500/[0.04] dark:bg-[#FFCC00]/[0.08] ring-2 ring-[#FFCC00] shadow-sm"
                  : "border-gray-200/80 dark:border-white/5 bg-white dark:bg-[#16181d] hover:border-gray-300 dark:hover:border-white/15 hover:shadow-xs"
              }`}
            >
              <div className="flex items-center gap-4 sm:gap-5 text-left">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#FFE48E] flex items-center justify-center shrink-0 shadow-xs">
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
                    <h3 className="font-bold text-gray-950 dark:text-white text-base sm:text-lg">
                      Become a Rider
                    </h3>
                    {currentType === "rider" && (
                      <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full uppercase">
                        Current
                      </span>
                    )}
                    {selectedType === "rider" && (
                      <span className="w-5 h-5 rounded-full bg-[#FFCC00] flex items-center justify-center text-gray-950">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 leading-snug">
                    Deliver packages, earn money, and grow with DART.
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0 ml-2" />
            </div>

            {/* Option 3: Business Account (COMING SOON) */}
            <div
              onClick={() => handleSelect("business")}
              className="w-full p-4 sm:p-5 rounded-2xl border border-gray-200/60 dark:border-white/5 bg-gray-50/70 dark:bg-white/[0.02] flex items-center justify-between cursor-pointer group opacity-90 transition-all hover:bg-gray-100/70 dark:hover:bg-white/[0.04]"
            >
              <div className="flex items-center gap-4 sm:gap-5 text-left">
                <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-[#FFF9E6] dark:bg-[#252219] border border-[#FFE7A0]/60 dark:border-[#FFCC00]/20 flex items-center justify-center shrink-0">
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
                    <h3 className="font-bold text-gray-700 dark:text-gray-300 text-base sm:text-lg">
                      Business Account
                    </h3>
                    <span className="bg-[#FFCC00] text-gray-950 font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      COMING SOON
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1 leading-snug">
                    Manage your business deliveries and connect with reliable logistics providers.
                  </p>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 ml-2" />
            </div>
          </div>
        </div>

        {/* Bottom CTA Button: full width responsive container */}
        <div className="pt-8 pb-4 w-full">
          <button
            type="button"
            disabled={isSwitching}
            onClick={handleContinueClick}
            className="w-full bg-[#FFCC00] hover:bg-[#E6B800] active:scale-[0.99] text-gray-950 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer text-base disabled:opacity-50"
          >
            <span>Continue</span>
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  )
}
