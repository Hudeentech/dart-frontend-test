import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react"
import { User, VerificationType, OnboardingPayload } from "../types/api.types"
import { authApi } from "../api/auth.api"
import { userApi } from "../api/user.api"
import { SESSION_EXPIRED_EVENT } from "../api/client"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  authError: string | null
  lastPhone: string
  authIdentifier: string
  authType: VerificationType
  authMode: "login" | "signup"
  setAuthMode: (mode: "login" | "signup") => void
  rememberMe: boolean
  setRememberMe: (remember: boolean) => void
  signupPassword?: string
  setSignupPassword: (pwd: string) => void
  loginWithPassword: (
    identifier: string,
    password?: string,
    remember?: boolean,
  ) => Promise<{ success: boolean; user?: User; message?: string }>
  devOtpCode: string | null
  whatsappUrl: string | null
  sendOtp: (
    identifier: string,
    type: VerificationType,
    channel?: "sms" | "whatsapp",
  ) => Promise<{
    success: boolean
    devCode?: string
    whatsappUrl?: string
    message?: string
  }>
  sendPhoneOtp: (
    phoneNumber: string,
    channel?: "sms" | "whatsapp",
  ) => Promise<{
    success: boolean
    devCode?: string
    whatsappUrl?: string
    message?: string
  }>
  verifyOtp: (
    code: string,
    identifier?: string,
    type?: VerificationType,
    password?: string,
  ) => Promise<{ success: boolean; user?: User; message?: string }>
  verifyPhoneOtp: (
    phoneNumber: string,
    code: string,
  ) => Promise<{ success: boolean; message?: string }>
  completeUserProfile: (data: {
    firstName: string
    lastName: string
    profileImageUrl?: string
  }) => Promise<boolean>
  saveOnboardingProfile: (data: OnboardingPayload) => Promise<boolean>
  updateUserProfile: (data: Partial<User>) => Promise<boolean>
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
  setDirectAuth: (user: User) => void
  checkIdentifier: (
    identifier: string,
  ) => Promise<{ exists: boolean; message: string }>
}

const extractSsoTokens = (): string | null => {
  try {
    if (typeof window === "undefined") return null
    const searchParams = new URLSearchParams(window.location.search)
    let ssoToken = searchParams.get("sso_token")
    let ssoRefresh = searchParams.get("sso_refresh")

    if (!ssoToken && window.location.hash.includes("?")) {
      const hashQuery = window.location.hash.split("?")[1]
      const hashParams = new URLSearchParams(hashQuery)
      ssoToken = hashParams.get("sso_token")
      ssoRefresh = hashParams.get("sso_refresh")
    }

    if (ssoToken) {
      localStorage.setItem("dart_access_token", ssoToken)
      if (ssoRefresh) {
        localStorage.setItem("dart_refresh_token", ssoRefresh)
      }

      // Clean the query parameters from the URL
      const url = new URL(window.location.href)
      url.searchParams.delete("sso_token")
      url.searchParams.delete("sso_refresh")
      if (url.hash.includes("?")) {
        const [hashPath, hashQ] = url.hash.split("?")
        const hp = new URLSearchParams(hashQ)
        hp.delete("sso_token")
        hp.delete("sso_refresh")
        url.hash = hp.toString() ? `${hashPath}?${hp.toString()}` : hashPath
      }
      window.history.replaceState({}, document.title, url.toString())
      return ssoToken
    }
  } catch (err) {
    console.warn("[Customer Auth] SSO token extraction:", err)
  }
  return null
}

// Extract any handoff SSO token before session bootstrapping
extractSsoTokens()

export const formatMemberId = (id?: string): string => {
  if (!id) return "DART-USR-88219"
  const clean = id.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  return `DART-USR-${clean.slice(0, 8) || "88219"}`
}

