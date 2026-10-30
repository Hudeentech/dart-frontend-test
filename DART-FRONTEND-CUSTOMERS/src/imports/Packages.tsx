import { useState, useEffect } from "react"
import {
  Plus,
  Search,
  ChevronRight,
  Package,
  Send,
  FileEdit,
  Trash2,
  ArrowRight,
  CheckSquare,
  Square,
  Check,
  CheckCheck,
} from "lucide-react"
import DeliveryDetails, { DeliveryDetailsItem } from "./DeliveryDetails"
import SendPackageModal from "../components/SendPackageModal"
import SendPackageFlow from "../components/SendPackageFlow"
import LinkInboundFlow, {
  InboundPackageItem,
} from "../components/LinkInboundFlow"
import PackageStateIcon from "../components/PackageStateIcon"
import ActiveDeliveryCard from "../components/ActiveDeliveryCard"
import CustomDeleteModal from "../components/CustomDeleteModal"
import SwipeToDeleteItem from "../components/SwipeToDeleteItem"
import { ordersApi } from "../api/orders.api"
import { packagesApi } from "../api/packages.api"
import {
  PackageDraft,
  getPackageDrafts,
  deletePackageDraft,
  deleteMultiplePackageDrafts,
  clearAllPackageDrafts,
  getDraftStepLabel,
} from "../utils/drafts"

type Tab = "All" | "Pending" | "Draft" | "Completed" | "Cancelled"

