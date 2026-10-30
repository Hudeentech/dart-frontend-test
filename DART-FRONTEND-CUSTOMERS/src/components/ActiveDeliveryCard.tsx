import { useEffect, useState } from "react"
import { Check, Copy } from "lucide-react"
import { ordersApi } from "../api/orders.api"
import type { OrderStatus } from "../types/api.types"

interface ActiveDeliveryCardProps {
  orderId?: string
  title: string
  status: string
  orderStatus?: OrderStatus
  fromLocation?: string
  toLocation?: string
  date?: string
  onClick?: () => void
}

interface LiveStatus {
  etaSeconds?: number | null
  etaTarget?: "PICKUP" | "DESTINATION" | null
  rider?: {
    distanceKm?: number | null
  }
}

function isInTransit(status?: OrderStatus) {
  return status === "PICKED_UP" || status === "IN_TRANSIT"
}

export default function ActiveDeliveryCard({
  orderId,
  title,
  status,
  orderStatus,
  fromLocation,
  toLocation,
  date,
  onClick,
}: ActiveDeliveryCardProps) {
  const [handoverCode, setHandoverCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [etaDeadline, setEtaDeadline] = useState<number | null>(null)
  const [etaTarget, setEtaTarget] = useState<LiveStatus["etaTarget"]>(null)
  const [etaDistance, setEtaDistance] = useState<number | null>(null)
  const [clock, setClock] = useState(() => Date.now())

  useEffect(() => {
    if (!orderId || !isInTransit(orderStatus)) {
      setHandoverCode(null)
      return
    }

    let active = true
    ordersApi
      .getHandoverCode(orderId)
      .then(({ code }) => {
        if (active) setHandoverCode(code)
      })
      .catch((error) => {
        console.warn("[ActiveDeliveryCard] Handover code unavailable:", error)
      })

    return () => {
      active = false
    }
  }, [orderId, orderStatus])

  useEffect(() => {
    if (!orderId || !isInTransit(orderStatus)) {
      setEtaDeadline(null)
      setEtaTarget(null)
      setEtaDistance(null)
      return
    }

    let active = true
    const refreshEta = async () => {
      try {
        const live: LiveStatus = await ordersApi.getLiveStatus(orderId)
        if (!active || typeof live?.etaSeconds !== "number") return

        const now = Date.now()
        const remaining = etaDeadline === null
          ? null
          : Math.max(0, Math.ceil((etaDeadline - now) / 1000))
        const targetChanged = etaTarget !== live.etaTarget
        const distance = live.rider?.distanceKm
        const distanceChanged =
          typeof distance === "number" &&
          (etaDistance === null || Math.abs(etaDistance - distance) >= 0.05)
        const estimateChanged =
          remaining === null || Math.abs(remaining - live.etaSeconds) >= 20

        if (targetChanged || distanceChanged || estimateChanged) {
          setEtaDeadline(now + Math.max(0, live.etaSeconds) * 1000)
        }
        if (targetChanged) setEtaTarget(live.etaTarget)
        if (typeof distance === "number" && (targetChanged || distanceChanged)) {
          setEtaDistance(distance)
        }
      } catch (error) {
        console.warn("[ActiveDeliveryCard] Live ETA refresh failed:", error)
      }
    }

    void refreshEta()
    const poll = window.setInterval(() => void refreshEta(), 15000)
    return () => {
      active = false
      window.clearInterval(poll)
    }
  }, [orderId, orderStatus, etaDeadline, etaDistance, etaTarget])

  useEffect(() => {
    if (etaDeadline === null) return
    const timer = window.setInterval(() => setClock(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [etaDeadline])

  const remainingSeconds =
    etaDeadline === null ? null : Math.max(0, Math.ceil((etaDeadline - clock) / 1000))
  const etaCountdown =
    remainingSeconds === null
      ? null
      : remainingSeconds >= 3600
        ? `${Math.floor(remainingSeconds / 3600)}h ${Math.floor((remainingSeconds % 3600) / 60)}m`
        : `${Math.ceil(remainingSeconds / 60)} min`
  const etaTime =
    etaDeadline === null
      ? null
      : new Date(etaDeadline).toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
  const todayLabel = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(clock))
  const deliveryDate = date === todayLabel ? "Today" : date || "Delivery in progress"

  const copyCode = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    if (!handoverCode) return
    try {
      await navigator.clipboard.writeText(handoverCode)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.warn("[ActiveDeliveryCard] Could not copy handover code:", error)
    }
  }

  return (
    <article
      onClick={onClick}
      onKeyDown={(event) => {
        if (onClick && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault()
          onClick()
        }
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#ffdf55] via-[#ffd62e] to-[#ffc800] p-4 text-gray-950 shadow-sm sm:p-5 ${
        onClick ? "cursor-pointer transition hover:shadow-md active:scale-[0.995]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="mb-1.5 inline-flex rounded-full bg-[#f04444] px-2.5 py-1 text-[10px] font-semibold uppercase leading-none text-white">
            {status}
          </span>
          <h3 className="truncate text-lg font-bold leading-tight sm:text-xl">{title}</h3>
          <p className="mt-1 text-sm font-medium text-gray-800/75">
            Delivering: {deliveryDate}
            {etaTime && <> • ETA {etaTime}</>}
          </p>
        </div>

        {handoverCode && (
          <div className="shrink-0 text-center">
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1 rounded-lg bg-gray-950 px-2 py-1.5 font-mono text-xs font-bold tracking-wide text-white transition hover:bg-gray-800"
              aria-label="Copy drop-off code"
              title="Copy drop-off code"
            >
              {handoverCode}
              {copied ? <Check className="size-3.5 text-emerald-300" /> : <Copy className="size-3.5" />}
            </button>
            <span className="mt-1 block text-[9px] font-medium leading-none text-gray-800/75">Drop-off Code</span>
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="relative flex h-4 items-center">
          <div className="absolute inset-y-1/2 left-0 right-0 -translate-y-1/2 border-t-2 border-dashed border-gray-900/70" />
          <div className="absolute inset-y-1/2 left-0 h-1.5 w-[52%] -translate-y-1/2 rounded-full bg-gray-950" />
          {etaCountdown && (
            <span className="absolute left-[52%] z-[1] -translate-x-1/2 rounded-full border border-gray-950 bg-[#ffcf00] px-2 py-0.5 text-[10px] font-bold leading-none">
              {etaCountdown}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between gap-3 text-xs font-medium text-gray-800">
          <span className="min-w-0 truncate">{fromLocation || "Pickup"}</span>
          <span className="min-w-0 truncate text-right">{toLocation || "Me"}</span>
        </div>
      </div>
    </article>
  )
}
