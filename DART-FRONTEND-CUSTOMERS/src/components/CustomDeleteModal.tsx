import React, { useEffect } from "react"
import { Trash2, X, AlertTriangle } from "lucide-react"

export interface CustomDeleteModalProps {
  isOpen: boolean
  title: string
  message: string
  itemCount?: number
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
  onClose?: () => void
  onCancel?: () => void
}

export default function CustomDeleteModal({
  isOpen,
  title,
  message,
  itemCount,
  confirmText = "Delete",
  cancelText = "Cancel",
  isLoading = false,
  onConfirm,
  onClose,
  onCancel,
}: CustomDeleteModalProps) {
  const handleCancel = onCancel || onClose || (() => {})

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        handleCancel()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, isLoading, handleCancel])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-delete-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) handleCancel()
      }}
    >
      <div className="bg-white dark:bg-[#1a1a1e] w-full max-w-sm rounded-3xl p-5 sm:p-6 shadow-2xl border border-gray-100 dark:border-white/10 flex flex-col animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6 stroke-[2]" />
          </div>

          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <h3
          id="custom-delete-title"
          className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight mb-2"
        >
          {title}
        </h3>

        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          {message}
        </p>

        {itemCount !== undefined && itemCount > 1 && (
          <div className="mb-5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>This will delete <strong>{itemCount}</strong> items at once.</span>
          </div>
        )}

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-3 px-4 rounded-xl text-xs sm:text-sm font-semibold text-white bg-red-500 hover:bg-red-600 active:bg-red-700 shadow-xs active:scale-[0.98] transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
