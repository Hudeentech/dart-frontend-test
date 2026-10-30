import { useEffect, useState } from "react"
import { formatNaira, riderEarning } from "../utils/format"
import { playIncomingRequestChime } from "../utils/audio"
import { ArrowRight, X, Clock } from "lucide-react"
import type { Order } from "../types/api.types"

interface IncomingRequestModalProps {
  order: Order | null
  isOpen: boolean
  onClose: () => void
  onAccept: (orderId: string) => Promise<void>
  onDecline: (orderId: string) => void
  loading?: boolean
}

const TOTAL_COUNTDOWN_SECONDS = 45

export function IncomingRequestModal({
  order,
  isOpen,
  onClose,
  onAccept,
  onDecline,
  loading = false,
}: IncomingRequestModalProps) {
  const [timeLeft, setTimeLeft] = useState(TOTAL_COUNTDOWN_SECONDS)

  // Reset timer & play chime when modal opens
  useEffect(() => {
    if (isOpen && order) {
      setTimeLeft(TOTAL_COUNTDOWN_SECONDS)
      playIncomingRequestChime()

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            onDecline(order.id)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isOpen, order?.id])

  if (!order || !isOpen) return null

  const earning = riderEarning(order) || order.totalPrice || 2500
  const progressPercent = (timeLeft / TOTAL_COUNTDOWN_SECONDS) * 100

  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") ||
    "Hudeen Danesi"

  const customerAvatar =
    (order.customer as any)?.profileImageUrl ||
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces"

  const pickupLocation =
    order.pickupAddress?.city ||
    (order.pickupAddress?.street ? order.pickupAddress.street.split(",")[0] : "AUCHI")

  const dropoffLocation =
    order.destinationAddress?.city ||
    (order.destinationAddress?.street ? order.destinationAddress.street.split(",")[0] : "GIG TERMINAL")

  const routeDisplay = `${pickupLocation.toUpperCase()} → ${dropoffLocation.toUpperCase()}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      {/* Incoming Request Card - Exactly as shown in the user's reference image */}
      <div
        role="dialog"
        aria-label="Incoming Delivery Request"
        className="sheet-in w-full max-w-md rounded-3xl bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/10 p-5 sm:p-6 shadow-2xl space-y-5"
      >
        {/* Subtle Countdown Bar */}
        <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 pb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="size-2 rounded-full bg-yellow-400 animate-ping" />
            Incoming Delivery Request
          </span>
          <span className="flex items-center gap-1 font-mono font-bold text-gray-500 dark:text-gray-400">
            <Clock className="size-3" /> {timeLeft}s
          </span>
        </div>

        <div className="h-1 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-white/10">
          <div
            className="h-full bg-yellow-400 transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Top Info Row: Avatar + Name & Route + Price */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar */}
            <div className="size-13 sm:size-14 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-white/10 ring-2 ring-black/5">
              <img
                src={customerAvatar}
                alt={customerName}
                className="size-full object-cover"
              />
            </div>

            {/* Name & Route */}
            <div className="min-w-0">
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate tracking-tight">
                {customerName}
              </h3>
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide truncate mt-0.5">
                {routeDisplay}
              </p>
            </div>
          </div>

          {/* Large Bold Price */}
          <div className="text-right shrink-0">
            <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              {formatNaira(earning)}
            </p>
          </div>
        </div>

        {/* Action Buttons Row: Red Decline + Yellow Accept (Matching User Image 1:1) */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Decline Button */}
          <button
            id="btn-modal-decline"
            type="button"
            onClick={() => onDecline(order.id)}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#ff4d4f] hover:bg-[#ff3b30] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition cursor-pointer touch-manipulation"
          >
            <span>Decline order</span>
            <X className="size-4.5 stroke-[2.5]" />
          </button>

          {/* Accept Button */}
          <button
            id="btn-modal-accept"
            type="button"
            onClick={() => onAccept(order.id)}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition cursor-pointer touch-manipulation"
          >
            <span>Accept order</span>
            <ArrowRight className="size-4.5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  )
}
