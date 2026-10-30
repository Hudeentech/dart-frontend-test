import { useState, useEffect } from "react"
import {
  ScanLine,
  Search,
  Send,
  Download,
  ArrowRight,
  ChevronRight,
  Package,
  Clock,
  FileEdit,
  Trash2,
  RefreshCw,
} from "lucide-react"
import {
  PackageDraft,
  getPackageDrafts,
  deletePackageDraft,
  getDraftStepLabel,
} from "../utils/drafts"
import { useTheme } from "../context/ThemeContext"
import { useAuth } from "../context/AuthContext"
import ReceivePackageModal from "../components/ReceivePackageModal"
import SendPackageModal from "./../components/SendPackageModal"
import SendPackageFlow from "../components/SendPackageFlow"
import DeliveryDetails, { DeliveryDetailsItem } from "./DeliveryDetails"
import CurrentDeliveries from "./CurrentDeliveries"
import LinkInboundFlow from "../components/LinkInboundFlow"
import PackageStateIcon from "../components/PackageStateIcon"
import ActiveDeliveryCard from "../components/ActiveDeliveryCard"
import NotificationButton from "../components/NotificationButton"
import emptyStateBoxSvg from "../assets/empty-state-box.svg"
import VerificationRequiredModal from "../components/VerificationRequiredModal"
import CustomDeleteModal from "../components/CustomDeleteModal"
import SwipeToDeleteItem from "../components/SwipeToDeleteItem"
import { ordersApi } from "../api/orders.api"
import { packagesApi } from "../api/packages.api"
import { userApi } from "../api/user.api"
import type { OrderStatus } from "../types/api.types"

interface DeliveryItem {
  id: string
  title: string
  store: string
  date: string
  status: "Delivered" | "Cancelled" | "In-Transit" | "Ready for pickup" | "Pending"
  trackingId: string
  orderStatus?: OrderStatus
  image?: string
  rider?: DeliveryDetailsItem["rider"]
  type: "my" | "linked"
  estimatedMinutes?: number
  isInbound?: boolean
  courier?: string
  shippedDate?: string
  estimatedArrival?: string
  category?: string
  fromLocation?: string
  toLocation?: string
  isArrived?: boolean
  arrivedDate?: string
  pickupTerminal?: string
  tracks?: any[]
  payUrl?: string
}

const DELIVERIES_DATA: DeliveryItem[] = []

