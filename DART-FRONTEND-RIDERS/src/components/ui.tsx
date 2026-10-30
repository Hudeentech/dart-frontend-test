import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react"
import { ArrowLeft, Loader2, Inbox } from "lucide-react"
import { goBack } from "../hooks/router"
import type { Tone } from "../utils/format"

export const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ")

// ---------------- Button ----------------
type Variant = "primary" | "secondary" | "ghost" | "danger" | "success"
const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-ink-950 hover:bg-brand-600 shadow-[0_8px_24px_-8px_rgb(255_204_0/0.6)]",
  secondary: "bg-gray-100 dark:bg-white/[0.06] text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1] border border-gray-200 dark:border-white/10",
  ghost: "text-gray-700 dark:text-white/70 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/[0.05]",
  danger: "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-500/25 border border-rose-200 dark:border-rose-500/20",
  success: "bg-emerald-500 text-white hover:bg-emerald-400 shadow-[0_8px_24px_-8px_rgb(16_185_129/0.6)]",
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  loading?: boolean
  size?: "sm" | "md" | "lg"
  icon?: ReactNode
  block?: boolean
}

export function Button({ variant = "primary", loading, size = "md", icon, block, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition-all duration-150 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        size === "sm" && "h-9 px-3.5 text-xs",
        size === "md" && "h-12 px-5 text-sm",
        size === "lg" && "h-14 px-6 text-base",
        block && "w-full",
        VARIANTS[variant],
        className,
      )}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ---------------- Inputs ----------------
interface FieldProps {
  label?: string
  hint?: string
  error?: string | null
}

const inputBase =
  "w-full rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/[0.04] px-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/30 outline-none transition focus:border-brand focus:bg-white dark:focus:bg-white/[0.06] focus:ring-4 focus:ring-brand/20"

function FieldWrap({ label, hint, error, children, id }: FieldProps & { children: ReactNode; id?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-gray-700 dark:text-white/60">
          {label}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-rose-500">{error}</p> : hint ? <p className="text-xs text-gray-500 dark:text-white/40">{hint}</p> : null}
    </div>
  )
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & FieldProps>(
  ({ label, hint, error, className, id, ...rest }, ref) => (
    <FieldWrap label={label} hint={hint} error={error} id={id}>
      <input ref={ref} id={id} {...rest} className={cx(inputBase, "h-12", className)} />
    </FieldWrap>
  ),
)
Input.displayName = "Input"

export function Select({ label, hint, error, className, id, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement> & FieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id}>
      <select id={id} {...rest} className={cx(inputBase, "h-12 appearance-none", className)}>
        {children}
      </select>
    </FieldWrap>
  )
}

export function Textarea({ label, hint, error, className, id, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return (
    <FieldWrap label={label} hint={hint} error={error} id={id}>
      <textarea id={id} {...rest} className={cx(inputBase, "min-h-28 py-3", className)} />
    </FieldWrap>
  )
}

// ---------------- Surfaces ----------------
export function Card({ className, children, onClick, id }: { className?: string; children: ReactNode; onClick?: () => void; id?: string }) {
  return (
    <div
      id={id}
      onClick={onClick}
      className={cx("glass rounded-3xl p-4 text-gray-900 dark:text-white", onClick && "cursor-pointer transition hover:border-gray-300 dark:hover:border-white/15 active:scale-[0.99]", className)}
    >
      {children}
    </div>
  )
}

const TONES: Record<Tone, string> = {
  neutral: "bg-gray-100 dark:bg-white/[0.07] text-gray-700 dark:text-white/70",
  brand: "bg-brand/15 text-yellow-800 dark:text-brand",
  info: "bg-sky-50 dark:bg-sky-500/15 text-sky-700 dark:text-sky-300",
  success: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  warning: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300",
  danger: "bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-300",
}

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold", TONES[tone], className)}>
      {children}
    </span>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cx("size-5 animate-spin text-brand", className)} />
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="size-7" />
    </div>
  )
}

export function EmptyState({ icon, title, message, action }: { icon?: ReactNode; title: string; message?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-white/[0.05] text-gray-500 dark:text-white/40">
        {icon ?? <Inbox className="size-6" />}
      </div>
      <div>
        <p className="font-semibold text-gray-900 dark:text-white">{title}</p>
        {message && <p className="mt-1 text-sm text-gray-500 dark:text-white/50">{message}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-rose-300 dark:border-rose-500/20 text-center">
      <p className="text-sm text-rose-600 dark:text-rose-300">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </Card>
  )
}

export function Avatar({ name, src, size = 44 }: { name: string; src?: string | null; size?: number }) {
  const letters = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
  return src ? (
    <img src={src} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10" />
  ) : (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-full bg-gradient-to-br from-brand to-amber-600 text-sm font-bold text-ink-950 ring-2 ring-black/5 dark:ring-white/10"
    >
      {letters || "R"}
    </div>
  )
}

// ---------------- Layout ----------------
export function TopBar({ title, back, right, subtitle }: { title: string; back?: boolean | string; right?: ReactNode; subtitle?: string }) {
  return (
    <header className="safe-top sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-gray-200/80 dark:border-white/5 bg-white/90 dark:bg-ink-950/80 px-4 pb-3 backdrop-blur-xl text-gray-900 dark:text-white">
      {back && (
        <button
          id="topbar-back"
          onClick={() => goBack(typeof back === "string" ? back : "/")}
          className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/[0.05] text-gray-700 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10 transition"
          aria-label="Go back"
        >
          <ArrowLeft className="size-5" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white">{title}</h1>
        {subtitle && <p className="truncate text-xs text-gray-500 dark:text-white/50">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="sheet-in safe-bottom w-full max-w-md rounded-t-[28px] border border-gray-200 dark:border-white/10 bg-white dark:bg-ink-900 text-gray-900 dark:text-white p-5 shadow-2xl"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-300 dark:bg-white/15" />
        <h2 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-center justify-between px-1">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-white/40">{children}</h2>
      {action}
    </div>
  )
}

export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string; count?: number }[] }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-gray-100 dark:bg-white/[0.04] p-1 border border-gray-200/60 dark:border-transparent">
      {options.map((o) => (
        <button
          key={o.value}
          id={`tab-${o.value}`}
          onClick={() => onChange(o.value)}
          className={cx(
            "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition cursor-pointer",
            value === o.value ? "bg-white dark:bg-white/10 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white/80",
          )}
        >
          {o.label}
          {o.count ? (
            <span className={cx("rounded-full px-1.5 text-[10px]", value === o.value ? "bg-brand text-ink-950" : "bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white")}>{o.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
