/**
 * DART.ng API HTTP Client
 * Modular, typed HTTP client with token rotation and error parsing.
 */

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1"

export const SESSION_EXPIRED_EVENT = "dart_session_expired"

export class ApiError extends Error {
  statusCode: number
  data?: any

  constructor(message: string, statusCode: number = 500, data?: any) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.data = data
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

const getErrorMessage = (value: unknown): string | undefined => {
  if (typeof value === "string") return value
  if (Array.isArray(value)) {
    const messages = value
      .map(getErrorMessage)
      .filter((message): message is string => Boolean(message))
    return messages.length ? messages.join(", ") : undefined
  }
  if (value && typeof value === "object") {
    const details = value as Record<string, unknown>
    for (const key of ["message", "error", "detail"]) {
      const message = getErrorMessage(details[key])
      if (message) return message
    }
    try {
      return JSON.stringify(value)
    } catch {
      return undefined
    }
  }
  return undefined
}

class ApiClient {
  private baseUrl: string
  private refreshPromise: Promise<boolean> | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "")
  }

  public getBaseUrl(): string {
    return this.baseUrl
  }

  private getAccessToken(): string | null {
    try {
      return localStorage.getItem("dart_access_token")
    } catch {
      return null
    }
  }

  private getRefreshToken(): string | null {
    try {
      return localStorage.getItem("dart_refresh_token")
    } catch {
      return null
    }
  }

  public setTokens(accessToken: string, refreshToken?: string) {
    try {
      localStorage.setItem("dart_access_token", accessToken)
      if (refreshToken) {
        localStorage.setItem("dart_refresh_token", refreshToken)
      }
    } catch (e) {
      console.warn("[ApiClient] Failed to write tokens to localStorage", e)
    }
  }

  public clearTokens() {
    try {
      localStorage.removeItem("dart_access_token")
      localStorage.removeItem("dart_refresh_token")
      localStorage.removeItem("dart_user")
    } catch (e) {
      console.warn("[ApiClient] Failed to clear tokens from localStorage", e)
    }
  }

  /**
   * Internal request executor with automatic JWT header & token refresh
   */
  public async request<T = any,>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { params, headers, ...restOptions } = options

    let url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`

    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null) {
          searchParams.append(key, String(val))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString
      }
    }

    const requestHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...headers as Record<string, string>,
    }

    let token = this.getAccessToken()
    if (!token && this.getRefreshToken()) {
      await this.tryRefreshToken()
      token = this.getAccessToken()
    }

    if (token && !requestHeaders["Authorization"]) {
      requestHeaders["Authorization"] = `Bearer ${token}`
    }

    let response: Response
    try {
      response = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
      })
    } catch (networkError: any) {
      console.warn(
        `[ApiClient] Network request failed for ${url}:`,
        networkError.message,
      )
      throw new ApiError(
        "Unable to connect to DART server. Please check your internet connection or backend server.",
        0,
        { originalError: networkError.message },
      )
    }

    // Attempt token refresh on 401 Unauthorized
    if (response.status === 401) {
      let refreshed = false
      const currentToken = this.getAccessToken()
      if (currentToken && currentToken !== token) {
        requestHeaders["Authorization"] = `Bearer ${currentToken}`
        refreshed = true
      } else if (this.getRefreshToken()) {
        refreshed = await this.tryRefreshToken()
        if (refreshed) {
          const refreshedToken = this.getAccessToken()
          if (refreshedToken) {
            requestHeaders["Authorization"] = `Bearer ${refreshedToken}`
          }
        }
      }
      if (refreshed) {
        response = await fetch(url, {
          ...restOptions,
          headers: requestHeaders,
        })
      } else {
        this.clearTokens()
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
        }
      }
    }

    // Handle responses
    let data: any = null
    const contentType = response.headers.get("content-type")
    if (contentType && contentType.includes("application/json")) {
      try {
        data = await response.json()
      } catch {
        data = null
      }
    } else {
      try {
        data = await response.text()
      } catch {
        data = null
      }
    }

    if (!response.ok) {
      const errorMessage =
        getErrorMessage(data) || "An unexpected error occurred"
      throw new ApiError(errorMessage, response.status, data)
    }

    // Automatically unwrap standard NestJS ResponseEnvelope { success, statusCode, data, timestamp }
    if (
      data &&
      typeof data === "object" &&
      "data" in data &&
      ("statusCode" in data || "timestamp" in data)
    ) {
      return data.data as T
    }

    return data as T
  }

  private async tryRefreshToken(): Promise<boolean> {
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = this.refreshTokens()
    try {
      return await this.refreshPromise
    } finally {
      this.refreshPromise = null
    }
  }

  private async refreshTokens(): Promise<boolean> {
    const refreshToken = this.getRefreshToken()
    if (!refreshToken) return false

    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })

      if (res.ok) {
        const raw = await res.json()
        const tokens = raw?.data || raw
        if (tokens?.accessToken) {
          this.setTokens(tokens.accessToken, tokens.refreshToken)
          return true
        }
      }
    } catch (e) {
      console.warn("[ApiClient] Token rotation failed", e)
    }

    this.clearTokens()
    return false
  }



  // Convenience verbs
  public get<T = any,>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }

  public post<T = any,>(
    endpoint: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  public patch<T = any,>(
    endpoint: string,
    body?: any,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  public delete<T = any,>(
    endpoint: string,
    options?: RequestOptions,
  ): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }
}

export const apiClient = new ApiClient(BASE_URL)
