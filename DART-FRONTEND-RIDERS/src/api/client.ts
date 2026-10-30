/**
 * DART Rider API HTTP client
 * - Attaches JWT, rotates tokens on 401, unwraps the NestJS ResponseEnvelope.
 * - Uses rider-scoped storage keys so it never collides with the customer app.
 * - Unlike the customer app, it never creates guest sessions: if refresh fails,
 *   it emits `dart-rider:session-expired` and the AuthContext logs the rider out.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1").replace(/\/+$/, "")

export const STORAGE_KEYS = {
  accessToken: "dart_rider_access_token",
  refreshToken: "dart_rider_refresh_token",
  user: "dart_rider_user",
} as const

export const SESSION_EXPIRED_EVENT = "dart-rider:session-expired"

export class ApiError extends Error {
  statusCode: number
  data?: unknown

  constructor(message: string, statusCode = 500, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.statusCode = statusCode
    this.data = data
  }
}

function getErrorMessage(value: unknown): string | undefined {
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
  }
  return undefined
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  params?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  /** Skip attaching Authorization header (for public endpoints). */
  anonymous?: boolean
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

class ApiClient {
  readonly baseUrl = BASE_URL
  private refreshing: Promise<boolean> | null = null

  getAccessToken() {
    return read(STORAGE_KEYS.accessToken)
  }

  setTokens(accessToken: string, refreshToken?: string) {
    localStorage.setItem(STORAGE_KEYS.accessToken, accessToken)
    if (refreshToken) localStorage.setItem(STORAGE_KEYS.refreshToken, refreshToken)
  }

  clearTokens() {
    localStorage.removeItem(STORAGE_KEYS.accessToken)
    localStorage.removeItem(STORAGE_KEYS.refreshToken)
    localStorage.removeItem(STORAGE_KEYS.user)
  }

  private buildUrl(endpoint: string, params?: RequestOptions["params"]) {
    let url = endpoint.startsWith("http") ? endpoint : `${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`
    if (params) {
      const qs = new URLSearchParams()
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== "") qs.append(k, String(v))
      })
      const s = qs.toString()
      if (s) url += (url.includes("?") ? "&" : "?") + s
    }
    return url
  }

  private async refresh(): Promise<boolean> {
    // De-duplicate concurrent refreshes
    if (this.refreshing) return this.refreshing
    const refreshToken = read(STORAGE_KEYS.refreshToken)
    if (!refreshToken) return false

    this.refreshing = (async () => {
      try {
        const res = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        })
        if (!res.ok) return false
        const raw = await res.json()
        const tokens = raw?.data ?? raw
        if (tokens?.accessToken) {
          this.setTokens(tokens.accessToken, tokens.refreshToken)
          return true
        }
        return false
      } catch {
        return false
      } finally {
        this.refreshing = null
      }
    })()
    return this.refreshing
  }

  async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, body, anonymous, ...rest } = options
    const url = this.buildUrl(endpoint, params)

    const doFetch = () => {
      const h: Record<string, string> = {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(headers as Record<string, string>),
      }
      const token = this.getAccessToken()
      if (token && !anonymous) h.Authorization = `Bearer ${token}`
      return fetch(url, {
        ...rest,
        headers: h,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      })
    }

    let response: Response
    try {
      response = await doFetch()
      if (response.status === 401 && !anonymous && read(STORAGE_KEYS.refreshToken)) {
        if (await this.refresh()) {
          response = await doFetch()
        }
      }
    } catch (e: any) {
      throw new ApiError(
        "Unable to reach the DART server. Check your connection or make sure the backend is running.",
        0,
        { originalError: e?.message },
      )
    }

    if (response.status === 401 && !anonymous) {
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT))
    }

    let data: any = null
    const ct = response.headers.get("content-type") || ""
    try {
      data = ct.includes("application/json") ? await response.json() : await response.text()
    } catch {
      data = null
    }

    if (!response.ok) {
      const message =
        getErrorMessage(data) || "Something went wrong. Please try again."
      throw new ApiError(message, response.status, data)
    }

    // Unwrap { success, statusCode, data, timestamp }
    if (data && typeof data === "object" && "data" in data && ("statusCode" in data || "timestamp" in data)) {
      return data.data as T
    }
    return data as T
  }

  get<T = unknown>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "GET" })
  }
  post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "POST", body })
  }
  patch<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "PATCH", body })
  }
  delete<T = unknown>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: "DELETE" })
  }
}

export const apiClient = new ApiClient()
