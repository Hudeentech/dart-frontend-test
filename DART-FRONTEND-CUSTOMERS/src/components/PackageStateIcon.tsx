import React from "react"
import boxStateDelivered from "../assets/Good-box.svg"
import boxStateReady from "../assets/empty-state-box.svg"
import boxStateSearching from "../assets/loading-box.svg"
import boxStateCancelled from "../assets/cancelled-box.svg"

// Backwards compatibility aliases
const boxStateTransit = boxStateSearching
const boxStatePending = boxStateSearching

export {
  boxStateDelivered,
  boxStateReady,
  boxStatePending,
  boxStateSearching,
  boxStateTransit,
  boxStateCancelled,
}

export type PackageStatusType = "Delivered" | "Completed" | "Ready for pickup" | "Arrived" | "In-Transit" | "Pending" | "Processing" | "Cancelled" | "Failed" | "Linked" | "Inbound" | "Searching" | string

export function getPackageStateIcon(status?: PackageStatusType): string {
  if (!status) return boxStateTransit

  const normalized = status.toLowerCase().trim()

  // Searching / Loading states
  if (normalized.includes("search") || normalized.includes("load")) {
    return boxStateSearching
  }

  // Delivered / Completed
  if (
    normalized.includes("deliver") ||
    normalized.includes("complet") ||
    normalized.includes("success")
  ) {
    return boxStateDelivered
  }

  // Ready / Arrived
  if (
    normalized.includes("ready") ||
    normalized.includes("arriv") ||
    normalized.includes("pickup")
  ) {
    return boxStateReady
  }

  // Cancelled / Failed
  if (
    normalized.includes("cancel") ||
    normalized.includes("fail") ||
    normalized.includes("reject")
  ) {
    return boxStateCancelled
  }

  // In-transit
  if (
    normalized.includes("transit") ||
    normalized.includes("shipped") ||
    normalized.includes("way")
  ) {
    return boxStateTransit
  }

  // Pending
  if (
    normalized.includes("pend") ||
    normalized.includes("process") ||
    normalized.includes("order")
  ) {
    return boxStateTransit
  }

  return boxStateTransit
}

interface PackageStateIconProps {
  status?: PackageStatusType
  className?: string
  alt?: string
}

export default function PackageStateIcon({
  status,
  className = "w-10 h-10 object-contain",
  alt,
}: PackageStateIconProps) {
  const iconSrc = getPackageStateIcon(status)

  return (
    <img
      src={iconSrc}
      alt={alt || `${status || "Package"} status`}
      className={`select-none shrink-0 ${className}`}
      loading="lazy"
    />
  )
}
