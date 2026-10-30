import React, { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  Bell,
  Copy,
  Check,
  ChevronsRight,
  AlertCircle,
  Bookmark,
  Star,
  MessageSquareText,
  Phone,
  Camera,
  Mic,
  Trash2,
  Send,
  Maximize2,
  X,
  Shirt,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Package,
  ShoppingBag,
} from "lucide-react"
import ConfettiBackground from "../components/ConfettiBackground"
import greenSuccessBadge from "../assets/good-mark.svg"
import NotificationButton from "../components/NotificationButton"
import linkedBoxSvg from "../assets/Linked-box.svg"
import PackageStateIcon from "../components/PackageStateIcon"
import { chatApi, getChatSocket } from "../api/chat.api"
import type { ApiChatMessage, OrderStatus } from "../types/api.types"
import { formatAudioDuration } from "../utils/audio"
import {
  cleanTrackingText,
  detectCourier,
  formatTrackingTime,
  deriveStatusFromAction,
  fetchParcelTracking,
  TrackItem,
} from "../utils/tracking"

export interface DeliveryDetailsItem {
  id?: string
  title?: string
  store?: string
  trackingCode?: string
  orderStatus?: OrderStatus
  estimatedMinutes?: number
  status?: "Delivered" | "In-Transit" | "Cancelled" | "Pending" | "Ready for pickup"
  image?: string
  fromLocation?: string
  toLocation?: string
  date?: string
  time?: string
  weight?: string
  category?: string
  fragileNote?: string
  rider?: {
    name: string
    idCode: string
    avatar: string
    rating: number
    reviewCount: number
    price: string
    plateNumber?: string
    isSaved?: boolean
  }
  isInbound?: boolean
  courier?: string
  shippedDate?: string
  estimatedArrival?: string
  isArrived?: boolean
  arrivedDate?: string
  pickupTerminal?: string
  tracks?: TrackItem[]
  payUrl?: string
}

interface DeliveryDetailsProps {
  delivery?: DeliveryDetailsItem | null
  onBack: () => void
  onOpenNotifications?: () => void
  onBookRiderAgain?: () => void
}

interface DeliveryChatMessage {
  id: string
  clientMessageId?: string
  sender: "rider" | "user"
  type: "text" | "audio"
  text?: string
  audioUrl?: string
  audioDuration?: number
  time: string
  createdAt?: string
}

