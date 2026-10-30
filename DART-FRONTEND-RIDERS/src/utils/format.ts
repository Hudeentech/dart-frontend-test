import type { Money, Order, OrderStatus, VehicleType } from "../types/api.types"

export const toNumber = (v: Money | null | undefined) => {
  const n = typeof v === "string" ? parseFloat(v) : (v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export const formatNaira = (v: Money | null | undefined, opts: { decimals?: boolean } = {}) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: opts.decimals ? 2 : 0,
    maximumFractionDigits: opts.decimals ? 2 : 0,
  }).format(toNumber(v))

export const formatDateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : "—"

export const timeAgo = (iso?: string | null) => {
  if (!iso) return ""
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export const fullName = (u?: { firstName?: string | null; lastName?: string | null } | null, fallback = "Rider") =>
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") || fallback

export const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "R"

export const formatAddress = (a?: { street?: string; city?: string; state?: string } | null) =>
  a ? [a.street, a.city].filter(Boolean).join(", ") : "—"

export const VEHICLE_LABELS: Record<VehicleType, string> = {
  MOTORCYCLE: "Motorcycle",
  BICYCLE: "Bicycle",
  CAR: "Car",
  VAN: "Van",
}

/** Rider earning for an order: settlement net if settled, otherwise riderSettlementFee. */
export const riderEarning = (o: Order) =>
  o.settlement?.netAmount != null ? toNumber(o.settlement.netAmount) : toNumber(o.riderSettlementFee ?? 0)

// ----- Order status buckets from the rider's perspective -----

export type JobBucket = "requests" | "active" | "completed" | "closed"

export const STATUS_BUCKET: Record<OrderStatus, JobBucket> = {
  DRAFT: "closed",
  RIDER_REQUESTED: "requests",
  RIDER_SELECTED: "requests",
  PAYMENT_PENDING: "requests",
  PAYMENT_CONFIRMED: "requests",
  RIDER_ASSIGNED: "requests",
  RIDER_ACCEPTED: "active",
  PICKUP_PENDING: "active",
  PICKED_UP: "active",
  IN_TRANSIT: "active",
  DELIVERED: "active",
  CUSTOMER_CONFIRMED: "completed",
  SETTLED: "completed",
  CANCELLED: "closed",
  EXPIRED: "closed",
  FAILED: "closed",
  DISPUTED: "closed",
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  RIDER_REQUESTED: "Requested",
  RIDER_SELECTED: "Reserved · awaiting payment",
  PAYMENT_PENDING: "Awaiting payment",
  PAYMENT_CONFIRMED: "Paid · ready to accept",
  RIDER_ASSIGNED: "Assigned · accept now",
  RIDER_ACCEPTED: "Accepted",
  PICKUP_PENDING: "Pickup pending",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  CUSTOMER_CONFIRMED: "Confirmed",
  SETTLED: "Completed · paid",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
  FAILED: "Failed",
  DISPUTED: "Disputed",
}

export type Tone = "neutral" | "brand" | "info" | "success" | "warning" | "danger"

export const STATUS_TONE: Record<OrderStatus, Tone> = {
  DRAFT: "neutral",
  RIDER_REQUESTED: "info",
  RIDER_SELECTED: "info",
  PAYMENT_PENDING: "info",
  PAYMENT_CONFIRMED: "brand",
  RIDER_ASSIGNED: "brand",
  RIDER_ACCEPTED: "warning",
  PICKUP_PENDING: "warning",
  PICKED_UP: "warning",
  IN_TRANSIT: "warning",
  DELIVERED: "success",
  CUSTOMER_CONFIRMED: "success",
  SETTLED: "success",
  CANCELLED: "danger",
  EXPIRED: "neutral",
  FAILED: "danger",
  DISPUTED: "danger",
}

export const canAccept = (s: OrderStatus) => s === "RIDER_ASSIGNED" || s === "PAYMENT_CONFIRMED"
export const canPickup = (s: OrderStatus) => s === "PICKUP_PENDING"
export const canConfirmDelivery = (s: OrderStatus) => s === "PICKED_UP" || s === "IN_TRANSIT"
export const canCancel = (s: OrderStatus) =>
  !["PICKED_UP", "IN_TRANSIT", "DELIVERED", "CUSTOMER_CONFIRMED", "SETTLED", "CANCELLED", "EXPIRED", "FAILED"].includes(s)

/** Best-effort one-shot geolocation */
export const getCurrentPosition = (timeout = 8000): Promise<GeolocationCoordinates | null> =>
  new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null)
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p.coords),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30000 },
    )
  })
