import { apiClient, STORAGE_KEYS } from "./client"
import type { AuthResponse, GoogleAuthPayload, LoginPayload, RiderSignupPayload } from "../types/api.types"

/**
 * Auth endpoints used by riders.
 * NOTE: backend OTP-signup always creates CUSTOMER accounts, so riders use
 * `POST /auth/signup/rider` (email or phone + password) and `POST /auth/login`.
 */
export const authApi = {
  /** POST /auth/signup/rider */
  signupRider: async (payload: RiderSignupPayload) => {
    const res = await apiClient.post<AuthResponse>("auth/signup/rider", payload, { anonymous: true })
    if (res?.tokens?.accessToken) apiClient.setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    return res
  },

  /** POST /auth/google/rider */
  googleRider: async (payload: GoogleAuthPayload) => {
    const res = await apiClient.post<AuthResponse>("auth/google/rider", payload, { anonymous: true })
    if (res?.tokens?.accessToken) apiClient.setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    return res
  },

  /** POST /auth/login */
  login: async ({ identifier, password, rememberMe }: LoginPayload) => {
    const id = identifier.trim()
    const res = await apiClient.post<AuthResponse>(
      "auth/login",
      { identifier: id, password, rememberMe: Boolean(rememberMe) },
      { anonymous: true },
    )
    return res
  },

  /** Persist tokens only after we've confirmed the account is a rider. */
  persistSession: (res: AuthResponse) => {
    if (res?.tokens?.accessToken) apiClient.setTokens(res.tokens.accessToken, res.tokens.refreshToken)
  },

  /** POST /auth/check-identifier */
  checkIdentifier: (identifier: string) =>
    apiClient.post<{ exists: boolean; message: string }>("auth/check-identifier", { identifier }, { anonymous: true }),

  /** POST /auth/request-otp (phone or email) */
  requestOtp: (payload: {
    identifier: string
    type: "PHONE_OTP" | "EMAIL_OTP"
    channel?: "sms" | "whatsapp"
    purpose?: "login" | "signup" | "reset_password"
  }) =>
    apiClient.post<{
      success: boolean
      message: string
      devCode?: string
      whatsappUrl?: string
      channel?: string
    }>("auth/otp/request", payload, { anonymous: true }),

  /** POST /auth/reset-password */
  resetPassword: (payload: { identifier: string; code: string; newPassword: string }) =>
    apiClient.post<{ success: boolean; message: string }>("auth/reset-password", payload, { anonymous: true }),

  /** POST /auth/logout */
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem(STORAGE_KEYS.refreshToken)
      if (refreshToken) await apiClient.post("auth/logout", { refreshToken }, { anonymous: true })
    } catch {
      /* best effort */
    } finally {
      apiClient.clearTokens()
    }
  },
}