export default function Home({
  onOpenNotifications,
  onNavigateToPackages,
  onProcedureChange,
  onNavigateToAccount,
}: {
  onOpenNotifications?: () => void
  onNavigateToPackages?: () => void
  onProcedureChange?: (inProcedure: boolean) => void
  onNavigateToAccount?: () => void
}) {
  const { resolvedTheme } = useTheme()
  const { user } = useAuth()
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
  const [pendingAction, setPendingAction] = useState<"send" | "receive" | null>(null)
  const [isSendModalOpen, setIsSendModalOpen] = useState(false)
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false)
  const [isLinkingInbound, setIsLinkingInbound] = useState(false)
  const [linkingTrackingId, setLinkingTrackingId] =
    useState<string | undefined>()
  const [searchTrackingId, setSearchTrackingId] = useState("")
  const [deliveryTab, setDeliveryTab] = useState<"my" | "linked" | "drafts">("my")
  const [packageDrafts, setPackageDrafts] = useState<PackageDraft[]>(() =>
    getPackageDrafts(),
  )
  const [activeResumingDraft, setActiveResumingDraft] =
    useState<PackageDraft | null>(null)
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>(DELIVERIES_DATA)
  const [isLoadingDeliveries, setIsLoadingDeliveries] = useState(false)
  const [deliveriesLoadError, setDeliveriesLoadError] = useState<string | null>(
    null,
  )
  const [selectedDelivery, setSelectedDelivery] =
    useState<DeliveryDetailsItem | null>(null)
  const [isSendingPackage, setIsSendingPackage] = useState(false)
  const [isRequestingPickup, setIsRequestingPickup] = useState(false)
  const [isViewingPackageStatus, setIsViewingPackageStatus] = useState(false)
  const [activeTrackingPackage, setActiveTrackingPackage] = useState<{
    packageName?: string
    fromLocation?: string
    toLocation?: string
    trackingId?: string
    category?: string
    weight?: string
    riderName?: string
    orderId?: string
    image?: string
    status?: OrderStatus
    rider?: DeliveryDetailsItem["rider"]
  } | null>(null)
  const [isViewingAllCurrentDeliveries, setIsViewingAllCurrentDeliveries] =
    useState(false)
  const [sendPackagePhoto, setSendPackagePhoto] = useState<{
    file?: File
    previewUrl: string
  } | null>(null)

  const [isLocallyVerified, setIsLocallyVerified] = useState<boolean>(() => {
    return localStorage.getItem("dart_account_verified") === "true"
  })

  const isUserVerified = Boolean(
    user?.isProfileComplete ||
    (user as any)?.isNinVerified ||
    (user as any)?.identityProfile?.kycStatus === "VERIFIED" ||
    isLocallyVerified ||
    localStorage.getItem("dart_account_verified") === "true"
  )

  useEffect(() => {
    const checkVerification = async () => {
      try {
        const status = await userApi.getVerificationStatus()
        if (
          status?.isNinVerified ||
          status?.identityProfile?.kycStatus === "VERIFIED" ||
          status?.isProfileComplete
        ) {
          setIsLocallyVerified(true)
          try {
            localStorage.setItem("dart_account_verified", "true")
          } catch {}
        }
      } catch (err) {
        console.warn("[Home] Verification check note:", err)
      }
    }
    checkVerification()
  }, [user])

  // Sync saved drafts when updated anywhere in the app
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

  const [draftToDelete, setDraftToDelete] = useState<PackageDraft | null>(null)

  const promptDeleteDraft = (draft: PackageDraft) => {
    setDraftToDelete(draft)
  }

  const handleConfirmDeleteDraft = () => {
    if (!draftToDelete) return
    deletePackageDraft(draftToDelete.id)
    setPackageDrafts(getPackageDrafts())
    setDraftToDelete(null)
  }

  const handleSendPackageClick = () => {
    setActiveResumingDraft(null)
    const verified = Boolean(
      user?.isProfileComplete ||
      (user as any)?.isNinVerified ||
      (user as any)?.identityProfile?.kycStatus === "VERIFIED" ||
      isLocallyVerified ||
      localStorage.getItem("dart_account_verified") === "true"
    )
    if (!verified) {
      setPendingAction("send")
      setIsVerificationModalOpen(true)
      return
    }
    setIsSendModalOpen(true)
  }

  const handleReceivePackageClick = () => {
    const verified = Boolean(
      user?.isProfileComplete ||
      (user as any)?.isNinVerified ||
      (user as any)?.identityProfile?.kycStatus === "VERIFIED" ||
      isLocallyVerified ||
      localStorage.getItem("dart_account_verified") === "true"
    )
    if (!verified) {
      setPendingAction("receive")
      setIsVerificationModalOpen(true)
      return
    }
    setIsReceiveModalOpen(true)
  }

  const fetchDeliveries = async () => {
    setIsLoadingDeliveries(true)
    setDeliveriesLoadError(null)
    try {
      const [ordersRes, inboundRes] = await Promise.allSettled([
        ordersApi.listOrders(),
        packagesApi.listInboundPackages(),
      ])

      const loadErrors: string[] = []
      const ordersLoaded =
        ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)
      const inboundLoaded =
        inboundRes.status === "fulfilled" && Array.isArray(inboundRes.value)
      if (!ordersLoaded) {
        const reason =
          ordersRes.status === "rejected" ? ordersRes.reason : undefined
        loadErrors.push(
          `Outbound orders: ${reason instanceof Error ? reason.message : "Unexpected response from the server."}`,
        )
      }
      if (!inboundLoaded) {
        const reason =
          inboundRes.status === "rejected" ? inboundRes.reason : undefined
        loadErrors.push(
          `Linked packages: ${reason instanceof Error ? reason.message : "Unexpected response from the server."}`,
        )
      }

      const mappedOrders: DeliveryItem[] = []
      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        ordersRes.value.forEach((ord) => {
          mappedOrders.push({
            id: ord.id,
            title: ord.package?.name || "Package Delivery",
            store: "DART Express",
            date: new Date(ord.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            }),
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
            trackingId: ord.trackingId,
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
            type: "my",
            category: ord.package?.category || "PARCEL",
            fromLocation: ord.pickupAddress
              ? `${ord.pickupAddress.street}, ${ord.pickupAddress.city}`
              : undefined,
            toLocation: ord.destinationAddress
              ? `${ord.destinationAddress.street}, ${ord.destinationAddress.city}`
              : undefined,
          })
        })
      }

      const mappedInbound: DeliveryItem[] = []
      if (inboundRes.status === "fulfilled" && Array.isArray(inboundRes.value)) {
        inboundRes.value.forEach((inb) => {
          mappedInbound.push({
            id: inb.id,
            title: inb.title || "Inbound Shipment",
            store: inb.store || inb.courier || "External Courier",
            date: inb.shippedDate || "Recent",
            status:
              inb.status === "Ready for pickup" || inb.isArrived
                ? "Ready for pickup"
                : inb.status === "Delivered"
                  ? "Delivered"
                  : "In-Transit",
            trackingId: inb.trackingId,
            type: "linked",
            isInbound: true,
            courier: inb.courier,
            shippedDate: inb.shippedDate,
            estimatedArrival: inb.estimatedArrival,
            category: inb.category || "PARCEL",
            fromLocation: inb.fromLocation,
            toLocation: inb.toLocation,
            isArrived: inb.isArrived,
            arrivedDate: inb.arrivedDate,
            pickupTerminal: inb.pickupTerminal,
            tracks: inb.tracks,
            payUrl: inb.payUrl,
          })
        })
      }

      const combined = [...mappedOrders, ...mappedInbound]
      setDeliveries((current) => [
        ...current.filter(
          (delivery) =>
            (!ordersLoaded && delivery.type === "my") ||
            (!inboundLoaded && delivery.type === "linked"),
        ),
        ...combined,
      ])
      if (loadErrors.length > 0) {
        setDeliveriesLoadError(loadErrors.join(" "))
      }
    } catch (e) {
      console.warn("[Home] Deliveries load note:", e)
      setDeliveriesLoadError(
        e instanceof Error ? e.message : "Could not load your packages.",
      )
    } finally {
      setIsLoadingDeliveries(false)
    }
  }

  useEffect(() => {
    fetchDeliveries()
  }, [])

  useEffect(() => {
    const inProcedure =
      isSendingPackage ||
      isRequestingPickup ||
      isLinkingInbound ||
      isViewingPackageStatus ||
      isViewingAllCurrentDeliveries ||
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
    isViewingAllCurrentDeliveries,
    selectedDelivery,
    onProcedureChange,
  ])

  if (isViewingAllCurrentDeliveries) {
    return (
      <CurrentDeliveries
        onBack={() => setIsViewingAllCurrentDeliveries(false)}
        onOpenNotifications={onOpenNotifications}
        onTrackLive={(item) => {
          setIsViewingAllCurrentDeliveries(false)
          if (item?.isInbound) {
            setSelectedDelivery(item)
            return
          }
          setActiveTrackingPackage(
            item
              ? {
                  packageName: item.title,
                  fromLocation: item.fromLocation,
                  toLocation: item.toLocation,
                  trackingId: item.trackingCode,
                  category: item.category,
                  weight: item.weight,
                  riderName: item.rider?.name || item.courier,
                  orderId: item.id,
                  image: item.image,
                  status: item.orderStatus,
                  rider: item.rider,
                }
              : null,
          )
          setIsViewingPackageStatus(true)
        }}
        onSelectDelivery={(item) => {
          setIsViewingAllCurrentDeliveries(false)
          if (item.isInbound) {
            setSelectedDelivery(item)
            return
          }
          setActiveTrackingPackage({
            packageName: item.title,
            fromLocation: item.fromLocation,
            toLocation: item.toLocation,
            trackingId: item.trackingCode,
            category: item.category,
            weight: item.weight,
            riderName: item.rider?.name || item.courier,
            orderId: item.id,
            image: item.image,
            status: item.orderStatus,
            rider: item.rider,
          })
          setIsViewingPackageStatus(true)
        }}
        onSendPackage={() => {
          setIsViewingAllCurrentDeliveries(false)
          handleSendPackageClick()
        }}
        onReceivePackage={() => {
          setIsViewingAllCurrentDeliveries(false)
          handleReceivePackageClick()
        }}
      />
    )
  }

  if (isViewingPackageStatus) {
    return (
      <SendPackageFlow
        mode="send"
        initialScreen="package_status"
        initialIsRiderAccepted={true}
        initialPackageDetails={activeTrackingPackage}
        onBack={() => {
          setIsViewingPackageStatus(false)
          setActiveTrackingPackage(null)
        }}
        onComplete={() => {
          setIsViewingPackageStatus(false)
          setActiveTrackingPackage(null)
          fetchDeliveries()
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
        initialTrackingId={linkingTrackingId}
        onBack={() => {
          setIsLinkingInbound(false)
          setLinkingTrackingId(undefined)
        }}
        onComplete={(pkg) => {
          const newInbound: DeliveryItem = {
            id: pkg.id || "inbound-" + Date.now(),
            title: pkg.title,
            store: pkg.store || pkg.courier,
            date: "Today",
            status:
              pkg.status === "Pending"
                ? "In-Transit"
                : pkg.status as DeliveryItem["status"],
            trackingId: pkg.trackingId,
            type: "linked",
            isInbound: true,
            courier: pkg.courier,
            shippedDate: pkg.shippedDate,
            estimatedArrival: pkg.estimatedArrival,
            category: pkg.category,
            fromLocation: pkg.fromLocation,
            toLocation: pkg.toLocation,
            tracks: pkg.tracks,
            payUrl: pkg.payUrl,
          }
          setDeliveries((prev) => [newInbound, ...prev])
          setDeliveryTab("linked")
          setIsLinkingInbound(false)
          setLinkingTrackingId(undefined)
          fetchDeliveries()
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
          fetchDeliveries()
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
          fetchDeliveries()
        }}
        onOpenNotifications={onOpenNotifications}
      />
    )
  }

  const activeDelivery = deliveries.find((delivery) => {
    if (delivery.isInbound) {
      return delivery.status === "In-Transit" || delivery.status === "Ready for pickup"
    }

    return (
      delivery.orderStatus !== "DRAFT" &&
      ["In-Transit", "Pending"].includes(delivery.status)
    )
  })
  const hasActiveDelivery = Boolean(activeDelivery)

  const recentDeliveries = deliveries
    .filter((d) => d.type === deliveryTab)
    .filter((d) => d.status === "Delivered" || d.status === "Cancelled")

  // The recent deliveries component should only show if the user has any past delivered/cancelled packages or drafts
  const hasAnyRecentDeliveries =
    deliveries.some((d) => d.status === "Delivered" || d.status === "Cancelled") ||
    packageDrafts.length > 0

  const handleDeleteDelivery = async (e: React.MouseEvent, item: DeliveryItem) => {
    e.stopPropagation()
    if (item.status === "Pending" || item.status === "In-Transit" || item.status === "Ready for pickup") {
      return // Never allow deleting active or in-transit packages
    }
    try {
      if (item.isInbound || item.type === "linked") {
        await packagesApi.unlinkInboundPackage(item.id)
      } else {
        await ordersApi.deleteOrder(item.id)
      }
      setDeliveries((prev) => prev.filter((d) => d.id !== item.id))
    } catch (err: any) {
      console.error("[Home] Delete delivery error:", err)
    }
  }
  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-24 md:pb-16 transition-colors">
      {/* Header Area: Matches Wallet header color & gradient exactly */}
      <div
        className="text-white dark:text-black px-4 sm:px-10 pt-[max(1.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-6 sm:pb-8 rounded-b-[30px] sm:rounded-b-[40px] relative overflow-hidden shrink-0 transition-all shadow-sm"
        style={{
          background:
            resolvedTheme === "dark"
              ? "linear-gradient(to bottom, #FFA600 0%, #FFCC00 100%)"
              : "#1a1a1a",
        }}
      >
        {/* Sunburst Ray Pattern & Glow: Soft wide fanned-out pattern visible, tiny converging base faded out */}
        <div
          className="absolute inset-0 pointer-events-none"
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

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-6 sm:mb-8">
            <div>
              <h1 className="text-xl sm:text-2xl font-medium mb-1 text-white dark:text-black">
                {(() => {
                  const hour = new Date().getHours()
                  const greeting =
                    hour < 12
                      ? "Good morning"
                      : hour < 17
                      ? "Good afternoon"
                      : "Good evening"
                  const name =
                    user?.firstName &&
                    user.firstName.trim() &&
                    user.firstName !== "Customer"
                      ? user.firstName.trim()
                      : user?.email && user.email.includes("@")
                      ? user.email.split("@")[0].charAt(0).toUpperCase() +
                        user.email.split("@")[0].slice(1)
                      : "there"
                  return `${greeting} ${name} 👋🏾`
                })()}
              </h1>
              <p className="text-sm text-gray-400 dark:text-black/75">
                {(user as any)?.city ? `${(user as any).city}, ${(user as any).state || "Edo state"}` : "Auchi, Edo state"}
              </p>
            </div>
            <NotificationButton
              variant="dark-header"
              onClick={onOpenNotifications}
            />
          </div>

          <h2 className="text-2xl sm:text-4xl font-semibold leading-tight mb-6 sm:mb-8 text-white dark:text-black">
            What would you like to do Today?
          </h2>

          {/* Track Package Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (searchTrackingId.trim()) {
                setLinkingTrackingId(searchTrackingId.trim())
              }
              setIsLinkingInbound(true)
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={searchTrackingId}
              onChange={(e) => setSearchTrackingId(e.target.value)}
              placeholder="Track Package"
              className="w-full h-14 bg-white/10 dark:bg-[#141416] text-white dark:text-white placeholder-gray-400 dark:placeholder-gray-400 rounded-full pl-6 pr-14 focus:outline-none focus:ring-2 focus:ring-yellow-400 dark:focus:ring-black border border-white/5 dark:border-black/20 dark:shadow-sm transition-all font-medium"
            />
            <button
              type="submit"
              title={
                searchTrackingId.trim()
                  ? "Search tracking ID"
                  : "Scan package barcode"
              }
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white flex items-center justify-center text-gray-950 shadow-sm hover:bg-gray-100 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              {searchTrackingId.trim().length > 0 ? (
                <Search className="w-5 h-5 text-gray-950 stroke-[2.2] animate-in zoom-in-75 duration-150" />
              ) : (
                <ScanLine className="w-5 h-5 text-gray-950 stroke-[2] animate-in zoom-in-75 duration-150" />
              )}
            </button>
          </form>
        </div>
      </div>

      <div className="flex-1 px-3.5 sm:px-8 md:px-10 py-5 sm:py-9 flex flex-col gap-6 sm:gap-9">
        {(isLoadingDeliveries || deliveriesLoadError) && (
          <div
            role={deliveriesLoadError ? "alert" : "status"}
            className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm ${
              deliveriesLoadError
                ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-100"
                : "border-gray-200 bg-white text-gray-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
            }`}
          >
            <span className="min-w-0">
              {isLoadingDeliveries
                ? "Loading your packages..."
                : `Some package details could not be loaded. ${deliveriesLoadError}`}
            </span>
            {!isLoadingDeliveries && deliveriesLoadError && (
              <button
                type="button"
                onClick={() => void fetchDeliveries()}
                className="inline-flex shrink-0 items-center gap-1.5 font-semibold underline underline-offset-2"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Retry
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          <button
            onClick={handleSendPackageClick}
            className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/90 dark:hover:bg-yellow-400/10 border border-gray-100 dark:border-white/5 hover:border-yellow-400/60 dark:hover:border-yellow-400/40 rounded-2xl p-3 sm:p-5 flex items-center justify-start gap-2.5 sm:gap-3.5 hover:shadow-lg hover:shadow-yellow-500/10 hover:-translate-y-1 active:translate-y-0 active:scale-[0.96] active:bg-yellow-100/80 dark:active:bg-yellow-400/20 transition-all duration-200 ease-out active:duration-75 group shadow-xs cursor-pointer touch-manipulation text-left select-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1a1a1a] dark:bg-[#FFCC00] rounded-xl flex items-center justify-center border border-black/10 dark:border-yellow-400/80 group-hover:scale-105 group-hover:rotate-[-3deg] group-active:scale-95 group-active:rotate-0 transition-all duration-200 shrink-0 shadow-2xs">
              <Send className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#FFCC00] dark:text-[#141416] group-hover:translate-x-0.5 group-active:translate-x-0 transition-all" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white group-hover:text-yellow-950 dark:group-hover:text-white text-xs sm:text-base text-left leading-tight transition-colors">
              Send
              <br />
              Package
            </span>
          </button>

          <button
            onClick={handleReceivePackageClick}
            className="bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/90 dark:hover:bg-yellow-400/10 border border-gray-100 dark:border-white/5 hover:border-yellow-400/60 dark:hover:border-yellow-400/40 rounded-2xl p-3 sm:p-5 flex items-center justify-start gap-2.5 sm:gap-3.5 hover:shadow-lg hover:shadow-yellow-500/10 hover:-translate-y-1 active:translate-y-0 active:scale-[0.96] active:bg-yellow-100/80 dark:active:bg-yellow-400/20 transition-all duration-200 ease-out active:duration-75 group shadow-xs cursor-pointer touch-manipulation text-left select-none"
          >
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#1a1a1a] dark:bg-[#FFCC00] rounded-xl flex items-center justify-center border border-black/10 dark:border-yellow-400/80 group-hover:scale-105 group-hover:rotate-[3deg] group-active:scale-95 group-active:rotate-0 transition-all duration-200 shrink-0 shadow-2xs">
              <Download className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-[#FFCC00] dark:text-[#141416] group-hover:translate-y-0.5 group-active:translate-y-0 transition-all" />
            </div>
            <span className="font-semibold text-gray-900 dark:text-white group-hover:text-yellow-950 dark:group-hover:text-white text-xs sm:text-base text-left leading-tight transition-colors">
              Receive
              <br />
              Package
            </span>
          </button>
        </div>

        {/* Unfinished Draft Resume Banner */}
        {packageDrafts.length > 0 && (
          <div
            onClick={() => handleResumeDraft(packageDrafts[0])}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-[#1c1c20] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-colors group -mt-2 sm:-mt-3 gap-3"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-gray-200/70 dark:bg-white/10 text-gray-600 dark:text-gray-300 flex items-center justify-center shrink-0">
                <FileEdit className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-gray-300 uppercase tracking-wider">
                    Draft
                  </span>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                    {packageDrafts[0].packageName || "Untitled Package"}
                  </p>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-1">
                  Saved at {getDraftStepLabel(packageDrafts[0].step)} · {packageDrafts[0].dateFormatted || "Recently"}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end sm:justify-start gap-1 text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:translate-x-0.5 transition-transform shrink-0 pl-14 sm:pl-2">
              <span>Continue draft</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        )}

        {/* Current Delivery - Only rendered if user has an active pending or in-transit delivery */}
        {hasActiveDelivery && activeDelivery && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Current delivery
              </h3>
              <button
                type="button"
                onClick={() => setIsViewingAllCurrentDeliveries(true)}
                className="text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white underline underline-offset-4 decoration-gray-300 dark:decoration-gray-600 cursor-pointer"
              >
                See All
              </button>
            </div>

            <ActiveDeliveryCard
              orderId={activeDelivery.isInbound ? undefined : activeDelivery.id}
              title={activeDelivery.title}
              status={activeDelivery.status === "In-Transit" ? "IN-TRANSIT" : activeDelivery.status}
              orderStatus={activeDelivery.orderStatus}
              fromLocation={activeDelivery.fromLocation}
              toLocation={activeDelivery.isInbound ? activeDelivery.toLocation : "Me"}
              date={activeDelivery.date}
              onClick={() => {
                if (activeDelivery.isInbound) {
                  setSelectedDelivery({
                    id: activeDelivery.id,
                    title: activeDelivery.title,
                    trackingCode: activeDelivery.trackingId,
                    status: activeDelivery.status,
                    image: activeDelivery.image,
                    fromLocation: activeDelivery.fromLocation,
                    toLocation: activeDelivery.toLocation,
                    category: activeDelivery.category,
                    isInbound: true,
                    courier: activeDelivery.courier,
                    shippedDate: activeDelivery.shippedDate,
                    estimatedArrival: activeDelivery.estimatedArrival,
                    isArrived: activeDelivery.isArrived,
                    arrivedDate: activeDelivery.arrivedDate,
                    pickupTerminal: activeDelivery.pickupTerminal,
                    tracks: activeDelivery.tracks,
                    payUrl: activeDelivery.payUrl,
                  })
                  return
                }
                setActiveTrackingPackage({
                  packageName: activeDelivery.title,
                  fromLocation: activeDelivery.fromLocation,
                  toLocation: activeDelivery.toLocation,
                  trackingId: activeDelivery.trackingId,
                  category: activeDelivery.category,
                  weight: "Standard",
                  riderName: activeDelivery.rider?.name || activeDelivery.courier,
                  orderId: activeDelivery.id,
                  image: activeDelivery.image,
                  status: activeDelivery.orderStatus,
                  rider: activeDelivery.rider,
                })
                setIsViewingPackageStatus(true)
              }}
            />
          </section>
        )}

        {/* Recent Deliveries (Directly below Current delivery) - Only rendered if user has recent packages or drafts */}
        {hasAnyRecentDeliveries && (
          <section className="space-y-3.5 sm:space-y-4">
            <div className="flex flex-col gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                Recent deliveries
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Past shipments & inbound packages
              </p>
            </div>

            {/* Mobile-Optimized Tab Buttons */}
            <div className="bg-gray-100 dark:bg-white/5 p-1 rounded-full flex w-full sm:w-fit border border-gray-200/60 dark:border-white/5">
              <button
                onClick={() => setDeliveryTab("my")}
                className={`flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-4 rounded-full font-medium transition-all text-center cursor-pointer touch-manipulation ${
                  deliveryTab === "my"
                    ? "bg-yellow-400 text-black font-bold shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                My Packages
              </button>
              <button
                onClick={() => setDeliveryTab("linked")}
                className={`flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-4 rounded-full font-medium transition-all text-center cursor-pointer touch-manipulation ${
                  deliveryTab === "linked"
                    ? "bg-yellow-400 text-black font-bold shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Inbound
              </button>
              <button
                onClick={() => setDeliveryTab("drafts")}
                className={`flex-1 sm:flex-initial text-xs sm:text-sm py-2 px-4 rounded-full font-medium transition-all text-center cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 ${
                  deliveryTab === "drafts"
                    ? "bg-yellow-400 text-black font-bold shadow-xs"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span>Drafts</span>
                {packageDrafts.length > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      deliveryTab === "drafts"
                        ? "bg-black text-yellow-400"
                        : "bg-yellow-400 text-black"
                    }`}
                  >
                    {packageDrafts.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Deliveries / Drafts List */}
          <div className="space-y-2.5 sm:space-y-3">
            {deliveryTab === "drafts" ? (
              packageDrafts.length === 0 ? (
                <div className="bg-white dark:bg-[#161618] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                    No unfinished package drafts. If you opt out while entering package information, your progress will be saved here automatically.
                  </p>
                </div>
              ) : (
                packageDrafts.map((draft) => (
                  <SwipeToDeleteItem
                    key={draft.id}
                    onDelete={() => promptDeleteDraft(draft)}
                    deleteLabel="Delete"
                  >
                    <div
                      onClick={() => handleResumeDraft(draft)}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-50 dark:bg-[#1c1c20] rounded-2xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/[0.07] transition-colors duration-200 gap-3.5 sm:gap-3.5 group touch-manipulation"
                    >
                      <div className="flex items-start gap-3 min-w-0 w-full sm:flex-1">
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleResumeDraft(draft)
                          }}
                          className="inline-flex flex-1 sm:flex-none items-center justify-center gap-1.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-200 text-white dark:text-gray-900 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors cursor-pointer active:scale-[0.98] touch-manipulation"
                        >
                          <span>Continue draft</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </SwipeToDeleteItem>
                ))
              )
            ) : recentDeliveries.length === 0 ? (
              <div className="bg-white dark:bg-[#161618] border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-6 text-center">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  No {deliveryTab === "my" ? "outbound packages" : "linked inbound packages"} found.
                </p>
              </div>
            ) : (
              recentDeliveries.slice(0, 4).map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedDelivery({
                    id: item.id,
                    title: item.title,
                    store: item.store,
                    trackingCode: item.trackingId.startsWith("DART-")
                      ? `#42324-HUD-${item.trackingId.replace("DART-", "")}`
                      : item.trackingId,
                    status: item.status,
                    orderStatus: item.orderStatus,
                    image: item.image,
                    fromLocation:
                      item.fromLocation ||
                      (item.store === "AliExpress"
                        ? "China, Beijing"
                        : item.store.toUpperCase()),
                    toLocation:
                      item.toLocation ||
                      (item.isArrived
                        ? "GIG Terminal, Auchi, Edo state"
                        : "Akpakpava, Benin"),
                    date: item.date.includes("Today")
                      ? "Today"
                      : item.date.includes("Yesterday")
                        ? "Yesterday"
                        : item.date.split(" ")[0],
                    time:
                      item.date.includes("PM") || item.date.includes("AM")
                        ? item.date.split(" ").slice(-2).join(" ")
                        : "12:47 PM",
                    weight: "Medium",
                    category:
                      item.category ||
                      (item.title.toLowerCase().includes("shoe")
                        ? "Clothes"
                        : item.title.toLowerCase().includes("phone") ||
                            item.title.toLowerCase().includes("airpods") ||
                            item.title.toLowerCase().includes("macbook")
                          ? "Electronics"
                          : "Accessories"),
                    fragileNote:
                      "Note: this Item was labelled as sensitive and fragile",
                    isInbound: item.isInbound ?? item.type === "linked",
                    courier: item.courier || item.store,
                    shippedDate: item.shippedDate || "Jun 28th 2026",
                    estimatedArrival: item.estimatedArrival || "Jul 30th 2026",
                    isArrived: item.isArrived,
                    arrivedDate: item.arrivedDate || "Jul 30th 2026 • 12:47 PM",
                    pickupTerminal:
                      item.pickupTerminal || "GIG Terminal, Auchi, Edo state",
                    tracks: item.tracks,
                    payUrl: item.payUrl,
                    rider: item.rider,
                  })
                }}
                className="flex items-center justify-between p-3.5 sm:p-4.5 bg-white dark:bg-[#1c1c20] hover:bg-yellow-50/80 dark:hover:bg-yellow-400/10 border border-gray-100 dark:border-white/5 hover:border-yellow-300/80 dark:hover:border-yellow-400/30 rounded-2xl cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 gap-3 sm:gap-3.5 group touch-manipulation"
              >
                {/* Package State Graphic */}
                <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 shrink-0 flex items-center justify-center p-1.5">
                  <PackageStateIcon
                    status={item.status}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1 pr-1">
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
                    {item.status}
                  </span>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base transition-colors truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                    From {item.store} • {item.date}
                  </p>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {item.status !== "In-Transit" && item.status !== "Pending" && item.status !== "Ready for pickup" && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteDelivery(e, item)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors cursor-pointer"
                      title="Delete package"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            )))}
          </div>

          {/* View All Navlink at Bottom */}
          <div className="pt-1 text-center">
            <button
              onClick={onNavigateToPackages}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl sm:rounded-full bg-white dark:bg-[#1c1c20] hover:bg-gray-50 dark:hover:bg-white/5 border border-gray-200/80 dark:border-white/10 text-xs sm:text-sm font-semibold text-gray-900 dark:text-white hover:text-yellow-600 dark:hover:text-yellow-400 shadow-2xs transition-all group cursor-pointer touch-manipulation"
            >
              <span>
                View all {deliveryTab === "my" ? "my" : "linked"} packages
              </span>
              <ArrowRight className="w-4 h-4 text-yellow-500 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          </section>
        )}

        {/* Empty State: Matches user's exact design mockup when no active or past deliveries exist */}
        {!hasActiveDelivery && !hasAnyRecentDeliveries && (
          <section className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                My deliveries
              </h3>
              <button
                type="button"
                onClick={onNavigateToPackages}
                className="text-sm font-semibold text-gray-900 dark:text-white hover:underline underline-offset-4 cursor-pointer"
              >
                See All
              </button>
            </div>

            <div className="flex flex-col items-center justify-center text-center py-6 sm:py-8 px-4">
              <img
                src={emptyStateBoxSvg}
                alt="No deliveries yet"
                className="w-24 h-24 sm:w-28 sm:h-28 object-contain mb-5"
              />
              <h4 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-1.5">
                Your first delivery starts here
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs sm:max-w-sm mb-6 leading-relaxed">
                Send packages across town in minutes with trusted riders and real-time tracking.
              </p>
              <button
                type="button"
                onClick={handleSendPackageClick}
                className="w-full max-w-[280px] bg-[#FFCC00] hover:bg-[#f5c400] active:scale-98 text-gray-950 font-bold py-3.5 px-6 rounded-2xl transition-all shadow-sm cursor-pointer touch-manipulation text-sm"
              >
                Book a Delivery
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Modals */}
      <ReceivePackageModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        onSelectOption={(option) => {
          if (option === "pickup") {
            setIsReceiveModalOpen(false)
            setIsRequestingPickup(true)
          } else if (option === "inbound") {
            setIsReceiveModalOpen(false)
            setIsLinkingInbound(true)
          }
        }}
      />
      <SendPackageModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onPhotoConfirmed={(photo) => {
          setSendPackagePhoto(photo)
          setIsSendModalOpen(false)
          setIsSendingPackage(true)
        }}
      />
      <VerificationRequiredModal
        isOpen={isVerificationModalOpen && !isUserVerified}
        onClose={() => {
          setIsVerificationModalOpen(false)
          setPendingAction(null)
        }}
        onVerifyNow={() => {
          setIsVerificationModalOpen(false)
          setPendingAction(null)
          if (onNavigateToAccount) {
            onNavigateToAccount()
          }
        }}
        onVerifiedSuccess={() => {
          if (pendingAction === "send") {
            setIsSendModalOpen(true)
          } else if (pendingAction === "receive") {
            setIsReceiveModalOpen(true)
          }
          setPendingAction(null)
        }}
      />
      <CustomDeleteModal
        isOpen={Boolean(draftToDelete)}
        title="Delete draft?"
        message={`Are you sure you want to delete "${draftToDelete?.packageName || "Untitled Package"}"? This action cannot be undone.`}
        confirmText="Delete Draft"
        onConfirm={handleConfirmDeleteDraft}
        onClose={() => setDraftToDelete(null)}
      />
    </div>
  )
}
