import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import {
  Loader2,
  AlertCircle,
  MessageSquare,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Check,
  KeyRound,
} from "lucide-react"

export default function PhoneAuth({
  onNext,
  onBack,
}: {
  onNext?: (target?: "phone-auth" | "otp2" | "add-profile") => void
  onBack?: () => void
}) {
  const {
    sendOtp,
    authMode,
    setAuthMode,
    authError,
    rememberMe,
    setRememberMe,
    loginWithPassword,
    authIdentifier,
    checkIdentifier,
    setSignupPassword,
  } = useAuth()

  // Channels & Methods
  const [method, setMethod] = useState<"email" | "phone">("email")
  const [emailInput, setEmailInput] = useState(() =>
    authIdentifier && authIdentifier.includes("@") ? authIdentifier : ""
  )
  const [phoneDigits, setPhoneDigits] = useState(() =>
    authIdentifier && !authIdentifier.includes("@")
      ? authIdentifier.replace("+234", "")
      : ""
  )
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [useOtpLogin, setUseOtpLogin] = useState(false)
  const [signupPasswordInput, setSignupPasswordInput] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittingChannel, setSubmittingChannel] = useState<
    "email" | "whatsapp" | "sms" | "password"
  >("email")
  const [localError, setLocalError] = useState<string | null>(null)
  const [suggestionMode, setSuggestionMode] = useState<"login" | "signup" | null>(null)

  const isLogin = authMode === "login"

  // Standardize Nigerian phone number
  const formatPhoneNumber = (digits: string) => {
    const clean = digits.replace(/\D/g, "")
    if (!clean) return ""
    if (clean.startsWith("0")) return `+234${clean.slice(1)}`
    if (clean.startsWith("234")) return `+${clean}`
    return `+234${clean}`
  }

  // Real-time blur validation
  const handleValidateIdentifier = async () => {
    const raw =
      method === "email"
        ? emailInput.trim().toLowerCase()
        : formatPhoneNumber(phoneDigits)

    if (method === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!raw || !emailRegex.test(raw)) return
    } else {
      if (!raw || raw.length < 13) return
    }

    try {
      const check = await checkIdentifier(raw)
      if (!isLogin && check.exists) {
        setLocalError(
          "An account with this email or phone number already exists. Please log in instead.",
        )
        setSuggestionMode("login")
      } else if (isLogin && !check.exists) {
        setLocalError(
          "No account found with this email or phone number. Please register an account first.",
        )
        setSuggestionMode("signup")
      } else {
        setLocalError(null)
        setSuggestionMode(null)
      }
    } catch {
      // Ignore blur background network errors
    }
  }

  // Direct Password Login (No OTP required!)
  const handlePasswordLogin = async () => {
    setLocalError(null)
    setSuggestionMode(null)
    const identifier =
      method === "email" ? emailInput.trim().toLowerCase() : formatPhoneNumber(phoneDigits)

    if (method === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!identifier || !emailRegex.test(identifier)) {
        setLocalError("Please enter a valid email address.")
        return
      }
    } else {
      if (!identifier || identifier.length < 13) {
        setLocalError("Please enter a valid 10 or 11 digit Nigerian phone number.")
        return
      }
    }

    if (!password || password.trim().length === 0) {
      setLocalError("Please enter your password to sign in.")
      return
    }

    // Pre-validation: Account must exist to log in
    setIsSubmitting(true)
    setSubmittingChannel("password")
    try {
      const check = await checkIdentifier(identifier)
      if (!check.exists) {
        setLocalError(
          "No account found with this email or phone number. Please register an account first.",
        )
        setSuggestionMode("signup")
        setIsSubmitting(false)
        return
      }

      const res = await loginWithPassword(identifier, password, rememberMe)
      if (res.success) {
        if (!res.user?.firstName || res.user.firstName.trim().length === 0) {
          onNext?.("add-profile")
        }
      } else {
        const msg = res.message || "Failed to sign in. Please check your credentials."
        setLocalError(msg)
        if (msg.toLowerCase().includes("no account") || msg.toLowerCase().includes("not found")) {
          setSuggestionMode("signup")
        }
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong during sign in."
      setLocalError(msg)
      if (msg.toLowerCase().includes("no account") || msg.toLowerCase().includes("not found")) {
        setSuggestionMode("signup")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Send OTP for Verification (WhatsApp, SMS, or Email)
  const handleSendOtp = async (channel: "email" | "whatsapp" | "sms") => {
    setLocalError(null)
    setSuggestionMode(null)

    let identifier = ""
    if (method === "email") {
      const email = emailInput.trim().toLowerCase()
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!email || !emailRegex.test(email)) {
        setLocalError("Please enter a valid email address (e.g. adebayo@gmail.com).")
        return
      }
      identifier = email
    } else {
      const clean = phoneDigits.replace(/\D/g, "")
      if (!clean || clean.length < 10) {
        setLocalError("Please enter a valid 10 or 11 digit Nigerian phone number.")
        return
      }
      identifier = formatPhoneNumber(phoneDigits)
    }

    if (!isLogin) {
      if (!signupPasswordInput || signupPasswordInput.length < 6) {
        setLocalError("Please create a password with at least 6 characters.")
        return
      }
      if (signupPasswordInput !== confirmPassword) {
        setLocalError("Passwords do not match. Please ensure both passwords match.")
        return
      }
      setSignupPassword(signupPasswordInput)
    }

    setIsSubmitting(true)
    setSubmittingChannel(method === "email" ? "email" : channel)
    try {
      // Pre-validation before sending OTP
      const check = await checkIdentifier(identifier)
      if (isLogin && !check.exists) {
        setLocalError(
          "No account found with this email or phone number. Please register an account first.",
        )
        setSuggestionMode("signup")
        setIsSubmitting(false)
        return
      }

      if (!isLogin && check.exists) {
        setLocalError(
          "An account with this email or phone number already exists. Please log in instead.",
        )
        setSuggestionMode("login")
        setIsSubmitting(false)
        return
      }

      const res = await sendOtp(
        identifier,
        method === "email" ? "EMAIL_OTP" : "PHONE_OTP",
        channel === "whatsapp" ? "whatsapp" : "sms"
      )

      if (res.success) {
        if (channel === "whatsapp" && res.whatsappUrl) {
          window.open(res.whatsappUrl, "_blank", "noopener,noreferrer")
        }
        onNext?.("otp2")
      } else {
        const msg = res.message || "Failed to send code. Please try again."
        setLocalError(msg)
        if (msg.toLowerCase().includes("already exists")) {
          setSuggestionMode("login")
        } else if (msg.toLowerCase().includes("no account") || msg.toLowerCase().includes("not found")) {
          setSuggestionMode("signup")
        }
      }
    } catch (err: any) {
      const msg = err.message || "Something went wrong. Please check your connection."
      setLocalError(msg)
      if (msg.toLowerCase().includes("already exists")) {
        setSuggestionMode("login")
      } else if (msg.toLowerCase().includes("no account") || msg.toLowerCase().includes("not found")) {
        setSuggestionMode("signup")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col w-full bg-transparent relative">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          {isLogin ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-normal leading-relaxed">
          {isLogin
            ? useOtpLogin
              ? "We will send a one-time verification code to sign in."
              : "Enter your credentials to sign in to your DART account."
            : "Enter your details and choose a password to get started with DART."}
        </p>
      </div>

      {/* Switch between Email and Phone */}
      <div className="flex items-center bg-gray-100 dark:bg-[#18181b] p-1 rounded-2xl border border-gray-200 dark:border-white/10 mb-6">
        <button
          type="button"
          onClick={() => {
            setMethod("email")
            setLocalError(null)
            setSuggestionMode(null)
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            method === "email"
              ? "bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-xs"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Mail className="w-4 h-4" />
          <span>Email Address</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMethod("phone")
            setLocalError(null)
            setSuggestionMode(null)
          }}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            method === "phone"
              ? "bg-white dark:bg-[#27272a] text-gray-900 dark:text-white shadow-xs"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Phone className="w-4 h-4" />
          <span>Phone Number</span>
        </button>
      </div>

      {/* Error Message with Quick Action */}
      {(localError || authError) && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in duration-200">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="leading-snug font-medium">{localError || authError}</p>
            {suggestionMode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login")
                  setLocalError(null)
                  setSuggestionMode(null)
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-gray-950 font-bold rounded-lg hover:bg-yellow-500 cursor-pointer shadow-xs transition-colors"
              >
                <span>Switch to Log In</span>
                <span>&rarr;</span>
              </button>
            )}
            {suggestionMode === "signup" && (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup")
                  setLocalError(null)
                  setSuggestionMode(null)
                }}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-400 text-gray-950 font-bold rounded-lg hover:bg-yellow-500 cursor-pointer shadow-xs transition-colors"
              >
                <span>Create New Account</span>
                <span>&rarr;</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Form Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (isLogin && !useOtpLogin) {
            handlePasswordLogin()
          } else if (method === "email") {
            handleSendOtp("email")
          } else {
            handleSendOtp("whatsapp")
          }
        }}
      >
        {method === "email" ? (
          /* Email Input */
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Email Address
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <Mail className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type="email"
                placeholder="adebayo@gmail.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value)
                  setLocalError(null)
                  setSuggestionMode(null)
                }}
                onBlur={handleValidateIdentifier}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
              />
            </div>
          </div>
        ) : (
          /* Phone Input */
          <div className="mb-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Phone Number
            </label>
            <div className="flex items-center bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <div className="flex items-center gap-2 pr-4 border-r border-gray-200 dark:border-white/10 shrink-0">
                <img
                  src="https://flagcdn.com/w20/ng.png"
                  alt="Nigeria"
                  className="w-5 h-3.5 object-cover rounded-xs"
                />
                <span className="font-semibold text-gray-800 dark:text-white text-base">
                  +234
                </span>
              </div>
              <input
                type="tel"
                placeholder="703 101 3632"
                value={phoneDigits}
                onChange={(e) => {
                  setPhoneDigits(e.target.value)
                  setLocalError(null)
                  setSuggestionMode(null)
                }}
                onBlur={handleValidateIdentifier}
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 pl-4 text-lg font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 tracking-wide"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* In Login Mode & Not OTP: Render Password Field & Remember Me */}
        {isLogin && !useOtpLogin && (
          <div className="mb-5 animate-in fade-in duration-150">
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Password
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <Lock className="w-5 h-5 text-gray-400 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Remember Me & OTP Toggle Row */}
            <div className="flex items-center justify-between mt-3 text-sm">
              <label
                htmlFor="remember-me"
                className="flex items-center gap-2.5 cursor-pointer select-none group"
              >
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                    rememberMe
                      ? "bg-yellow-400 border-yellow-400 text-gray-950 shadow-xs"
                      : "border-gray-300 dark:border-white/20 bg-white dark:bg-[#18181b] group-hover:border-yellow-400"
                  }`}
                >
                  {rememberMe && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setUseOtpLogin(true)
                  setLocalError(null)
                }}
                className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 hover:underline font-semibold cursor-pointer flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Sign in with code instead</span>
              </button>
            </div>
          </div>
        )}

        {/* In Registration Mode: Create & Confirm Password Fields */}
        {!isLogin && (
          <div className="space-y-4 mb-5 animate-in fade-in duration-150">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Create Password
                </label>
                <span className="text-[11px] text-gray-400">Min. 6 characters</span>
              </div>
              <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
                <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type={showSignupPassword ? "text" : "password"}
                  placeholder="Create a secure password"
                  value={signupPasswordInput}
                  onChange={(e) => {
                    setSignupPasswordInput(e.target.value)
                    setLocalError(null)
                  }}
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowSignupPassword(!showSignupPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition-colors p-1"
                  aria-label={showSignupPassword ? "Hide password" : "Show password"}
                >
                  {showSignupPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Confirm Password
              </label>
              <div
                className={`flex items-center gap-3 bg-white dark:bg-[#18181b] border rounded-2xl p-4 shadow-xs transition-all ${
                  confirmPassword.length > 0 && signupPasswordInput !== confirmPassword
                    ? "border-red-300 dark:border-red-500/40 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-400/20"
                    : confirmPassword.length > 0 && signupPasswordInput === confirmPassword
                      ? "border-emerald-300 dark:border-emerald-500/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20"
                      : "border-gray-200 dark:border-white/10 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20"
                }`}
              >
                <Lock className="w-5 h-5 text-gray-400 shrink-0" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setLocalError(null)
                  }}
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition-colors p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && signupPasswordInput === confirmPassword && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 stroke-[3]" /> Passwords match
                </p>
              )}
            </div>
          </div>
        )}

        {/* If in Login Mode and user chose OTP code */}
        {isLogin && useOtpLogin && (
          <div className="mb-4 flex items-center justify-between bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/30 p-3 rounded-xl text-xs text-yellow-800 dark:text-yellow-300">
            <span>Signing in via one-time verification code</span>
            <button
              type="button"
              onClick={() => {
                setUseOtpLogin(false)
                setLocalError(null)
              }}
              className="underline font-bold hover:text-yellow-900 dark:hover:text-yellow-100 cursor-pointer ml-2 shrink-0"
            >
              Use password instead
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {isLogin && !useOtpLogin ? (
            /* Direct Password Sign In Button */
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
            >
              {isSubmitting && submittingChannel === "password" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <span>Sign In</span>
              )}
            </button>
          ) : method === "email" ? (
            /* Email OTP Button */
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
            >
              {isSubmitting && submittingChannel === "email" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending Verification Code...</span>
                </>
              ) : (
                <span>
                  {isLogin ? "Send Login Code to Email" : "Continue with Email"}
                </span>
              )}
            </button>
          ) : (
            /* Phone OTP Buttons: WhatsApp & SMS */
            <>
              <button
                type="button"
                onClick={() => handleSendOtp("whatsapp")}
                disabled={isSubmitting}
                className="w-full h-14 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2.5 shadow-sm hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
              >
                {isSubmitting && submittingChannel === "whatsapp" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Sending to WhatsApp...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span>
                      {isLogin ? "Send Login Code via WhatsApp" : "Send OTP via WhatsApp"}
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSendOtp("sms")}
                disabled={isSubmitting}
                className="w-full h-13 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-sm cursor-pointer disabled:opacity-60"
              >
                {isSubmitting && submittingChannel === "sms" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sending SMS Code...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>{isLogin ? "Send Login Code via SMS" : "Send OTP via SMS"}</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </form>

      {/* Toggle between Login and Register Mode */}
      <div className="mt-5 text-center">
        {isLogin ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setAuthMode("signup")
                setUseOtpLogin(false)
                setLocalError(null)
                setSuggestionMode(null)
              }}
              className="text-yellow-600 dark:text-yellow-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Register
            </button>
          </p>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => {
                setAuthMode("login")
                setUseOtpLogin(false)
                setLocalError(null)
                setSuggestionMode(null)
                setSignupPasswordInput("")
                setConfirmPassword("")
              }}
              className="text-yellow-600 dark:text-yellow-400 font-bold hover:underline cursor-pointer ml-1"
            >
              Log In
            </button>
          </p>
        )}
      </div>

      {/* Divider */}
      <div className="flex items-center my-4">
        <div className="flex-1 border-t border-gray-200 dark:border-white/10"></div>
        <span className="px-3 text-xs text-gray-400 uppercase tracking-wider font-medium">
          or continue with
        </span>
        <div className="flex-1 border-t border-gray-200 dark:border-white/10"></div>
      </div>

      {/* Google Alternative */}
      <button
        onClick={() => onNext?.()}
        type="button"
        className="w-full h-13 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-white font-medium rounded-2xl transition-colors flex items-center justify-center gap-3 text-sm cursor-pointer shadow-2xs"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>
    </div>
  )
}