export default function Packages({
  onOpenNotifications,
  onProcedureChange,
}: {
  onOpenNotifications?: () => void
  onProcedureChange?: (inProcedure: boolean) => void
}) {
  const [activeTab, setActiveTab] = useState<Tab>("All")
  const [deliveryFilter, setDeliveryFilter] = useState<"my" | "linked">("my")
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryDetailsItem | null>(null)
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isLinkingInbound, setIsLinkingInbound] = useState(false)
  const [isRequestingPickup, setIsRequestingPickup] = useState(false)
  const [isSendingPackage, setIsSendingPackage] = useState(false)
  const [isViewingPackageStatus, setIsViewingPackageStatus] = useState(false)
  const [sendPackagePhoto, setSendPackagePhoto] = useState<{
    file?: File
    previewUrl: string
  } | null>(null)
  const [packageDrafts, setPackageDrafts] = useState<PackageDraft[]>(() =>
    getPackageDrafts(),
  )
  const [activeResumingDraft, setActiveResumingDraft] =
    useState<PackageDraft | null>(null)

  const [myDeliveries, setMyDeliveries] = useState<DeliveryDetailsItem[]>([])
  const [linkedDeliveries, setLinkedDeliveries] = useState<DeliveryDetailsItem[]>([])

  useEffect(() => {
    const syncDrafts = () => {
      setPackageDrafts(getPackageDrafts())
    }
    window.addEventListener("dart_drafts_updated", syncDrafts)
    return () => window.removeEventListener("dart_drafts_updated", syncDrafts)
  }, [])

  const handleResumeDraft = (draft: PackageDraft) => {
    setActiveResumingDraft(draft)
    setIsSendingPackage(true)
  }

  // Selection / Batch deletion state
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Custom confirmation modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    itemCount?: number
    confirmText?: string
    isLoading?: boolean
    onConfirm: () => Promise<void> | void
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })

  // Clear selection when tab or filter switches
  useEffect(() => {
    setIsSelectMode(false)
    setSelectedIds(new Set())
  }, [activeTab, deliveryFilter])

  const toggleSelectItem = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 1. Prompt delete single draft
  const promptDeleteDraft = (draft: PackageDraft) => {
    setDeleteModal({
      isOpen: true,
      title: "Delete draft?",
      message: `Are you sure you want to delete "${draft.packageName || "Untitled Package"}"? This action cannot be undone.`,
      itemCount: 1,
      confirmText: "Delete Draft",
      onConfirm: () => {
        deletePackageDraft(draft.id)
        setPackageDrafts(getPackageDrafts())
        setSelectedIds((prev) => {
          const next = new Set(prev)
          next.delete(draft.id)
          return next
        })
        setDeleteModal((m) => ({ ...m, isOpen: false }))
      },
    })
  }

  // 2. Prompt delete all drafts
  const promptDeleteAllDrafts = () => {
    if (packageDrafts.length === 0) return
    setDeleteModal({
      isOpen: true,
      title: "Delete all drafts?",
      message: `Are you sure you want to delete all ${packageDrafts.length} unfinished package drafts? This action cannot be undone.`,
      itemCount: packageDrafts.length,
      confirmText: "Delete All",
      onConfirm: () => {
        clearAllPackageDrafts()
        setPackageDrafts([])
        setSelectedIds(new Set())
        setIsSelectMode(false)
        setDeleteModal((m) => ({ ...m, isOpen: false }))
      },
    })
  }

  // 3. Prompt delete single package
  const promptDeletePackage = (item: DeliveryDetailsItem) => {
    if (item.status === "Pending" || item.status === "In-Transit" || item.status === "Ready for pickup") {
      return
    }
    setDeleteModal({
      isOpen: true,
      title: "Delete package record?",
      message: `Are you sure you want to delete "${item.title || "Package"}" from your history? This action cannot be undone.`,
      itemCount: 1,
      confirmText: "Delete",
      onConfirm: async () => {
        setDeleteModal((m) => ({ ...m, isLoading: true }))
        try {
          if (!item.id) return
          if (item.isInbound || deliveryFilter === "linked") {
            await packagesApi.unlinkInboundPackage(item.id)
            setLinkedDeliveries((prev) => prev.filter((p) => p.id !== item.id))
          } else {
            await ordersApi.deleteOrder(item.id)
            setMyDeliveries((prev) => prev.filter((p) => p.id !== item.id))
          }
        } catch (err: any) {
          console.error("[Packages] Delete package error:", err)
        }
        setSelectedIds((prev) => {
          const next = new Set(prev)
          if (item.id) next.delete(item.id)
          return next
        })
        setDeleteModal((m) => ({ ...m, isOpen: false, isLoading: false }))
      },
    })
  }

  // 4. Prompt delete all eligible packages
  const promptDeleteAllPackages = (eligibleItems: DeliveryDetailsItem[]) => {
    if (eligibleItems.length === 0) return
    setDeleteModal({
      isOpen: true,
      title: "Delete all eligible shipments?",
      message: `Are you sure you want to remove all ${eligibleItems.length} completed and cancelled shipments from your deliveries?`,
      itemCount: eligibleItems.length,
      confirmText: "Delete All",
      onConfirm: async () => {
        setDeleteModal((m) => ({ ...m, isLoading: true }))
        const idsToDelete = eligibleItems.map((i) => i.id)
        for (const item of eligibleItems) {
          if (!item.id) continue
          try {
            if (item.isInbound || deliveryFilter === "linked") {
              await packagesApi.unlinkInboundPackage(item.id)
            } else {
              await ordersApi.deleteOrder(item.id)
            }
          } catch (err) {
            console.error("Error clearing package:", item.id, err)
          }
        }
        const idSet = new Set(idsToDelete.filter(Boolean))
        if (deliveryFilter === "linked") {
          setLinkedDeliveries((prev) => prev.filter((p) => !p.id || !idSet.has(p.id)))
        } else {
          setMyDeliveries((prev) => prev.filter((p) => !p.id || !idSet.has(p.id)))
        }
        setSelectedIds(new Set())
        setIsSelectMode(false)
        setDeleteModal((m) => ({ ...m, isOpen: false, isLoading: false }))
      },
    })
  }

  // 5. Prompt delete selected items (drafts or packages)
  const promptDeleteSelected = () => {
    if (selectedIds.size === 0) return

    if (activeTab === "Draft") {
      setDeleteModal({
        isOpen: true,
        title: `Delete ${selectedIds.size} draft${selectedIds.size > 1 ? "s" : ""}?`,
        message: "Are you sure you want to delete the selected package drafts? This cannot be undone.",
        itemCount: selectedIds.size,
        confirmText: `Delete (${selectedIds.size})`,
        onConfirm: () => {
          deleteMultiplePackageDrafts(Array.from(selectedIds))
          setPackageDrafts(getPackageDrafts())
          setSelectedIds(new Set())
          setIsSelectMode(false)
          setDeleteModal((m) => ({ ...m, isOpen: false }))
        },
      })
    } else {
      setDeleteModal({
        isOpen: true,
        title: `Delete ${selectedIds.size} package${selectedIds.size > 1 ? "s" : ""}?`,
        message: "Are you sure you want to delete the selected package records from your list?",
        itemCount: selectedIds.size,
        confirmText: `Delete (${selectedIds.size})`,
        onConfirm: async () => {
          setDeleteModal((m) => ({ ...m, isLoading: true }))
          const idsToDelete = Array.from(selectedIds)
          for (const id of idsToDelete) {
            try {
              if (deliveryFilter === "linked") {
                await packagesApi.unlinkInboundPackage(id)
              } else {
                await ordersApi.deleteOrder(id)
              }
            } catch (err) {
              console.error("Failed to delete package:", id, err)
            }
          }
          if (deliveryFilter === "linked") {
            setLinkedDeliveries((prev) => prev.filter((p) => !p.id || !selectedIds.has(p.id)))
          } else {
            setMyDeliveries((prev) => prev.filter((p) => !p.id || !selectedIds.has(p.id)))
          }
          setSelectedIds(new Set())
          setIsSelectMode(false)
          setDeleteModal((m) => ({ ...m, isOpen: false, isLoading: false }))
        },
      })
    }
  }

  const fetchUserDeliveries = async () => {
    try {
      const [userOrdersRes, inboundListRes] = await Promise.allSettled([
        ordersApi.listOrders(),
        packagesApi.listInboundPackages(),
      ])

      const mappedOrders: DeliveryDetailsItem[] =
        userOrdersRes.status === "fulfilled" && userOrdersRes.value?.length > 0
          ? userOrdersRes.value.map((ord) => ({
              id: ord.id,
              title: ord.package?.name || "Customer Package",
              trackingCode: ord.trackingId,
              orderStatus: ord.status,
              estimatedMinutes: ord.estimatedMinutes,
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
              status:
                ord.status === "DELIVERED" ||
                ord.status === "CUSTOMER_CONFIRMED" ||
                ord.status === "SETTLED"
                  ? "Delivered"
                  : ord.status === "CANCELLED"
                    ? "Cancelled"
                    : ["RIDER_ACCEPTED", "PICKUP_PENDING", "PICKED_UP", "IN_TRANSIT"].includes(ord.status)
                      ? "In-Transit"
                      : "Pending",
              fromLocation: ord.pickupAddress
                ? `${ord.pickupAddress.street}, ${ord.pickupAddress.city}`
                : "Pickup",
              toLocation: ord.destinationAddress
                ? `${ord.destinationAddress.street}, ${ord.destinationAddress.city}`
                : "Destination",
              date: new Date(ord.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
              time: new Date(ord.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              weight: ord.package?.weightKg
                ? `${ord.package.weightKg} kg`
                : "Standard",
              category: ord.package?.category || "PARCEL",
              fragileNote: ord.package?.isFragile
                ? "Fragile item - Handle with care"
                : undefined,
            }))
          : []

      const mappedInbound: DeliveryDetailsItem[] =
        inboundListRes.status === "fulfilled" && inboundListRes.value?.length > 0
          ? inboundListRes.value.map((pkg) => ({
              id: pkg.id,
              title: pkg.title,
              store: pkg.store || pkg.courier,
              trackingCode: pkg.trackingId,
              status: pkg.status,
              fromLocation: pkg.fromLocation,
              toLocation: pkg.toLocation,
              date: pkg.shippedDate || "Recently",
              time: "",
              weight: "Medium",
              category: pkg.category,
              fragileNote:
                pkg.fragileNote ||
                (pkg.store
                  ? `Ordered from ${pkg.store} via ${pkg.courier}`
                  : `Inbound shipment from ${pkg.courier}`),
              isInbound: true,
              isArrived: pkg.isArrived,
              arrivedDate: pkg.arrivedDate,
              pickupTerminal: pkg.pickupTerminal,
              courier: pkg.courier,
              shippedDate: pkg.shippedDate,
              estimatedArrival: pkg.estimatedArrival,
              tracks: pkg.tracks,
              payUrl: pkg.payUrl,
            }))
          : []

      setMyDeliveries(mappedOrders)
      setLinkedDeliveries(mappedInbound)
    } catch (e) {
      console.warn("[Packages] Deliveries load note:", e)
    }
  }

  useEffect(() => {
    fetchUserDeliveries()
  }, [])

  useEffect(() => {
    const inProcedure =
      isSendingPackage ||
      isRequestingPickup ||
      isLinkingInbound ||
      isViewingPackageStatus ||
      selectedDelivery !== null
    onProcedureChange?.(inProcedure)
    return () => {
      onProcedureChange?.(false)
    }
  }, [
    isSendingPackage,
    isRequestingPickup,
    isLinkingInbound,
    isViewingPackageStatus,
    selectedDelivery,
    onProcedureChange,
  ])

  if (isViewingPackageStatus) {
    return (
      <SendPackageFlow
        mode="send"
        initialScreen="package_status"
        initialIsRiderAccepted={true}
        onBack={() => setIsViewingPackageStatus(false)}
        onComplete={() => {
          setIsViewingPackageStatus(false)
        }}
        onOpenNotifications={onOpenNotifications}
      />
    )
  }

  if (selectedDelivery) {
    return (
      <DeliveryDetails
        delivery={selectedDelivery}
        onBack={() => setSelectedDelivery(null)}
        onOpenNotifications={onOpenNotifications}
        onBookRiderAgain={() => {
          setSelectedDelivery(null)
          setIsRequestingPickup(true)
        }}
      />
    )
  }

  if (isLinkingInbound) {
    return (
      <LinkInboundFlow
        onBack={() => setIsLinkingInbound(false)}
        onComplete={(pkg: InboundPackageItem) => {
          packagesApi.linkInboundPackage(pkg).catch((err) => {
            console.warn("Inbound package persist note:", err)
          })
          const newLinkedItem: DeliveryDetailsItem = {
            id: pkg.id || "inbound-" + Date.now(),
            title: pkg.title,
            store: pkg.store || pkg.courier,
            trackingCode: pkg.trackingId,
            status: pkg.status,
            fromLocation: pkg.fromLocation,
            toLocation: pkg.toLocation,
            date: "Today",
            time: "Just now",
            weight: "Medium",
            category: pkg.category,
            fragileNote: pkg.store
              ? `Ordered from ${pkg.store} via ${pkg.courier}`
              : `Inbound package from ${pkg.courier}`,
            isInbound: true,
            courier: pkg.courier,
            shippedDate: pkg.shippedDate,
            estimatedArrival: pkg.estimatedArrival,
            tracks: pkg.tracks,
            payUrl: pkg.payUrl,
            rider: {
              name: pkg.store ? `${pkg.store} • ${pkg.courier}` : pkg.courier,
              idCode: pkg.trackingId,
              avatar:
                "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
              rating: 5.0,
              reviewCount: 14,
              price: "Free Link",
            },
          }
          setLinkedDeliveries((prev) => [newLinkedItem, ...prev])
          setDeliveryFilter("linked")
          setIsLinkingInbound(false)
        }}
      />
    )
  }

  if (isSendingPackage) {
    return (
      <SendPackageFlow
        mode="send"
        initialDraft={activeResumingDraft}
        initialImage={activeResumingDraft ? null : sendPackagePhoto}
        onBack={() => {
          setIsSendingPackage(false)
          setActiveResumingDraft(null)
        }}
        onComplete={() => {
          setIsSendingPackage(false)
          setActiveResumingDraft(null)
          fetchUserDeliveries()
        }}
        onOpenNotifications={onOpenNotifications}
      />
    )
  }

  if (isRequestingPickup) {
    return (
      <SendPackageFlow
        mode="pickup"
        onBack={() => setIsRequestingPickup(false)}
        onComplete={() => {
          setIsRequestingPickup(false)
          fetchUserDeliveries()
        }}
        onOpenNotifications={onOpenNotifications}
      />
    )
  }

  const activePendingDelivery =
    myDeliveries.find((delivery) => delivery.status === "In-Transit") ||
    linkedDeliveries.find(
      (delivery) =>
        delivery.status === "In-Transit" || delivery.status === "Ready for pickup",
    )

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-24 md:pb-12 transition-colors">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-sm sticky top-0 z-30 border-b border-gray-100 dark:border-white/5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My Deliveries
        </h1>

        <div className="flex items-center">
          <div className="relative">
            <button
              onClick={() => setIsActionMenuOpen(!isActionMenuOpen)}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black shadow-xs transition-colors cursor-pointer touch-manipulation"
              title="Add or Send Package"
              aria-expanded={isActionMenuOpen}
            >
              <Plus
                className={`w-5 h-5 stroke-[2.2] transition-transform duration-200 ${
                  isActionMenuOpen ? "rotate-45" : ""
                }`}
              />
            </button>

            {/* Backdrop for closing when clicking outside */}
            {isActionMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsActionMenuOpen(false)}
                />

                {/* Dropdown Action Menu matching user screenshot */}
                <div className="absolute right-0 top-full mt-2 w-60 sm:w-64 bg-white dark:bg-[#1a1a1e] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-white/10 z-50 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 animate-in fade-in zoom-in-95 duration-150">
                  {/* Option 1: Link Inbound package */}
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false)
                      setIsLinkingInbound(true)
                    }}
                    className="w-full flex items-center gap-3.5 px-4.5 py-3.5 sm:py-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className="text-gray-900 dark:text-gray-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors shrink-0">
                      <Package className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <span className="text-[15px] font-normal sm:font-medium text-gray-800 dark:text-gray-100 tracking-tight">
                      Link Inbound package
                    </span>
                  </button>

                  {/* Option 2: Request pickup */}
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false)
                      setIsRequestingPickup(true)
                    }}
                    className="w-full flex items-center gap-3.5 px-4.5 py-3.5 sm:py-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className="text-gray-900 dark:text-gray-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors shrink-0">
                      <svg
                        className="w-5 h-5 stroke-[1.8]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 4v9" />
                        <path d="m8.5 9.5 3.5 3.5 3.5-3.5" />
                        <path d="M4 12v4a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4" />
                      </svg>
                    </div>
                    <span className="text-[15px] font-normal sm:font-medium text-gray-800 dark:text-gray-100 tracking-tight">
                      Request pickup
                    </span>
                  </button>

                  {/* Option 3: Send Package */}
                  <button
                    onClick={() => {
                      setIsActionMenuOpen(false)
                      setIsSendModalOpen(true)
                    }}
                    className="w-full flex items-center gap-3.5 px-4.5 py-3.5 sm:py-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                  >
                    <div className="text-gray-900 dark:text-gray-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors shrink-0">
                      <Send className="w-5 h-5 stroke-[1.8]" />
                    </div>
                    <span className="text-[15px] font-normal sm:font-medium text-gray-800 dark:text-gray-100 tracking-tight">
                      Send Package
                    </span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-3.5 sm:px-6 my-3 sm:my-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-3 border border-gray-100 dark:border-white/10 rounded-xl leading-5 bg-gray-50 dark:bg-[#202024] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 sm:text-sm"
            placeholder="Search package"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3.5 sm:px-6 mb-4 sm:mb-5 flex gap-2 overflow-x-auto hide-scrollbar w-full">
        {(["All", "Pending", "Draft", "Completed", "Cancelled"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer touch-manipulation flex items-center gap-1.5 ${
              activeTab === tab
                ? "bg-yellow-400 text-black font-bold shadow-xs"
                : "bg-gray-100/80 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200/50 dark:border-white/5"
            }`}
          >
            <span>{tab}</span>
            {tab === "Draft" && packageDrafts.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  activeTab === "Draft"
                    ? "bg-black text-yellow-400"
                    : "bg-yellow-400 text-black"
                }`}
              >
                {packageDrafts.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 px-3.5 sm:px-6 pb-6 w-full">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Active delivery
        </h2>

        {/* Active Delivery Card */}
        {activePendingDelivery ? (
            <div className="mb-8">
              <ActiveDeliveryCard
                orderId={activePendingDelivery.isInbound ? undefined : activePendingDelivery.id}
                title={activePendingDelivery.title || "Delivery"}
                status={activePendingDelivery.status === "In-Transit" ? "IN-TRANSIT" : activePendingDelivery.status || "PENDING"}
                orderStatus={activePendingDelivery.orderStatus}
                fromLocation={activePendingDelivery.fromLocation}
                toLocation={activePendingDelivery.isInbound ? activePendingDelivery.toLocation : "Me"}
                date={activePendingDelivery.date}
                onClick={() => setSelectedDelivery(activePendingDelivery)}
              />
            </div>
          ) : (
              <div className="bg-white dark:bg-[#161618] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-5 mb-8 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No active pending deliveries right now. Tap '+' to create or link one.
                </p>
              </div>
          )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 w-full">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              My deliveries
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Past shipments & inbound packages
            </p>
          </div>

          {/* Mobile-Optimized Tab Buttons (identical to Home page) */}
          <div className="bg-gray-100 dark:bg-white/5 p-1 rounded-full flex w-full sm:w-fit border border-gray-200/60 dark:border-white/5">
            <button
              onClick={() => setDeliveryFilter("my")}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-4 rounded-full font-medium transition-all text-center cursor-pointer touch-manipulation ${
                deliveryFilter === "my"
                  ? "bg-yellow-400 text-black font-bold shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              My Packages
            </button>
            <button
              onClick={() => setDeliveryFilter("linked")}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-4 rounded-full font-medium transition-all text-center cursor-pointer touch-manipulation ${
                deliveryFilter === "linked"
                  ? "bg-yellow-400 text-black font-bold shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Inbound
            </button>
          </div>
        </div>

        {/* Past Deliveries List or Drafts List */}
        {(() => {
          if (activeTab === "Draft") {
            if (packageDrafts.length === 0) {
              return (
                <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    No unfinished package drafts found. If you exit while sending a package, it will appear here.
                  </p>
                </div>
              )
            }

            const allDraftsSelected = packageDrafts.length > 0 && packageDrafts.every((d) => selectedIds.has(d.id))

            const handleToggleSelectAllDrafts = () => {
              if (allDraftsSelected) {
                setSelectedIds(new Set())
              } else {
                setSelectedIds(new Set(packageDrafts.map((d) => d.id)))
              }
            }

            return (
              <div className="space-y-3.5 w-full">
                {/* Draft Management Toolbar */}
                <div className="flex items-center justify-between gap-2 py-1 px-1">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Swipe left on any draft or mark to delete</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectMode(!isSelectMode)
                        if (isSelectMode) setSelectedIds(new Set())
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        isSelectMode
                          ? "bg-gray-900 text-white dark:bg-white dark:text-black font-semibold"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {isSelectMode ? "Done" : "Mark to delete"}
                    </button>

                    {!isSelectMode && (
                      <button
                        type="button"
                        onClick={promptDeleteAllDrafts}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete all</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Batch Selection Banner */}
                {isSelectMode && (
                  <div className="bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200/80 dark:border-yellow-400/20 rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={handleToggleSelectAllDrafts}
                        className="text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                      >
                        {allDraftsSelected ? (
                          <CheckSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                        <span>{allDraftsSelected ? "Deselect all" : "Select all"}</span>
                      </button>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({selectedIds.size} selected)
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsSelectMode(false)
                          setSelectedIds(new Set())
                        }}
                        className="text-xs px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={selectedIds.size === 0}
                        onClick={promptDeleteSelected}
                        className="text-xs px-3 py-1 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
                      >
                        Delete ({selectedIds.size})
                      </button>
                    </div>
                  </div>
                )}

                {packageDrafts.map((draft) => {
                  const isSelected = selectedIds.has(draft.id)
                  return (
                    <SwipeToDeleteItem
                      key={draft.id}
                      disabled={isSelectMode}
                      onDelete={() => promptDeleteDraft(draft)}
                      deleteLabel="Delete"
                      bgClass="bg-gray-50 dark:bg-[#1c1c20]"
                    >
                      <div
                        onClick={() => {
                          if (isSelectMode) {
                            toggleSelectItem({ stopPropagation: () => {} } as any, draft.id)
                          } else {
                            handleResumeDraft(draft)
                          }
                        }}
                        className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-[#1c1c20] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-colors duration-200 gap-3.5 sm:gap-3.5 w-full group touch-manipulation border ${
                          isSelected
                            ? "border-yellow-400 ring-2 ring-yellow-400/40"
                            : "border-transparent"
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 w-full sm:flex-1">
                          {isSelectMode && (
                            <div
                              onClick={(e) => toggleSelectItem(e, draft.id)}
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-yellow-600 dark:text-yellow-400 cursor-pointer"
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 fill-yellow-400 text-black stroke-[2]" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          )}

                          <div className="w-11 h-11 rounded-xl bg-gray-200/70 dark:bg-white/10 text-gray-600 dark:text-gray-300 shrink-0 flex items-center justify-center">
                            <FileEdit className="w-5 h-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300 inline-block">
                                Draft
                              </span>
                              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">
                                {getDraftStepLabel(draft.step)}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                              {draft.packageName || "Untitled Package"}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                              {draft.fromLocation} → {draft.toLocation}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                              Saved {draft.dateFormatted || "Recently"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto pl-14 sm:pl-0">
                          {!isSelectMode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                promptDeleteDraft(draft)
                              }}
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-50 dark:text-gray-400 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                              title="Delete draft"
                              aria-label="Delete draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (isSelectMode) {
                                toggleSelectItem(e, draft.id)
                              } else {
                                handleResumeDraft(draft)
                              }
                            }}
                            className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer active:scale-[0.98] touch-manipulation"
                          >
                            <span>Continue draft</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </SwipeToDeleteItem>
                  )
                })}
              </div>
            )
          }

          const currentList = deliveryFilter === "my" ? myDeliveries : linkedDeliveries
          const filteredList = currentList.filter((item) => {
            if (item.id === activePendingDelivery?.id) return false
            if (activeTab === "Pending") {
              return item.status === "In-Transit" || item.status === "Ready for pickup"
            }
            if (activeTab === "Completed") {
              return item.status === "Delivered"
            }
            if (activeTab === "Cancelled") {
              return item.status === "Cancelled"
            }
            return true
          })

          if (filteredList.length === 0) {
            return (
              <div className="text-center py-10 px-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  No {activeTab === "All" ? "" : activeTab.toLowerCase() + " "}
                  {deliveryFilter === "my" ? "outbound" : "linked"} packages found.
                </p>
              </div>
            )
          }

          const deletableItems = filteredList.filter(
            (item): item is DeliveryDetailsItem & { id: string } =>
              Boolean(item.id) &&
              item.status !== "In-Transit" &&
              item.status !== "Pending" &&
              item.status !== "Ready for pickup"
          )
          const allDeletableSelected =
            deletableItems.length > 0 && deletableItems.every((d) => selectedIds.has(d.id))

          const handleToggleSelectAllPackages = () => {
            if (allDeletableSelected) {
              setSelectedIds(new Set())
            } else {
              setSelectedIds(new Set(deletableItems.map((d) => d.id)))
            }
          }

          return (
            <div className="space-y-4 w-full">
              {/* Package Management Toolbar (if deletable items exist) */}
              {deletableItems.length > 0 && (
                <div className="flex items-center justify-between gap-2 py-1 px-1">
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Swipe left on recent deliveries to delete</span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectMode(!isSelectMode)
                        if (isSelectMode) setSelectedIds(new Set())
                      }}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        isSelectMode
                          ? "bg-gray-900 text-white dark:bg-white dark:text-black font-semibold"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      {isSelectMode ? "Done" : "Mark to delete"}
                    </button>

                    {!isSelectMode && (
                      <button
                        type="button"
                        onClick={() => promptDeleteAllPackages(deletableItems)}
                        className="text-xs px-2.5 py-1 rounded-lg font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear all</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Batch Selection Banner */}
              {isSelectMode && deletableItems.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-400/10 border border-yellow-200/80 dark:border-yellow-400/20 rounded-2xl p-3 flex items-center justify-between gap-3 animate-in fade-in duration-150">
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleToggleSelectAllPackages}
                      className="text-xs font-semibold text-gray-800 dark:text-gray-200 hover:text-black dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      {allDeletableSelected ? (
                        <CheckSquare className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                      <span>{allDeletableSelected ? "Deselect all" : "Select all"}</span>
                    </button>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      ({selectedIds.size} selected)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectMode(false)
                        setSelectedIds(new Set())
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={selectedIds.size === 0}
                      onClick={promptDeleteSelected}
                      className="text-xs px-3 py-1 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 transition-colors cursor-pointer shadow-xs"
                    >
                      Delete ({selectedIds.size})
                    </button>
                  </div>
                </div>
              )}

              {filteredList.map((item) => {
                const isDeletable =
                  item.status !== "In-Transit" &&
                  item.status !== "Pending" &&
                  item.status !== "Ready for pickup"
                const isSelected = Boolean(item.id && selectedIds.has(item.id))

                const rowContent = (
                  <div
                    onClick={() => {
                      if (isSelectMode && isDeletable && item.id) {
                        toggleSelectItem({ stopPropagation: () => {} } as any, item.id)
                      } else {
                        setSelectedDelivery(item)
                      }
                    }}
                    className={`flex items-center justify-between p-3.5 sm:p-4 bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/80 dark:hover:bg-yellow-400/10 border ${
                      isSelected
                        ? "border-yellow-400 ring-2 ring-yellow-400/40"
                        : "border-gray-100 dark:border-white/5 hover:border-yellow-300/80 dark:hover:border-yellow-400/30"
                    } rounded-2xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 gap-3 sm:gap-3.5 w-full group touch-manipulation`}
                  >
                    {isSelectMode && isDeletable && item.id && (
                      <div
                        onClick={(e) => toggleSelectItem(e, item.id!)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-yellow-600 dark:text-yellow-400 cursor-pointer"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 fill-yellow-400 text-black stroke-[2]" />
                        ) : (
                          <Square className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    )}

                    <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 shrink-0 flex items-center justify-center p-1.5">
                      <PackageStateIcon
                        status={item.status}
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-1.5 inline-block ${
                          item.status === "Delivered"
                            ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-400/10"
                            : item.status === "In-Transit" ||
                                item.status === "Ready for pickup"
                              ? "text-yellow-700 dark:text-yellow-400 bg-yellow-400/20"
                              : "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-400/10"
                        }`}
                      >
                        {item.status || "DELIVERED"}
                      </span>
                      <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                        {item.fromLocation ? `From ${item.fromLocation} • ` : ""}
                        {item.date} {item.time}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      {!isSelectMode && isDeletable && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            promptDeletePackage(item)
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                          title="Delete package"
                          aria-label="Delete package"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                    </div>
                  </div>
                )

                if (isDeletable) {
                  return (
                    <SwipeToDeleteItem
                      key={item.id}
                      disabled={isSelectMode}
                      onDelete={() => promptDeletePackage(item)}
                      deleteLabel="Delete"
                      bgClass="bg-white dark:bg-[#1c1c20]"
                    >
                      {rowContent}
                    </SwipeToDeleteItem>
                  )
                }

                return <div key={item.id}>{rowContent}</div>
              })}
            </div>
          )
        })()}
      </div>

      <SendPackageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onPhotoConfirmed={(photo) => {
          setSendPackagePhoto(photo)
          setIsSendModalOpen(false)
          setIsSendingPackage(true)
        }}
      />

      {/* Reusable Custom Delete Confirmation Prompt */}
      <CustomDeleteModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        message={deleteModal.message}
        itemCount={deleteModal.itemCount}
        confirmText={deleteModal.confirmText}
        isLoading={deleteModal.isLoading}
        onConfirm={deleteModal.onConfirm}
        onClose={() => setDeleteModal((m) => ({ ...m, isOpen: false }))}
      />
    </div>
  )
}
