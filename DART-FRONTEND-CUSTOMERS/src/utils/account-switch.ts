export function getRiderAppUrl(): string {
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  const configuredUrl = import.meta.env.VITE_RIDER_APP_URL
  const baseUrl =
    configuredUrl ||
    (isLocal ? "http://localhost:8444" : `${window.location.origin}/rider`)

  try {
    localStorage.setItem("dart_customer_app_url", window.location.origin)
  } catch {
    // Continue without persistence when storage is unavailable.
  }
  const destination = new URL(baseUrl, window.location.origin)
  const accessToken =
    localStorage.getItem("dart_access_token") ||
    localStorage.getItem("dart_rider_access_token")
  const refreshToken =
    localStorage.getItem("dart_refresh_token") ||
    localStorage.getItem("dart_rider_refresh_token")

  if (accessToken) {
    localStorage.setItem("dart_rider_access_token", accessToken)
    const user = localStorage.getItem("dart_user")
    if (user) localStorage.setItem("dart_rider_user", user)
  }
  if (refreshToken) {
    localStorage.setItem("dart_rider_refresh_token", refreshToken)
  }

  const handoff = new URLSearchParams()
  if (accessToken) handoff.set("sso_token", accessToken)
  if (refreshToken) handoff.set("sso_refresh", refreshToken)
  handoff.set("return_customer_url", window.location.origin)
  destination.hash = `/onboarding${handoff.size ? `?${handoff}` : ""}`

  return destination.toString()
}