export const enrichUser = (u: User | null): User | null => {
  if (!u) return null
  const isVerified = Boolean(
    u.isProfileComplete ||
    (u as any)?.identityProfile?.kycStatus === "VERIFIED" ||
    (u as any)?.riderProfile?.isVerified ||
    (u as any)?.isNinVerified ||
    localStorage.getItem("dart_account_verified") === "true"
  )
  return {
    ...u,
    isProfileComplete: isVerified,
    memberId: u.memberId || formatMemberId(u.id),
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const LOCAL_STORAGE_USER_KEY = "dart_user"

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const token = localStorage.getItem("dart_access_token")
      const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY)
      // Require both a token AND user record to allow instant hydration
      if (token && saved) {
        return enrichUser(JSON.parse(saved))
      }
      // If no token exists, immediately purge any stale cached user
      if (saved && !token) {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
      }
      return null
    } catch {
      return null
    }
  })

  const setEnrichedUser = (u: User | null) => {
    const enriched = enrichUser(u)
    setUser(enriched)
    if (enriched) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(enriched))
    } else {
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
    }
  }

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [authError, setAuthError] = useState<string | null>(null)
  const [rememberMe, setRememberMe] = useState<boolean>(() => {
    return localStorage.getItem("dart_remember_me") === "true"
  })
  const [authIdentifier, setAuthIdentifier] = useState<string>(() => {
    return localStorage.getItem("dart_last_identifier") || ""
  })
  const [authType, setAuthType] = useState<VerificationType>("EMAIL_OTP")
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")
  const [lastPhone, setLastPhone] = useState<string>("")
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null)
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null)
  const [signupPassword, setSignupPassword] = useState<string>("")

  // Listen for global session expiration events (e.g. 401 Unauthorized from API client)
  useEffect(() => {
    const onSessionExpired = () => {
      setEnrichedUser(null)
      localStorage.removeItem("dart_access_token")
      localStorage.removeItem("dart_refresh_token")
      localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onSessionExpired)
  }, [])

  // Auto-fetch fresh profile if token exists on app launch
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem("dart_access_token")
      if (token) {
        try {
          const freshUser = await userApi.getProfile()
          if (freshUser && freshUser.id) {
            let isVerified = Boolean(
              freshUser.isProfileComplete ||
              (freshUser as any)?.riderProfile?.isVerified ||
              localStorage.getItem("dart_account_verified") === "true"
            )
            try {
              const v = await userApi.getVerificationStatus()
              if (v?.isNinVerified || v?.identityProfile?.kycStatus === "VERIFIED") {
                isVerified = true
              }
            } catch {
              // Ignore verification check error
            }
            if (isVerified) {
              localStorage.setItem("dart_account_verified", "true")
            }
            setEnrichedUser({ ...freshUser, isProfileComplete: isVerified })
          } else {
            // Invalid profile response -> clear session
            setEnrichedUser(null)
            localStorage.removeItem("dart_access_token")
            localStorage.removeItem("dart_refresh_token")
            localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
          }
        } catch (err: any) {
          // Profile call rejected (e.g. 401 Unauthorized or user deleted from database)
          console.warn("[AuthContext] Token expired or invalid during bootstrap, clearing session:", err?.message)
          setEnrichedUser(null)
          localStorage.removeItem("dart_access_token")
          localStorage.removeItem("dart_refresh_token")
          localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
        }
      } else {
        // No token present on boot - guarantee no lingering user
        setEnrichedUser(null)
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY)
      }
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  /**
   * Request 6-digit OTP code for Email or Phone
   */
  const sendOtp = async (
    identifier: string,
    type: VerificationType,
    channel: "sms" | "whatsapp" = "sms",
  ) => {
    setAuthError(null)
    setAuthIdentifier(identifier)
    setAuthType(type)
    if (type === "PHONE_OTP") {
      setLastPhone(identifier)
    }

    try {
      const res = await authApi.requestOtp({
        identifier: identifier.trim(),
        type,
        channel,
        purpose: authMode,
      })

      const extractedDevCode = res?.devCode || (res as any)?.data?.devCode
      const extractedWhatsappUrl =
        res?.whatsappUrl || (res as any)?.data?.whatsappUrl

      if (extractedDevCode) {
        setDevOtpCode(extractedDevCode)
      }
      if (extractedWhatsappUrl) {
        setWhatsappUrl(extractedWhatsappUrl)
      } else if (type === "EMAIL_OTP") {
        setWhatsappUrl(null)
      }

      return {
        success: true,
        devCode: extractedDevCode,
        whatsappUrl: extractedWhatsappUrl,
        message:
          res?.message ||
          (res as any)?.data?.message ||
          `Verification code sent to ${identifier}`,
      }
    } catch (err: any) {
      const msg =
        err.message || "Failed to send verification code. Please try again."
      setAuthError(msg)
      return { success: false, message: msg }
    }
  }

  /**
   * Backward-compatible phone OTP helper
   */
  const sendPhoneOtp = async (
    phoneNumber: string,
    channel: "sms" | "whatsapp" = "sms",
  ) => {
    return sendOtp(phoneNumber, "PHONE_OTP", channel)
  }

  /**
   * Check if account exists with an identifier
   */
  const checkIdentifier = async (
    rawIdentifier: string,
  ): Promise<{ exists: boolean; message: string }> => {
    try {
      return await authApi.checkIdentifier(rawIdentifier.trim())
    } catch (err: any) {
      return { exists: false, message: err?.message || "" }
    }
  }

  /**
   * Verify OTP code and sign up / log in the user
   */
  const verifyOtp = async (
    code: string,
    identifier?: string,
    type?: VerificationType,
    password?: string,
  ) => {
    setAuthError(null)
    const targetIdentifier = (identifier || authIdentifier).trim()
    const targetType = type || authType
    const targetPassword = password || signupPassword || undefined

    try {
      // 1. Verify OTP with backend (including purpose and password for proper auth session creation)
      const verifyRes = await authApi.verifyOtp({
        identifier: targetIdentifier,
        code: code.trim(),
        type: targetType,
        purpose: authMode,
        password: targetPassword,
      })

      if (verifyRes?.user) {
        setSignupPassword("")
        const enriched = enrichUser(verifyRes.user)
        setEnrichedUser(verifyRes.user)
        return { success: true, user: enriched || undefined }
      }

      // 2. Fallback: sync profile if already authenticated
      const userProfile = await userApi.getProfile()
      const enriched = enrichUser(userProfile)
      setEnrichedUser(userProfile)
      return { success: true, user: enriched || undefined }
    } catch (err: any) {
      const msg =
        err.message ||
        "Verification failed. Please check the code and try again."
      setAuthError(msg)
      return { success: false, message: msg }
    }
  }

  /**
   * Backward-compatible verify phone helper
   */
  const verifyPhoneOtp = async (phoneNumber: string, code: string) => {
    return verifyOtp(code, phoneNumber, "PHONE_OTP")
  }

  /**
   * Complete user profile name and avatar
   */
  const completeUserProfile = async (data: {
    firstName: string
    lastName: string
    profileImageUrl?: string
  }) => {
    setAuthError(null)
    try {
      const updatedUser = await userApi.completeProfile({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phoneNumber: user?.phoneNumber || lastPhone,
        email: user?.email || (authIdentifier.includes("@") ? authIdentifier : undefined),
        profileImageUrl: data.profileImageUrl,
      })

      setEnrichedUser(updatedUser)
      return true
    } catch (err: any) {
      setAuthError(err.message || "Failed to update profile")
      if (user) {
        const simulated: User = {
          ...user,
          firstName: data.firstName,
          lastName: data.lastName,
          isProfileComplete: true,
        }
        setEnrichedUser(simulated)
        return true
      }
      return false
    }
  }

  /**
   * Save onboarding profile: names, gender, avatar, with immediate verification option
   */
  const saveOnboardingProfile = async (data: OnboardingPayload) => {
    setAuthError(null)
    try {
      const response = await userApi.saveOnboarding({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        gender: data.gender,
        profileImageUrl: data.profileImageUrl,
        phoneNumber: data.phoneNumber || user?.phoneNumber || lastPhone,
        verifyNow: data.verifyNow ?? false,
      })

      const updatedUser = response.user
      setEnrichedUser(updatedUser)
      return true
    } catch (err: any) {
      console.warn("[AuthContext] saveOnboarding API error, using local fallback:", err.message)
      if (user) {
        const simulated: User = {
          ...user,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          gender: data.gender || user.gender,
          profileImageUrl: data.profileImageUrl || user.profileImageUrl,
          isProfileComplete: Boolean(data.verifyNow),
        }
        setEnrichedUser(simulated)
        return true
      }
      return false
    }
  }

  /**
   * Update profile details
   */
  const updateUserProfile = async (data: Partial<User>) => {
    try {
      const updatedUser = await userApi.updateProfile({
        firstName: data.firstName ?? undefined,
        lastName: data.lastName ?? undefined,
        phoneNumber: data.phoneNumber ?? undefined,
        profileImageUrl: data.profileImageUrl ?? undefined,
      })

      setEnrichedUser(updatedUser)
      return true
    } catch (err: any) {
      setAuthError(err.message)
      if (user) {
        const merged = { ...user, ...data }
        setEnrichedUser(merged as User)
        return true
      }
      return false
    }
  }

  /**
   * Re-fetch profile data from backend
   */
  const refreshProfile = async () => {
    try {
      const [freshUser, verifRes] = await Promise.allSettled([
        userApi.getProfile(),
        userApi.getVerificationStatus(),
      ])
      const u = freshUser.status === "fulfilled" ? freshUser.value : null
      const v = verifRes.status === "fulfilled" ? verifRes.value : null
      const isVerified = Boolean(
        u?.isProfileComplete ||
        v?.isNinVerified ||
        v?.identityProfile?.kycStatus === "VERIFIED"
      )
      if (u) {
        setEnrichedUser({ ...u, isProfileComplete: isVerified })
      }
    } catch (e) {
      console.warn("[AuthContext] Refresh profile notice:", e)
    }
  }

  /**
   * Direct Login with Password & Remember Me (No OTP required)
   */
  const loginWithPassword = async (
    identifier: string,
    password?: string,
    remember?: boolean,
  ) => {
    setAuthError(null)
    const isRemember = remember !== undefined ? remember : rememberMe
    const cleanId = identifier.trim()
    setAuthIdentifier(cleanId)

    try {
      const res = await authApi.login({
        identifier: cleanId,
        email: cleanId.includes("@") ? cleanId : undefined,
        phoneNumber: !cleanId.includes("@") ? cleanId : undefined,
        password: password || "DartCustomer2026!",
        rememberMe: isRemember,
      })

      if (isRemember) {
        localStorage.setItem("dart_remember_me", "true")
        localStorage.setItem("dart_last_identifier", cleanId)
      } else {
        localStorage.removeItem("dart_remember_me")
        localStorage.removeItem("dart_last_identifier")
      }

      if (res?.user) {
        setEnrichedUser(res.user)
        return { success: true, user: res.user }
      }

      const userProfile = await userApi.getProfile()
      setEnrichedUser(userProfile)
      return { success: true, user: userProfile }
    } catch (err: any) {
      const msg =
        err.message || "Invalid credentials. Please check your details or use OTP code."
      setAuthError(msg)
      return { success: false, message: msg }
    }
  }

  /**
   * Logout user, clear tokens, and reset state
   */
  const logout = async () => {
    await authApi.logout()
    setEnrichedUser(null)
    setDevOtpCode(null)
    setWhatsappUrl(null)
    if (!rememberMe) {
      localStorage.removeItem("dart_last_identifier")
    }
  }

  /**
   * Manually set authenticated user (for instant demo or quick switch)
   */
  const setDirectAuth = (authenticatedUser: User) => {
    setEnrichedUser(authenticatedUser)
  }

  const isAuthenticated = Boolean(
    user && typeof window !== "undefined" && localStorage.getItem("dart_access_token")
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        authError,
        lastPhone,
        authIdentifier,
        authType,
        authMode,
        setAuthMode,
        rememberMe,
        setRememberMe,
        signupPassword,
        setSignupPassword,
        loginWithPassword,
        devOtpCode,
        whatsappUrl,
        sendOtp,
        sendPhoneOtp,
        verifyOtp,
        verifyPhoneOtp,
        completeUserProfile,
        saveOnboardingProfile,
        updateUserProfile,
        refreshProfile,
        logout,
        setDirectAuth,
        checkIdentifier,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
