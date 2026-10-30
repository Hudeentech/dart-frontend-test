import { useEffect } from "react"
import { Sun, Moon, Sparkles, X } from "lucide-react"
import { useTheme } from "../../context/ThemeContext"

interface AppearanceModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function AppearanceModal({
  isOpen,
  onClose,
}: AppearanceModalProps) {
  const { theme, setTheme } = useTheme()

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

  const THEME_OPTIONS: Array<{
    id: "light" | "dark" | "system"
    title: string
    description: string
    icon: typeof Sun
    iconBg: string
    iconColor: string
  }> = [
    {
      id: "light",
      title: "Light Mode",
      description: "Clean, high-contrast bright appearance for daytime",
      icon: Sun,
      iconBg: "bg-amber-100/80 dark:bg-amber-400/15",
      iconColor: "text-amber-600 dark:text-amber-400",
    },
    {
      id: "dark",
      title: "Dark Mode",
      description: "Sleek, deep theme that is gentle on your eyes in low light",
      icon: Moon,
      iconBg: "bg-yellow-400/15 dark:bg-yellow-400/15",
      iconColor: "text-yellow-500 dark:text-yellow-400",
    },
    {
      id: "system",
      title: "System Default",
      description: "Automatically matches your device display settings",
      icon: Sparkles,
      iconBg: "bg-gray-100 dark:bg-white/10",
      iconColor: "text-gray-700 dark:text-gray-300",
    },
  ]

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-7 border border-gray-100 dark:border-white/10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 ease-out transition-colors max-h-[92dvh] overflow-y-auto pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-7"
      >
        {/* Pull Handle Bar for Mobile */}
        <div
          className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5 sm:hidden cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          onClick={onClose}
        />

        {/* Desktop Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="hidden sm:flex absolute top-5 right-5 w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl sm:text-[26px] font-bold text-gray-950 dark:text-white tracking-tight leading-snug">
            App Appearance
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Choose how Dart looks for you on this device.
          </p>
        </div>

        {/* Theme Cards List */}
        <div className="space-y-3 mb-6">
          {THEME_OPTIONS.map((opt) => {
            const isSelected = theme === opt.id
            const IconComp = opt.icon

            return (
              <div
                key={opt.id}
                onClick={() => setTheme(opt.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3.5 group select-none ${
                  isSelected
                    ? "border-[#FFCC00] bg-amber-50/40 dark:bg-[#FFCC00]/10 ring-1 ring-[#FFCC00]/50 shadow-xs"
                    : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#161618] hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50/60 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${opt.iconBg} ${opt.iconColor}`}
                  >
                    <IconComp className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                      {opt.title}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                      {opt.description}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                    isSelected
                      ? "border-[#FFCC00] bg-[#FFCC00]"
                      : "border-gray-300 dark:border-gray-600 group-hover:border-gray-400"
                  }`}
                >
                  {isSelected && <div className="w-2 h-2 rounded-full bg-black" />}
                </div>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 bg-yellow-400 hover:bg-yellow-500 active:scale-[0.99] text-black font-semibold rounded-2xl transition-all shadow-sm cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  )
}