function mapDeliveryChatMessage(message: ApiChatMessage): DeliveryChatMessage {
  return {
    id: message.id,
    clientMessageId: message.clientMessageId,
    sender:
      message.sender === "user" || message.senderRole === "customer"
        ? "user"
        : "rider",
    type: message.type === "audio" ? "audio" : "text",
    text:
      message.text ||
      (message.type === "audio"
        ? "Voice message"
        : message.type === "image"
          ? "Photo"
          : "Attachment"),
    audioUrl: message.audioUrl,
    audioDuration: message.audioDuration,
    time:
      message.time ||
      (message.createdAt
        ? new Date(message.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Just now"),
    createdAt: message.createdAt,
  }
}

function upsertDeliveryChatMessage(
  messages: DeliveryChatMessage[],
  message: DeliveryChatMessage,
): DeliveryChatMessage[] {
  const index = messages.findIndex(
    (current) =>
      current.id === message.id ||
      (!!message.clientMessageId &&
        current.clientMessageId === message.clientMessageId),
  )
  if (index < 0) return [...messages, message]

  const updated = [...messages]
  updated[index] = message
  return updated
}

export default function DeliveryDetails({
  delivery,
  onBack,
  onOpenNotifications,
  onBookRiderAgain,
}: DeliveryDetailsProps) {
  // Inbound arrival state toggle (defaults to delivery status)
  const [inboundArrivedState, setInboundArrivedState] = useState<boolean>(
    Boolean(
      delivery?.isArrived ||
        delivery?.status === "Delivered" ||
        delivery?.status === "Ready for pickup",
    ),
  )
  const [liveTracks, setLiveTracks] = useState<TrackItem[]>(
    delivery?.tracks || [],
  )
  const [livePayUrl, setLivePayUrl] = useState<string>(delivery?.payUrl || "")
  const [isFetchingLive, setIsFetchingLive] = useState<boolean>(false)

  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [isBookmarked, setIsBookmarked] = useState<boolean>(
    delivery?.rider?.isSaved || false,
  )
  const [isBooked, setIsBooked] = useState<boolean>(false)
  const [showRiderChat, setShowRiderChat] = useState<boolean>(false)
  const [showExpandedImage, setShowExpandedImage] = useState<boolean>(false)
  const [chatInputText, setChatInputText] = useState<string>("")
  const [chatMessages, setChatMessages] = useState<DeliveryChatMessage[]>([])
  const [chatError, setChatError] = useState<string | null>(null)
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)


  // Synchronize live tracking data from API whenever an inbound package is viewed
  useEffect(() => {
    const rawCode = delivery?.trackingCode || ""
    const cleanCode = rawCode
      .replace(/^[#]/, "")
      .replace(/^42324-HUD-/, "")
      .trim()

    if (
      cleanCode &&
      (delivery?.isInbound ||
        cleanCode.toUpperCase().startsWith("NG") ||
        cleanCode.toUpperCase().startsWith("SF"))
    ) {
      let isMounted = true
      setIsFetchingLive(true)
      fetchParcelTracking(cleanCode).then((res) => {
        if (isMounted && res.success && res.data) {
          if (Array.isArray(res.data.tracks)) {
            setLiveTracks(res.data.tracks)
          }
          if (res.data.payUrl) {
            setLivePayUrl(res.data.payUrl)
          }
        }
        if (isMounted) setIsFetchingLive(false)
      })
      return () => {
        isMounted = false
      }
    }
  }, [delivery?.trackingCode, delivery?.isInbound])

  useEffect(() => {
    if (!showRiderChat) return
    if (!delivery?.id) {
      setChatMessages([])
      setChatError("This delivery is not linked to an order chat.")
      return
    }

    let isActive = true
    const chatId = `order-${delivery.id}`
    const socket = getChatSocket()
    setChatMessages([])
    setChatError(null)

    const handleNewMessage = (message: ApiChatMessage) => {
      if (!isActive || message.chatId !== chatId) return
      const formatted = mapDeliveryChatMessage(message)
      setChatMessages((current) =>
        upsertDeliveryChatMessage(current, formatted),
      )
    }

    const loadMessages = async () => {
      try {
        const messages = await chatApi.getChatMessages(chatId)
        if (!isActive || !Array.isArray(messages)) return
        setChatMessages((current) => {
          const merged = messages.reduce(
            (result, message) =>
              upsertDeliveryChatMessage(
                result,
                mapDeliveryChatMessage(message),
              ),
            current,
          )
          return merged.sort(
            (a, b) =>
              new Date(a.createdAt || 0).getTime() -
              new Date(b.createdAt || 0).getTime(),
          )
        })
        setChatError(null)
      } catch (error) {
        if (isActive) {
          setChatError(
            error instanceof Error ? error.message : "Could not load messages.",
          )
        }
      }
    }

    socket.on("new_message", handleNewMessage)
    socket.emit("join_chat", { chatId })
    void loadMessages()
    const pollTimer = window.setInterval(loadMessages, 10000)

    return () => {
      isActive = false
      socket.emit("leave_chat", { chatId })
      socket.off("new_message", handleNewMessage)
      window.clearInterval(pollTimer)
    }
  }, [showRiderChat, delivery?.id])

  useEffect(
    () => () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current)
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  // If this is an inbound package:
  if (delivery?.isInbound) {
    const rawCode = delivery.trackingCode || ""
    const cleanCode = rawCode
      .replace(/^[#]/, "")
      .replace(/^42324-HUD-/, "")
      .trim()
    const latestTrack = liveTracks.length > 0 ? liveTracks[0] : null
    const earliestTrack =
      liveTracks.length > 0 ? liveTracks[liveTracks.length - 1] : null

    const activeCourier =
      delivery.courier && delivery.courier !== "AliExpress"
        ? delivery.courier
        : detectCourier(cleanCode)

    const activeShippedDate = earliestTrack?.time
      ? formatTrackingTime(earliestTrack.time)
      : delivery.shippedDate || "Recent"

    const activeLastScan = latestTrack?.time
      ? formatTrackingTime(latestTrack.time)
      : delivery.estimatedArrival || "In Transit"

    const activeOrigin =
      cleanTrackingText(earliestTrack?.msgEng || earliestTrack?.actionName) ||
      (delivery.fromLocation && delivery.fromLocation !== "China, Beijing"
        ? delivery.fromLocation
        : "Origin Terminal")

    const activeDestination =
      cleanTrackingText(latestTrack?.msgEng || latestTrack?.actionName) ||
      (delivery.toLocation && delivery.toLocation !== "Akpakpava, Benin"
        ? delivery.toLocation
        : "Distribution Hub")

    const activeStatus = latestTrack?.actionName
      ? deriveStatusFromAction(latestTrack.actionName)
      : delivery.status || "In-Transit"

    const activeStatusBadge =
      latestTrack?.actionName || delivery.status || "In-Transit"
    const activeTitle =
      delivery.title && !delivery.title.includes("Black Hoodie")
        ? delivery.title
        : latestTrack?.actionName
          ? `${latestTrack.actionName} - ${cleanCode}`
          : `Inbound Shipment (${cleanCode})`

    // ----------------------------------------------------
    // SCREEN: PACKAGE HAS ARRIVED & READY FOR PICKUP
    // ----------------------------------------------------
    if (inboundArrivedState) {
      return (
        <div className="w-full flex-1 flex flex-col min-h-screen bg-white dark:bg-[#0c0c0e] relative select-none overflow-hidden animate-in fade-in duration-300">
          {/* Celebration Confetti in upper half */}
          <div className="absolute top-0 left-0 right-0 h-72 sm:h-80 pointer-events-none overflow-hidden z-0 flex justify-center opacity-95">
            <ConfettiBackground />
          </div>

          {/* Top header navigation */}
          <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-2 flex items-center justify-between relative z-20">
            <button
              onClick={onBack}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* State Toggle for demo */}
            <button
              type="button"
              onClick={() => setInboundArrivedState(false)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-400/30 transition-colors cursor-pointer"
              title="Preview In-Transit state"
            >
              View In-Transit
            </button>
          </div>

          {/* Content Body */}
          <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pb-8 flex-1 flex flex-col items-center justify-between relative z-10">
            <div className="w-full flex flex-col items-center">
              {/* Green Success Scalloped Starburst Badge */}
              <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center mt-2 sm:mt-6">
                <img
                  src={greenSuccessBadge}
                  alt="Package Arrived"
                  className="w-28 h-28 sm:w-32 sm:h-32 object-contain drop-shadow-md animate-in zoom-in-95 duration-300"
                />
              </div>

              {/* Headings */}
              <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 dark:text-white tracking-tight mt-6 text-center">
                Your package has arrived 🎉
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-xs leading-relaxed">
                Your package is ready for pickup at{" "}
                {activeDestination ||
                  delivery.pickupTerminal ||
                  "Distribution Terminal"}
              </p>

              {/* Package Pickup Details Card */}
              <div className="w-full bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs divide-y divide-gray-100 dark:divide-white/5 mt-6 text-left">
                <div className="pb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                      {activeTitle}
                    </h3>
                    <span className="text-[10px] font-bold text-yellow-700 dark:text-yellow-400 bg-yellow-400/20 px-2 py-0.5 rounded uppercase tracking-wider mt-1 inline-block">
                      READY FOR PICKUP
                    </span>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-yellow-50 dark:bg-white/5 border border-yellow-100 dark:border-white/10 shrink-0 flex items-center justify-center p-1">
                    <PackageStateIcon
                      status="Ready for pickup"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
                <div className="py-3">
                  <p className="font-mono text-xs sm:text-sm text-gray-400 dark:text-gray-500">
                    ID: {cleanCode || delivery.trackingCode}
                  </p>
                </div>
                <div className="pt-3">
                  <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                    Arrived on:{" "}
                    {activeLastScan || delivery.arrivedDate || "Recent"}
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="w-full flex flex-col gap-3 pt-6 mt-6">
              <button
                type="button"
                onClick={() => {
                  if (onBookRiderAgain) {
                    onBookRiderAgain()
                  } else {
                    onBack()
                  }
                }}
                className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 active:scale-[0.99] text-black font-bold text-base transition-all shadow-sm flex items-center justify-center cursor-pointer touch-manipulation"
              >
                Book a Rider Now
              </button>
              <button
                type="button"
                onClick={onBack}
                className="w-full py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-[0.99] text-gray-900 dark:text-white font-semibold text-base transition-colors cursor-pointer touch-manipulation text-center"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )
    }

    // ----------------------------------------------------
    // SCREEN: IN-TRANSIT ROUTE STEPPER & DETAILS SCREEN
    // ----------------------------------------------------
    return (
      <div className="w-full flex-1 flex flex-col min-h-full bg-[#fcfcfc] dark:bg-[#0c0c0e] pb-12 transition-colors animate-in fade-in duration-200">
        {/* Top Header */}
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between sticky top-0 z-20 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md">
          <button
            onClick={onBack}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          {/* Quick toggle to arrived preview */}
          <button
            type="button"
            onClick={() => setInboundArrivedState(true)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-colors cursor-pointer"
            title="Preview package arrived state"
          >
            Mark as Arrived
          </button>
        </div>

        {/* Main Content Area */}
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col gap-4 sm:gap-5 flex-1">
          {/* Header Title */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Package details
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Live tracking information from carrier
            </p>
          </div>

          {/* Card 1: Item & Category Summary */}
          <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4">
            {/* Inbound Package Details Icon */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-yellow-50 dark:bg-white/5 border border-yellow-100 dark:border-white/5 flex items-center justify-center shrink-0 p-2.5">
              <img
                src={linkedBoxSvg}
                alt="Inbound package details"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              {/* Category & Status Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-400 text-black text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                  <Package className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{delivery.category || "PARCEL"}</span>
                </span>
                {delivery.store && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-400/10 text-yellow-800 dark:text-yellow-300 text-[10px] font-bold uppercase tracking-wider border border-yellow-200/60 dark:border-yellow-400/20">
                    From {delivery.store}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    activeStatus === "Delivered"
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : "bg-yellow-100 dark:bg-yellow-400/20 text-yellow-800 dark:text-yellow-400"
                  }`}
                >
                  {activeStatusBadge}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                {activeTitle}
              </h3>
              <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {cleanCode || delivery.trackingCode}
              </p>
            </div>
          </div>

          {/* Card 2: Courier Shipping Metadata */}
          <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl divide-y divide-gray-100 dark:divide-white/5 shadow-xs overflow-hidden">
            {/* Courier */}
            <div className="flex items-center justify-between p-4 sm:p-4.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                  <Truck className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Courier
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {activeCourier}
              </span>
            </div>

            {/* Ordered from store (if set) */}
            {delivery.store && (
              <div className="flex items-center justify-between p-4 sm:p-4.5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                    <ShoppingBag className="w-4.5 h-4.5 text-yellow-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    Ordered from
                  </span>
                </div>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {delivery.store}
                </span>
              </div>
            )}

            {/* Shipped on */}
            <div className="flex items-center justify-between p-4 sm:p-4.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Shipped on
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {activeShippedDate}
              </span>
            </div>

            {/* Last Scanned */}
            <div className="flex items-center justify-between p-4 sm:p-4.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                  <Clock className="w-4.5 h-4.5" />
                </div>
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Last Scanned
                </span>
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {activeLastScan}
              </span>
            </div>
          </div>

          {/* Pay Customs / Duty URL Notice from API if available */}
          {livePayUrl && (
            <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
                  Customs / Duty Pending
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400/90 mt-0.5 truncate">
                  Online duty payment available for this package
                </p>
              </div>
              <a
                href={livePayUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all shrink-0 shadow-xs"
              >
                Pay Now
              </a>
            </div>
          )}

          {/* Card 3: Real Tracking Milestones Stepper */}
          <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Tracking Milestones{" "}
                {liveTracks.length > 0 ? `(${liveTracks.length})` : ""}
              </h4>
              {liveTracks.length > 0 && (
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Live API Synced
                </span>
              )}
            </div>

            {liveTracks.length > 0 ? (
              <div className="flex flex-col gap-6 relative">
                {/* Connecting Vertical Dashed Line */}
                <div className="absolute left-2.5 top-3.5 bottom-3.5 w-px border-l-2 border-dashed border-gray-300 dark:border-gray-700 -translate-x-1/2" />

                {liveTracks.map((tr, idx) => {
                  const isLatest = idx === 0
                  const isEarliest = idx === liveTracks.length - 1
                  const eventTitle =
                    tr.actionName || tr.status || "Status Update"
                  const eventMsg = cleanTrackingText(tr.msgEng || tr.message)

                  return (
                    <div
                      key={idx}
                      className="flex items-start gap-3.5 relative z-10"
                    >
                      {/* Node Icon/Marker */}
                      {isLatest ? (
                        <div className="w-5 h-5 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                          <MapPin className="w-5 h-5 fill-red-500/20 stroke-red-500 animate-bounce" />
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full border-2 shrink-0 mt-0.5 shadow-2xs ${
                            isEarliest
                              ? "bg-yellow-400 border-yellow-500 dark:border-yellow-300"
                              : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                          }`}
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider block ${
                              isLatest
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {isLatest
                              ? "CURRENT STATION"
                              : isEarliest
                                ? "INBOUND ORIGIN"
                                : "TRANSIT HUB"}
                          </span>
                          {tr.time && (
                            <span className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                              {formatTrackingTime(tr.time)}
                            </span>
                          )}
                        </div>

                        <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                          {eventTitle}
                        </p>

                        {eventMsg && eventMsg !== eventTitle && (
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
                            {eventMsg}
                          </p>
                        )}

                        {(tr.scanSource || tr.location) && (
                          <span className="text-[11px] text-gray-400 dark:text-gray-500 block mt-1">
                            {tr.location ? `📍 ${tr.location}` : ""}{" "}
                            {tr.scanSource ? `• ${tr.scanSource}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              /* Fallback 2-stop stepper when no API tracks loaded */
              <div className="flex flex-col gap-6 relative">
                {/* Connecting Vertical Dashed Line */}
                <div className="absolute left-2.5 top-3.5 bottom-3.5 w-px border-l-2 border-dashed border-gray-300 dark:border-gray-700 -translate-x-1/2" />

                {/* Stop 1 */}
                <div className="flex items-start gap-3.5 relative z-10">
                  <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-500 dark:border-yellow-300 shrink-0 mt-0.5 shadow-2xs" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                      INBOUND FROM
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                      {activeOrigin}
                    </p>
                  </div>
                </div>

                {/* Stop 2 */}
                <div className="flex items-start gap-3.5 relative z-10">
                  <div className="w-5 h-5 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                    <MapPin className="w-5 h-5 fill-red-500/20 stroke-red-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                      CURRENT HUB / DESTINATION
                    </span>
                    <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                      {activeDestination}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Defaults matching the exact reference design
  const item: DeliveryDetailsItem = {
    id: delivery?.id || "1",
    title: delivery?.title || "Nike Air Max shoe",
    trackingCode: delivery?.trackingCode || "#42324-HUD-PKG34R",
    status: delivery?.status || "Delivered",
    image: delivery?.image || linkedBoxSvg,
    fromLocation: delivery?.fromLocation || "GIG TERMINAL",
    toLocation: delivery?.toLocation || "Auchi, Edo State",
    date: delivery?.date || "Yesterday",
    time: delivery?.time || "12:47 PM",
    weight: delivery?.weight || "Medium",
    category: delivery?.category || "Clothes",
    fragileNote:
      delivery?.fragileNote ||
      "Note: this Item was labelled as sensitive and fragile",
    rider: {
      name: delivery?.rider?.name || "Assigned Rider",
      idCode: delivery?.rider?.idCode || "#42324-FHJS44R-34R",
      avatar:
        delivery?.rider?.avatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      rating: delivery?.rider?.rating || 4.8,
      reviewCount: delivery?.rider?.reviewCount || 32,
      price: delivery?.rider?.price || "₦5,000",
      isSaved: delivery?.rider?.isSaved ?? false,
    },
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleSendMessage = async (customText?: string) => {
    const text = (customText || chatInputText).trim()
    if (!text || isSendingMessage) return
    if (!delivery?.id) {
      setChatError("This delivery is not linked to an order chat.")
      return
    }

    const chatId = `order-${delivery.id}`
    const tempId = `msg-${Date.now()}`
    const optimisticMessage: DeliveryChatMessage = {
      id: tempId,
      sender: "user",
      type: "text",
      text,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      createdAt: new Date().toISOString(),
    }

    setChatError(null)
    setChatMessages((current) => [...current, optimisticMessage])
    if (!customText) setChatInputText("")
    setIsSendingMessage(true)

    try {
      const saved = await chatApi.sendMessage(chatId, { type: "text", text })
      const formatted = mapDeliveryChatMessage(saved)
      setChatMessages((current) => [
        ...current.filter((message) => message.id !== tempId && message.id !== saved.id),
        formatted,
      ])
    } catch (error) {
      setChatMessages((current) =>
        current.filter((message) => message.id !== tempId),
      )
      setChatError(
        error instanceof Error ? error.message : "Message could not be sent.",
      )
    } finally {
      setIsSendingMessage(false)
    }
  }

  const startVoiceRecording = async () => {
    if (!delivery?.id) {
      setChatError("This delivery is not linked to an order chat.")
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setChatError("Voice recording is not supported by this browser.")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = stream
      audioChunksRef.current = []
      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"].find(
        (type) => MediaRecorder.isTypeSupported(type),
      )
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }
      recorder.start()
      setChatError(null)
      setRecordingSeconds(0)
      setIsRecordingVoice(true)
      recordingTimerRef.current = window.setInterval(
        () => setRecordingSeconds((seconds) => seconds + 1),
        1000,
      )
    } catch (error) {
      console.error("Could not start voice recording:", error)
      setChatError("Microphone access is unavailable. Check your browser permission.")
    }
  }

  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = null
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
      mediaRecorderRef.current = null
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    audioChunksRef.current = []
    setRecordingSeconds(0)
    setIsRecordingVoice(false)
  }

  const sendVoiceRecording = () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || recorder.state === "inactive" || !delivery?.id) return

    const chatId = `order-${delivery.id}`
    const duration = Math.max(1, recordingSeconds)
    recorder.onstop = () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
      mediaRecorderRef.current = null
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current)
        recordingTimerRef.current = null
      }
      setIsRecordingVoice(false)
      setRecordingSeconds(0)

      const blob = new Blob(audioChunksRef.current, {
        type: recorder.mimeType || "audio/webm",
      })
      audioChunksRef.current = []
      const reader = new FileReader()
      reader.onload = async () => {
        if (typeof reader.result !== "string") {
          setChatError("Voice message could not be prepared. Please try again.")
          return
        }

        const clientMessageId =
          globalThis.crypto?.randomUUID?.() ||
          `voice-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const createdAt = new Date().toISOString()
        const optimistic: DeliveryChatMessage = {
          id: clientMessageId,
          clientMessageId,
          sender: "user",
          type: "audio",
          text: "Voice message",
          audioUrl: reader.result,
          audioDuration: duration,
          time: new Date(createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          createdAt,
        }
        setChatError(null)
        setChatMessages((current) => [...current, optimistic])
        setIsSendingMessage(true)

        try {
          const saved = await chatApi.sendMessage(chatId, {
            type: "audio",
            audioUrl: reader.result,
            audioDuration: duration,
            clientMessageId,
          })
          const formatted = mapDeliveryChatMessage(saved)
          setChatMessages((current) =>
            upsertDeliveryChatMessage(current, formatted),
          )
        } catch (error) {
          setChatMessages((current) =>
            current.filter((message) => message.id !== clientMessageId),
          )
          setChatError(
            error instanceof Error
              ? error.message
              : "Voice message could not be sent.",
          )
        } finally {
          setIsSendingMessage(false)
        }
      }
      reader.onerror = () => {
        console.error("Could not read recorded voice message:", reader.error)
        setChatError("Voice message could not be prepared. Please try again.")
      }
      reader.readAsDataURL(blob)
    }
    recorder.stop()
  }

  // Close expanded image on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowExpandedImage(false)
      }
    }
    if (showExpandedImage) {
      window.addEventListener("keydown", handleKeyDown)
    }
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showExpandedImage])

  if (showRiderChat) {
    return (
      <div className="w-full flex-1 min-h-full h-full flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] animate-in fade-in duration-200 pb-0 md:pb-0">
        {/* Chat Header */}
        <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3.5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white/95 dark:bg-[#161618]/95 backdrop-blur-md z-20 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setShowRiderChat(false)}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer touch-manipulation shrink-0"
              title="Back to delivery status"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>
            <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 border border-gray-200/80 dark:border-white/10">
              <img
                src={item.rider?.avatar}
                alt={item.rider?.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#161618]" />
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                {item.rider?.name}
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                <span className="text-yellow-500 font-semibold">
                  ★ {item.rider?.rating}
                </span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Verified Rider
                </span>
                <span>•</span>
                <span>
                  {item.status || "Status unavailable"}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() =>
                handleCopy(item.rider?.name || "Assigned Rider", "call")
              }
              className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
              title="Call rider"
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowRiderChat(false)}
              className="px-3 py-1.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
              title="Back to delivery status"
            >
              <span>Back to Status</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Order Tracking Quick Banner */}
        <div className="px-4 sm:px-6 py-2.5 bg-yellow-50/80 dark:bg-yellow-400/10 border-b border-yellow-200/50 dark:border-yellow-400/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-lg">📦</span>
            <div className="min-w-0">
              <h4 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white truncate">
                {item.title}
              </h4>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-mono truncate">
                Tracking ID: {item.trackingCode} • {item.status?.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowRiderChat(false)}
            className="text-xs font-bold text-[#b45309] dark:text-yellow-400 hover:underline cursor-pointer flex items-center gap-1 shrink-0 ml-2"
          >
            <span>View Status</span>
            <span>→</span>
          </button>
        </div>

        {/* Chat Message Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-gray-50/70 dark:bg-[#111113] flex flex-col gap-3.5">
          <div className="flex justify-center my-1">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium px-3 py-1 rounded-full bg-gray-200/60 dark:bg-white/5">
              Today • {item.time || "10:11 AM"}
            </span>
          </div>

          {chatError && (
            <p role="alert" className="text-center text-xs text-red-600 dark:text-red-400">
              {chatError}
            </p>
          )}

          {chatMessages.map((msg) => {
            const isUser = msg.sender === "user"
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                  isUser ? "self-end flex-row-reverse" : "self-start"
                } animate-in fade-in slide-in-from-bottom-1 duration-150`}
              >
                {!isUser && (
                  <img
                    src={item.rider?.avatar}
                    alt="Rider"
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-auto border border-gray-200 dark:border-white/10"
                  />
                )}
                <div
                  className={`p-3.5 rounded-2xl shadow-2xs ${
                    isUser
                      ? "bg-[#FFCC00] text-gray-950 rounded-br-xs font-medium"
                      : "bg-white dark:bg-[#1c1c20] text-gray-900 dark:text-white rounded-bl-xs border border-gray-100 dark:border-white/5"
                  }`}
                >
                  {msg.type === "audio" && msg.audioUrl ? (
                    <div className="min-w-[210px] max-w-full">
                      <audio
                        controls
                        preload="metadata"
                        src={msg.audioUrl}
                        className="h-9 w-full"
                        aria-label="Voice message playback"
                      />
                      {msg.audioDuration ? (
                        <p className="mt-1 text-[10px] opacity-70">
                          Voice message · {formatAudioDuration(msg.audioDuration)}
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed">
                      {msg.text}
                    </p>
                  )}
                  <p
                    className={`text-[9.5px] mt-1 text-right ${
                      isUser
                        ? "text-gray-800/80"
                        : "text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    {msg.time}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Quick Suggestion Pills & Input Area */}
        <div className="p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom,0.75rem))] bg-white dark:bg-[#161618] border-t border-gray-100 dark:border-white/5 shrink-0">
          {/* Horizontal Quick Pills */}
          <div className="flex gap-2 mb-2.5 overflow-x-auto pb-1 hide-scrollbar">
            {[
              "Call me",
              "I'm outside waiting",
              "What's your current ETA?",
              "Thank you for the delivery!",
            ].map((phrase, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(phrase)}
                className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 text-xs whitespace-nowrap text-gray-700 dark:text-gray-300 hover:border-yellow-400 hover:bg-yellow-50/50 dark:hover:bg-yellow-400/10 transition-colors cursor-pointer shrink-0"
              >
                {phrase}
              </button>
            ))}
          </div>

          {isRecordingVoice ? (
            <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#202024]">
              <button
                type="button"
                onClick={cancelVoiceRecording}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10"
                aria-label="Cancel voice recording"
                title="Cancel recording"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    Recording voice message
                  </span>
                  <span className="font-mono text-xs text-gray-600 dark:text-gray-300">
                    {formatAudioDuration(recordingSeconds)}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Recording in progress"
                  className="h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
                >
                  <div
                    className="h-full rounded-full bg-red-500 transition-[width] duration-1000"
                    style={{
                      width: `${Math.min(100, (recordingSeconds / 60) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={sendVoiceRecording}
                disabled={isSendingMessage}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFCC00] text-gray-950 transition-colors hover:bg-[#f5c400] disabled:opacity-50"
                aria-label="Finish and send voice message"
                title="Send voice note"
              >
                <Send className="h-4 w-4 stroke-[2.5]" />
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={() => handleCopy("Photo feature", "photo")}
                className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full shrink-0 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                title="Attach photo"
              >
                <Camera className="w-5 h-5" />
              </button>

              <div className="flex-1 bg-gray-100 dark:bg-[#202024] rounded-2xl flex items-center px-4 py-2.5 border border-transparent focus-within:border-yellow-400 transition-colors">
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder={`Message ${item.rider?.name || "rider"}...`}
                  disabled={!delivery?.id || isSendingMessage}
                  className="bg-transparent w-full focus:outline-none text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>

              {chatInputText.trim() ? (
                <button
                  type="submit"
                  disabled={!delivery?.id || isSendingMessage}
                  className="w-10 h-10 flex items-center justify-center bg-[#FFCC00] hover:bg-[#f5c400] disabled:opacity-40 disabled:hover:bg-[#FFCC00] text-gray-950 rounded-full shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Send message"
                >
                  <Send className="w-4 h-4 stroke-[2.5]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void startVoiceRecording()}
                  disabled={!delivery?.id || isSendingMessage}
                  className="w-10 h-10 flex items-center justify-center bg-[#FFCC00] hover:bg-[#f5c400] disabled:opacity-40 text-gray-950 rounded-full shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                  title="Record voice message"
                  aria-label="Record voice message"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-28 md:pb-16 transition-colors">
      {/* Top Header */}
      <div className="px-5 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-white/5">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition-colors -ml-1 cursor-pointer touch-manipulation"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Delivery information
        </h1>

        <NotificationButton variant="standard" onClick={onOpenNotifications} />
        {/* Spacer to keep title centered on desktop when notification button is hidden */}
        <div className="w-10 hidden xl:block" aria-hidden="true" />
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-5 sm:py-6 flex flex-col gap-6">
        {/* Package Header Card */}
        <div className="flex items-center gap-4">
          <div
            onClick={() => setShowExpandedImage(true)}
            className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-white dark:bg-[#1a1a1d] border border-gray-100 dark:border-white/10 shrink-0 shadow-xs cursor-pointer group relative select-none"
            title="Click to expand full image"
          >
            <img
              src={item.image}
              alt={item.title}
              className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Maximize2 className="w-5 h-5 text-white drop-shadow-md" />
            </div>
          </div>

          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <PackageStateIcon
                status={item.status}
                className="w-5 h-5 object-contain"
              />
              <span
                className={`text-[10px] sm:text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider w-fit ${
                  item.status === "Delivered"
                    ? "text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-400/15"
                    : item.status === "Cancelled"
                      ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-400/15"
                      : "text-black bg-yellow-400 font-bold"
                }`}
              >
                {item.status}
              </span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white truncate">
              {item.title}
            </h2>

            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              <span className="truncate">{item.trackingCode}</span>
              <button
                onClick={() => handleCopy(item.trackingCode || "", "tracking")}
                className="p-1 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy tracking code"
              >
                {copiedKey === "tracking" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Package Information Card */}
        <div className="space-y-4 pt-1">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            Package Information
          </h3>

          {/* Route Section - perfectly aligned with 2-column metadata grid below */}
          <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8 items-center">
            {/* From Column */}
            <div className="flex items-center justify-between pr-1 min-w-0">
              <div className="min-w-0">
                <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block">
                  From
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-400 uppercase tracking-wide block mt-0.5 truncate">
                  {item.fromLocation}
                </span>
              </div>
              <ChevronsRight className="w-5 h-5 text-gray-300 dark:text-gray-600 shrink-0 ml-auto mr-1" />
            </div>

            {/* To Column */}
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white block">
                To
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-400 block mt-0.5 truncate">
                {item.toLocation}
              </span>
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="border-b border-dashed border-gray-200 dark:border-white/10 my-2"></div>

          {/* Grid Metadata - identical 2-column width and alignment as From / To */}
          <div className="grid grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-4">
            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Date
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5 truncate">
                {item.date}
              </span>
            </div>

            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Time
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5 truncate">
                {item.time}
              </span>
            </div>

            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Estimated weight
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5 truncate">
                {item.weight}
              </span>
            </div>

            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-white block">
                Category
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 block mt-0.5 truncate">
                {item.category}
              </span>
            </div>
          </div>

          {/* Fragile Alert Box */}
          {item.fragileNote && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-xl sm:rounded-2xl bg-gray-50 dark:bg-[#161619] border border-gray-100 dark:border-white/5 text-xs text-gray-600 dark:text-gray-400 mt-2">
              <AlertCircle className="w-4 h-4 text-gray-400 shrink-0" />
              <p className="leading-snug">{item.fragileNote}</p>
            </div>
          )}
        </div>

        {/* Rider’s information Card */}
        <div className="bg-white dark:bg-[#1c1c20] rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col gap-4">
          <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
            Rider’s information
          </h3>

          {/* Rider Profile Row */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={item.rider?.avatar}
                alt={item.rider?.name}
                className="w-12 h-12 rounded-full object-cover shrink-0"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {item.rider?.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                  <span className="truncate">{item.rider?.idCode}</span>
                  <button
                    onClick={() =>
                      handleCopy(item.rider?.idCode || "", "riderId")
                    }
                    className="hover:text-gray-800 dark:hover:text-white transition-colors cursor-pointer"
                    title="Copy rider code"
                  >
                    {copiedKey === "riderId" ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Message Rider Button */}
              <button
                onClick={() => setShowRiderChat(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200/80 dark:border-white/10 text-gray-700 dark:text-gray-200 hover:bg-yellow-50 dark:hover:bg-yellow-400/10 hover:border-yellow-400 transition-all cursor-pointer touch-manipulation shadow-2xs"
                title="Message rider"
              >
                <MessageSquareText className="w-4 h-4 stroke-[1.8]" />
              </button>

              {/* Bookmark Button */}
              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors cursor-pointer touch-manipulation shrink-0 ${
                  isBookmarked
                    ? "bg-yellow-400/20 text-yellow-600 dark:text-yellow-400"
                    : "text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
                title={isBookmarked ? "Saved rider" : "Save rider"}
              >
                <Bookmark
                  className={`w-5 h-5 ${isBookmarked ? "fill-current" : ""}`}
                />
              </button>
            </div>
          </div>

          {/* Dashed Separator */}
          <div className="border-b border-dashed border-gray-100 dark:border-white/10"></div>

          {/* Rating Row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Rating :
            </span>
            <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span>{item.rider?.rating}</span>
              <span className="text-gray-400 text-xs font-normal">
                ({item.rider?.reviewCount})
              </span>
            </div>
          </div>

          {/* Price Row */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400 font-medium">
              Price :
            </span>
            <div className="flex items-center gap-1.5 font-bold text-base text-gray-900 dark:text-white">
              <span>{item.rider?.price}</span>
              <button
                onClick={() => handleCopy(item.rider?.price || "", "price")}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy price"
              >
                {copiedKey === "price" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Book Rider Again Action Button */}
          <div className="pt-2">
            <button
              onClick={() => {
                setIsBooked(true)
                onBookRiderAgain?.()
                setTimeout(() => setIsBooked(false), 2500)
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 active:scale-[0.99] text-gray-900 font-bold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              {isBooked ? (
                <>
                  <Check className="w-5 h-5 text-black stroke-[2.5]" />
                  <span>Rider Booking Requested!</span>
                </>
              ) : (
                <span>Book Rider Again</span>
              )}
            </button>
          </div>
        </div>

        {/* Fullscreen Expanded Package Image Modal / Lightbox */}
        {showExpandedImage && (
          <div
            className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setShowExpandedImage(false)}
          >
            {/* Top Bar */}
            <div
              className="flex items-center justify-between z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setShowExpandedImage(false)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer active:scale-95 shrink-0"
                  title="Back to delivery information"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                </button>
                <div className="min-w-0">
                  <h3 className="text-white font-bold text-sm sm:text-base leading-tight truncate">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-yellow-400 font-mono mt-0.5 truncate">
                    Tracking: {item.trackingCode} • Full Image View
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowExpandedImage(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                  title="Close"
                >
                  <span>Close</span>
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>

            {/* Center: Full Uncropped Image */}
            <div
              className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 w-full overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative max-h-full max-w-full flex items-center justify-center">
                <img
                  src={item.image}
                  alt={item.title}
                  className="max-h-[75vh] sm:max-h-[82vh] max-w-[94vw] w-auto h-auto object-contain rounded-2xl shadow-2xl ring-1 ring-white/15 animate-in zoom-in-95 duration-200 select-none"
                />
              </div>
            </div>

            {/* Bottom Bar */}
            <div
              className="flex items-center justify-between gap-3 pt-2 max-w-xl mx-auto w-full z-10 text-xs text-white/70"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="truncate">
                Tap outside or click Close to return
              </span>
              <button
                type="button"
                onClick={() => setShowExpandedImage(false)}
                className="text-yellow-400 hover:underline font-bold cursor-pointer shrink-0"
              >
                Back to Details →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
