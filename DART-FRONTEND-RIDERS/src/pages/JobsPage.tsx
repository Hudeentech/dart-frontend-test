import { useState } from "react"
import { useRider } from "../context/RiderContext"
import { canAccept, formatNaira, STATUS_BUCKET } from "../utils/format"
import { goBack, navigate } from "../hooks/router"
import { ArrowLeft, Bell, RefreshCw, Inbox, CheckCircle2 } from "lucide-react"
import type { Order } from "../types/api.types"

// Package image assets matching screenshot
import nikeShoeImg from "../assets/nike_air_max_shoe.jpg"
import googlePixelImg from "../assets/google_pixel_photo.jpg"
import iphoneImg from "../assets/iphone_12_pro.jpg"

type TabKey = "available" | "active" | "history"

export function JobsPage() {
  const {
    orders,
    ordersLoading,
    reloadOrders,
    isOnline,
    setOnline,
    togglingStatus,
    acceptOrder,
    incomingModalOrder,
    setIncomingModalOrder,
  } = useRider()

  const [activeTab, setActiveTab] = useState<TabKey>("available")
  const [refreshing, setRefreshing] = useState(false)
  const [acceptingId, setAcceptingId] = useState<string | null>(null)

  const handleRefresh = async () => {
    setRefreshing(true)
    await reloadOrders()
    setRefreshing(false)
  }

  const handleAccept = async (orderId: string) => {
    try {
      setAcceptingId(orderId)
      await acceptOrder(orderId)
      navigate(`/jobs/${orderId}`)
    } catch {
      // toast is handled in RiderContext
    } finally {
      setAcceptingId(null)
    }
  }

  // Filter orders
  const availableOrders = orders.filter((o) => canAccept(o.status))
  const incomingAvailableOrder = availableOrders.find((o) => o.id === incomingModalOrder?.id)
  const activeOrders = orders.filter((o) => STATUS_BUCKET[o.status] === "active")
  const historyOrders = orders.filter(
    (o) => STATUS_BUCKET[o.status] === "completed" || STATUS_BUCKET[o.status] === "closed"
  )

  // Smart image resolver matching the screenshot
  const getPackageImage = (order: Order, index: number) => {
    if (order.package?.photoUrl) return order.package.photoUrl
    const name = (order.package?.name || "").toLowerCase()
    if (name.includes("nike") || name.includes("shoe") || name.includes("sneaker") || name.includes("footwear")) {
      return nikeShoeImg
    }
    if (
      name.includes("pixel") ||
      name.includes("google") ||
      name.includes("phone") ||
      name.includes("samsung") ||
      name.includes("device")
    ) {
      return googlePixelImg
    }
    if (name.includes("iphone") || name.includes("apple") || name.includes("mac") || name.includes("laptop")) {
      return iphoneImg
    }
    const fallbacks = [nikeShoeImg, googlePixelImg, iphoneImg]
    return fallbacks[index % fallbacks.length]
  }

  // Estimate minutes string
  const getEtaString = (order: Order) => {
    if (order.estimatedMinutes) return `${order.estimatedMinutes} mins away`
    if (order.distanceKm) return `${Math.max(3, Math.round(order.distanceKm * 2.5))} mins away`
    return "3 mins away"
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-24 md:pb-16 transition-colors">
      <div className="w-full max-w-3xl lg:max-w-4xl mx-auto flex-1 flex flex-col px-3.5 sm:px-6 md:px-8 py-3 sm:py-5 space-y-5">
        {/* Top Header Bar matching Screenshot & Responsive Desktop */}
        <header className="flex items-center justify-between py-1">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                goBack()
              } else {
                navigate("/")
              }
            }}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition cursor-pointer text-gray-800 dark:text-gray-100"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            {activeTab === "available"
              ? "Available orders"
              : activeTab === "active"
              ? "Active Deliveries"
              : "Order History"}
          </h1>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition cursor-pointer text-gray-600 dark:text-gray-300"
              title="Refresh orders"
              aria-label="Refresh orders"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-amber-500" : ""}`} />
            </button>

            {/* Bell Icon Button (hidden on desktop per desktop layout rules) */}
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer md:hidden"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Online Status Banner matching Screenshot */}
        <div className="bg-[#FFF9E6] dark:bg-amber-400/10 border border-[#FDE68A]/80 dark:border-amber-400/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-3.5 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative flex items-center justify-center shrink-0">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOnline
                    ? "bg-[#FFCC00] shadow-[0_0_8px_rgba(255,204,0,0.9)]"
                    : "bg-gray-400"
                }`}
              />
              {isOnline && (
                <span className="absolute w-4 h-4 rounded-full bg-[#FFCC00]/40 animate-ping" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                {isOnline ? "You are online" : "You are offline"}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                {isOnline
                  ? `${availableOrders.length} Delivery ${
                      availableOrders.length === 1 ? "order" : "orders"
                    } near you`
                  : "Go online to receive nearby delivery orders"}
              </p>
            </div>
          </div>

          {!isOnline && (
            <button
              type="button"
              onClick={() => setOnline(true)}
              disabled={togglingStatus}
              className="bg-[#FFCC00] hover:bg-yellow-400 active:scale-95 text-black font-semibold text-xs sm:text-sm px-4 py-2 rounded-full transition shadow-xs cursor-pointer shrink-0 disabled:opacity-50"
            >
              {togglingStatus ? "..." : "Go Online"}
            </button>
          )}
        </div>

        {activeTab === "available" && incomingAvailableOrder && (
          <section
            aria-live="polite"
            className="flex items-center justify-between gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 shadow-xs dark:border-amber-400/20 dark:bg-amber-400/10"
          >
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFCC00] text-black">
                <Bell className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white">
                  New delivery request
                </p>
                <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">
                  {incomingAvailableOrder.package?.name || "Package delivery"} from{" "}
                  {incomingAvailableOrder.customer?.firstName || "Customer"} is ready to accept.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(`/jobs/${incomingAvailableOrder.id}`)}
                className="rounded-full bg-[#FFCC00] px-4 py-2 text-xs font-semibold text-black transition hover:bg-yellow-400"
              >
                View order
              </button>
              <button
                type="button"
                onClick={() => setIncomingModalOrder(null)}
                aria-label="Dismiss new order notification"
                className="rounded-full p-2 text-gray-500 transition hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10"
              >
                ×
              </button>
            </div>
          </section>
        )}

        {/* Segmented Switcher for Available / Active / History */}
        <div className="flex items-center justify-between bg-gray-100/80 dark:bg-white/5 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "available"
                ? "bg-white dark:bg-[#1f1f23] text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Available ({availableOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "active"
                ? "bg-white dark:bg-[#1f1f23] text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Active ({activeOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer text-center ${
              activeTab === "history"
                ? "bg-white dark:bg-[#1f1f23] text-gray-900 dark:text-white shadow-xs"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            History ({historyOrders.length})
          </button>
        </div>

        {/* Main Orders List filling full available height */}
        <div className="flex-1 flex flex-col pt-1">
          {ordersLoading && orders.length === 0 ? (
            <div className="space-y-3.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#161618] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 animate-pulse flex items-center gap-3.5 sm:gap-4"
                >
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/3" />
                  </div>
                  <div className="w-20 h-9 rounded-full bg-gray-200 dark:bg-white/10 shrink-0" />
                </div>
              ))}
            </div>
          ) : activeTab === "available" && availableOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#161618] rounded-2xl p-8 sm:p-12 border border-gray-100 dark:border-white/5 text-center space-y-3.5 shadow-2xs min-h-[300px]">
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-yellow-400/10 text-amber-500 flex items-center justify-center mx-auto">
                <Inbox className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">
                  No available orders right now
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                  Stay online. When customers place orders in your delivery zone, they will appear here automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRefresh}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 transition cursor-pointer text-gray-700 dark:text-gray-200"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                Check for new orders
              </button>
            </div>
          ) : activeTab === "active" && activeOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#161618] rounded-2xl p-8 sm:p-12 border border-gray-100 dark:border-white/5 text-center space-y-3.5 shadow-2xs min-h-[300px]">
              <div className="w-14 h-14 rounded-full bg-blue-50 dark:bg-blue-400/10 text-blue-500 flex items-center justify-center mx-auto">
                <Inbox className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">
                  No active deliveries
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                  Accept an incoming order from the Available tab to start a delivery run.
                </p>
              </div>
            </div>
          ) : activeTab === "history" && historyOrders.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white dark:bg-[#161618] rounded-2xl p-8 sm:p-12 border border-gray-100 dark:border-white/5 text-center space-y-3.5 shadow-2xs min-h-[300px]">
              <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-400/10 text-emerald-500 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base sm:text-lg">
                  No completed jobs yet
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                  Completed and settled deliveries will be listed here for your records.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3.5 flex-1">
              {(activeTab === "available"
                ? availableOrders
                : activeTab === "active"
                ? activeOrders
                : historyOrders
              ).map((order, idx) => {
                const isAvailable = canAccept(order.status)
                const isAcceptingThis = acceptingId === order.id
                const price = order.riderSettlementFee || order.totalPrice

                return (
                  <div
                    key={order.id}
                    className="bg-white dark:bg-[#161618] rounded-2xl p-3.5 sm:p-4 md:p-5 border border-gray-100 dark:border-white/5 shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3.5 sm:gap-4 group"
                  >
                    {/* Left: Package Image */}
                    <div
                      onClick={() => navigate(`/jobs/${order.id}`)}
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-center cursor-pointer"
                    >
                      <img
                        src={getPackageImage(order, idx)}
                        alt={order.package?.name || "Delivery package"}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          ;(e.target as HTMLImageElement).src = nikeShoeImg
                        }}
                      />
                    </div>

                    {/* Middle: Order Details */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/jobs/${order.id}`)}
                    >
                      {/* Row 1: Title + Verified Badge */}
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                          {order.package?.name || "Package Delivery"}
                        </span>
                        {/* Green verified shield icon matching screenshot */}
                        <svg
                          className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500 shrink-0 inline"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-label="Verified Package"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <path d="m9 12 2 2 4-4" />
                        </svg>
                      </div>

                      {/* Row 2: ETA and Price */}
                      <div className="flex items-center justify-between mt-1 text-xs sm:text-sm">
                        <span className="text-gray-500 dark:text-gray-400">
                          {getEtaString(order)}
                        </span>
                        <span className="font-bold text-gray-900 dark:text-white">
                          {formatNaira(price)}
                        </span>
                      </div>

                      {/* Row 3: Pickup City » Destination City */}
                      <div className="flex items-center gap-2 mt-1.5 text-xs sm:text-sm text-gray-600 dark:text-gray-300 font-medium">
                        <span className="truncate">{order.pickupAddress?.city || "Auchi"}</span>
                        <span className="text-gray-400 font-bold shrink-0">»</span>
                        <span className="truncate">{order.destinationAddress?.city || "Benin"}</span>
                      </div>
                    </div>

                    {/* Right: Accept Button or Status Action */}
                    <div className="shrink-0">
                      {isAvailable ? (
                        <button
                          type="button"
                          onClick={() => handleAccept(order.id)}
                          disabled={Boolean(acceptingId)}
                          className="bg-[#FFCC00] hover:bg-yellow-400 active:scale-95 disabled:opacity-50 text-black font-semibold text-xs sm:text-sm px-5 py-2.5 sm:px-6 sm:py-3 rounded-full transition shadow-xs cursor-pointer"
                        >
                          {isAcceptingThis ? (
                            <span className="flex items-center gap-1.5">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Accepting...
                            </span>
                          ) : (
                            "Accept"
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => navigate(`/jobs/${order.id}`)}
                          className="bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/15 active:scale-95 text-gray-800 dark:text-white font-medium text-xs sm:text-sm px-4 py-2 sm:px-5 sm:py-2.5 rounded-full transition cursor-pointer"
                        >
                          {order.status === "PICKUP_PENDING"
                            ? "Pickup"
                            : order.status === "PICKED_UP" || order.status === "IN_TRANSIT"
                            ? "Deliver"
                            : "View"}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
