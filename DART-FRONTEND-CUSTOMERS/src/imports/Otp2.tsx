import { useState, useRef, useEffect } from "react"
import { ArrowLeft, Loader2, AlertCircle, Sparkles, MessageSquare, ExternalLink, Mail, Phone } from "lucide-react"
import { useAuth } from "../context/AuthContext"

export default function Otp2({
  onNext,
  onBack,
  onChangeNumber,
}: {
  onNext?: (target?: string) => void
  onBack?: () => void
  onChangeNumber?: () => void
}) {
  const { authIdentifier, authType, devOtpCode, whatsappUrl, verifyOtp, sendOtp, authError } =
    useAuth()
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(30)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const isEmail = authType === "EMAIL_OTP" || authIdentifier.includes("@")

  // Timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((c) => c - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCountdown])

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleDigitChange = (index: number, value: string) => {
    const val = value.replace(/\D/g, "").slice(-1)
    const newDigits = [...digits]
    newDigits[index] = val
    setDigits(newDigits)

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
    if (pasted) {
      const newDigits = [...digits]
      for (let i = 0; i < 6; i++) {
        newDigits[i] = pasted[i] || ""
      }
      setDigits(newDigits)
      const nextFocus = Math.min(pasted.length, 5)
      inputRefs.current[nextFocus]?.focus()
    }
  }

  const handleAutoFillDevCode = () => {
    if (devOtpCode && devOtpCode.length === 6) {
      const split = devOtpCode.split("")
      setDigits(split)
      inputRefs.current[5]?.focus()
    }
  }

  const handleVerify = async () => {
    const fullCode = digits.join("")
    if (fullCode.length < 6) {
      setLocalError("Please enter the full 6-digit verification code.")
      return
    }

    setLocalError(null)
    setSuccessNotice(null)
    setIsVerifying(true)
    try {
      const res = await verifyOtp(fullCode)
      if (res.success) {
        sessionStorage.setItem("dart_just_registered", "true")
        try {
          localStorage.removeItem("dart_verification_dismissed")
        } catch {}

        const isFullyVerified =
          Boolean(res.user?.isProfileComplete) ||
          Boolean((res.user as any)?.isNinVerified) ||
          (res.user as any)?.identityProfile?.kycStatus === "VERIFIED"

        if (isFullyVerified && res.user?.firstName && res.user.firstName !== "Customer") {
          onNext?.("home" as any)
        } else {
          onNext?.("add-profile" as any)
        }
      } else {
        setLocalError(res.message || "Invalid verification code.")
      }
    } catch (err: any) {
      setLocalError(err.message || "Failed to verify code.")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResend = async (channel?: "sms" | "whatsapp") => {
    if (resendCountdown > 0 && !isResending) return
    setLocalError(null)
    setSuccessNotice(null)
    setIsResending(true)
    try {
      const res = await sendOtp(authIdentifier, isEmail ? "EMAIL_OTP" : "PHONE_OTP", channel)
      setResendCountdown(30)
      if (!isEmail && channel === "whatsapp" && res.whatsappUrl) {
        window.open(res.whatsappUrl, "_blank", "noopener,noreferrer")
        setSuccessNotice("Code sent to WhatsApp! Check your WhatsApp chat.")
      } else if (isEmail) {
        setSuccessNotice("New verification code sent to your email address.")
      } else {
        setSuccessNotice("New verification code sent successfully via SMS.")
      }
    } catch (e: any) {
      setLocalError(e.message || "Failed to resend code.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="flex flex-col w-full bg-transparent relative">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors mb-6 -ml-2 text-gray-800 dark:text-white cursor-pointer"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Enter the 6-digit code
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-normal">
          We sent a verification code to{" "}
          <span className="text-gray-900 dark:text-white font-semibold">
            {authIdentifier || (isEmail ? "your email" : "+234 703 101 3632")}
          </span>
        </p>
      </div>

      {/* WhatsApp Delivery Helper Card (Only when phone number was used) */}
      {!isEmail && whatsappUrl && (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-5 mx-auto px-4 py-2.5 rounded-2xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#128C7E] dark:text-[#25D366] text-xs font-semibold flex items-center gap-2 hover:bg-[#25D366]/20 transition-all shadow-2xs group"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
          <span>Open WhatsApp to view code</span>
          <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:translate-x-0.5 transition-transform" />
        </a>
      )}

      {/* Developer Helper Notice Banner */}
      {devOtpCode ? (
        <div
          onClick={handleAutoFillDevCode}
          className="mb-5 mx-auto w-full max-w-sm p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border-2 border-dashed border-amber-400/60 dark:border-amber-400/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col items-center gap-1.5 cursor-pointer hover:bg-amber-100/60 dark:hover:bg-amber-950/60 transition-all active:scale-[0.99] shadow-xs"
          title="Click to autofill verification code"
        >
          <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            <span>Development Verification Code</span>
          </div>
          <p className="text-center text-xs text-amber-800/80 dark:text-amber-300/80">
            Your OTP is <strong className="text-base text-gray-950 dark:text-white font-mono tracking-widest bg-white dark:bg-black/40 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">{devOtpCode}</strong>
          </p>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 underline font-semibold">
            Tap here to auto-fill code
          </span>
        </div>
      ) : (
        <div className="mb-5 mx-auto px-3.5 py-2 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 text-xs text-center">
          Code dispatched. Check your backend terminal log.
        </div>
      )}

      {/* Success Notification */}
      {successNotice && (
        <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/30 text-xs text-emerald-700 dark:text-emerald-400 animate-in fade-in duration-200 text-center">
          {successNotice}
        </div>
      )}

      {/* Error alert */}
      {(localError || authError) && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="leading-snug">{localError || authError}</p>
        </div>
      )}

      {/* OTP Inputs */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 w-full max-w-full">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleDigitChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={idx === 0 ? handlePaste : undefined}
            className="w-10 sm:w-12 h-13 sm:h-16 text-center text-xl sm:text-3xl font-bold bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-xl sm:rounded-2xl focus:bg-white dark:focus:bg-[#202024] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 text-gray-900 dark:text-white outline-none transition-all shrink-0"
          />
        ))}
      </div>

      {/* Resend Code Options */}
      <div className="text-center mb-8">
        <p className="text-gray-500 dark:text-gray-400 font-normal mb-2 text-sm">
          Didn't receive the code?
        </p>
        {resendCountdown > 0 ? (
          <p className="text-gray-900 dark:text-white font-medium text-sm">
            Resend available in{" "}
            <span className="text-yellow-500 font-semibold">
              0:{resendCountdown < 10 ? `0${resendCountdown}` : resendCountdown}
            </span>
          </p>
        ) : isEmail ? (
          <button
            onClick={() => handleResend()}
            disabled={isResending}
            className="text-yellow-600 dark:text-yellow-400 font-bold text-xs sm:text-sm hover:underline cursor-pointer flex items-center justify-center gap-1.5 mx-auto"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Resend Code to Email</span>
          </button>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => handleResend("whatsapp")}
              disabled={isResending}
              className="text-[#25D366] hover:text-[#1ebd59] font-bold text-xs sm:text-sm hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Send via WhatsApp</span>
            </button>
            <span className="text-gray-300 dark:text-white/20">|</span>
            <button
              onClick={() => handleResend("sms")}
              disabled={isResending}
              className="text-yellow-600 dark:text-yellow-400 font-bold text-xs sm:text-sm hover:underline cursor-pointer flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Resend SMS</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-4">
        <button
          onClick={handleVerify}
          disabled={isVerifying}
          className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
        >
          {isVerifying ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Verifying Code...</span>
            </>
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>

        <div className="flex items-center gap-4 py-1">
          <div className="h-px bg-gray-200 dark:bg-white/10 flex-1" />
          <span className="text-gray-400 text-xs uppercase tracking-wider font-medium">
            or
          </span>
          <div className="h-px bg-gray-200 dark:bg-white/10 flex-1" />
        </div>

        <button
          onClick={onChangeNumber ?? onBack}
          className="w-full text-center text-gray-700 dark:text-gray-300 font-medium hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors py-2 text-sm cursor-pointer flex items-center justify-center gap-1.5"
        >
          {isEmail ? (
            <>
              <Mail className="w-4 h-4" />
              <span>Change email address</span>
            </>
          ) : (
            <>
              <Phone className="w-4 h-4" />
              <span>Change phone number</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
