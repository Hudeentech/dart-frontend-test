import React, { useState, useEffect } from "react"
import { X, Package, Check, ArrowRight, ShieldCheck } from "lucide-react"

interface LinkInboundModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (details: {
    trackingNumber: string
    courier: string
    itemName: string
  }) => void
}

const COURIERS = [
  { id: "dart", name: "Dart Express", icon: "⚡" },
  { id: "gig", name: "GIG Logistics", icon: "🚚" },
  { id: "dhl", name: "DHL Express", icon: "✈️" },
  { id: "fedex", name: "FedEx", icon: "📦" },
  { id: "speedaf", name: "Speedaf", icon: "🛵" },
]

export default function LinkInboundModal({
  isOpen,
  onClose,
  onSuccess,
}: LinkInboundModalProps) {
  const [trackingNumber, setTrackingNumber] = useState("")
  const [selectedCourier, setSelectedCourier] = useState("dart")
  const [itemName, setItemName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      setIsSuccess(false)
      setError("")
    } else {
      document.body.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNumber = trackingNumber.trim()
    if (!cleanNumber) {
      setError("Please enter a tracking or waybill number")
      return
    }

    setIsSubmitting(true)
    setError("")

    let verifiedTrackingNo = cleanNumber.toUpperCase()
    let detectedCourier =
      COURIERS.find((c) => c.id === selectedCourier)?.name || "Dart Express"
    let finalItemName = itemName.trim()

    try {
      // Query live tracking API at http://localhost:3000/api/track/
      const res = await fetch(
        `http://localhost:3000/api/track/${encodeURIComponent(cleanNumber)}`,
      )
      if (res.ok) {
        const result = await res.json()
        if (
          result?.success &&
          Array.isArray(result.data) &&
          result.data.length > 0
        ) {
          const item = result.data[0]
          if (item.mailNo) verifiedTrackingNo = item.mailNo
          if (item.courier) detectedCourier = item.courier

          if (Array.isArray(item.tracks) && item.tracks.length > 0) {
            const latestEvent = item.tracks[0]
            console.log(
              `[${latestEvent.time}] ${latestEvent.actionName}: ${latestEvent.msgEng}`,
            )
            if (!finalItemName && latestEvent.actionName) {
              finalItemName = `${latestEvent.actionName} (${verifiedTrackingNo})`
            }
          }
        }
      }
    } catch (err) {
      console.warn(
        "Could not reach http://localhost:3000/api/track/, proceeding with input ID:",
        err,
      )
    }

    setIsSubmitting(false)
    setIsSuccess(true)

    setTimeout(() => {
      onSuccess?.({
        trackingNumber: verifiedTrackingNo,
        courier: detectedCourier,
        itemName: finalItemName || "Inbound Shipment",
      })
      setIsSuccess(false)
      setTrackingNumber("")
      setItemName("")
      onClose()
    }, 1000)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Modal Container */}
      <div
        className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[28px] p-5 sm:p-7 border border-gray-100 dark:border-white/10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 ease-out transition-colors max-h-[92dvh] overflow-y-auto pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Pull Bar */}
        <div
          className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5 sm:hidden cursor-pointer"
          onClick={onClose}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-500/20 text-green-600 dark:text-green-400 flex items-center justify-center mb-4">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              Package Linked!
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
              Your inbound delivery has been added to your linked packages list.
            </p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-black flex items-center justify-center shrink-0 shadow-2xs">
                <Package className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                  Link Inbound Package
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Track deliveries sent to you from any courier
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* Courier Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Courier / Provider
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {COURIERS.map((c) => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => setSelectedCourier(c.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer truncate ${
                        selectedCourier === c.id
                          ? "bg-yellow-400/15 border-yellow-400 text-gray-900 dark:text-white font-bold"
                          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <span>{c.icon}</span>
                      <span className="truncate">{c.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tracking Number Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Tracking or Waybill Number *
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => {
                    setTrackingNumber(e.target.value)
                    if (error) setError("")
                  }}
                  placeholder="e.g. NG021358672334 or DART-8392"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 uppercase font-mono"
                  autoFocus
                />
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
              </div>

              {/* Item Description (Optional) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Item Description (Optional)
                </label>
                <input
                  type="text"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  placeholder="e.g. Sneakers from cousin, Laptop Charger"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50"
                />
              </div>

              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-white/5 text-xs text-gray-500 dark:text-gray-400">
                <ShieldCheck className="w-4 h-4 text-green-500 shrink-0" />
                <span>
                  Live status updates and courier rider info will sync
                  automatically.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 px-5 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Link Inbound Package</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
