import { useEffect, useState, useRef, useCallback } from "react"
import { ordersApi } from "../api/orders.api"
import { useRider } from "../context/RiderContext"
import { useToast } from "../context/ToastContext"
import { goBack, navigate } from "../hooks/router"
import {
  STATUS_LABEL,
  formatAddress,
  formatNaira,
  getCurrentPosition,
  riderEarning,
} from "../utils/format"
import {
  ArrowLeft,
  Copy,
  MapPin,
  Navigation as NavIcon,
  Phone,
  MessageCircle,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Sun,
  Scan,
  Smartphone,
  X,
  ChevronsRight,
  Timer,
  LocateFixed,
  Package,
  Upload,
  ClipboardPaste,
  Headphones,
} from "lucide-react"
import type { Order } from "../types/api.types"
import goodMark from "../assets/good-mark.svg"
import { ConfettiBackground } from "../components/ConfettiBackground"

type ViewTab = "delivery_details" | "package_details"
type WorkflowStep =
  | "initial"
  | "navigation"
  | "arrived"
  | "in_transit"
  | "confirm_delivery"
  | "completed"
type CompletionView = "success" | "details" | "legacy_details"

export function JobDetailPage({ orderId }: { orderId: string }) {
  const { reloadOrders, lastLocation } = useRider()
  const toast = useToast()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Tabs on Screen 1 & 2
  const [activeTab, setActiveTab] = useState<ViewTab>("delivery_details")

  // Overall workflow step (Screens 1/2 -> 3 -> 4 -> in_transit)
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("initial")
  const [completionView, setCompletionView] = useState<CompletionView>("success")
  const completionConfirmedHereRef = useRef(false)

  // Screen 5: Prompt Modal ("Take a photo of the package")
  const [showPhotoPromptModal, setShowPhotoPromptModal] = useState(false)

  // Screen 6: Camera Viewfinder ("Capture The Package")
  const [showCameraViewfinder, setShowCameraViewfinder] = useState(false)

  // Screen 7: Photo Review & Confirm
  const [showPhotoPreview, setShowPhotoPreview] = useState(false)
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null)

  // Delivery code is entered after the rider confirms the package handover.
  const [handoverCode, setHandoverCode] = useState("")
  const [hasHandedOverPackage, setHasHandedOverPackage] = useState(false)

  // Cancel order modal
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState("")

  // Swipe slider state (Screen 3)
  const [swipeProgress, setSwipeProgress] = useState(0) // 0 to 100
  const isDraggingRef = useRef(false)
  const sliderTrackRef = useRef<HTMLDivElement | null>(null)
  const [navigationDeadline, setNavigationDeadline] = useState<number | null>(null)
  const [navigationClock, setNavigationClock] = useState(() => Date.now())
  const [mapFocusedOnRider, setMapFocusedOnRider] = useState(false)

  // Camera video / canvas refs
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false)

  const loadOrder = async () => {
    setError(null)
    try {
      const data = await ordersApi.get(orderId)
      setOrder(data)
      const estimateStartEvent = data.deliveryEvents
        ?.filter((event) => event.status === "RIDER_ACCEPTED" || event.status === "PICKUP_PENDING")
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
        .at(-1)
      const estimateStartedAt = estimateStartEvent ? Date.parse(estimateStartEvent.createdAt) : Date.now()
      setNavigationDeadline(
        data.estimatedMinutes != null && Number.isFinite(data.estimatedMinutes)
          ? estimateStartedAt + Math.max(0, data.estimatedMinutes) * 60_000
          : null,
      )
      setNavigationClock(Date.now())
      if (
        data.status === "DELIVERED" ||
        data.status === "CUSTOMER_CONFIRMED" ||
        data.status === "SETTLED"
      ) {
        setWorkflowStep("completed")
        if (!completionConfirmedHereRef.current) {
          setCompletionView("legacy_details")
        }
      } else if (
        data.status === "PICKED_UP" ||
        data.status === "IN_TRANSIT"
      ) {
        setWorkflowStep("in_transit")
      }
    } catch (err: any) {
      setError(err.message || "Failed to load order details")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrder()
  }, [orderId])

  useEffect(() => {
    if (navigationDeadline === null) return
    const timerId = window.setInterval(() => setNavigationClock(Date.now()), 1000)
    return () => window.clearInterval(timerId)
  }, [navigationDeadline])

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    }
    toast(`${label} copied to clipboard!`, "success")
  }

  // Camera stream handler
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        })
        mediaStreamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        setCameraPermissionGranted(true)
      }
    } catch (err) {
      console.warn("Camera access not available:", err)
      setCameraPermissionGranted(false)
      toast("Camera unavailable. Upload a package photo instead.", "info")
    }
  }

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }
  }

  useEffect(() => {
    if (showCameraViewfinder) {
      startCamera()
    } else {
      stopCamera()
    }
    return () => {
      stopCamera()
    }
  }, [showCameraViewfinder])

  // Trigger shutter click
  const handleShutterCapture = () => {
    if (cameraPermissionGranted && videoRef.current) {
      const video = videoRef.current
      const canvas = document.createElement("canvas")
      canvas.width = video.videoWidth || 640
      canvas.height = video.videoHeight || 480
      const ctx = canvas.getContext("2d")
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
        setCapturedPhotoUrl(dataUrl)
      } else {
        toast("Could not capture the photo. Please upload an image.", "error")
        fileInputRef.current?.click()
        return
      }
    } else {
      fileInputRef.current?.click()
      return
    }
    stopCamera()
    setShowCameraViewfinder(false)
    setShowPhotoPreview(true)
  }

  // File upload fallback
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        setCapturedPhotoUrl(reader.result as string)
        stopCamera()
        setShowCameraViewfinder(false)
        setShowPhotoPreview(true)
      }
      reader.readAsDataURL(file)
    }
  }

  // Confirm photo and transition order state to PICKED_UP
  const handleConfirmPickupPhoto = async () => {
    setActionLoading(true)
    try {
      await ordersApi.pickup(orderId)
      toast("Package picked up! In transit to destination.", "success")
      setShowPhotoPreview(false)
      setWorkflowStep("in_transit")
      await reloadOrders()
      await loadOrder()
    } catch (err: any) {
      toast(err.message || "Failed to mark package picked up", "error")
    } finally {
      setActionLoading(false)
    }
  }

  const handlePasteHandoverCode = async () => {
    try {
      const pastedText = await navigator.clipboard.readText()
      const digits = pastedText.replace(/\D/g, "").slice(0, 5)
      if (!digits) {
        toast("No delivery code found in clipboard.", "info")
        return
      }
      setHandoverCode(digits)
    } catch {
      toast("Clipboard access is unavailable. Please enter the code manually.", "error")
    }
  }

  // Submit Handover Code from recipient
  const handleConfirmDelivery = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^\d{5}$/.test(handoverCode.trim())) {
      toast("Please enter the 5-digit delivery handover confirmation code", "error")
      return
    }

    setActionLoading(true)
    try {
      const coords = await getCurrentPosition()
      await ordersApi.confirmDelivery(orderId, {
        code: handoverCode.trim(),
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      })
      toast("Delivery completed and settlement credited to your wallet!", "success")
      completionConfirmedHereRef.current = true
      setHandoverCode("")
      setCompletionView("success")
      setWorkflowStep("completed")
      await reloadOrders()
      await loadOrder()
    } catch (err: any) {
      toast(err.message || "Invalid handover code. Please verify with recipient.", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Cancel order
  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cancelReason.trim()) {
      toast("Please provide a reason for cancelling", "error")
      return
    }

    setActionLoading(true)
    try {
      await ordersApi.cancel(orderId, cancelReason.trim())
      toast("Order cancelled and released.", "info")
      setCancelSheetOpen(false)
      navigate("/jobs")
    } catch (err: any) {
      toast(err.message || "Failed to cancel order", "error")
    } finally {
      setActionLoading(false)
    }
  }

  // Swipe to complete logic (Screen 3)
  const handleStartDrag = () => {
    isDraggingRef.current = true
  }

  const handleDrag = useCallback(
    (clientX: number) => {
      if (!isDraggingRef.current || !sliderTrackRef.current) return
      const rect = sliderTrackRef.current.getBoundingClientRect()
      const maxDistance = rect.width - 60
      const currentX = Math.max(0, Math.min(clientX - rect.left - 30, maxDistance))
      const percent = (currentX / maxDistance) * 100
      setSwipeProgress(percent)

      if (percent >= 80) {
        isDraggingRef.current = false
        setSwipeProgress(100)
        setTimeout(() => {
          setWorkflowStep("arrived")
          toast("Arrived at pickup location!", "success")
        }, 150)
      }
    },
    [toast],
  )

  const handleEndDrag = () => {
    if (!isDraggingRef.current) return
    isDraggingRef.current = false
    if (swipeProgress < 80) {
      setSwipeProgress(0)
    }
  }

  const openNavigation = () => {
    const destination =
      workflowStep === "in_transit" ||
      workflowStep === "confirm_delivery" ||
      workflowStep === "completed"
        ? order?.destinationAddress
        : order?.pickupAddress
    const coordinates =
      destination?.latitude != null && destination.longitude != null
        ? `${destination.latitude},${destination.longitude}`
        : formatAddress(destination)
    if (!coordinates || coordinates === "—") {
      toast("The destination address is unavailable.", "error")
      return
    }

    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(coordinates)}`
    window.open(mapsUrl, "_blank", "noopener,noreferrer")
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handleDrag(e.clientX)
    const onMouseUp = () => handleEndDrag()
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) handleDrag(e.touches[0].clientX)
    }
    const onTouchEnd = () => handleEndDrag()

    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    window.addEventListener("touchmove", onTouchMove)
    window.addEventListener("touchend", onTouchEnd)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
      window.removeEventListener("touchmove", onTouchMove)
      window.removeEventListener("touchend", onTouchEnd)
    }
  }, [handleDrag, swipeProgress])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[300px]">
        <div className="size-10 rounded-full border-3 border-yellow-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertTriangle className="size-12 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Could not load delivery</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">{error || "Order not found"}</p>
        <button
          onClick={() => navigate("/jobs")}
          className="px-5 py-2.5 bg-yellow-400 text-black font-bold text-xs rounded-xl hover:bg-yellow-300 cursor-pointer"
        >
          Back to Jobs
        </button>
      </div>
    )
  }

  const packageName = order.package?.name || "Package details unavailable"
  const trackingNumber = order.orderNumber || order.trackingId
  const packagePhoto = order.package?.photoUrl
  const pickupCity = order.pickupAddress?.city || order.pickupAddress?.state || "Location unavailable"
  const dropoffCity = order.destinationAddress?.city || order.destinationAddress?.state || "Location unavailable"
  const customerName =
    [order.customer?.firstName, order.customer?.lastName].filter(Boolean).join(" ") || "Customer"
  const packageWeight =
    order.package?.weightKg != null ? `${order.package.weightKg} kg` : "Not provided"
  const packageCategory =
    order.package?.category?.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) ||
    "Not specified"
  const statusLabel = STATUS_LABEL[order.status] || order.status.replace(/_/g, " ")
  const mapAddress =
    workflowStep === "in_transit" ||
    workflowStep === "confirm_delivery" ||
    workflowStep === "completed"
    ? order.destinationAddress
    : order.pickupAddress
  const isNavigatingToDropoff =
    workflowStep === "in_transit" ||
    workflowStep === "confirm_delivery" ||
    workflowStep === "completed"
  const mapLatitude = mapAddress?.latitude
  const mapLongitude = mapAddress?.longitude
  const focusedLatitude =
    workflowStep === "navigation" && mapFocusedOnRider ? lastLocation?.lat : mapLatitude
  const focusedLongitude =
    workflowStep === "navigation" && mapFocusedOnRider ? lastLocation?.lng : mapLongitude
  const pickupAddressLabel =
    formatAddress(order.pickupAddress) === "—" ? "Pickup address unavailable" : formatAddress(order.pickupAddress)
  const dropoffAddressLabel =
    formatAddress(order.destinationAddress) === "—" ? "Drop-off address unavailable" : formatAddress(order.destinationAddress)
  const mapUrl =
    typeof focusedLatitude === "number" &&
    Number.isFinite(focusedLatitude) &&
    typeof focusedLongitude === "number" &&
    Number.isFinite(focusedLongitude) &&
    Math.abs(focusedLatitude) <= 90 &&
    Math.abs(focusedLongitude) <= 180
      ? `https://www.openstreetmap.org/export/embed.html?bbox=${focusedLongitude - 0.008},${focusedLatitude - 0.006},${focusedLongitude + 0.008},${focusedLatitude + 0.006}&layer=mapnik&marker=${focusedLatitude},${focusedLongitude}`
      : null
  const remainingEstimateSeconds =
    navigationDeadline === null ? null : Math.max(0, Math.ceil((navigationDeadline - navigationClock) / 1000))
  const remainingEstimate =
    remainingEstimateSeconds === null
      ? null
      : `${Math.floor(remainingEstimateSeconds / 60)
          .toString()
          .padStart(2, "0")}:${(remainingEstimateSeconds % 60).toString().padStart(2, "0")}`
  const remainingEstimateLabel = remainingEstimate ? `${remainingEstimate} min` : "—"
  const pickupEvent = order.deliveryEvents
    ?.filter((event) => event.status === "PICKED_UP" || event.status === "IN_TRANSIT")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .at(-1)
  const deliveredEvent = order.deliveryEvents
    ?.filter((event) => event.status === "DELIVERED" || event.status === "CUSTOMER_CONFIRMED" || event.status === "SETTLED")
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))
    .at(-1)
  const actualDeliveryMinutes =
    pickupEvent && deliveredEvent
      ? Math.max(
          0,
          Math.round((Date.parse(deliveredEvent.createdAt) - Date.parse(pickupEvent.createdAt)) / 60_000),
        )
      : null
  const deliveryDuration = actualDeliveryMinutes ?? order.estimatedMinutes
  const earnings = riderEarning(order)
  const addressSummary = (address?: Order["pickupAddress"]) =>
    [address?.city, address?.state].filter(Boolean).join(", ") || "Address unavailable"
  const completedAt =
    deliveredEvent && Number.isFinite(Date.parse(deliveredEvent.createdAt))
      ? new Date(deliveredEvent.createdAt)
      : null
  const completedDate = completedAt
    ? completedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "Date unavailable"
  const completedTime = completedAt
    ? completedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Time unavailable"
  const startNavigation = () => {
    setMapFocusedOnRider(false)
    setSwipeProgress(0)
    setWorkflowStep("navigation")
  }

  return (
    <div className={`${workflowStep === "navigation" ? "fixed inset-0 z-[60] h-[100dvh] w-screen max-w-none md:static md:z-auto md:h-full md:w-full md:max-w-xl 2xl:md:max-w-2xl md:mx-auto" : workflowStep === "completed" ? "fixed inset-0 z-[70] h-[100dvh] w-screen max-w-none bg-white dark:bg-[#0c0c0e] md:static md:z-auto md:h-full md:w-full md:max-w-xl 2xl:md:max-w-2xl md:mx-auto" : "w-full max-w-xl 2xl:max-w-2xl mx-auto"} flex-1 min-h-0 flex flex-col bg-[#f8f9fa] dark:bg-[#0c0c0e] md:border border-gray-200/80 dark:border-white/10 md:shadow-md relative overflow-hidden select-none my-0 rounded-none`}>
      {/* Scrollable Middle Container for all Navigation Screens */}
      <div className={`flex-1 min-h-0 ${workflowStep === "navigation" ? "overflow-hidden" : "overflow-y-auto"} flex flex-col relative w-full`}>
        {workflowStep !== "completed" && (
          <>
        {/* 1. Header (Sticky floating over top of middle component) */}
        <header className={`${workflowStep === "navigation" ? "absolute" : "sticky"} top-0 left-0 right-0 z-30 px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between pointer-events-auto ${workflowStep === "navigation" ? "" : "-mb-16"}`}>
        <button
          type="button"
          onClick={() => {
            if (workflowStep === "navigation") {
              setWorkflowStep("initial")
            } else if (workflowStep === "arrived") {
              setWorkflowStep("navigation")
            } else if (workflowStep === "confirm_delivery") {
              setWorkflowStep("in_transit")
            } else {
              goBack()
            }
          }}
          className="size-10 flex items-center justify-center rounded-full bg-white/80 dark:bg-black/60 backdrop-blur-md text-gray-900 dark:text-white shadow-xs hover:bg-white dark:hover:bg-black transition cursor-pointer"
          title="Go back"
        >
          <ArrowLeft className="size-5 stroke-[2.2]" />
        </button>

        {workflowStep === "navigation" ? (
          /* Floating Center Location Pill (Screen 3) */
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 dark:bg-[#1c1c20]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-gray-200/80 dark:border-white/10 shadow-sm max-w-[min(70vw,360px)]">
            <div className="size-6 rounded-full bg-yellow-400 flex items-center justify-center text-black">
              <NavIcon className="size-3.5 fill-current" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-gray-900 dark:text-white leading-tight">
                {isNavigatingToDropoff ? "Drop-off location" : "Your Location"}
              </p>
              <p className="max-w-[42vw] truncate text-[10px] text-gray-500 dark:text-gray-400 leading-none sm:max-w-xs">
                {isNavigatingToDropoff ? dropoffAddressLabel : [order.pickupAddress?.city, order.pickupAddress?.state].filter(Boolean).join(", ") || pickupAddressLabel}
              </p>
            </div>
          </div>
        ) : (
          <span aria-hidden="true" className="size-10" />
        )}

      </header>

      {/* 2. Route overview */}
      <div className={`relative w-full shrink-0 overflow-hidden bg-[#e8ecf2] dark:bg-[#1a1c22] ${
        workflowStep === "navigation"
          ? "absolute inset-0 h-full min-h-0"
          : "h-[48dvh] min-h-[320px] max-h-[520px]"
      }`}>
        {mapUrl ? (
          <iframe
            title={`Map to ${isNavigatingToDropoff ? "drop-off" : "pickup"} location`}
            src={mapUrl}
            className="absolute inset-0 size-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-100 px-8 text-center dark:bg-[#1a1c22]">
            <MapPin className="size-9 text-yellow-500" />
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              Map preview unavailable
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This order does not include coordinates. Use the address to open directions.
            </p>
          </div>
        )}

        <div className={`absolute left-1/2 z-20 -translate-x-1/2 pointer-events-none ${workflowStep === "navigation" ? "top-[38%]" : "top-20"}`}>
          <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-[#181a20]/90 px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg backdrop-blur-md">
            <Timer className="size-3.5 text-yellow-400" />
            <span>
              {order.estimatedMinutes != null
                ? `${remainingEstimateLabel}${order.distanceKm != null ? ` · ${order.distanceKm.toFixed(1)} km` : ""}`
                : "No travel estimate available"}
            </span>
          </div>
        </div>

        {/* Open the destination in the rider's navigation app */}
        <button
          type="button"
          onClick={() => {
            if (workflowStep === "navigation") {
              if (!lastLocation) {
                toast("Your current location is not available yet.", "info")
                return
              }
              setMapFocusedOnRider(true)
              return
            }
            openNavigation()
          }}
          className={`absolute right-4 z-20 size-11 rounded-full bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 text-gray-800 dark:text-white shadow-md flex items-center justify-center hover:scale-105 active:scale-95 transition cursor-pointer ${
            workflowStep === "navigation" ? "bottom-[190px]" : "bottom-6 sm:bottom-8"
          }`}
          title={workflowStep === "navigation" ? "Show your current location" : "Open destination in maps"}
        >
          {workflowStep === "navigation" ? <LocateFixed className="size-5 stroke-[2]" /> : <NavIcon className="size-5 stroke-[2]" />}
        </button>
      </div>
          </>
        )}

      {/* 3. Bottom Cards per Workflow Screen */}

      {/* ========================================================================= */}
      {/* SCREEN 3: NAVIGATION MODE (Yellow Card with "Swipe to complete" slider)   */}
      {/* ========================================================================= */}
      {workflowStep === "navigation" && (
        <div className="absolute bottom-4 left-5 right-5 z-30 rounded-[24px] bg-gradient-to-br from-[#ffcf00] to-[#ffb900] p-2 shadow-xl sm:left-6 sm:right-6 sm:bottom-6">
          <div className="px-3 pb-2 pt-2 text-center">
            <p className="text-sm font-medium text-gray-900">Estimated time left</p>
            <p className="mt-0.5 text-[30px] font-semibold leading-none tracking-tight text-black">
              {remainingEstimate?.split(":")[0] ?? "--"}:{remainingEstimate?.split(":")[1] ?? "--"}
              <span className="ml-1 text-base font-medium">mins</span>
            </p>
          </div>

          <div
            ref={sliderTrackRef}
            className="relative h-[72px] w-full rounded-[18px] bg-white p-2 flex items-center shadow-inner overflow-hidden select-none"
          >
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="pl-14 text-base font-medium text-gray-800">Swipe to complete</span>
            </div>

            <div
              className="h-full rounded-xl bg-[#ffcc00]/30 transition-all duration-75"
              style={{ width: `${swipeProgress}%` }}
            />

            <div
              onMouseDown={handleStartDrag}
              onTouchStart={handleStartDrag}
              className="absolute left-2 top-2 flex size-[56px] items-center justify-center rounded-xl bg-[#ffcc00] text-black shadow-sm cursor-grab active:cursor-grabbing transition-transform duration-75 touch-none"
              style={{
                left: `${Math.max(0, swipeProgress)}%`,
                transform: `translateX(calc(8px - ${(72 * swipeProgress) / 100}px))`,
              }}
            >
              <ChevronsRight className="size-6 stroke-[2]" />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1 & 2: INITIAL JOB DETAILS TABS (Delivery Details & Package Details)*/}
      {/* ========================================================================= */}
      {workflowStep === "initial" && (
        <div className="w-full bg-white dark:bg-[#161618] border-t border-gray-100 dark:border-white/5 shadow-2xl px-5 pt-2 pb-5 sm:px-6 sm:pt-3 sm:pb-6 relative z-30 transition-colors rounded-t-[30px]">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="space-y-4">
            {/* Header: Title, Code with Copy icon, and PENDING badge */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight truncate">
                  {packageName}
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="font-mono">{trackingNumber}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(trackingNumber, "Tracking Number")}
                    className="hover:text-gray-800 dark:hover:text-white p-0.5 cursor-pointer"
                    title="Copy Tracking ID"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>

              {activeTab !== "package_details" && (
                <span className="px-3 py-1 rounded-full bg-[#FFCC00] text-gray-950 font-bold text-[11px] tracking-wider uppercase shrink-0 shadow-2xs">
                  {statusLabel}
                </span>
              )}
            </div>

            {/* Unified Toggle Switch: Delivery details vs. Package details */}
            <div className="w-full p-1 bg-gray-100 dark:bg-white/10 rounded-full flex items-center relative border border-gray-200/60 dark:border-white/5 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveTab("delivery_details")}
                className={`flex-1 py-2 sm:py-2.5 px-3 rounded-full text-xs font-bold transition-all duration-200 text-center cursor-pointer select-none ${
                  activeTab === "delivery_details"
                    ? "bg-[#FFCC00] text-gray-950 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Delivery details
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("package_details")}
                className={`flex-1 py-2 sm:py-2.5 px-3 rounded-full text-xs font-bold transition-all duration-200 text-center cursor-pointer select-none ${
                  activeTab === "package_details"
                    ? "bg-[#FFCC00] text-gray-950 shadow-sm"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Package details
              </button>
            </div>

            {/* Tab 1: Delivery details */}
            {activeTab === "delivery_details" && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                <div className="space-y-3">
                  {/* Pickup */}
                  <div className="flex items-start gap-3">
                    <div className="size-4 rounded-full border-2 border-yellow-500 bg-yellow-400 shrink-0 mt-1" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                        PICK-UP
                      </span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {pickupCity}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {pickupAddressLabel}
                      </p>
                    </div>
                  </div>

                  {/* Connecting dashed line */}
                  <div className="border-l-2 border-dashed border-gray-300 dark:border-white/20 h-5 ml-1.5" />

                  {/* Drop-off */}
                  <div className="flex items-start gap-3">
                    <MapPin className="size-4 text-red-500 fill-red-500 shrink-0 mt-1" />
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider">
                        DROP-OFF
                      </span>
                      <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                        {dropoffCity}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                        {dropoffAddressLabel}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-100 dark:border-white/5 pt-1" />

                {/* Customer Information Row */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white">Customer's information</h4>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-11 rounded-full shrink-0 border border-gray-200/80 dark:border-white/10 bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-yellow-200">
                        {customerName
                          .split(/\s+/)
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {customerName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold mt-0.5">
                          Delivery price : <span className="text-gray-900 dark:text-white">{formatNaira(order.totalPrice)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {order.customer?.phoneNumber && (
                        <a
                          href={`tel:${order.customer.phoneNumber}`}
                          className="size-10 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:border-yellow-400 transition cursor-pointer"
                          title="Call customer"
                        >
                          <Phone className="size-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/messages?chat=order-${order.id}`)}
                        className="size-10 rounded-2xl bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 hover:border-yellow-400 transition cursor-pointer"
                        title="Message customer"
                      >
                        <MessageCircle className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Package details */}
            {activeTab === "package_details" && (
              <div className="space-y-4 pt-1 animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  {packagePhoto ? (
                    <img src={packagePhoto} alt={packageName} className="h-[76px] w-[120px] rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="h-[76px] w-[120px] rounded-xl bg-yellow-100 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-300 flex items-center justify-center shrink-0">
                      <Package className="size-8" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-gray-900 dark:text-white truncate">{packageName}</h3>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-mono mt-0.5 truncate">{trackingNumber}</p>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(trackingNumber, "Tracking Number")}
                        className="text-gray-500 hover:text-gray-900 dark:hover:text-white p-0.5 cursor-pointer"
                        title="Copy Tracking ID"
                      >
                        <Copy className="size-3.5" />
                      </button>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#FFCC00] text-gray-950 font-bold text-[10px] tracking-wider uppercase shrink-0">
                    {statusLabel}
                  </span>
                </div>

                <div className="rounded-2xl border border-gray-100 dark:border-white/5 px-4 py-3">
                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-gray-200 dark:border-white/10 pb-3">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Package status</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{statusLabel}</p>
                    </div>

                    {order.estimatedMinutes != null && (
                      <span className="px-3 py-2 rounded-xl bg-[#FFCC00] text-gray-950 font-bold text-base flex items-center gap-1.5 shadow-xs shrink-0">
                        <Timer className="size-4 stroke-[2.5]" />
                        <span>{remainingEstimateLabel}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-end justify-between gap-3 pt-3">
                    <div className="space-y-2.5">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white block">Estimated weight</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{packageWeight}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white block">Category</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{packageCategory}</span>
                      </div>
                    </div>

                    {order.package?.isFragile && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 text-xs font-semibold shrink-0">
                        <AlertTriangle className="size-3.5" />
                        <span>Fragile</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Button: Start Navigation */}
            <div className="pt-2">
              <button
                type="button"
                onClick={startNavigation}
                className="w-full py-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-base flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition cursor-pointer"
              >
                <NavIcon className="size-4.5 fill-current stroke-[2]" />
                <span>Start Navigation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: ARRIVED AT PICKUP (Shows "Confirm Pickup" button)               */}
      {/* ========================================================================= */}
      {workflowStep === "arrived" && (
        <div className="w-full bg-white dark:bg-[#161618] border-t border-gray-100 dark:border-white/5 shadow-2xl p-5 sm:p-6 relative z-30 transition-colors animate-in slide-in-from-bottom duration-300 rounded-none">
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
              {packagePhoto ? (
                <img src={packagePhoto} alt={packageName} className="size-14 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="size-14 rounded-xl bg-yellow-100 dark:bg-yellow-400/10 text-yellow-700 dark:text-yellow-300 flex items-center justify-center shrink-0">
                  <Package className="size-6" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{packageName}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{trackingNumber}</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFCC00] text-gray-950 font-bold text-[10px] tracking-wider uppercase shrink-0">
                {statusLabel}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Package status</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{statusLabel} · Arrived at pickup</p>
              </div>

              {order.estimatedMinutes != null && (
                <span className="px-3 py-1 rounded-xl bg-[#FFCC00] text-gray-950 font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0">
                  <Timer className="size-3.5 stroke-[2.5]" />
                  <span>{remainingEstimateLabel}</span>
                </span>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 text-xs pt-1">
              <div>
                <span className="text-gray-400 block font-medium">Estimated weight</span>
                <span className="font-bold text-gray-900 dark:text-white">{packageWeight}</span>
              </div>

              <div>
                <span className="text-gray-400 block font-medium">Category</span>
                <span className="font-bold text-gray-900 dark:text-white">{packageCategory}</span>
              </div>

              {order.package?.isFragile && (
                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 text-xs font-semibold">
                  <AlertTriangle className="size-3" />
                  <span>Fragile</span>
                </div>
              )}
            </div>

            {/* Customer Information Row */}
            <div className="border-t border-gray-100 dark:border-white/5 pt-3 space-y-2">
              <h4 className="text-xs font-bold text-gray-900 dark:text-white">Customer's information</h4>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-11 rounded-full shrink-0 border border-gray-200/80 dark:border-white/10 bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-sm font-bold text-gray-800 dark:text-yellow-200">
                    {customerName
                      .split(/\s+/)
                      .map((part) => part[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                      {customerName}
                    </p>
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                      {order.customer?.phoneNumber || "Phone unavailable"}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">Delivery price :</p>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{formatNaira(order.totalPrice)}</p>
                </div>
              </div>
            </div>

            {/* Bottom Button: Confirm Pickup */}
            <div className="pt-2">
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => setShowPhotoPromptModal(true)}
                className="w-full py-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-base flex items-center justify-center gap-2 shadow-xs active:scale-[0.99] transition cursor-pointer"
              >
                <span>Mark package collected</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drop-off details and handover confirmation after pickup */}
      {workflowStep === "in_transit" && (
        <div className="w-full rounded-t-[30px] border-t border-gray-100 bg-white px-5 pb-6 pt-2 shadow-2xl transition-colors dark:border-white/5 dark:bg-[#161618] sm:px-6">
          <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate text-lg font-bold tracking-tight text-gray-900 dark:text-white sm:text-xl">
                  {packageName}
                </h2>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-mono">{trackingNumber}</span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(trackingNumber, "Tracking Number")}
                    className="cursor-pointer p-0.5 hover:text-gray-800 dark:hover:text-white"
                    title="Copy Tracking ID"
                  >
                    <Copy className="size-3.5" />
                  </button>
                </div>
              </div>
              <span className="shrink-0 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                In transit
              </span>
            </div>

            <div className="flex w-full items-center rounded-full border border-gray-200/60 bg-gray-100 p-1 shadow-inner dark:border-white/5 dark:bg-white/10">
              <button
                type="button"
                onClick={() => setActiveTab("delivery_details")}
                className={`flex-1 rounded-full px-3 py-2.5 text-center text-xs font-bold transition-all ${
                  activeTab === "delivery_details"
                    ? "bg-[#FFCC00] text-gray-950 shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Delivery details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("package_details")}
                className={`flex-1 rounded-full px-3 py-2.5 text-center text-xs font-bold transition-all ${
                  activeTab === "package_details"
                    ? "bg-[#FFCC00] text-gray-950 shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                Package details
              </button>
            </div>

            {activeTab === "delivery_details" ? (
              <div className="space-y-4 pt-1">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 size-4 shrink-0 rounded-full border-2 border-yellow-500 bg-yellow-400" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        PICK-UP
                      </span>
                      <p className="text-sm font-bold leading-tight text-gray-900 dark:text-white">{pickupCity}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{pickupAddressLabel}</p>
                    </div>
                  </div>
                  <div className="ml-1.5 h-5 border-l-2 border-dashed border-gray-300 dark:border-white/20" />
                  <div className="flex items-start gap-3">
                    <MapPin className="mt-1 size-4 shrink-0 fill-red-500 text-red-500" />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        DROP-OFF
                      </span>
                      <p className="text-sm font-bold leading-tight text-gray-900 dark:text-white">{dropoffCity}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{dropoffAddressLabel}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-gray-100 pt-1 dark:border-white/5" />
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-200/80 bg-yellow-100 text-sm font-bold text-gray-800 dark:border-white/10 dark:bg-yellow-900/30 dark:text-yellow-200">
                      {customerName
                        .split(/\s+/)
                        .map((part) => part[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{customerName}</p>
                      <p className="mt-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Delivery price:{" "}
                        <span className="text-gray-900 dark:text-white">{formatNaira(order.totalPrice)}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {order.customer?.phoneNumber && (
                      <a
                        href={`tel:${order.customer.phoneNumber}`}
                        className="flex size-10 items-center justify-center rounded-2xl border border-gray-200/60 bg-gray-100 text-gray-700 transition hover:border-yellow-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                        title="Call customer"
                      >
                        <Phone className="size-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/messages?chat=order-${order.id}`)}
                      className="flex size-10 items-center justify-center rounded-2xl border border-gray-200/60 bg-gray-100 text-gray-700 transition hover:border-yellow-400 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                      title="Message customer"
                    >
                      <MessageCircle className="size-4" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="flex items-center gap-3">
                  {packagePhoto ? (
                    <img src={packagePhoto} alt={packageName} className="h-[76px] w-[120px] shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-[76px] w-[120px] shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700 dark:bg-yellow-400/10 dark:text-yellow-300">
                      <Package className="size-8" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-gray-900 dark:text-white">{packageName}</h3>
                    <p className="mt-0.5 truncate font-mono text-xs text-gray-700 dark:text-gray-300">{trackingNumber}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    Picked up
                  </span>
                </div>
                <div className="rounded-2xl border border-gray-100 px-4 py-3 dark:border-white/5">
                  <div className="flex items-center justify-between gap-3 border-b border-dashed border-gray-200 pb-3 dark:border-white/10">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900 dark:text-white">Package status</h4>
                      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{statusLabel}</p>
                    </div>
                    {order.estimatedMinutes != null && (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FFCC00] px-3 py-2 text-base font-bold text-gray-950 shadow-xs">
                        <Timer className="size-4 stroke-[2.5]" />
                        <span>{remainingEstimateLabel}</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-3 pt-3">
                    <div className="space-y-2.5">
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Estimated weight</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{packageWeight}</span>
                      </div>
                      <div>
                        <span className="block text-sm font-medium text-gray-900 dark:text-white">Category</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{packageCategory}</span>
                      </div>
                    </div>
                    {order.package?.isFragile && (
                      <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 dark:border-red-500/40 dark:text-red-400">
                        <AlertTriangle className="size-3.5" />
                        <span>Fragile</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-200 p-4 text-sm font-medium text-gray-800 dark:border-white/10 dark:text-gray-200">
              <input
                type="checkbox"
                checked={hasHandedOverPackage}
                onChange={(event) => setHasHandedOverPackage(event.target.checked)}
                className="mt-0.5 size-5 shrink-0 accent-[#FFCC00]"
              />
              <span>I have handed over the package to the customer</span>
            </label>

            <button
              type="button"
              disabled={!hasHandedOverPackage}
              onClick={() => setWorkflowStep("confirm_delivery")}
              className="w-full rounded-2xl bg-[#FFCC00] py-4 text-base font-bold text-gray-950 shadow-xs transition hover:bg-[#f5c400] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirm Drop-Off
            </button>
          </div>
        </div>
      )}

      {workflowStep === "confirm_delivery" && (
        <div className="w-full rounded-t-[30px] border-t border-gray-100 bg-white px-5 pb-7 pt-2 shadow-2xl dark:border-white/5 dark:bg-[#161618] sm:px-6">
          <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          <button
            type="button"
            onClick={() => setWorkflowStep("in_transit")}
            className="mb-5 text-sm font-semibold text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <ArrowLeft className="mr-1 inline size-4" />
            Back to drop-off
          </button>
          <form onSubmit={handleConfirmDelivery} className="space-y-5 text-center">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Enter delivery code</h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Ask the customer for the 5-digit handover code to confirm delivery.
              </p>
            </div>
            <div className="relative mx-auto flex max-w-sm items-center justify-center gap-3">
              <div aria-hidden="true" className="flex justify-center gap-2.5">
                {Array.from({ length: 5 }, (_, index) => (
                  <span
                    key={index}
                    className="flex size-12 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 font-mono text-xl font-bold text-gray-900 dark:border-white/15 dark:bg-white/5 dark:text-white sm:size-14"
                  >
                    {handoverCode[index] || ""}
                  </span>
                ))}
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{5}"
                maxLength={5}
                value={handoverCode}
                onChange={(event) => setHandoverCode(event.target.value.replace(/\D/g, ""))}
                aria-label="5-digit delivery handover code"
                autoFocus
                required
                className="absolute inset-0 h-full w-full cursor-text opacity-0"
              />
              <button
                type="button"
                onClick={handlePasteHandoverCode}
                className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFCC00] text-gray-950 shadow-xs transition hover:bg-[#f5c400] active:scale-95"
                aria-label="Paste delivery code"
                title="Paste delivery code"
              >
                <ClipboardPaste className="size-5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={actionLoading || !/^\d{5}$/.test(handoverCode)}
              className="w-full rounded-2xl bg-[#FFCC00] py-4 text-base font-bold text-gray-950 shadow-xs transition hover:bg-[#f5c400] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionLoading ? "Verifying..." : "Confirm delivery"}
            </button>
            <div className="border-t border-gray-100 pt-4 dark:border-white/5">
              {order.customer?.phoneNumber ? (
                <a
                  href={`tel:${order.customer.phoneNumber}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300"
                >
                  <Phone className="size-4" />
                  Need help?
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => navigate(`/messages?chat=order-${order.id}`)}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300"
                >
                  <MessageCircle className="size-4" />
                  Need help?
                </button>
              )}
            </div>
          </form>
        </div>
      )}
      {workflowStep === "completed" && (
        completionView === "success" ? (
          <div className="flex min-h-full w-full flex-col bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-8 dark:bg-[#0c0c0e] sm:px-8">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="relative mb-7 flex size-56 items-center justify-center">
                <ConfettiBackground className="absolute inset-0 size-full opacity-95" />
                <img
                  src={goodMark}
                  alt=""
                  aria-hidden="true"
                  className="relative z-[1] size-32 object-contain drop-shadow-md sm:size-36"
                />
              </div>
              <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold uppercase text-green-800 dark:bg-green-400/15 dark:text-green-300">
                Payment successful
              </span>
              <h1 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Delivery Successful! 🎉
              </h1>
              <p className="mt-2 max-w-xs text-base text-gray-600 dark:text-gray-400">
                Great job! You’ve completed the delivery.
              </p>

              <div className="mt-12 flex w-full max-w-md items-center justify-between gap-3 text-left">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">Total Amount</span>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{formatNaira(earnings)}</span>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-md flex-col gap-3 pt-8">
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                className="w-full rounded-2xl bg-[#FFCC00] px-5 py-4 font-bold text-gray-950 transition hover:bg-[#f5c400]"
              >
                Continue other deliveries <ArrowRight className="ml-1 inline size-4" />
              </button>
              <button
                type="button"
                onClick={() => setCompletionView("details")}
                className="w-full rounded-2xl bg-gray-50 px-5 py-4 font-semibold text-gray-800 transition hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
              >
                View details
              </button>
            </div>
          </div>
        ) : completionView === "details" ? (
          <div className="flex min-h-full w-full flex-col bg-[#fcfcfc] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] pt-[max(1rem,env(safe-area-inset-top,0px))] dark:bg-[#0c0c0e] sm:px-8">
            <header className="mb-7 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCompletionView("success")}
                className="flex size-10 items-center justify-center rounded-full text-gray-800 transition hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                aria-label="Back to delivery completed"
              >
                <ArrowLeft className="size-5" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery information</h1>
              <button
                type="button"
                onClick={() => navigate("/messages")}
                className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/15"
                aria-label="Contact support"
                title="Contact support"
              >
                <Headphones className="size-5" />
              </button>
            </header>

            <div className="space-y-5">
              <section className="rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-[#161618]">
                <h2 className="border-b border-dashed border-gray-200 pb-2 text-xl font-bold text-gray-950 dark:border-white/15 dark:text-white">
                  Delivery Summary
                </h2>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <span className="break-all text-sm font-bold text-gray-800 dark:text-gray-200">
                    #{trackingNumber}
                  </span>
                  <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-[10px] font-semibold uppercase text-green-800 dark:bg-green-400/15 dark:text-green-300">
                    Completed
                  </span>
                </div>

                <div className="mt-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-[3px] border-yellow-400 bg-yellow-200" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Pick up from</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{order.pickupAddress?.city || "Pickup location"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{addressSummary(order.pickupAddress)}</p>
                    </div>
                  </div>
                  <div className="ml-[9px] h-6 border-l-2 border-dashed border-gray-400" />
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-700 text-white">
                      <CheckCircle2 className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">Delivering to</p>
                      <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{order.destinationAddress?.city || "Delivery location"}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{addressSummary(order.destinationAddress)}</p>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                <p>Time ({deliveryDuration != null ? `${deliveryDuration} min` : "Not available"})</p>
                <p>Distance ({order.distanceKm != null ? `${order.distanceKm.toFixed(1)} km` : "Not available"})</p>
                <div className="flex items-center justify-between border-t border-gray-100 pt-3 font-semibold text-gray-900 dark:border-white/10 dark:text-white">
                  <span>Earnings</span>
                  <span className="text-lg">{formatNaira(earnings)}</span>
                </div>
              </section>
            </div>

            <div className="mx-auto mt-auto flex w-full max-w-md flex-col gap-3 pt-8">
              <button
                type="button"
                onClick={() => navigate("/earnings")}
                className="w-full rounded-2xl bg-[#FFCC00] px-5 py-4 font-bold text-gray-950 transition hover:bg-[#f5c400]"
              >
                View Earnings
              </button>
              <button
                type="button"
                onClick={() => navigate("/")}
                className="w-full rounded-2xl bg-gray-50 px-5 py-4 font-semibold text-gray-800 transition hover:bg-gray-100 dark:bg-white/5 dark:text-gray-200 dark:hover:bg-white/10"
              >
                Back to home <ArrowRight className="ml-1 inline size-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex min-h-full w-full flex-col bg-[#fcfcfc] px-5 pb-8 pt-[max(1rem,env(safe-area-inset-top,0px))] dark:bg-[#0c0c0e] sm:px-8">
            <header className="mb-5 flex items-center justify-between">
              <button
                type="button"
                onClick={() => navigate("/jobs")}
                className="flex size-10 items-center justify-center rounded-full text-gray-800 transition hover:bg-gray-100 dark:text-white dark:hover:bg-white/10"
                aria-label="Back to jobs"
              >
                <ArrowLeft className="size-5" />
              </button>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Delivery information</h1>
              <button
                type="button"
                onClick={() => navigate("/messages")}
                className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-gray-700 transition hover:bg-gray-200 dark:bg-white/10 dark:text-gray-200"
                aria-label="Contact support"
              >
                <Headphones className="size-5" />
              </button>
            </header>

            <div className="space-y-4">
              <section className="flex items-start gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[#161618]">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-gray-800 dark:bg-white/5 dark:text-gray-200">
                  <Package className="size-7" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-gray-900 dark:text-white">{packageName}</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Delivered: {completedAt ? `${completedDate} • ${completedTime}` : "Completed"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold uppercase text-green-800 dark:bg-green-400/15 dark:text-green-300">
                  Delivered
                </span>
              </section>

              <section className="rounded-2xl border border-gray-100 bg-white p-4 dark:border-white/10 dark:bg-[#161618]">
                <div className="flex items-center gap-4">
                  {packagePhoto ? (
                    <img src={packagePhoto} alt={packageName} className="size-24 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <div className="flex size-24 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">
                      <Package className="size-9" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase text-green-700 dark:bg-green-400/15 dark:text-green-300">
                      Delivered
                    </span>
                    <p className="mt-2 text-[10px] font-medium uppercase text-gray-400">Tracking number</p>
                    <div className="mt-1 flex items-center gap-1">
                      <span className="break-all text-sm font-bold text-gray-900 dark:text-white">#{trackingNumber}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(trackingNumber, "Tracking Number")}
                        className="shrink-0 text-gray-500 hover:text-gray-900 dark:hover:text-white"
                        aria-label="Copy tracking number"
                      >
                        <Copy className="size-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-[#161618]">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Package Details</h2>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-3 dark:bg-white/5">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Pick up from</p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {addressSummary(order.pickupAddress)}
                    </p>
                  </div>
                  <ChevronsRight className="size-5 shrink-0 text-emerald-700" />
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] font-semibold uppercase text-gray-400">Delivered to</p>
                    <p className="mt-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">
                      {addressSummary(order.destinationAddress)}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 border-b border-gray-100 pb-3 text-xs dark:border-white/10">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Date</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{completedDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500 dark:text-gray-400">Time</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{completedTime}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 text-xs dark:border-white/10">
                  <div>
                    <p className="text-gray-500 dark:text-gray-400">Estimated Weight</p>
                    <p className="mt-1 font-semibold text-gray-900 dark:text-white">{packageWeight}</p>
                  </div>
                  {order.package?.isFragile && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-red-300 px-2.5 py-1 text-[10px] font-semibold uppercase text-red-600 dark:border-red-500/40 dark:text-red-400">
                      <AlertTriangle className="size-3" />
                      Fragile
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-3 text-xs">
                  <p className="text-gray-500 dark:text-gray-400">Category</p>
                  <p className="text-right font-semibold text-gray-900 dark:text-white">{packageCategory}</p>
                </div>
              </section>

              <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 dark:border-white/10 dark:bg-[#161618]">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Customer Information</h2>
                <div className="flex items-center gap-3">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-yellow-100 font-bold text-gray-800 dark:bg-yellow-400/15 dark:text-yellow-200">
                    {customerName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{customerName}</p>
                    <p className="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">#{trackingNumber}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(trackingNumber, "Tracking Number")}
                    className="ml-auto shrink-0 text-gray-400 hover:text-gray-800 dark:hover:text-white"
                    aria-label="Copy customer reference"
                  >
                    <Copy className="size-4" />
                  </button>
                </div>
                <div className="border-t border-gray-100 pt-3 dark:border-white/10">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Contact</span>
                    {order.customer?.phoneNumber ? (
                      <a href={`tel:${order.customer.phoneNumber}`} className="font-semibold text-gray-900 dark:text-white">
                        {order.customer.phoneNumber}
                      </a>
                    ) : (
                      <span className="font-semibold text-gray-500">Unavailable</span>
                    )}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Delivery Price</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatNaira(earnings)}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )
      )}
      </div>

      {/* ========================================================================= */}
      {/* SCREEN 5: "Take a photo of the package" BOTTOM SHEET MODAL                */}
      {/* ========================================================================= */}
      {showPhotoPromptModal && (
        <div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 rounded-none overflow-hidden">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-7 shadow-2xl border-t sm:border border-gray-100 dark:border-white/10 animate-in slide-in-from-bottom duration-200"
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5 sm:hidden" />

            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                Take a photo of the package
              </h3>
              <button
                type="button"
                onClick={() => setShowPhotoPromptModal(false)}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
              Take a clear photo to review the package condition before confirming collection. The photo is not attached to the order.
            </p>

            <button
              type="button"
              onClick={() => {
                setShowPhotoPromptModal(false)
                setShowCameraViewfinder(true)
              }}
              className="w-full py-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-base flex items-center justify-center shadow-xs active:scale-[0.99] transition cursor-pointer"
            >
              <span>Got it</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 6: CAPTURE THE PACKAGE (Camera Viewfinder - Overlay in container)  */}
      {/* ========================================================================= */}
      {showCameraViewfinder && (
        <div className="absolute inset-0 z-50 bg-[#141518] text-white flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 rounded-none overflow-hidden">
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => {
                stopCamera()
                setShowCameraViewfinder(false)
              }}
              className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition cursor-pointer"
            >
              <ArrowLeft className="size-5 stroke-[2.2]" />
            </button>

            <h2 className="text-base font-bold tracking-tight text-white">Capture The Package</h2>

            <button
              type="button"
              onClick={() => {
                stopCamera()
                setShowCameraViewfinder(false)
              }}
              className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition cursor-pointer"
            >
              <X className="size-5 stroke-[2.2]" />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center my-3 relative">
            <div className="relative w-full max-w-sm aspect-[4/3] rounded-3xl overflow-hidden bg-black/60 shadow-2xl flex items-center justify-center border border-white/10">
              {cameraPermissionGranted ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 px-6 text-center text-white/75">
                  <Package className="size-12 text-yellow-400" />
                  <p className="text-sm font-medium">Camera unavailable</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-950"
                  >
                    <Upload className="size-4" />
                    Upload package photo
                  </button>
                </div>
              )}

              <div className="absolute inset-4 pointer-events-none">
                <div className="absolute top-0 left-0 size-8 border-t-[3px] border-l-[3px] border-white rounded-tl-xl" />
                <div className="absolute top-0 right-0 size-8 border-t-[3px] border-r-[3px] border-white rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 size-8 border-b-[3px] border-l-[3px] border-white rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 size-8 border-b-[3px] border-r-[3px] border-white rounded-br-xl" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 sm:gap-4 mt-5">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-semibold text-white/90">
                <Sun className="size-3.5 text-yellow-400" />
                <span>Good lighting</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-semibold text-white/90">
                <Scan className="size-3.5 text-blue-400" />
                <span>All sides visible</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 text-[11px] font-semibold text-white/90">
                <Smartphone className="size-3.5 text-emerald-400" />
                <span>No blur</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-around py-2 sm:py-4">
            <button
              type="button"
              onClick={startCamera}
              className="size-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition active:scale-95 cursor-pointer"
              title="Switch Camera"
            >
              <RotateCcw className="size-5 stroke-[2]" />
            </button>

            <button
              type="button"
              onClick={handleShutterCapture}
              className="size-18 sm:size-20 rounded-full border-4 border-white flex items-center justify-center p-1.5 hover:scale-105 active:scale-95 transition cursor-pointer shadow-lg"
              title="Take Photo"
            >
              <div className="size-full rounded-full bg-white shadow-xs" />
            </button>

            <button
              type="button"
              onClick={() => {
                fileInputRef.current?.click()
              }}
              className="size-12 rounded-full flex items-center justify-center text-white bg-white/10 hover:bg-white/20 transition active:scale-95 cursor-pointer"
              title="Upload Image"
            >
              <Upload className="size-5 stroke-[2]" />
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 7: PHOTO REVIEW & CONFIRMATION (Overlay in container)              */}
      {/* ========================================================================= */}
      {showPhotoPreview && (
        <div className="absolute inset-0 z-50 bg-[#141518] text-white flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 rounded-none overflow-hidden">
          <div className="space-y-1 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-white">Capture The Package</h2>
              <button
                type="button"
                onClick={() => setShowPhotoPreview(false)}
                className="size-10 flex items-center justify-center rounded-full hover:bg-white/10 text-white transition cursor-pointer"
              >
                <X className="size-5 stroke-[2.2]" />
              </button>
            </div>
            <p className="text-xs text-white/60">
              Make sure the details are clear and all the corners are captured.
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center my-3">
            <div className="relative w-full max-w-sm aspect-[4/3] rounded-3xl overflow-hidden bg-black/80 shadow-2xl border border-white/10">
              {capturedPhotoUrl ? (
                <img
                  src={capturedPhotoUrl}
                  alt="Captured package"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-white/60">
                  <Package className="size-14" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3.5 max-w-sm mx-auto w-full pb-2">
            <div className="bg-white/10 dark:bg-[#1f2024] rounded-2xl p-3.5 sm:p-4 border border-white/10 flex items-start gap-3">
              <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white">Review package condition</h4>
                <p className="text-[11px] text-white/70 mt-0.5 leading-relaxed">
                  Review the package condition before confirming collection. The order status updates after you continue.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPhotoPreview(false)
                  setShowCameraViewfinder(true)
                }}
                className="w-full py-3.5 sm:py-4 px-4 rounded-2xl border border-white/20 hover:border-white/40 text-white font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 transition active:scale-[0.99] cursor-pointer"
              >
                <RotateCcw className="size-4" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmPickupPhoto}
                disabled={actionLoading}
                className="w-full py-3.5 sm:py-4 px-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-sm sm:text-base flex items-center justify-center gap-1.5 shadow-sm transition active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                <span>{actionLoading ? "Confirming..." : "Continue"}</span>
                <ArrowRight className="size-4.5 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelSheetOpen && (
        <div className="absolute inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 rounded-none overflow-hidden">
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-7 shadow-2xl border-t sm:border border-gray-100 dark:border-white/10 animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cancel Delivery Task</h3>
              <button
                type="button"
                onClick={() => setCancelSheetOpen(false)}
                className="size-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCancelOrder} className="space-y-4">
              <p className="text-xs text-red-500">
                Cancelling will release this package back to dispatch.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full p-3 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-white/15 bg-transparent text-gray-900 dark:text-white"
                rows={3}
                required
              />
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-3.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm shadow-xs transition"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
