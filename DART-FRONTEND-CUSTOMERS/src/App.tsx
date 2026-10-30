import { useState, useEffect, useRef } from "react"
import PhoneAuth from "./imports/PhoneAuth"
import Otp2 from "./imports/Otp2"
import AddProfilcPicAndName from "./imports/AddProfilcPicAndName"
import Nin from "./imports/Nin"
import AccountCreationSuccessful from "./imports/AccountCreationSuccessful"
import AuthLayout from "./components/AuthLayout"
import MainLayout from "./components/MainLayout"
import ProfileSetupPromptModal from "./components/ProfileSetupPromptModal"
import ChooseAccountType from "./imports/ChooseAccountType"
import { AuthProvider, useAuth } from "./context/AuthContext"

type Screen =
  | "phone-auth"
  | "otp2"
  | "account-type"
  | "add-profile"
  | "nin"
  | "account-success"

const FLOW: Screen[] = [
  "phone-auth",
  "otp2",
  "account-type",
  "add-profile",
  "nin",
  "account-success",
]

function AppContent() {
  const [history, setHistory] = useState<Screen[]>(["phone-auth"])
  const { isAuthenticated, isLoading, user, setDirectAuth, setAuthMode } = useAuth()
  const [showProfilePrompt, setShowProfilePrompt] = useState(false)
  const timerRef = useRef<any>(null)
  const hasTriggeredRef = useRef(false)
  const current = history[history.length - 1]

  // Enforce default to login on initial page visit
  useEffect(() => {
    if (!isAuthenticated) {
      setAuthMode("login")
    }
  }, [isAuthenticated, setAuthMode])

  const push = (screen: Screen) => setHistory((h) => [...h, screen])
  const pop = () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h))

  const next = (target?: Screen | "home") => {
    if (target === "home") {
      setHistory(["phone-auth"])
      return
    }
    if (target) {
      push(target as Screen)
      return
    }
    const idx = FLOW.indexOf(current)
    if (idx < FLOW.length - 1) {
      push(FLOW[idx + 1])
    } else {
      // Completed onboarding: enter MainLayout
      if (user) {
        setDirectAuth({
          ...user,
          firstName: user.firstName || (user.email ? user.email.split("@")[0] : ""),
        })
      }
      setHistory(["phone-auth"])
    }
  }

  const isOnboardingStep = [
    "otp2",
    "account-type",
    "add-profile",
    "nin",
    "account-success",
  ].includes(current)

  // 10-second timer prompt for unverified accounts on the main/home screens
  useEffect(() => {
    // If account is already verified, clear timer and NEVER show modal
    const isVerified = Boolean(
      user?.isProfileComplete ||
      (user as any)?.isNinVerified ||
      (user as any)?.identityProfile?.kycStatus === "VERIFIED"
    )

    if (isVerified) {
      setShowProfilePrompt(false)
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    if (!isAuthenticated || isOnboardingStep) {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      return
    }

    if (!isVerified && !hasTriggeredRef.current && !timerRef.current) {
      console.log("[Verification Prompt] 10s timer started for unverified account on Home...")
      timerRef.current = setTimeout(() => {
        const stillVerified = Boolean(
          user?.isProfileComplete ||
          (user as any)?.isNinVerified ||
          (user as any)?.identityProfile?.kycStatus === "VERIFIED"
        )
        if (!stillVerified) {
          console.log("[Verification Prompt] 10 seconds elapsed. Displaying verification prompt modal.")
          setShowProfilePrompt(true)
        }
        hasTriggeredRef.current = true
        timerRef.current = null
      }, 10000)
    }
  }, [isAuthenticated, isOnboardingStep, Boolean(user?.isProfileComplete)])

  const handleDismissPrompt = () => {
    setShowProfilePrompt(false)
    hasTriggeredRef.current = true
  }

  const handleSetupProfileNow = () => {
    setShowProfilePrompt(false)
    hasTriggeredRef.current = true
    push("nin")
  }

  // 0. Bootstrap / Session verification check - prevents screen flickering or unauthorized view flash
  if (isLoading) {
    return (
      <div className="w-full min-h-[100dvh] flex flex-col items-center justify-center bg-[#0c0c0e] text-white">
        <div className="relative flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FFCC00]/10 border border-[#FFCC00]/30 flex items-center justify-center shadow-lg shadow-[#FFCC00]/10 animate-pulse">
            <div className="w-6 h-6 border-2 border-[#FFCC00] border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-xs font-medium text-white/50 tracking-wider uppercase">
            Securing Dart Session...
          </p>
        </div>
      </div>
    )
  }

  // When user is navigating through onboarding flow
  if (isOnboardingStep) {
    const maxWidth =
      current === "account-type"
        ? "max-w-2xl 2xl:max-w-3xl"
        : "max-w-md sm:max-w-lg"

    return (
      <div className="w-full min-h-[100dvh] flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] text-gray-900 dark:text-white transition-colors">
        <AuthLayout
          hideCarousel={true}
          maxWidthClass={maxWidth}
          hideTopBar={current === "account-type"}
        >
          {current === "otp2" && (
            <Otp2
              onNext={(target?: string) => {
                if (target === "home") {
                  setHistory(["phone-auth"])
                } else if (target === "add-profile" || target === "account-type") {
                  push("account-type")
                } else {
                  next(target as any)
                }
              }}
              onBack={pop}
              onChangeNumber={() => push("phone-auth")}
            />
          )}
          {current === "account-type" && (
            <ChooseAccountType
              onBack={pop}
              onContinue={(type) => {
                if (type === "rider") {
                  const isLocal =
                    window.location.hostname === "localhost" ||
                    window.location.hostname === "127.0.0.1"
                  const riderUrl = isLocal
                    ? "http://localhost:8444/#/onboarding"
                    : "/rider"
                  window.location.href = riderUrl
                } else {
                  push("add-profile")
                }
              }}
            />
          )}
          {current === "add-profile" && (
            <AddProfilcPicAndName
              onVerifyAccount={() => push("nin")}
              onGoToHome={() => {
                hasTriggeredRef.current = false
                setHistory(["phone-auth"])
              }}
              onNext={() => push("nin")}
              onBack={pop}
            />
          )}
          {current === "nin" && (
            <Nin
              onNext={() => push("account-success")}
              onBack={() => push("add-profile")}
            />
          )}
          {current === "account-success" && (
            <AccountCreationSuccessful
              onNext={() => {
                hasTriggeredRef.current = true
                setHistory(["phone-auth"])
              }}
              onSetupProfile={() => {
                hasTriggeredRef.current = true
                setHistory(["phone-auth"])
              }}
            />
          )}
        </AuthLayout>
      </div>
    )
  }

  // If user is authenticated and not in an onboarding step, render MainLayout with prompt modal
  if (isAuthenticated) {
    return (
      <div className="w-full min-h-[100dvh] flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] text-gray-900 dark:text-white transition-colors relative">
        <MainLayout />
        <ProfileSetupPromptModal
          isOpen={showProfilePrompt}
          onClose={handleDismissPrompt}
          onSetupNow={handleSetupProfileNow}
        />
      </div>
    )
  }

  // Not authenticated: Initial Auth flow (PhoneAuth)
  return (
    <div className="w-full min-h-[100dvh] flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] text-gray-900 dark:text-white transition-colors">
      <AuthLayout>
        {current === "phone-auth" && <PhoneAuth onNext={next} onBack={pop} />}
      </AuthLayout>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
