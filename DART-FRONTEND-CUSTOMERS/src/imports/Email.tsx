import { useState } from "react"
import { ArrowLeft, Mail, Loader2, AlertCircle } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function Email({
  onNext,
  onBack,
}: {
  onNext?: () => void
  onBack?: () => void
}) {
  const { user, updateUserProfile } = useAuth()
  const [email, setEmail] = useState<string>(user?.email || "")
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleVerifyEmail = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setErrorMessage(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address to continue.")
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage("Please enter a valid email address (e.g. name@example.com).")
      return
    }

    try {
      setIsSubmitting(true)
      await updateUserProfile({ email: cleanEmail })
      onNext?.()
    } catch (err: any) {
      console.warn("[Email] Update email warning:", err)
      onNext?.()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col w-full bg-transparent relative">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors mb-6 -ml-2 text-gray-800 dark:text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          What's your email?
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-normal leading-relaxed">
          We'll use this to send important updates about your orders and receipts.
        </p>
      </div>

      <form onSubmit={handleVerifyEmail} className="flex flex-col flex-1">
        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Inputs */}
        <div className="mb-8">
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Email Address
          </label>
          <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all shadow-xs">
            <Mail className="w-5 h-5 text-gray-400 shrink-0" />
            <div className="w-px h-5 bg-gray-200 dark:bg-white/10 shrink-0" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g example@gmail.com"
              className="w-full bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base"
              autoFocus
            />
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="mt-auto pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-75 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-[0.99] text-base cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Verify email</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
