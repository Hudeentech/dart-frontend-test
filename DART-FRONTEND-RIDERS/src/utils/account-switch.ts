export function getCustomerAppUrl(): string {
  const isLocal =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  const configuredUrl = import.meta.env.VITE_CUSTOMER_APP_URL

  let returnCustomerUrl: string | null = null
  try {
    returnCustomerUrl =
      new URL(window.location.href).searchParams.get("return_customer_url") ||
      window.location.hash.match(/[?&]return_customer_url=([^&]+)/)?.[1] ||
      localStorage.getItem("dart_customer_app_url")
    if (returnCustomerUrl?.includes("%")) {
      returnCustomerUrl = decodeURIComponent(returnCustomerUrl)
    }
  } catch {
    returnCustomerUrl = null
  }

  const baseUrl =
    configuredUrl ||
    (isLocal ? "http://localhost:8443" : returnCustomerUrl || window.location.origin)
  const destination = new URL(baseUrl, window.location.origin)
  const accessToken =
    localStorage.getItem("dart_rider_access_token") ||
    localStorage.getItem("dart_access_token")
  const refreshToken =
    localStorage.getItem("dart_rider_refresh_token") ||
    localStorage.getItem("dart_refresh_token")

  if (accessToken) {
    localStorage.setItem("dart_access_token", accessToken)
    const user = localStorage.getItem("dart_rider_user")
    if (user) localStorage.setItem("dart_user", user)
  }
  if (refreshToken) {
    localStorage.setItem("dart_refresh_token", refreshToken)
  }

  if (accessToken) destination.searchParams.set("sso_token", accessToken)
  if (refreshToken) destination.searchParams.set("sso_refresh", refreshToken)

  try {
    localStorage.setItem("dart_rider_app_url", window.location.origin)
  } catch {
    // Continue without persistence when storage is unavailable.
  }

  return destination.toString()
}
