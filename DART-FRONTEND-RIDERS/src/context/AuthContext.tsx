import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { authApi } from "../api/auth.api"
import { usersApi } from "../api/account.api"
import { ridersApi } from "../api/riders.api"
import { disconnectChatSocket } from "../api/chat.api"
import { ApiError, SESSION_EXPIRED_EVENT, STORAGE_KEYS, apiClient } from "../api/client"
import type { GoogleAuthPayload, RiderProfile, RiderSignupPayload, User } from "../types/api.types"

interface AuthContextValue {
  user: User | null
  riderProfile: RiderProfile | null
  isAuthenticated: boolean
  isBootstrapping: boolean
  /** True when the rider still needs to add name / vehicle details and hasn't skipped */
  needsOnboarding: boolean
  skipOnboarding: () => void
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>
  signup: (payload: RiderSignupPayload) => Promise<void>
  googleLogin: (payload: GoogleAuthPayload) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  setUser: (u: User) => void
  setRiderProfile: (p: RiderProfile) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

const SKIP_ONBOARDING_KEY = "dart_rider_skip_onboarding"

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
      localStorage.setItem(STORAGE_KEYS.accessToken, ssoToken)
      if (ssoRefresh) {
        localStorage.setItem(STORAGE_KEYS.refreshToken, ssoRefresh)
      }
      apiClient.setTokens(ssoToken, ssoRefresh || "")

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
    console.warn("[Rider Auth] SSO token extraction:", err)
  }
  return null
}

// Extract any handoff SSO token before session bootstrapping
extractSsoTokens()

const loadUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user)
    return raw ? (JSON.parse(raw) as User) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => (apiClient.getAccessToken() ? loadUser() : null))
  const [riderProfile, setRiderProfile] = useState<RiderProfile | null>(user?.riderProfile ?? null)
  const [isBootstrapping, setBootstrapping] = useState(Boolean(apiClient.getAccessToken()))
  const [hasSkippedOnboarding, setHasSkippedOnboarding] = useState<boolean>(() => {
    return localStorage.getItem(SKIP_ONBOARDING_KEY) === "true"
  })

  const setUser = useCallback((u: User | null) => {
    setUserState(u)
    if (u) localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(u))
    else localStorage.removeItem(STORAGE_KEYS.user)
  }, [])

  const skipOnboarding = useCallback(() => {
    localStorage.setItem(SKIP_ONBOARDING_KEY, "true")
    setHasSkippedOnboarding(true)
  }, [])

  const clearSession = useCallback(() => {
    disconnectChatSocket()
    apiClient.clearTokens()
    localStorage.removeItem(SKIP_ONBOARDING_KEY)
    setHasSkippedOnboarding(false)
    setUser(null)
    setRiderProfile(null)
  }, [setUser])

  const refresh = useCallback(async () => {
    try {
      const [me, profile] = await Promise.allSettled([usersApi.me(), ridersApi.getProfile()])
      if (me.status === "fulfilled" && me.value) {
        setUser(me.value)
      } else {
        // User does not exist or token invalid -> clear session immediately
        clearSession()
        return
      }
      if (profile.status === "fulfilled" && profile.value) {
        setRiderProfile(profile.value)
      }
    } catch {
      clearSession()
    }
  }, [setUser, clearSession])

  // Bootstrap session on launch
  useEffect(() => {
    if (!apiClient.getAccessToken()) {
      clearSession()
      setBootstrapping(false)
      return
    }
    refresh().finally(() => setBootstrapping(false))
  }, [refresh, clearSession])

  // Global 401 -> logout
  useEffect(() => {
    const onExpired = () => clearSession()
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired)
  }, [clearSession])

  const login = async (identifier: string, password: string, rememberMe?: boolean) => {
    const res = await authApi.login({ identifier, password, rememberMe })
    if (!res?.user) throw new Error("Login failed. Please try again.")
    authApi.persistSession(res)
    setUser(res.user)
    setRiderProfile(res.user.riderProfile ?? null)
    await refresh()
  }

  const signup = async (payload: RiderSignupPayload) => {
    let res
    try {
      res = await authApi.signupRider(payload)
    } catch (error) {
      if (!(error instanceof ApiError) || error.statusCode !== 409) throw error

      const identifier = payload.email || payload.phoneNumber
      if (!identifier) throw error

      try {
        res = await authApi.login({ identifier, password: payload.password })
      } catch (loginError) {
        if (loginError instanceof ApiError && loginError.statusCode === 401) {
          throw new Error(
            "An account already exists with these details. Sign in with its existing password or reset your password.",
          )
        }
        throw loginError
      }

      if (res.user) {
        authApi.persistSession(res)
      }
    }

    if (!res?.user) throw new Error("Sign up failed. Please try again.")
    if (payload.fullName?.trim()) {
      const [firstName, ...rest] = payload.fullName.trim().split(/\s+/)
      try {
        const updated = await usersApi.completeProfile({
          firstName,
          lastName: rest.join(" ") || firstName,
          phoneNumber: payload.phoneNumber || undefined,
          email: payload.email,
        })
        const safeUser = (updated as any)?.user || updated
        setUser({ ...res.user, ...safeUser })
      } catch {
        setUser(res.user)
      }
    } else {
      setUser(res.user)
    }
    await refresh()
  }

  const googleLogin = async (payload: GoogleAuthPayload) => {
    const res = await authApi.googleRider(payload)
    if (!res?.user) throw new Error("Google authentication failed. Please try again.")
    authApi.persistSession(res)
    setUser(res.user)
    setRiderProfile(res.user.riderProfile ?? null)
    await refresh()
  }

  const logout = async () => {
    try {
      await ridersApi.setAvailability("OFFLINE")
    } catch {
      /* ignore */
    }
    await authApi.logout()
    clearSession()
  }

  // Only lock onto onboarding if user is logged in, has missing data, and hasn't clicked Skip
  const needsOnboarding = Boolean(
    !hasSkippedOnboarding && user && (!user.firstName || !riderProfile?.plateNumber)
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        riderProfile,
        isAuthenticated: Boolean(user),
        isBootstrapping,
        needsOnboarding,
        skipOnboarding,
        login,
        signup,
        googleLogin,
        logout,
        refresh,
        setUser,
        setRiderProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
