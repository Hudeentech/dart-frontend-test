import { useEffect, useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useRider } from "../context/RiderContext"
import { useTheme } from "../context/ThemeContext"
import { walletApi } from "../api/account.api"
import { Card, Button, Badge, Sheet, Input } from "../components/ui"
import { JobCard } from "../components/AppShell"
import { IncomingRequestModal } from "../components/IncomingRequestModal"
import { navigate } from "../hooks/router"
import { useToast } from "../context/ToastContext"
import { formatNaira, fullName, formatAddress, STATUS_BUCKET, canAccept, riderEarning } from "../utils/format"
import {
  Bell,
  ArrowDown,
  ArrowRight,
  TrendingUp,
  Package,
  Layers,
  RefreshCw,
  Radio,
  Clock,
  CheckCircle2,
  Phone,
  MessageCircle,
  KeyRound,
  Zap,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  X,
} from "lucide-react"

export function HomePage() {
  const { user, riderProfile } = useAuth()
  const toast = useToast()
  const { resolvedTheme } = useTheme()
  const {
    isOnline,
    togglingStatus,
    setOnline,
    orders,
    acceptOrder,
    confirmDelivery,
    incomingModalOrder,
    setIncomingModalOrder,
    unreadCount,
    lastLocation,
    locationError,
  } = useRider()

  const [walletBalance, setWalletBalance] = useState<number>(130500)
  const [actionLoading, setActionLoading] = useState(false)

  // Handover confirmation modal
  const [handoverSheetOpen, setHandoverSheetOpen] = useState(false)
  const [handoverCode, setHandoverCode] = useState("")

  useEffect(() => {
    walletApi.get().then((w) => {
      if (w?.totalBalance != null) setWalletBalance(w.totalBalance)
    }).catch(() => {})
  }, [orders])

  // Partition orders
  const activeOrders = orders.filter((o) =>
    ["RIDER_ACCEPTED", "PICKUP_PENDING", "PICKED_UP", "IN_TRANSIT"].includes(o.status),
  )
  const pendingRequests = orders.filter((o) => canAccept(o.status))
  const completedOrders = orders.filter((o) => STATUS_BUCKET[o.status] === "completed")

  const currentJob = activeOrders[0] || null
  const topIncomingRequest = pendingRequests[0] || null

  const handleAcceptRequest = async (orderId: string) => {
    setActionLoading(true)
    try {
      await acceptOrder(orderId)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeclineRequest = (orderId: string) => {
    setIncomingModalOrder(null)
  }

  const handleSubmitHandoverCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentJob) return
    if (!handoverCode || handoverCode.trim().length !== 5) {
      toast("Please enter the 5-digit delivery handover code", "error")
      return
    }
    setActionLoading(true)
    try {
      await confirmDelivery(currentJob.id, handoverCode.trim())
      setHandoverSheetOpen(false)
      setHandoverCode("")
    } finally {
      setActionLoading(false)
    }
  }

  const riderFirstName = user?.firstName?.trim() || "Divine"
  const locationDisplay = (user as any)?.city
    ? `${(user as any).city}, ${(user as any).state || "Edo state"}`
    : "Auchi, Edo state"

  const completedCount = riderProfile?.totalDeliveries ?? completedOrders.length
  const pendingSettlement = activeOrders.reduce((sum, o) => sum + (Number(riderEarning(o)) || 0), 0)

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-24 md:pb-16 transition-colors">
      {/* 1. HERO HEADER AREA - Compound card with fluid transition and bottom status bar */}
      <div
        className={`w-full relative shrink-0 shadow-sm overflow-hidden rounded-b-[32px] sm:rounded-b-[42px] transition-all duration-700 ease-in-out ${
          isOnline ? "animate-gradient-flow" : ""
        }`}
        style={{
          background: isOnline
            ? resolvedTheme === "dark"
              ? "#ffffff"
              : "linear-gradient(110deg, #ffcc00 0%, #ffc000 45%, #ff9e00 80%, #ffcc00 100%)"
            : "linear-gradient(110deg, #dc2626 0%, #b91c1c 50%, #991b1b 100%)",
        }}
      >
        {/* Main Header Content - Inner curved panel: brand gradient yellow in dark theme, dark in light theme */}
        <div
          className={`relative isolate flex flex-col overflow-hidden text-white dark:text-black rounded-b-[30px] sm:rounded-b-[40px] px-4 sm:px-6 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-5 sm:pb-6 transition-colors duration-500 shadow-sm`}
          style={{
            background:
              resolvedTheme === "dark"
                ? "linear-gradient(to bottom, #FFA600 0%, #FFCC00 100%)"
                : "#151515",
          }}
        >
          {/* Sunburst Ray Pattern & Glow from Customer side: Soft wide fanned-out pattern visible */}
          <div
            className="absolute inset-0 pointer-events-none -z-10"
            style={{
              maskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.08) 18%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.85) 75%, rgba(0, 0, 0, 0.85) 100%)",
              WebkitMaskImage:
                "linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.08) 18%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.85) 75%, rgba(0, 0, 0, 0.85) 100%)",
              background:
                resolvedTheme === "dark"
                  ? `
                    radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.035) 45%, transparent 75%),
                    repeating-conic-gradient(
                      from -5deg at 50% 105%,
                      rgba(0, 0, 0, 0.035) 0deg,
                      rgba(0, 0, 0, 0.035) 10deg,
                      transparent 10deg,
                      transparent 20deg
                    )
                  `
                  : `
                    radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 40%, transparent 75%),
                    repeating-conic-gradient(
                      from -5deg at 50% 105%,
                      rgba(255, 255, 255, 0.028) 0deg,
                      rgba(255, 255, 255, 0.028) 10deg,
                      transparent 10deg,
                      transparent 20deg
                    )
                  `,
            }}
          />

          <div className="relative z-10 space-y-3 sm:space-y-4">
            {/* Top Greeting & Notifications Button */}
            <div className="flex items-start justify-between pt-1">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white dark:text-black flex items-center gap-1.5">
                  <span>👋🏾</span>
                  <span>Good morning {riderFirstName}</span>
                </h1>
                <p className="text-sm text-gray-400 dark:text-black/70 mt-0.5">{locationDisplay}</p>
              </div>

              <button
                id="btn-notifications"
                onClick={() => navigate("/notifications")}
                className="relative flex size-10 sm:size-11 items-center justify-center rounded-full bg-[#ffcc00] text-black shadow-md hover:bg-[#ffc000] active:scale-95 transition cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="size-5 fill-black stroke-[2.2]" />
                {unreadCount > 0 && (
                  <span className="absolute top-2 right-2 flex size-2.5">
                    <span className="animate-ping absolute inline-flex size-full rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex size-2.5 rounded-full bg-red-500 ring-2 ring-yellow-400" />
                  </span>
                )}
              </button>
            </div>

            {/* Growth Pill */}
            <div>
              <span className="inline-flex items-center justify-center rounded-full bg-[#167d08] text-white px-3 sm:px-4 py-1 text-[11px] sm:text-xs font-medium whitespace-nowrap shadow-xs">
                You're 25% up today
              </span>
            </div>

            {/* Balance Amount & Deposit Action */}
            <div className="flex items-end justify-between pt-1">
              <div>
                <div className="flex items-baseline whitespace-nowrap leading-none tabular-nums text-white dark:text-black">
                  <span className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mr-1">
                    ₦
                  </span>
                  <span className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                    {Number(walletBalance || 130500).toLocaleString("en-NG", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <span className="text-lg sm:text-2xl font-bold tracking-tight opacity-85 ml-0.5">
                    .00
                  </span>
                </div>
                <button
                  onClick={() => navigate("/transactions")}
                  className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-white/75 dark:text-black/75 hover:text-white dark:hover:text-black transition group cursor-pointer"
                >
                  <span>View History</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                </button>
              </div>

              <div className="flex flex-col items-center">
                <button
                  id="btn-deposit-wallet"
                  onClick={() => navigate("/earnings")}
                  className="flex size-11 sm:size-12 items-center justify-center rounded-full border border-[#363a3d] bg-[#222629]/95 text-[#fafafa] hover:bg-[#2b3033] hover:border-[#51565a] active:scale-95 transition shadow-xs cursor-pointer group"
                  title="Deposit / Top up"
                >
                  <span className="w-6 h-6 rounded-full bg-[#ffcc00] text-[#17191a] flex items-center justify-center shrink-0">
                    <ArrowDown className="size-3.5 stroke-[2.8]" />
                  </span>
                </button>
                <span className="text-xs font-semibold text-white/75 dark:text-black/75 mt-1.5">Deposit</span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. ATTACHED "YOU ARE ACTIVE" / "YOU ARE OFFLINE" BAR */}
        <button
          id="btn-toggle-active-status"
          onClick={() => setOnline(!isOnline)}
          disabled={togglingStatus}
          className={`w-full py-2.5 sm:py-3 px-4 flex items-center justify-center gap-2 text-xs sm:text-[13px] font-semibold transition-all duration-500 cursor-pointer active:opacity-90 touch-manipulation select-none ${
            isOnline
              ? "text-[#101820] dark:bg-white dark:text-black"
              : "text-white"
          }`}
          title={isOnline ? "Tap to go offline" : "Tap to go online"}
        >
          {/* Animated Hexagonal/Octagonal Icon */}
          <span className="relative flex items-center justify-center">
            {isOnline && (
              <span className="animate-ping absolute inline-flex size-3.5 rounded-full bg-black/20" />
            )}
            <svg
              className="size-4 shrink-0 stroke-[2.2] transition-transform duration-300"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <span className="tracking-tight transition-all duration-300">
            {isOnline ? "You are active" : "You are offline"}
          </span>
        </button>
      </div>

      <div className="flex-1 px-3.5 sm:px-8 md:px-10 py-5 sm:py-7 flex flex-col gap-6 sm:gap-8">

        {/* 3. METRICS CARDS: DELIVERIES COMPLETED & PENDING SETTLEMENT */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {/* Deliveries Completed */}
          <div
            onClick={() => navigate("/jobs")}
            className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/50 dark:hover:bg-yellow-400/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 text-center shadow-xs cursor-pointer hover:shadow-md transition active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-gray-900 dark:text-white">
              <Package className="size-5 stroke-[2] text-yellow-600 dark:text-yellow-400" />
              <span className="text-xl sm:text-2xl font-bold tracking-tight">{completedCount}</span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">Deliveries Completed</p>
          </div>

          {/* Pending Settlement */}
          <div
            onClick={() => navigate("/earnings")}
            className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/50 dark:hover:bg-yellow-400/5 border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 text-center shadow-xs cursor-pointer hover:shadow-md transition active:scale-[0.98]"
          >
            <div className="flex items-center justify-center gap-1.5 mb-1 text-gray-900 dark:text-white">
              <span className="text-base sm:text-lg">💼</span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">+{formatNaira(pendingSettlement)}</span>
            </div>
            <p className="text-[11px] sm:text-xs font-semibold text-gray-500 dark:text-gray-400">Pending Settlement</p>
          </div>
        </div>

        {/* 4. QUICK ACTION SECTION */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">Quick action</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Earnings */}
            <button
              onClick={() => navigate("/earnings")}
              className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/90 dark:hover:bg-yellow-400/10 border border-gray-100 dark:border-white/5 hover:border-yellow-400/60 dark:hover:border-yellow-400/40 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-3.5 shadow-xs hover:shadow-md transition text-left active:scale-[0.98] cursor-pointer"
            >
              <div className="size-11 sm:size-12 rounded-xl bg-yellow-400 flex items-center justify-center text-black shrink-0 font-bold shadow-xs">
                <span className="text-lg">₦</span>
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">Earnings</span>
            </button>

            {/* Available Order */}
            <button
              onClick={() => navigate("/jobs")}
              className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/90 dark:hover:bg-yellow-400/10 border border-gray-100 dark:border-white/5 hover:border-yellow-400/60 dark:hover:border-yellow-400/40 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-3.5 shadow-xs hover:shadow-md transition text-left active:scale-[0.98] cursor-pointer"
            >
              <div className="size-11 sm:size-12 rounded-xl bg-yellow-400 flex items-center justify-center text-black shrink-0 shadow-xs">
                <Layers className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">
                Available<br />Order
              </span>
            </button>

            {/* Performance */}
            <button
              onClick={() => navigate("/performance")}
              className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/90 dark:hover:bg-yellow-400/10 border border-gray-100 dark:border-white/5 hover:border-yellow-400/60 dark:hover:border-yellow-400/40 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-3.5 shadow-xs hover:shadow-md transition text-left active:scale-[0.98] cursor-pointer"
            >
              <div className="size-11 sm:size-12 rounded-xl bg-yellow-400 flex items-center justify-center text-black shrink-0 shadow-xs">
                <TrendingUp className="size-5 stroke-[2.2]" />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">Performance</span>
            </button>

            {/* On Duty Toggle */}
            <button
              onClick={() => setOnline(!isOnline)}
              disabled={togglingStatus}
              className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/90 dark:hover:bg-yellow-400/10 border border-gray-100 dark:border-white/5 hover:border-yellow-400/60 dark:hover:border-yellow-400/40 rounded-2xl p-3.5 sm:p-5 flex items-center gap-3 sm:gap-3.5 shadow-xs hover:shadow-md transition text-left active:scale-[0.98] cursor-pointer"
            >
              <div className="size-11 sm:size-12 rounded-xl bg-yellow-400 flex items-center justify-center text-black shrink-0 shadow-xs">
                <RefreshCw className={`size-5 stroke-[2.2] ${togglingStatus ? "animate-spin" : ""}`} />
              </div>
              <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight">On Duty</span>
            </button>
          </div>
        </div>

      {/* 5. INCOMING REQUEST WAITING CARD (Matches Image 1 exactly) */}
      {topIncomingRequest && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex size-2 rounded-full bg-yellow-400 animate-ping" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400">
                New Request Available
              </h2>
            </div>
            <span className="text-xs text-gray-500 dark:text-white/50">{pendingRequests.length} waiting</span>
          </div>

          {/* Incoming Request Card matching User Reference Image 1 */}
          <div className="bg-white dark:bg-[#18181b] rounded-3xl p-4 sm:p-5 border border-gray-100 dark:border-white/10 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-13 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-white/10 ring-2 ring-black/5">
                  <img
                    src={(topIncomingRequest.customer as any)?.profileImageUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop&crop=faces"}
                    alt="Customer"
                    className="size-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-base text-gray-900 dark:text-white truncate tracking-tight">
                    {[topIncomingRequest.customer?.firstName, topIncomingRequest.customer?.lastName].filter(Boolean).join(" ") || "Hudeen Danesi"}
                  </h3>
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wide truncate mt-0.5">
                    {topIncomingRequest.pickupAddress?.city || "AUCHI"} → {topIncomingRequest.destinationAddress?.city || "GIG TERMINAL"}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                  {formatNaira(riderEarning(topIncomingRequest) || topIncomingRequest.totalPrice || 2500)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleDeclineRequest(topIncomingRequest.id)}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#ff4d4f] hover:bg-[#ff3b30] text-white font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition cursor-pointer touch-manipulation"
              >
                <span>Decline order</span>
                <X className="size-4.5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => handleAcceptRequest(topIncomingRequest.id)}
                disabled={actionLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] transition cursor-pointer touch-manipulation"
              >
                <span>Accept order</span>
                <ArrowRight className="size-4.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. YOUR ACTIVE DELIVERY SECTION */}
      {currentJob && <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">Your Active Delivery</h2>
          <button
            onClick={() => currentJob ? navigate(`/jobs/${currentJob.id}`) : navigate("/jobs")}
            className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-4 decoration-gray-400 dark:decoration-gray-500 cursor-pointer"
          >
            View All
          </button>
        </div>

        {/* Active Delivery Card */}
          <div
            onClick={() => navigate(`/jobs/${currentJob.id}`)}
            className="bg-yellow-400 rounded-3xl p-5 sm:p-7 text-gray-950 shadow-md cursor-pointer hover:shadow-lg transition relative overflow-hidden group"
          >
            {/* Status Pill */}
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-block text-white text-[11px] font-bold px-3 py-1 rounded-full bg-[#e53935] uppercase tracking-wider mb-2">
                  {currentJob.status === "PICKUP_PENDING" ? "Pickup Pending" : "In-transit"}
                </span>

                <h3 className="text-xl sm:text-2xl font-bold text-gray-950 tracking-tight leading-snug">
                  {currentJob.package?.name || "Customer Package"}
                </h3>

                <p className="text-xs sm:text-sm font-medium text-gray-900/80 mt-0.5">
                  {currentJob.status === "PICKUP_PENDING"
                    ? `Pickup: ${formatAddress(currentJob.pickupAddress)}`
                    : `Drop-off: ${formatAddress(currentJob.destinationAddress)}`}
                </p>
              </div>

              <div className="size-10 rounded-full bg-black/10 flex items-center justify-center group-hover:bg-yellow-500 transition">
                <ArrowRight className="size-5 text-gray-950" />
              </div>
            </div>

            {/* Slider track indicator with yellow handle (matches customer card & mockup) */}
            <div className="mt-7 pt-1">
              <div className="relative flex items-center w-full h-5">
                {/* Left solid track */}
                <div
                  className="h-1.5 bg-gray-950 rounded-l-full"
                  style={{ width: currentJob.status === "PICKUP_PENDING" ? "25%" : "60%" }}
                />
                {/* Center yellow handle knob */}
                <div
                  className="size-4.5 rounded-full bg-yellow-400 border-[2.5px] border-gray-950 shadow-sm shrink-0 -mx-1 relative z-10"
                />
                {/* Right dashed / dotted track */}
                <div className="flex-1 border-b-2 border-dashed border-gray-950/50 h-0" />
              </div>

              {/* Terminal / Dropoff Labels */}
              <div className="flex items-center justify-between mt-2.5 text-xs font-semibold text-gray-900">
                <span className="truncate max-w-[45%]">
                  {currentJob.pickupAddress?.street ? currentJob.pickupAddress.street.split(",")[0] : "Pickup location"}
                </span>
                <span className="truncate max-w-[45%] text-right">
                  {currentJob.destinationAddress?.street ? currentJob.destinationAddress.street.split(",")[0] : "Drop-off"}
                </span>
              </div>
            </div>

            {/* Direct Workflow button inside card */}
            <div className="mt-5 pt-3.5 border-t border-black/10 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
              <div className="text-xs sm:text-sm text-gray-900/80 truncate">
                Earning: <span className="font-extrabold text-gray-950 text-sm sm:text-base">{formatNaira(riderEarning(currentJob) || currentJob.totalPrice)}</span>
              </div>

              {currentJob.status === "PICKUP_PENDING" ? (
                <Button
                  size="sm"
                  onClick={() => navigate(`/jobs/${currentJob.id}`)}
                  className="bg-gray-950 text-white hover:bg-black font-bold px-4"
                >
                  Continue pickup
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="success"
                  onClick={() => setHandoverSheetOpen(true)}
                  className="bg-emerald-700 text-white font-bold px-4"
                >
                  Enter Code
                </Button>
              )}
            </div>
          </div>
      </div>
      }
      </div>

      {/* Incoming Request Full Screen / Bottom Modal Sheet */}
      <IncomingRequestModal
        order={incomingModalOrder}
        isOpen={Boolean(incomingModalOrder)}
        onClose={() => setIncomingModalOrder(null)}
        onAccept={handleAcceptRequest}
        onDecline={handleDeclineRequest}
        loading={actionLoading}
      />

      {/* Handover Code Modal Sheet */}
      <Sheet
        open={handoverSheetOpen}
        onClose={() => setHandoverSheetOpen(false)}
        title="Complete Delivery Handover"
      >
        <form onSubmit={handleSubmitHandoverCode} className="space-y-4">
          <p className="text-xs text-gray-600 dark:text-white/60">
            Ask the recipient for their 5-digit confirmation code displayed on their Dart customer app to confirm package delivery and release payout.
          </p>

          <Input
            id="home-handover-code-input"
            label="5-Digit Handover Code"
            placeholder="e.g. 12345"
            maxLength={5}
            value={handoverCode}
            onChange={(e) => setHandoverCode(e.target.value.replace(/\D/g, ""))}
            className="text-center font-mono text-2xl tracking-widest font-bold"
            required
          />

          <Button id="btn-home-submit-handover" type="submit" block loading={actionLoading} variant="success">
            Verify Code & Complete Handover
          </Button>
        </form>
      </Sheet>
    </div>
  )
}
