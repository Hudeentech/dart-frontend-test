/**
 * Shared tracking helper utilities for API data formatting and status synchronization
 */

export interface TrackItem {
  mailNo?: string
  action?: string
  subAction?: string
  actionName?: string
  message?: string
  msgEng?: string
  msgLoc?: string
  time?: string
  timezone?: number
  receiverCountryCode?: string
  scanSource?: string
  payUrl?: string | null
  [key: string]: any
}

export interface ParcelTrackingData {
  mailNo: string
  tracks: TrackItem[]
  payUrl?: string
  [key: string]: any
}

/**
 * Clean up strings containing bracket encoding or question marks (?DC-BNI CENTRAL? -> DC-BNI CENTRAL)
 */
export function cleanTrackingText(text?: string | null): string {
  if (!text) return ""
  return text
    .replace(/[【】]/g, " ")
    .replace(/\?/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Detect courier carrier name from tracking ID format
 */
export function detectCourier(trackingId?: string): string {
  if (!trackingId) return "Dart Express"
  const id = trackingId.toUpperCase().trim()
  if (id.startsWith("NG")) return "SpeedAF Express"
  if (id.startsWith("SF")) return "SF Express"
  if (id.startsWith("DART")) return "Dart Express"
  if (id.startsWith("GIG")) return "GIG Logistics"
  if (id.startsWith("DHL")) return "DHL Express"
  if (id.startsWith("FEDEX")) return "FedEx"
  return "SpeedAF / Dart Express"
}

/**
 * Format raw tracking time string like "2026-09-13 08:49:50" to human friendly display
 */
export function formatTrackingTime(timeStr?: string | null): string {
  if (!timeStr) return "Recently"
  try {
    const parts = timeStr.trim().split(" ")
    if (parts.length >= 2) {
      const dateParts = parts[0].split("-")
      const timePart = parts[1]
      if (dateParts.length === 3) {
        const year = parseInt(dateParts[0], 10)
        const month = parseInt(dateParts[1], 10) - 1
        const day = parseInt(dateParts[2], 10)
        const [hourStr, minStr] = timePart.split(":")
        const hour = parseInt(hourStr, 10)
        const min = parseInt(minStr, 10)
        const dateObj = new Date(year, month, day, hour, min)
        if (!isNaN(dateObj.getTime())) {
          return (
            dateObj.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            }) +
            " • " +
            dateObj.toLocaleTimeString("en-US", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
            })
          )
        }
      }
    }
    return timeStr
  } catch {
    return timeStr
  }
}

/**
 * Derive high level delivery status from latest tracking actionName
 */
export function deriveStatusFromAction(
  actionName?: string | null,
): "In-Transit" | "Delivered" | "Cancelled" {
  if (!actionName) return "In-Transit"
  const act = actionName.toLowerCase()
  if (
    act.includes("deliver") ||
    act.includes("signed") ||
    act.includes("received") ||
    act.includes("completed")
  ) {
    return "Delivered"
  }
  if (
    act.includes("cancel") ||
    act.includes("reject") ||
    act.includes("fail")
  ) {
    return "Cancelled"
  }
  return "In-Transit"
}

/**
 * Fetch parcel tracking details from API endpoint http://localhost:3000/api/track/
 */
export async function fetchParcelTracking(
  waybillNo: string,
): Promise<{
  success: boolean
  data: ParcelTrackingData | null
  error: string | null
}> {
  const cleanId = waybillNo.trim()
  if (!cleanId) {
    return { success: false, data: null, error: "Empty tracking number" }
  }

  try {
    const res = await fetch(
      `http://localhost:3000/api/track/${encodeURIComponent(cleanId)}`,
    )
    if (!res.ok) {
      return { success: false, data: null, error: `HTTP ${res.status}` }
    }
    const json = await res.json()
    if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
      return { success: true, data: json.data[0], error: null }
    }
    return {
      success: false,
      data: null,
      error: json?.error || "No tracking records found",
    }
  } catch (err: any) {
    return {
      success: false,
      data: null,
      error: err?.message || "Failed to fetch from tracking API",
    }
  }
}
