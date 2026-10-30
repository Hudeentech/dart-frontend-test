import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { authApi } from "../api/auth.api"
import {
  Loader2,
  AlertCircle,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Check,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  User,
} from "lucide-react"

export function AuthPage() {
  const { login, signup, googleLogin } = useAuth()
  const toast = useToast()

  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login")

  // Forgot password sub-steps: "request" -> "verify" -> "success"
  const [forgotStep, setForgotStep] = useState<"request" | "verify" | "success">("request")
  const [resetCode, setResetCode] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
  const [devResetCode, setDevResetCode] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(0)

  // Form Fields (Email only)
  const [emailInput, setEmailInput] = useState("")
  const [fullName, setFullName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)

  // Google Sign-In state
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [successNotice, setSuccessNotice] = useState<string | null>(null)

  const isLogin = authMode === "login"
  const isForgot = authMode === "forgot"

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((c) => c - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCountdown])

  // Handle Standard Email & Password submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    const rawEmail = emailInput.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      setLocalError("Please enter a valid email address.")
      return
    }

    if (!password || password.length < 6) {
      setLocalError("Password must be at least 6 characters.")
      return
    }

    if (!isLogin) {
      if (!fullName.trim()) {
        setLocalError("Please enter your full legal name.")
        return
      }
      if (password !== confirmPassword) {
        setLocalError("Passwords do not match. Please ensure both passwords match.")
        return
      }
    }

    setIsSubmitting(true)
    try {
      if (isLogin) {
        await login(rawEmail, password, rememberMe)
        toast("Welcome back to Dart Fleet!", "success")
      } else {
        await signup({
          email: rawEmail,
          password,
          fullName: fullName.trim() || undefined,
        })
        toast("Rider account created successfully!", "success")
      }
    } catch (err: any) {
      const msg = err.message || "Authentication failed. Please check your credentials."
      setLocalError(msg)
      toast(msg, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle Continue with Google via real Google OAuth 2.0
  const handleGoogleSignIn = async () => {
    setLocalError(null)
    const clientId = (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID

    if (!clientId) {
      const msg = "Google OAuth is not configured. Please set your VITE_GOOGLE_CLIENT_ID in the .env file."
      setLocalError(msg)
      toast(msg, "error")
      return
    }

    const google = (window as any).google
    if (!google?.accounts?.oauth2) {
      const msg = "Google services are initializing. Please wait a moment and click again."
      setLocalError(msg)
      toast(msg, "error")
      return
    }

    setIsGoogleLoading(true)
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid",
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            setIsGoogleLoading(false)
            const msg = tokenResponse.error_description || tokenResponse.error || "Google sign-in was cancelled."
            setLocalError(msg)
            toast(msg, "error")
            return
          }

          try {
            // Retrieve Google user info using the OAuth access token
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            })

            if (!res.ok) {
              throw new Error("Unable to fetch user details from Google.")
            }

            const profile = await res.json()
            await googleLogin({
              tokenOrId: profile.sub,
              email: profile.email,
              firstName: profile.given_name || profile.name || "Rider",
              lastName: profile.family_name || "",
              profileImageUrl: profile.picture,
            })
            toast("Signed in with Google successfully!", "success")
          } catch (err: any) {
            const msg = err.message || "Failed to authenticate with Google."
            setLocalError(msg)
            toast(msg, "error")
          } finally {
            setIsGoogleLoading(false)
          }
        },
        error_callback: (err: any) => {
          setIsGoogleLoading(false)
          const msg = err?.message || "Google OAuth window closed or failed to initialize."
          setLocalError(msg)
          toast(msg, "error")
        },
      })

      client.requestAccessToken({ prompt: "select_account" })
    } catch (err: any) {
      setIsGoogleLoading(false)
      const msg = err.message || "Could not launch Google authentication."
      setLocalError(msg)
      toast(msg, "error")
    }
  }

  // Request Password Reset Code via Email
  const handleRequestResetOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setLocalError(null)
    setSuccessNotice(null)

    const rawEmail = emailInput.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      setLocalError("Please enter a valid email address.")
      return
    }

    setIsSubmitting(true)
    try {
      const check = await authApi.checkIdentifier(rawEmail)
      if (!check.exists) {
        setLocalError("No rider account found with this email. Please check or register.")
        setIsSubmitting(false)
        return
      }

      const res = await authApi.requestOtp({
        identifier: rawEmail,
        type: "EMAIL_OTP",
        channel: "sms",
        purpose: "reset_password",
      })

      if (res.devCode) {
        setDevResetCode(res.devCode)
      }
      setResendCountdown(30)
      setForgotStep("verify")
      setSuccessNotice(`Verification code sent to ${rawEmail}`)
      toast("Verification code dispatched to your email", "success")
    } catch (err: any) {
      const msg = err.message || "Failed to send reset code. Please try again."
      setLocalError(msg)
      toast(msg, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit Password Reset with OTP
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    setSuccessNotice(null)

    const rawEmail = emailInput.trim().toLowerCase()
    const code = resetCode.trim()
    if (!code || code.length !== 6) {
      setLocalError("Please enter the 6-digit verification code.")
      return
    }

    if (!newPassword || newPassword.length < 6) {
      setLocalError("Password must be at least 6 characters.")
      return
    }

    if (newPassword !== confirmNewPassword) {
      setLocalError("Passwords do not match. Please ensure both passwords match.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await authApi.resetPassword({
        identifier: rawEmail,
        code,
        newPassword,
      })

      if (res.success) {
        setForgotStep("success")
        toast("Password reset successfully! You can now log in.", "success")
      } else {
        setLocalError(res.message || "Failed to reset password.")
      }
    } catch (err: any) {
      const msg = err.message || "Failed to reset password. Please verify the code."
      setLocalError(msg)
      toast(msg, "error")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col w-full bg-transparent relative animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-6">
        {isForgot && (
          <button
            type="button"
            onClick={() => {
              setAuthMode("login")
              setLocalError(null)
              setSuccessNotice(null)
            }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 dark:hover:text-white mb-3 cursor-pointer transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Sign In</span>
          </button>
        )}
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          {isForgot
            ? forgotStep === "success"
              ? "Password Updated!"
              : "Reset Password"
            : isLogin
            ? "Welcome back"
            : "Join the Dart Fleet"}
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base font-normal leading-relaxed">
          {isForgot
            ? forgotStep === "success"
              ? "Your password has been changed successfully. You can now log in."
              : forgotStep === "verify"
              ? `Enter the 6-digit code sent to ${emailInput} along with your new password.`
              : "Enter your registered email address to receive a verification reset code."
            : isLogin
            ? "Enter your email and password to sign in to your rider account."
            : "Register as a verified rider with your email and password to accept deliveries and earn daily."}
        </p>
      </div>

      {/* Success Notification Alert */}
      {successNotice && (
        <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/30 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400 animate-in fade-in duration-200">
          <ShieldCheck className="size-4 shrink-0 mt-0.5" />
          <p className="leading-snug font-medium flex-1">{successNotice}</p>
        </div>
      )}

      {/* Verification Code helper banner if returned by server */}
      {isForgot && devResetCode && forgotStep === "verify" && (
        <div className="mb-5 p-3.5 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-between text-xs text-yellow-700 dark:text-yellow-400">
          <span className="font-medium">
            Verification Code: <strong className="font-mono text-sm tracking-widest">{devResetCode}</strong>
          </span>
          <button
            type="button"
            onClick={() => setResetCode(devResetCode)}
            className="text-[11px] underline font-bold cursor-pointer hover:text-yellow-500"
          >
            Auto Fill
          </button>
        </div>
      )}

      {/* Error Message Alert */}
      {localError && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400 animate-in fade-in duration-200">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p className="leading-snug font-medium flex-1">{localError}</p>
        </div>
      )}

      {/* CONTINUE WITH GOOGLE (Available on Login & Signup) */}
      {!isForgot && (
        <div className="mb-5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || isGoogleLoading}
            className="w-full h-13 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-white font-semibold rounded-2xl transition-all flex items-center justify-center gap-3 text-sm cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99] disabled:opacity-60"
          >
            {isGoogleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            )}
            <span>{isLogin ? "Continue with Google" : "Sign Up with Google"}</span>
          </button>

          {/* Divider */}
          <div className="relative my-5 flex items-center justify-center">
            <div className="w-full border-t border-gray-200 dark:border-white/10" />
            <span className="absolute bg-[#fcfcfc] dark:bg-[#0c0c0e] px-3 text-xs font-medium text-gray-400">
              {isLogin ? "or sign in with email" : "or register with email"}
            </span>
          </div>
        </div>
      )}

      {/* FORGOT PASSWORD FORM: Step 1 (Request Code) */}
      {isForgot && forgotStep === "request" && (
        <form onSubmit={handleRequestResetOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Registered Email Address
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <Mail className="size-5 text-gray-400 shrink-0" />
              <input
                type="email"
                placeholder="rider@dart.ng"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value)
                  setLocalError(null)
                }}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
                required
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Sending Code...</span>
                </>
              ) : (
                <>
                  <KeyRound className="size-5" />
                  <span>Send Verification Code</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* FORGOT PASSWORD FORM: Step 2 (Verify Code & Reset) */}
      {isForgot && forgotStep === "verify" && (
        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              6-Digit Verification Code
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <KeyRound className="size-5 text-gray-400 shrink-0" />
              <input
                type="text"
                maxLength={6}
                placeholder="123456"
                value={resetCode}
                onChange={(e) => {
                  setResetCode(e.target.value.replace(/\D/g, ""))
                  setLocalError(null)
                }}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-xl font-bold tracking-widest text-gray-900 dark:text-white placeholder-gray-400"
                autoFocus
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              New Password
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <Lock className="size-5 text-gray-400 shrink-0" />
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value)
                  setLocalError(null)
                }}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Confirm New Password
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <Lock className="size-5 text-gray-400 shrink-0" />
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                placeholder="••••••••"
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value)
                  setLocalError(null)
                }}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                {showConfirmNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
            <span>Didn't receive code?</span>
            <button
              type="button"
              disabled={resendCountdown > 0 || isSubmitting}
              onClick={() => handleRequestResetOtp()}
              className="text-yellow-600 dark:text-yellow-400 font-semibold hover:underline disabled:opacity-50 cursor-pointer"
            >
              {resendCountdown > 0 ? `Resend in ${resendCountdown}s` : "Resend Code"}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* FORGOT PASSWORD FORM: Step 3 (Success) */}
      {isForgot && forgotStep === "success" && (
        <div className="space-y-5 text-center py-4">
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <Check className="size-8 stroke-[3]" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your rider account password has been updated. You can now proceed to log in with your new password.
          </p>
          <button
            type="button"
            onClick={() => {
              setAuthMode("login")
              setForgotStep("request")
              setPassword("")
              setConfirmPassword("")
              setResetCode("")
            }}
            className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center text-base cursor-pointer"
          >
            Sign In with New Password
          </button>
        </div>
      )}

      {/* LOGIN & SIGNUP FORM AREA (Email Only) */}
      {!isForgot && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name for Registration */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Full Legal Name
              </label>
              <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
                <User className="size-5 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="e.g. Babatunde Adeleke"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value)
                    setLocalError(null)
                  }}
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Email Address
            </label>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <Mail className="size-5 text-gray-400 shrink-0" />
              <input
                type="email"
                placeholder="rider@dart.ng"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value)
                  setLocalError(null)
                }}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                autoFocus
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {isLogin ? "Password" : "Create Password"}
              </label>
              {!isLogin && <span className="text-[11px] text-gray-400">Min. 6 characters</span>}
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 shadow-xs focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all">
              <Lock className="size-5 text-gray-400 shrink-0" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setLocalError(null)
                }}
                className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Registration: Confirm Password */}
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                Confirm Password
              </label>
              <div
                className={`flex items-center gap-3 bg-white dark:bg-[#18181b] border rounded-2xl p-4 shadow-xs transition-all ${
                  confirmPassword.length > 0 && password !== confirmPassword
                    ? "border-red-300 dark:border-red-500/40 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-400/20"
                    : confirmPassword.length > 0 && password === confirmPassword
                    ? "border-emerald-300 dark:border-emerald-500/40 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-400/20"
                    : "border-gray-200 dark:border-white/10 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20"
                }`}
              >
                <Lock className="size-5 text-gray-400 shrink-0" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    setLocalError(null)
                  }}
                  className="w-full bg-transparent border-none focus:outline-none focus:ring-0 text-base font-semibold text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer transition-colors p-1"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {confirmPassword.length > 0 && password === confirmPassword && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                  <Check className="size-3.5 stroke-[3]" /> Passwords match
                </p>
              )}
            </div>
          )}

          {/* Remember me row (Login mode) */}
          {isLogin && (
            <div className="flex items-center justify-between text-sm pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <div
                  onClick={() => setRememberMe(!rememberMe)}
                  className={`size-5 rounded-lg border flex items-center justify-center transition-all ${
                    rememberMe
                      ? "bg-yellow-400 border-yellow-400 text-gray-950 shadow-xs"
                      : "border-gray-300 dark:border-white/20 bg-white dark:bg-[#18181b] group-hover:border-yellow-400"
                  }`}
                >
                  {rememberMe && <Check className="size-3.5 stroke-[3]" />}
                </div>
                <span className="text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-medium">
                  Remember me
                </span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setAuthMode("forgot")
                  setForgotStep("request")
                  setLocalError(null)
                  setSuccessNotice(null)
                  setResetCode("")
                  setNewPassword("")
                  setConfirmNewPassword("")
                }}
                className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 hover:underline font-semibold cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>{isLogin ? "Signing In..." : "Registering Rider..."}</span>
                </>
              ) : (
                <span>{isLogin ? "Sign In as Rider" : "Create Rider Account"}</span>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Switch Between Login and Register */}
      {!isForgot && (
        <div className="mt-6 text-center">
          {isLogin ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Don't have a rider account?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup")
                  setLocalError(null)
                }}
                className="text-yellow-600 dark:text-yellow-400 font-bold hover:underline cursor-pointer ml-1"
              >
                Register as Rider
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Already registered as a rider?{" "}
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login")
                  setLocalError(null)
                  setPassword("")
                  setConfirmPassword("")
                }}
                className="text-yellow-600 dark:text-yellow-400 font-bold hover:underline cursor-pointer ml-1"
              >
                Log In
              </button>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
