import { useState, useEffect } from "react"
import { Check, X } from "lucide-react"

export interface LanguageOption {
  id: string
  name: string
  isDefault?: boolean
}

export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { id: "en", name: "English", isDefault: true },
  { id: "ha", name: "Hausa", isDefault: false },
  { id: "yo", name: "Yoruba", isDefault: false },
  { id: "ig", name: "Igbo", isDefault: false },
]

interface LanguageModalProps {
  isOpen: boolean
  onClose: () => void
  currentLanguage?: string
  onSaveLanguage?: (language: LanguageOption) => void
}

export default function LanguageModal({
  isOpen,
  onClose,
  currentLanguage = "en",
  onSaveLanguage,
}: LanguageModalProps) {
  const [selectedId, setSelectedId] = useState<string>(currentLanguage)

  useEffect(() => {
    if (isOpen) {
      setSelectedId(currentLanguage)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen, currentLanguage])

  if (!isOpen) return null

  const handleSave = () => {
    const selected =
      AVAILABLE_LANGUAGES.find((l) => l.id === selectedId) ||
      AVAILABLE_LANGUAGES[0]
    onSaveLanguage?.(selected)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 dark:bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[28px] p-5 sm:p-7 border border-gray-100 dark:border-white/10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 ease-out transition-colors max-h-[92dvh] overflow-y-auto pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:pb-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pull handle bar */}
        <div
          className="w-12 h-1 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5 cursor-pointer hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors"
          onClick={onClose}
        />

        {/* Close Button for Desktop */}
        <button
          onClick={onClose}
          className="hidden sm:flex absolute top-5 right-5 w-8 h-8 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
          title="Close"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Titles */}
        <h2 className="text-2xl sm:text-[26px] font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
          Choose your preferred <br className="hidden sm:inline" />
          language
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-6 font-normal">
          You can change this anytime.
        </p>

        {/* Language Options Box */}
        <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/10 rounded-2xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 transition-colors">
          {AVAILABLE_LANGUAGES.map((lang) => {
            const isSelected = selectedId === lang.id
            return (
              <button
                key={lang.id}
                type="button"
                onClick={() => setSelectedId(lang.id)}
                className={`w-full flex items-center justify-between p-4 transition-colors cursor-pointer text-left ${
                  isSelected
                    ? "bg-amber-50/40 dark:bg-white/[0.04]"
                    : "hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <span
                  className={`text-sm ${
                    isSelected
                      ? "font-semibold text-gray-900 dark:text-white"
                      : "font-medium text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {lang.name}
                </span>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                    isSelected
                      ? "border-yellow-400 bg-yellow-400"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                >
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-black stroke-[3]" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Bottom Save Action */}
        <button
          onClick={handleSave}
          className="w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl flex items-center justify-center mt-6 transition-colors shadow-xs active:scale-[0.99] cursor-pointer"
        >
          Save
        </button>
      </div>
    </div>
  )
}
