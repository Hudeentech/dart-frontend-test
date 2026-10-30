import { useCallback, useEffect, useState } from "react"

/**
 * Minimal hash router: `#/jobs/abc` -> { path: "/jobs/abc", segments: ["jobs","abc"] }
 * Kept dependency-free so it can be swapped for react-router later if needed.
 */
const parse = () => {
  const raw = window.location.hash.replace(/^#/, "") || "/"
  const [pathPart, queryPart = ""] = raw.split("?")
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`
  return {
    path,
    segments: path.split("/").filter(Boolean),
    query: new URLSearchParams(queryPart),
  }
}

export function navigate(to: string, opts: { replace?: boolean } = {}) {
  const hash = `#${to.startsWith("/") ? to : `/${to}`}`
  if (opts.replace) window.location.replace(hash)
  else window.location.hash = hash
}

export function goBack(fallback = "/") {
  if (window.history.length > 1) window.history.back()
  else navigate(fallback, { replace: true })
}

export function useHashRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setRoute(parse())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener("hashchange", onChange)
    return () => window.removeEventListener("hashchange", onChange)
  }, [])
  return route
}

/** Small data-loading hook with refresh + error state */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError(null)
    try {
      const result = await fn()
      setData(result)
      return result
    } catch (e: any) {
      setError(e?.message || "Failed to load")
      return null
    } finally {
      setLoading(false)
    }
  }, deps)

  useEffect(() => {
    run()
  }, [run])

  return { data, setData, error, loading, reload: run }
}
