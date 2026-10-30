import { useState, useEffect, useMemo } from "react"
import {
  ArrowLeft,
  Search,
  Package,
  RefreshCw,
  Plus,
} from "lucide-react"
import { DeliveryDetailsItem } from "./DeliveryDetails"
import ActiveDeliveryCard from "../components/ActiveDeliveryCard"
import { ordersApi } from "../api/orders.api"
import { packagesApi } from "../api/packages.api"

interface CurrentDeliveriesProps {
  onBack: () => void
  onOpenNotifications?: () => void
  onTrackLive: (item?: DeliveryDetailsItem) => void
  onSelectDelivery?: (item: DeliveryDetailsItem) => void
  onSendPackage?: () => void
  onReceivePackage?: () => void
}

export default function CurrentDeliveries({
  onBack,
  onOpenNotifications,
  onTrackLive,
  onSelectDelivery,
  onSendPackage,
  onReceivePackage,
}: CurrentDeliveriesProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [deliveryFilter, setDeliveryFilter] = useState<"direct" | "inbound">("direct")
  const [isLoading, setIsLoading] = useState(false)
  const [apiOrders, setApiOrders] = useState<DeliveryDetailsItem[]>([])

  // Clean initial pending deliveries (empty for real testing)
  const initialPendingDeliveries: DeliveryDetailsItem[] = useMemo(() => [], [])

  // Fetch live orders and inbound shipments from backend
  const fetchOrders = async () => {
    try {
      setIsLoading(true)
      const [userOrdersRes, inboundRes] = await Promise.allSettled([
        ordersApi.listOrders(),
        packagesApi.listInboundPackages(),
      ])

      const mappedOrders: DeliveryDetailsItem[] =
        userOrdersRes.status === "fulfilled" && userOrdersRes.value?.length > 0
          ? userOrdersRes.value
              .filter((ord) =>
                [
                  "PENDING",
                  "DRAFT",
                  "RIDER_REQUESTED",
                  "RIDER_SELECTED",
                  "PAYMENT_PENDING",
                  "PAYMENT_CONFIRMED",
                  "RIDER_ASSIGNED",
                  "RIDER_ACCEPTED",
                  "PICKUP_PENDING",
                  "PICKED_UP",
                  "IN_TRANSIT",
                ].includes(ord.status),
              )
              .map((ord) => ({
                id: ord.id,
                title: ord.package?.name || "Delivery Package",
                trackingCode: ord.trackingId,
                image: ord.package?.photoUrl || undefined,
                rider: ord.rider
                  ? {
                      name: `${ord.rider.firstName || ""} ${ord.rider.lastName || ""}`.trim() || "Assigned Rider",
                      idCode: ord.rider.id,
                      avatar: ord.rider.profileImageUrl || "",
                      rating: ord.rider.riderProfile?.averageRating || 0,
                      reviewCount: ord.rider.riderProfile?.totalDeliveries || 0,
                      price: ord.totalPrice ? `₦${Number(ord.totalPrice).toLocaleString()}` : "",
                      plateNumber: ord.rider.riderProfile?.plateNumber || undefined,
                    }
                  : undefined,
                store: "DART Express",
                status:
                  ["RIDER_ACCEPTED", "PICKUP_PENDING", "PICKED_UP", "IN_TRANSIT"].includes(ord.status)
                    ? "In-Transit"
                    : "Pending",
                orderStatus: ord.status,
                estimatedMinutes: ord.estimatedMinutes,
                fromLocation: ord.pickupAddress
                  ? `${ord.pickupAddress.street}, ${ord.pickupAddress.city}`
                  : "Pickup Location",
                toLocation: ord.destinationAddress
                  ? `${ord.destinationAddress.street}, ${ord.destinationAddress.city}`
                  : "Drop-off Location",
                date: new Date(ord.createdAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
                time: new Date(ord.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                weight: ord.package?.weightKg ? `${ord.package.weightKg} kg` : "Standard",
                category: ord.package?.category || "PARCEL",
                courier: "DART Rider",
                fragileNote: ord.package?.isFragile
                  ? "Fragile item - Handle with care"
                  : undefined,
              }))
          : []

      const mappedInbound: DeliveryDetailsItem[] =
        inboundRes.status === "fulfilled" && inboundRes.value?.length > 0
          ? inboundRes.value
              .filter(
                (pkg) =>
                  pkg.status === "In-Transit" ||
                  pkg.status === "Ready for pickup",
              )
              .map((pkg) => ({
                id: pkg.id,
                title: pkg.title,
                store: pkg.store || pkg.courier,
                status: pkg.status,
                fromLocation: pkg.fromLocation,
                toLocation: pkg.toLocation,
                date: pkg.shippedDate || "Recently",
                time: "",
                weight: "Medium",
                category: pkg.category,
                isInbound: true,
                courier: pkg.courier,
                isArrived: pkg.isArrived,
                arrivedDate: pkg.arrivedDate,
                pickupTerminal: pkg.pickupTerminal,
                tracks: pkg.tracks,
                payUrl: pkg.payUrl,
              }))
          : []

      setApiOrders([...mappedOrders, ...mappedInbound])
    } catch (err) {
      console.warn("[CurrentDeliveries] Orders fetch note:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // Combine static and API pending deliveries
  const allPendingDeliveries = useMemo(() => {
    const combined = [...initialPendingDeliveries, ...apiOrders]
    const seen = new Set<string>()
    return combined.filter((item) => {
      if (!item.id || seen.has(item.id)) return false
      seen.add(item.id)
      return true
    })
  }, [initialPendingDeliveries, apiOrders])

  // Filter based on tab and search
  const filteredDeliveries = useMemo(() => {
    return allPendingDeliveries.filter((item) => {
      if (deliveryFilter === "inbound" && !item.isInbound) return false
      if (deliveryFilter === "direct" && item.isInbound) return false

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchesTitle = item.title?.toLowerCase().includes(query)
        const matchesStore = item.store?.toLowerCase().includes(query)
        const matchesCourier = item.courier?.toLowerCase().includes(query)
        const matchesLocation =
          item.fromLocation?.toLowerCase().includes(query) ||
          item.toLocation?.toLowerCase().includes(query)
        return matchesTitle || matchesStore || matchesCourier || matchesLocation
      }

      return true
    })
  }, [allPendingDeliveries, deliveryFilter, searchQuery])

  const primaryDelivery = filteredDeliveries.find(
    (delivery) => delivery.status === "In-Transit",
  )
  const pendingRequestDeliveries = filteredDeliveries.filter(
    (delivery) => delivery.id !== primaryDelivery?.id,
  )

  return (
    <div className="w-full flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] animate-in fade-in duration-200 relative">
      {/* Top Header */}
      <header className="px-4 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-white/95 dark:bg-[#161618]/95 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100 dark:border-white/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 -ml-1 sm:ml-0 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              Pending Deliveries
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
              All active shipments, dispatches, and incoming packages
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchOrders}
            className={`w-9 h-9 rounded-full flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer ${
              isLoading ? "animate-spin" : ""
            }`}
            title="Refresh deliveries"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {onSendPackage && (
            <button
              type="button"
              onClick={onSendPackage}
              className="flex size-11 items-center justify-center rounded-2xl bg-yellow-300 text-gray-950 transition hover:bg-yellow-400"
              title="Send a package"
            >
              <Plus className="size-5 stroke-[2.4]" />
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-5 max-w-5xl mx-auto w-full space-y-6 pb-20">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4.5 h-4.5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search package"
            className="w-full rounded-2xl border border-gray-100 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 shadow-2xs transition-all placeholder:text-gray-300 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/30 dark:border-white/10 dark:bg-[#161618] dark:text-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex w-full items-center rounded-full border border-gray-100 bg-gray-50 p-1 dark:border-white/5 dark:bg-white/5">
          {(["direct", "inbound"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setDeliveryFilter(filter)}
              className={`flex-1 rounded-full px-3 py-2.5 text-center text-sm transition ${
                deliveryFilter === filter
                  ? "bg-yellow-300 font-medium text-gray-950"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {filter === "direct" ? "Direct Packages" : "Inbound Packages"}
            </button>
          ))}
        </div>

        {primaryDelivery && (
            <section className="space-y-3 pb-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Delivery</h2>
              <ActiveDeliveryCard
                orderId={primaryDelivery.isInbound ? undefined : primaryDelivery.id}
                title={primaryDelivery.title || "Delivery"}
                status={primaryDelivery.status === "In-Transit" ? "IN-TRANSIT" : primaryDelivery.status || "PENDING"}
                orderStatus={primaryDelivery.orderStatus}
                fromLocation={primaryDelivery.fromLocation}
                toLocation={primaryDelivery.isInbound ? primaryDelivery.toLocation : "Me"}
                date={primaryDelivery.date}
                onClick={() => onTrackLive(primaryDelivery)}
              />
            </section>
        )}

        {/* Deliveries List */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">
              Pending Requests
            </h3>
            <span className="text-xs text-gray-400">
              {pendingRequestDeliveries.length} item{pendingRequestDeliveries.length === 1 ? "" : "s"}
            </span>
          </div>

          {pendingRequestDeliveries.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-gray-900 dark:text-white">
                No deliveries found
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
                {searchQuery
                  ? `No deliveries matching "${searchQuery}". Try searching a different term.`
                  : "You don't have any pending deliveries under this filter right now."}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-white/10 text-xs font-bold text-gray-800 dark:text-white hover:bg-gray-200 cursor-pointer"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            pendingRequestDeliveries.map((delivery) => (
              <button
                key={delivery.id}
                type="button"
                onClick={() => onTrackLive(delivery)}
                className="w-full rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-2xs transition hover:border-yellow-300 dark:border-white/5 dark:bg-[#161618]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className={`mb-1.5 inline-flex rounded-full px-2 py-1 text-[10px] font-semibold uppercase text-white ${
                      delivery.status === "In-Transit" ? "bg-sky-500" : "bg-orange-500"
                    }`}>
                      {delivery.status === "In-Transit" ? "IN-TRANSIT" : "PENDING REQUEST"}
                    </span>
                    <h4 className="truncate text-base font-bold text-gray-900 dark:text-white">{delivery.title}</h4>
                    <p className="mt-1 text-sm text-gray-400">Delivering: {delivery.date || "Today"}</p>
                  </div>
                  {delivery.isInbound && (
                    <span className="shrink-0 rounded-lg bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 dark:bg-white/10 dark:text-gray-300">
                      Inbound
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2 text-xs dark:bg-white/5">
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] text-gray-400">From</span>
                    <p className="truncate text-gray-800 dark:text-gray-200">{delivery.fromLocation || "Pickup location"}</p>
                  </div>
                  <span className="text-lg text-gray-400">››</span>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[10px] text-gray-400">To</span>
                    <p className="truncate text-gray-800 dark:text-gray-200">{delivery.toLocation || "Destination"}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Quick Bottom Actions */}
        <div className="pt-4 border-t border-gray-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left">
            Need to ship another item or receive an incoming parcel?
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {onReceivePackage && (
              <button
                type="button"
                onClick={onReceivePackage}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 text-xs font-bold text-gray-900 dark:text-white transition-all cursor-pointer"
              >
                Receive Package
              </button>
            )}
            {onSendPackage && (
              <button
                type="button"
                onClick={onSendPackage}
                className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Send Package</span>
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  )
}
