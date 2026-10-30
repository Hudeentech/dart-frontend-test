import { apiClient } from "./client"
import {
  AuthResponse,
  CustomerSignupPayload,
  GoogleAuthPayload,
  LoginPayload,
  OtpRequestPayload,
  OtpRequestResponse,
  OtpVerifyPayload,
  OtpVerifyResponse,
} from "../types/api.types"

/**
 * Authentication API Service
 * Handles customer registration, OTP requests, login, Google OAuth, and session tokens.
 */
export const authApi = {
  /**
   * Request OTP code for phone or email verification
   */
  requestOtp: async (
    payload: OtpRequestPayload,
  ): Promise<OtpRequestResponse> => {
    return apiClient.post<OtpRequestResponse>("auth/otp/request", payload)
  },

  /**
   * Check if an account exists by email or phone number
   */
  checkIdentifier: async (
    identifier: string,
  ): Promise<{ exists: boolean; message: string }> => {
    return apiClient.post<{ exists: boolean; message: string }>(
      "auth/check-identifier",
      { identifier },
    )
  },

  /**
   * Verify OTP code
   */
  verifyOtp: async (payload: OtpVerifyPayload): Promise<OtpVerifyResponse> => {
    const res = await apiClient.post<OtpVerifyResponse>("auth/otp/verify", payload)
    if (res?.tokens?.accessToken) {
      apiClient.setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    }
    return res
  },

  /**
   * Sign up as a new customer
   */
  signupCustomer: async (
    payload: CustomerSignupPayload,
  ): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(
      "auth/signup/customer",
      payload,
    )
    if (res?.tokens?.accessToken) {
      apiClient.setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    }
    return res
  },

  /**
   * Login with email or phone + password
   */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    // Strip client-side rememberMe preference so backend whitelist validation is never violated
    const { rememberMe, ...backendPayload } = payload
    const res = await apiClient.post<AuthResponse>("auth/login", backendPayload)
    if (res?.tokens?.accessToken) {
      apiClient.setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    }
    return res
  },

  /**
   * Continue with Google as a Customer
   */
  googleCustomer: async (payload: GoogleAuthPayload): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>(
      "auth/google/customer",
      payload,
    )
    if (res?.tokens?.accessToken) {
      apiClient.setTokens(res.tokens.accessToken, res.tokens.refreshToken)
    }
    return res
  },

  /**
   * Logout user and revoke active session
   */
  logout: async (): Promise<{ success: boolean }> => {
    try {
      const refreshToken = localStorage.getItem("dart_refresh_token")
      if (refreshToken) {
        await apiClient.post("auth/logout", { refreshToken })
      }
    } catch (e) {
      console.warn("[authApi] Logout request notice:", e)
    } finally {
      apiClient.clearTokens()
    }
    return { success: true }
  },
}
