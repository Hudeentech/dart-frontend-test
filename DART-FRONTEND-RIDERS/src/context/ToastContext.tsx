import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react"

type ToastKind = "success" | "error" | "info"
interface Toast {
  id: number
  kind: ToastKind
  message: string
}

interface ToastContextValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id))

  const toast = useCallback((message: string, kind: ToastKind = "info") => {
    const id = ++idRef.current
    setToasts((t) => [...t.slice(-2), { id, kind, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] mx-auto flex w-full max-w-md flex-col gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex items-start gap-3 rounded-2xl border border-white/10 bg-[#18181c]/95 p-3.5 text-sm text-white shadow-2xl backdrop-blur-xl"
          >
            {t.kind === "success" && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" />}
            {t.kind === "error" && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-rose-400" />}
            {t.kind === "info" && <Info className="mt-0.5 size-4 shrink-0 text-brand" />}
            <p className="flex-1 leading-snug">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-white/40 hover:text-white" aria-label="Dismiss">
              <X className="size-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx.toast
}

// Helper hook for components that just want to fire-and-forget
export function useToastOnError(error: string | null) {
  const toast = useToast()
  useEffect(() => {
    if (error) toast(error, "error")
  }, [error, toast])
}
