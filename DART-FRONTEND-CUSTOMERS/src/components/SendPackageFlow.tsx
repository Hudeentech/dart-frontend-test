import React, { useState, useEffect, useRef, useCallback } from "react"
import {
  ArrowLeft,
  ArrowRight,
  X,
  Camera,
  Shirt,
  FileText,
  Package,
  MapPin,
  History,
  Plus,
  Star,
  CheckCircle2,
  Check,
  Search,
  Navigation,
  ShieldCheck,
  ChevronsRight,
  AlertTriangle,
  Copy,
  Info,
  Shield,
  Wallet,
  CreditCard,
  Banknote,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Bookmark,
  Flag,
  MessageSquare,
  MessageSquareText,
  Timer,
  Phone,
  Send,
  MoreVertical,
  Maximize2,
  Smartphone,
  AlertOctagon,
  Loader2,
} from "lucide-react"
import iphone12Photo from "../assets/iphone_12_pro.jpg"
import divineAvatar from "../assets/divine_augustina_rider.jpg"
import allRidersImage from "../assets/all-riders-image.png"
import dropOffBoxGoodMarkIcon from "../assets/Good-box.svg"
import courierRatingAvatar from "../assets/courier_rating_avatar.png"
import greenSuccessBadge from "../assets/good-mark.svg"
import SendPackageModal from "./SendPackageModal"
import ConfettiBackground from "./ConfettiBackground"
import RateRiderModal from "./RateRiderModal"
import { ordersApi } from "../api/orders.api"
import { packagesApi } from "../api/packages.api"
import { ridersApi } from "../api/riders.api"
import { cardsApi, SavedCard } from "../api/cards.api"
import { userApi } from "../api/user.api"
import { walletApi } from "../api/wallet.api"
import { chatApi, getChatSocket } from "../api/chat.api"
import { useAuth } from "../context/AuthContext"
import { Address, ApiChatMessage, OrderStatus } from "../types/api.types"
import { PackageDraft, savePackageDraft, deletePackageDraft } from "../utils/drafts"

export interface Rider {
  id: string
  name: string
  avatar: string
  rating: number
  reviews: number
  etaMinutes: number
  distanceKm?: number
  isVerified: boolean
  isAvailable: boolean
  plateNumber?: string
}

interface LivePackageStatus {
  status?: OrderStatus
  state?: string
  isRiderAccepted?: boolean
  isPackageArrived?: boolean
  isArrivalImminent?: boolean
  isCancelled?: boolean
  pendingCountdown?: number
  etaSeconds?: number | null
  etaTarget?: "PICKUP" | "DESTINATION" | null
  packageName?: string
  trackingId?: string
  fromLocation?: string
  toLocation?: string
  estimatedFee?: string
  dropOffCode?: string
  milestones?: {
    riderEnRouteAt?: string | null
    packageCollectedAt?: string | null
    packageArrivedAt?: string | null
    deliveredAt?: string | null
  }
  rider?: {
    id?: string
    name?: string
    avatar?: string
    rating?: number
    reviews?: number
    phoneNumber?: string
    etaMinutes?: number
    distanceKm?: number
    plateNumber?: string
  }
}

const formatMilestoneTime = (timestamp?: string | null) => {
  if (!timestamp) return ""
  const date = new Date(timestamp)
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export const defaultRidersList: Rider[] = [
  {
    id: "r1",
    name: "Augustine Osagie",
    avatar: divineAvatar,
    rating: 4.8,
    reviews: 251,
    etaMinutes: 3,
    distanceKm: 0.11,
    isVerified: true,
    isAvailable: true,
    plateNumber: "EDO-423-AUC",
  },
  {
    id: "r8",
    name: "Darrell Steward",
    avatar:
      "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80",
    rating: 4.7,
    reviews: 144,
    etaMinutes: 8,
    distanceKm: 2.03,
    isVerified: true,
    isAvailable: true,
    plateNumber: "EDO-541-AUC",
  },
]

const preparePackagePhoto = async (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error("Could not read the package photo."))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error("Could not process the package photo."))
      image.onload = () => {
        const scale = Math.min(1, 1280 / Math.max(image.width, image.height))
        const canvas = document.createElement("canvas")
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("Could not process the package photo."))
          return
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }
      image.src = String(reader.result)
    }
    reader.readAsDataURL(file)
  })

export type FlowScreen = "details" | "destination" | "add_location" | "choose_rider" | "all_riders" | "confirm_delivery" | "payment_method" | "package_status" | "success"

interface SendPackageFlowProps {
  initialImage?: {
    file?: File
    previewUrl: string
  } | null
  mode?: "send" | "pickup"
  initialScreen?: FlowScreen
  initialIsRiderAccepted?: boolean
  initialDraft?: PackageDraft | null
  initialPackageDetails?: {
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
  } | null
  onBack: () => void
  onComplete?: (details: {
    packageName: string
    category: string
    weight: string
    imageFile?: File
    fromLocation?: string
    toLocation?: string
    estimatedFee?: string
    riderName?: string
    riderEta?: string
    paymentMethod: string
  }) => void
  onOpenNotifications?: () => void
}

export default function SendPackageFlow({
  initialImage,
  mode = "send",
  initialScreen = "details",
  initialIsRiderAccepted = false,
  initialDraft,
  initialPackageDetails,
  onBack,
  onComplete,
}: SendPackageFlowProps) {
  const { user } = useAuth()
  const [activeDraftId, setActiveDraftId] = useState<string | null>(
    initialDraft?.id || null,
  )
  const [screen, setScreen] = useState<FlowScreen>(
    initialDraft?.step || initialScreen,
  )
  const [capturedImage, setCapturedImage] = useState<{
    file?: File
    previewUrl: string
  } | null>(
    initialImage ||
      (initialPackageDetails?.image
        ? { previewUrl: initialPackageDetails.image }
        : null),
  )
  const packagePhoto =
    capturedImage?.previewUrl || initialPackageDetails?.image

  // Camera modal state (only camera and prompt modals appear as popups)
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false)
  const [cameraModalInitialMode, setCameraModalInitialMode] =
    useState<"prompt" | "camera">("camera")

  // Form state for Package Details
  const [packageName, setPackageName] = useState(
    initialDraft?.packageName ||
      initialPackageDetails?.packageName ||
      "",
  )
  const [selectedCategory, setSelectedCategory] =
    useState<"Electronics" | "Documents" | "Clothes" | "Others">(
      (initialDraft?.category as any) ||
        (initialPackageDetails?.category as any) ||
        "Electronics",
    )
  const [selectedWeight, setSelectedWeight] =
    useState<"light" | "medium" | "heavy" | "">(
      (initialDraft?.weight as any) || (mode === "pickup" ? "" : "light"),
    )
  const [isFragile, setIsFragile] = useState(
    initialDraft?.isFragile !== undefined ? initialDraft.isFragile : false,
  )

  // Destination screen state
  const [fromLocation, setFromLocation] = useState(
    initialDraft?.fromLocation ||
      initialPackageDetails?.fromLocation ||
      "",
  )
  const [pickupCoordinates, setPickupCoordinates] = useState<{
    lat: number
    lng: number
  } | null>(null)
  const [isLocatingPickup, setIsLocatingPickup] = useState(false)
  const [pickupLocationError, setPickupLocationError] = useState<string | null>(null)
  const [toLocation, setToLocation] = useState(
    initialDraft?.toLocation ||
      initialPackageDetails?.toLocation ||
      "",
  )
  const [estimatedFee, setEstimatedFee] = useState("")
  const [quoteError, setQuoteError] = useState<string | null>(null)
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false)
  const quoteRequestId = useRef(0)

  // Add new location state
  const [newLocationSearch, setNewLocationSearch] = useState("")
  const [selectedNewLocation, setSelectedNewLocation] = useState("")

  // Rider selection state
  const [selectedRiderId, setSelectedRiderId] = useState(
    initialDraft?.selectedRiderId || "r1",
  )
  const [showSelectedRiderModal, setShowSelectedRiderModal] = useState(false)

  // Payment method selection state
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<"wallet" | "card" | "cash">(
      (initialDraft?.selectedPaymentMethod as any) || "wallet",
    )
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])

  // Saved addresses state & wallet balance
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([])
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [saveToBook, setSaveToBook] = useState(true)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [isLoadingWallet, setIsLoadingWallet] = useState(false)

  // Handle saving as draft and exiting the flow
  const handleExitFlow = () => {
    if (
      screen === "details" ||
      screen === "destination" ||
      screen === "add_location" ||
      screen === "choose_rider" ||
      screen === "all_riders" ||
      screen === "confirm_delivery" ||
      screen === "payment_method"
    ) {
      let saveStep: FlowScreen = screen
      if (saveStep === "add_location") saveStep = "destination"
      if (saveStep === "all_riders") saveStep = "choose_rider"

      savePackageDraft({
        id: activeDraftId || undefined,
        packageName: packageName.trim() || "Untitled Package",
        category: selectedCategory,
        weight: selectedWeight,
        isFragile,
        fromLocation,
        toLocation,
        estimatedFee,
        selectedRiderId,
        selectedPaymentMethod,
        step: saveStep,
      })
    }
    onBack()
  }

  // Auto-sync active draft as customer makes edits
  useEffect(() => {
    if (activeDraftId) {
      let saveStep: FlowScreen = screen
      if (saveStep === "add_location") saveStep = "destination"
      if (saveStep === "all_riders") saveStep = "choose_rider"
      if (
        saveStep === "details" ||
        saveStep === "destination" ||
        saveStep === "choose_rider" ||
        saveStep === "confirm_delivery" ||
        saveStep === "payment_method"
      ) {
        savePackageDraft({
          id: activeDraftId,
          packageName: packageName.trim() || "Untitled Package",
          category: selectedCategory,
          weight: selectedWeight,
          isFragile,
          fromLocation,
          toLocation,
          estimatedFee,
          selectedRiderId,
          selectedPaymentMethod,
          step: saveStep,
        })
      }
    }
  }, [
    activeDraftId,
    screen,
    packageName,
    selectedCategory,
    selectedWeight,
    isFragile,
    fromLocation,
    toLocation,
    estimatedFee,
    selectedRiderId,
    selectedPaymentMethod,
  ])

  const loadAddresses = async () => {
    setIsLoadingAddresses(true)
    try {
      const addrs = await userApi.getAddresses()
      if (Array.isArray(addrs)) {
        setSavedAddresses(addrs)
        setFromLocation((currentFrom: string) => {
          if (!currentFrom && addrs.length > 0) {
            const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0]
            return `${defaultAddr.street}, ${defaultAddr.city}`
          }
          return currentFrom
        })
      }
    } catch (e) {
      console.warn("[SendPackageFlow] Load addresses note:", e)
    } finally {
      setIsLoadingAddresses(false)
    }
  }

  const loadWallet = async () => {
    setIsLoadingWallet(true)
    try {
      const w = await walletApi.getWallet()
      if (w && typeof w.balance === "number") {
        setWalletBalance(w.balance)
      } else {
        const overview = await cardsApi.getPaymentOverview()
        if (overview && typeof overview.walletBalance === "number") {
          setWalletBalance(overview.walletBalance)
        }
      }
    } catch (e) {
      try {
        const overview = await cardsApi.getPaymentOverview()
        if (overview && typeof overview.walletBalance === "number") {
          setWalletBalance(overview.walletBalance)
        }
      } catch {}
    } finally {
      setIsLoadingWallet(false)
    }
  }

  useEffect(() => {
    cardsApi
      .listCards()
      .then((cards) => {
        if (Array.isArray(cards)) setSavedCards(cards)
      })
      .catch(() => {})
    loadAddresses()
    loadWallet()
  }, [])

  useEffect(() => {
    if (screen === "payment_method") {
      loadWallet()
    } else if (screen === "destination" || screen === "add_location") {
      loadAddresses()
    } else if (screen === "package_status") {
      window.scrollTo(0, 0)
      const mainEl = document.querySelector("main")
      if (mainEl) {
        mainEl.scrollTo({ top: 0, behavior: "instant" })
      }
    }
  }, [screen])

  // All Riders screen state
  const [riderSearchQuery, setRiderSearchQuery] = useState("")
  const [riderFilterTab, setRiderFilterTab] =
    useState<"recommended" | "nearest" | "highest" | "available">("recommended")
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [inviteToast, setInviteToast] = useState<string | null>(null)
  const [copyToast, setCopyToast] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  // Fullscreen expanded package image lightbox state
  const [showExpandedImage, setShowExpandedImage] = useState(false)

  // Order & Tracking State
  const [activeOrderId, setActiveOrderId] = useState<string | null>(
    initialPackageDetails?.orderId || null,
  )
  const [liveOrderStatus, setLiveOrderStatus] =
    useState<LivePackageStatus | null>(null)
  const [activeOrderTrackingId, setActiveOrderTrackingId] = useState<string | null>(
    initialPackageDetails?.trackingId || null,
  )
  const lastEtaDistanceRef = useRef<{
    target: LivePackageStatus["etaTarget"]
    distanceKm?: number
  } | null>(null)
  const liveEtaDeadlineRef = useRef<number | null>(null)
  const [liveEtaDeadline, setLiveEtaDeadline] = useState<number | null>(null)
  const [etaClock, setEtaClock] = useState(() => Date.now())
  const [riderSelectionKey, setRiderSelectionKey] = useState<string | null>(null)
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false)

  // Rider Chat screen state (opened via message button)
  const [showRiderChat, setShowRiderChat] = useState(false)
  const [chatMessages, setChatMessages] = useState<ApiChatMessage[]>([])
  const [chatInputText, setChatInputText] = useState("")
  const [isSendingChat, setIsSendingChat] = useState(false)
  const chatFileInputRef = useRef<HTMLInputElement | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  const scrollToChatBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  // Sync real-time messages with backend chat API & WebSocket room
  useEffect(() => {
    if (!showRiderChat) return
    const chatId = activeOrderId ? `order-${activeOrderId}` : "order-active"

    const loadMessages = async () => {
      try {
        const msgs = await chatApi.getChatMessages(chatId)
        if (Array.isArray(msgs)) {
          setChatMessages(msgs)
        }
      } catch (err) {
        // best effort
      }
    }

    loadMessages()

    try {
      const socket = getChatSocket()
      socket.emit("join_chat", { chatId })

      const handleNewMessage = (msg: any) => {
        if (msg.chatId === chatId || (activeOrderId && msg.chatId === `order-${activeOrderId}`)) {
          setChatMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev
            return [...prev, msg]
          })
          setTimeout(scrollToChatBottom, 50)
        }
      }

      socket.on("new_message", handleNewMessage)
      const pollTimer = setInterval(loadMessages, 2500)

      return () => {
        socket.emit("leave_chat", { chatId })
        socket.off("new_message", handleNewMessage)
        clearInterval(pollTimer)
      }
    } catch {
      const pollTimer = setInterval(loadMessages, 2500)
      return () => clearInterval(pollTimer)
    }
  }, [showRiderChat, activeOrderId, scrollToChatBottom])

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || chatInputText).trim()
    if (!text || isSendingChat) return
    setChatInputText("")

    const chatId = activeOrderId ? `order-${activeOrderId}` : "order-active"
    const tempId = `m_${Date.now()}`
    const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

    const optimisticMsg: ApiChatMessage = {
      id: tempId,
      chatId,
      sender: "user",
      senderRole: "customer",
      senderId: user?.id,
      text,
      type: "text",
      time: timeNow,
      createdAt: new Date().toISOString(),
    }

    setChatMessages((prev) => [...prev, optimisticMsg])
    setTimeout(scrollToChatBottom, 50)

    try {
      setIsSendingChat(true)
      const saved = await chatApi.sendMessage(chatId, {
        type: "text",
        text,
      })
      if (saved?.id) {
        setChatMessages((prev) => {
          const socketMessage = prev.find((message) => message.id === saved.id)
          const reconciled = {
            ...socketMessage,
            ...saved,
            sender: "user" as const,
          }
          return [
            ...prev.filter(
              (message) => message.id !== tempId && message.id !== saved.id,
            ),
            reconciled,
          ]
        })
      }
    } catch (e) {
      console.warn("[SendPackageFlow] Failed to send message via API:", e)
      setChatMessages((prev) => prev.filter((message) => message.id !== tempId))
    } finally {
      setIsSendingChat(false)
    }
  }

  const handleChatImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async () => {
      const dataUrl = reader.result as string
      const chatId = activeOrderId ? `order-${activeOrderId}` : "order-active"
      const tempId = `img_${Date.now()}`
      const timeNow = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

      const optimisticMsg: ApiChatMessage = {
        id: tempId,
        chatId,
        sender: "user",
        senderRole: "customer",
        senderId: user?.id,
        imageUrl: dataUrl,
        type: "image",
        text: file.name,
        time: timeNow,
        createdAt: new Date().toISOString(),
      }

      setChatMessages((prev) => [...prev, optimisticMsg])
      setTimeout(scrollToChatBottom, 50)

      try {
        const saved = await chatApi.sendMessage(chatId, {
          type: "image",
          imageUrl: dataUrl,
          text: file.name,
        })
        if (saved?.id) {
          setChatMessages((prev) => {
            const socketMessage = prev.find((message) => message.id === saved.id)
            const reconciled = {
              ...socketMessage,
              ...saved,
              sender: "user" as const,
            }
            return [
              ...prev.filter(
                (message) => message.id !== tempId && message.id !== saved.id,
              ),
              reconciled,
            ]
          })
        }
      } catch (err) {
        console.warn("[SendPackageFlow] Failed to upload chat image:", err)
        setChatMessages((prev) => prev.filter((message) => message.id !== tempId))
      }
    }
    reader.readAsDataURL(file)
  }

  const copyToClipboard = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
    }
    setCopyToast(`${label} copied!`)
    setTimeout(() => setCopyToast(null), 2200)
  }

  const [ridersList, setRidersList] = useState<Rider[]>(defaultRidersList)

  const getLocationCoords = (name: string): { lat: number; lng: number } => {
    const lower = (name || "").toLowerCase()
    const normalizedLocation = lower.replace(/\s+/g, " ").trim()
    const savedAddress = savedAddresses.find((address) => {
      const addressLabel =
        `${address.street}${address.city ? `, ${address.city}` : ""}`
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim()
      return addressLabel === normalizedLocation || address.street.toLowerCase() === normalizedLocation
    })
    if (savedAddress) {
      return { lat: savedAddress.latitude, lng: savedAddress.longitude }
    }
    if (lower.includes("igbe")) return { lat: 7.0712, lng: 6.2755 }
    if (lower.includes("delta") || lower.includes("terminal"))
      return { lat: 7.062, lng: 6.268 }
    if (lower.includes("iyapki") || lower.includes("ibie"))
      return { lat: 7.045, lng: 6.292 }
    if (lower.includes("auchi")) return { lat: 7.0682, lng: 6.2736 }
    if (lower.includes("benin")) return { lat: 6.335, lng: 5.6037 }
    if (
      lower.includes("lagos") ||
      lower.includes("ikeja") ||
      lower.includes("lekki")
    )
      return { lat: 6.4474, lng: 3.4723 }
    if (lower.includes("abuja")) return { lat: 9.0765, lng: 7.3986 }
    if (lower.includes("port harcourt") || lower.includes("ph"))
      return { lat: 4.8156, lng: 7.0498 }
    const hash = name
      ? name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
      : 0
    return {
      lat: 7.0682 + (hash % 10) * 0.02,
      lng: 6.2736 + (hash % 7) * 0.02,
    }
  }

  const handleUseCurrentPickupLocation = () => {
    if (!navigator.geolocation) {
      setPickupLocationError("Location access is not available in this browser.")
      return
    }

    setIsLocatingPickup(true)
    setPickupLocationError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPickupCoordinates({ lat: coords.latitude, lng: coords.longitude })
        setFromLocation("My current location")
        setIsLocatingPickup(false)
      },
      (error) => {
        setPickupLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser, or enter your pickup address below."
            : "Could not get your location. Enter your pickup address instead.",
        )
        setIsLocatingPickup(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const recalculateQuote = async (origin?: string, destination?: string) => {
    const requestId = ++quoteRequestId.current
    const selectedOrigin = origin ?? fromLocation
    const selectedDestination = destination ?? toLocation
    if (!selectedOrigin.trim() || !selectedDestination.trim()) {
      setEstimatedFee("")
      setQuoteError(null)
      setIsCalculatingQuote(false)
      return
    }

    setEstimatedFee("")
    setQuoteError(null)
    setIsCalculatingQuote(true)
    try {
      const o = selectedOrigin || "Auchi, Edo State"
      const d = selectedDestination
      const originCoords =
        selectedOrigin === fromLocation && pickupCoordinates
          ? pickupCoordinates
          : getLocationCoords(o)
      const destCoords = getLocationCoords(d)
      const weightVal =
        selectedWeight === "heavy"
          ? 5.0
          : selectedWeight === "medium"
            ? 2.5
            : 1.0
      const category =
        selectedCategory === "Electronics"
          ? "ELECTRONICS"
          : selectedCategory === "Clothes"
            ? "CLOTHING"
            : selectedCategory === "Documents"
              ? "DOCUMENT"
              : "PARCEL"
      const quote = await ordersApi.calculateQuote({
        pickupLat: originCoords.lat,
        pickupLng: originCoords.lng,
        destLat: destCoords.lat,
        destLng: destCoords.lng,
        weightKg: weightVal,
        category,
        isFragile,
      })
      if (!Number.isFinite(quote?.totalPrice)) {
        throw new Error("The pricing service returned an invalid quote.")
      }
      if (requestId === quoteRequestId.current) {
        setEstimatedFee(quote.totalPrice.toLocaleString())
        setQuoteError(null)
      }
    } catch (error) {
      if (requestId === quoteRequestId.current) {
        setQuoteError(
          error instanceof Error
            ? error.message
            : "Could not calculate the delivery fee. Please try again.",
        )
      }
    } finally {
      if (requestId === quoteRequestId.current) {
        setIsCalculatingQuote(false)
      }
    }
  }

  const handleConfirmAddLocation = async () => {
    const loc = (newLocationSearch || selectedNewLocation || "").trim()
    if (!loc) {
      setScreen("destination")
      return
    }

    setToLocation(loc)

    const alreadySaved = savedAddresses.some((address) => {
      const savedLocation =
        `${address.street}${address.city ? `, ${address.city}` : ""}`
          .toLowerCase()
          .trim()
      return savedLocation === loc.toLowerCase()
    })

    if (saveToBook && savedAddresses.length < 5 && !alreadySaved) {
      setIsSavingAddress(true)
      try {
        const parts = loc.split(",").map((s) => s.trim())
        const street = parts[0] || loc
        const city = parts[1] || "Auchi"
        const state = parts[2] || "Edo State"
        const coords = getLocationCoords(loc)
        const newAddr = await userApi.createAddress({
          title: street,
          street: street,
          city: city,
          state: state,
          latitude: coords.lat,
          longitude: coords.lng,
          isDefault: savedAddresses.length === 0,
        })
        if (newAddr && newAddr.id) {
          setSavedAddresses((prev) => [
            newAddr,
            ...prev.filter((a) => a.id !== newAddr.id),
          ].slice(0, 5))
        }
      } catch (err) {
        console.error("[SendPackageFlow] Failed to save address:", err)
      } finally {
        setIsSavingAddress(false)
      }
    }

    setScreen("destination")
  }

  useEffect(() => {
    recalculateQuote(fromLocation, toLocation)
  }, [selectedWeight, selectedCategory, isFragile, fromLocation, toLocation, savedAddresses, pickupCoordinates])

  const [isLoadingRiders, setIsLoadingRiders] = useState(false)

  const loadOnlineRiders = async () => {
    setIsLoadingRiders(true)
    try {
      const coords = pickupCoordinates || getLocationCoords(fromLocation || "Auchi, Edo State")
      const available = await ridersApi.findAvailable({
        latitude: coords.lat,
        longitude: coords.lng,
      })
      if (Array.isArray(available) && available.length > 0) {
        const mappedRiders: Rider[] = available.map((r, idx) => {
          const dist = r.distanceKm != null ? Number(r.distanceKm) : undefined
          return {
            id: r.id || `r-live-${idx}`,
            name: `${r.user?.firstName || "Rider"} ${r.user?.lastName || ""}`.trim(),
            avatar:
              r.user?.profileImageUrl ||
              (r.user?.firstName?.toLowerCase().includes("divine")
                ? divineAvatar
                : "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=256&q=80"),
            rating: r.averageRating || 4.8,
            reviews: r.totalDeliveries || 120,
            distanceKm: dist,
            etaMinutes: dist
              ? Math.max(2, Math.round(dist * 2.5))
              : 3,
            isVerified: Boolean(r.isVerified ?? true),
            isAvailable: r.availability?.status === "ONLINE",
            plateNumber: r.plateNumber || undefined,
          }
        })
        mappedRiders.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999))
        setRidersList(mappedRiders)
        if (mappedRiders.length > 0) {
          setSelectedRiderId((prev: string) =>
            mappedRiders.some((mr) => mr.id === prev)
              ? prev
              : mappedRiders[0].id,
          )
        }
      } else if (Array.isArray(available) && available.length === 0) {
        setRidersList([])
      }
    } catch (e) {
      console.warn("[SendPackageFlow] Load riders note:", e)
    } finally {
      setIsLoadingRiders(false)
    }
  }

  useEffect(() => {
    loadOnlineRiders()
  }, [fromLocation, screen])

  const getSelectedRider = (): Rider => {
    return (
      ridersList.find((r) => r.id === selectedRiderId) ||
      ridersList[0] || {
        id: "assigned",
        name: "Assigned Rider",
        avatar: "https://ui-avatars.com/api/?name=Rider&background=ffcc00&color=000000",
        rating: 5.0,
        reviews: 0,
        etaMinutes: 5,
        distanceKm: 0.5,
        isVerified: true,
        isAvailable: true,
      }
    )
  }

  // Filtered and sorted riders for All Riders screen
  const filteredRiders = ridersList
    .filter((rider) => {
      if (!riderSearchQuery.trim()) return true
      return rider.name.toLowerCase().includes(riderSearchQuery.toLowerCase())
    })
    .filter((rider) => {
      if (riderFilterTab === "available") return rider.isAvailable
      return true
    })
    .sort((a, b) => {
      if (riderFilterTab === "nearest" || riderFilterTab === "recommended") {
        return (a.distanceKm ?? a.etaMinutes) - (b.distanceKm ?? b.etaMinutes)
      }
      if (riderFilterTab === "highest") return b.rating - a.rating
      return 0
    })

  // Package Status screen state
  const [countdown, setCountdown] = useState(40) // 40 seconds countdown
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showReassignRiderModal, setShowReassignRiderModal] = useState(false)
  const [isReassigningRider, setIsReassigningRider] = useState(false)
  const [isRiderAccepted, setIsRiderAccepted] = useState(
    initialPackageDetails?.status
      ? [
          "RIDER_ACCEPTED",
          "PICKUP_PENDING",
          "PICKED_UP",
          "IN_TRANSIT",
          "DELIVERED",
          "CUSTOMER_CONFIRMED",
          "SETTLED",
        ].includes(initialPackageDetails.status)
      : initialScreen === "package_status"
        ? (initialIsRiderAccepted ?? true)
        : false,
  )
  const [isPackageArrived, setIsPackageArrived] = useState(
    Boolean(
      initialPackageDetails?.status &&
        ["DELIVERED", "CUSTOMER_CONFIRMED", "SETTLED"].includes(
          initialPackageDetails.status,
        ),
    ),
  )
  const [isTransactionComplete, setIsTransactionComplete] = useState(
    initialPackageDetails?.status === "SETTLED",
  )
  const [transitCountdown, setTransitCountdown] = useState(1563) // 26:03
  const [showReportModal, setShowReportModal] = useState(false)
  const [showDropOffCodeModal, setShowDropOffCodeModal] = useState(false)
  const [dropOffCode, setDropOffCode] = useState("30184")
  const [isCodeCopied, setIsCodeCopied] = useState(false)
  const [showRatingModal, setShowRatingModal] = useState(false)
  const [userRating, setUserRating] = useState(5)
  const [isCancelled, setIsCancelled] = useState(
    initialPackageDetails?.status === "CANCELLED",
  )
  const [showCancelledToast, setShowCancelledToast] = useState(false)
  const [showAcceptedToast, setShowAcceptedToast] = useState(false)

  // Timer effect for package status countdown
  useEffect(() => {
    if (
      screen !== "package_status" ||
      isRiderAccepted ||
      isCancelled
    )
      return
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [
    screen,
    countdown,
    isRiderAccepted,
    isCancelled,
  ])

  // Real-time backend status polling while on package_status screen
  useEffect(() => {
    if (screen !== "package_status" || !activeOrderId || isCancelled) return

    let isMounted = true
    const pollStatus = async () => {
      try {
        const live: LivePackageStatus = await ordersApi.getLiveStatus(activeOrderId)
        if (!isMounted || !live) return

        setLiveOrderStatus(live)
        setIsRiderAccepted(Boolean(live.isRiderAccepted))
        if (
          !live.isRiderAccepted &&
          typeof live.pendingCountdown === "number"
        ) {
          setCountdown(live.pendingCountdown)
        }
        if (live.isRiderAccepted && typeof live.etaSeconds === "number") {
          const distanceKm = live.rider?.distanceKm
          const previous = lastEtaDistanceRef.current
          const now = Date.now()
          const remainingFromDeadline =
            liveEtaDeadlineRef.current === null
              ? null
              : Math.max(0, Math.ceil((liveEtaDeadlineRef.current - now) / 1000))
          const targetChanged = previous?.target !== live.etaTarget
          const locationChanged =
            typeof distanceKm === "number" &&
            (previous?.distanceKm == null ||
              Math.abs(previous.distanceKm - distanceKm) >= 0.05)
          const estimateChanged =
            remainingFromDeadline === null ||
            Math.abs(remainingFromDeadline - live.etaSeconds) >= 20

          if (targetChanged || locationChanged || estimateChanged) {
            const deadline = now + Math.max(0, live.etaSeconds) * 1000
            liveEtaDeadlineRef.current = deadline
            setLiveEtaDeadline(deadline)
          }

          if (targetChanged && typeof distanceKm !== "number") {
            lastEtaDistanceRef.current = {
              target: live.etaTarget,
            }
          } else if (targetChanged || locationChanged || !previous) {
            lastEtaDistanceRef.current = {
              target: live.etaTarget,
              ...(typeof distanceKm === "number" ? { distanceKm } : {}),
            }
          }
        } else if (!live.isRiderAccepted || lastEtaDistanceRef.current?.target !== live.etaTarget) {
          liveEtaDeadlineRef.current = null
          setLiveEtaDeadline(null)
          lastEtaDistanceRef.current = null
        }
        setIsPackageArrived(Boolean(live.isPackageArrived))
        setIsCancelled(Boolean(live.isCancelled))
        const transactionComplete = ["CUSTOMER_CONFIRMED", "SETTLED"].includes(
          live.status || "",
        )
        setIsTransactionComplete(transactionComplete)
        if (transactionComplete) {
          setShowDropOffCodeModal(false)
          setShowReportModal(false)
          setScreen("success")
        }
        if (live.packageName) setPackageName(live.packageName)
        if (live.fromLocation) setFromLocation(live.fromLocation)
        if (live.toLocation) setToLocation(live.toLocation)
        if (live.estimatedFee) setEstimatedFee(live.estimatedFee)
        if (live.isRiderAccepted && !isRiderAccepted) {
          setShowAcceptedToast(true)
          setTimeout(() => setShowAcceptedToast(false), 3500)
        }

        if (live.isCancelled && !isCancelled) {
          setShowCancelledToast(true)
        }

        if (live.dropOffCode) {
          setDropOffCode(live.dropOffCode)
        }
        if (live.trackingId) {
          setActiveOrderTrackingId(live.trackingId)
        }
      } catch (err) {
        console.warn("[SendPackageFlow] Live order status refresh failed:", err)
      }
    }

    pollStatus()
    const interval = setInterval(pollStatus, 3000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [screen, activeOrderId, isRiderAccepted, isCancelled])

  useEffect(() => {
    if (
      screen !== "package_status" ||
      !isRiderAccepted ||
      isPackageArrived ||
      isCancelled
    )
      return

    const timer = setInterval(() => setEtaClock(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [screen, isRiderAccepted, isPackageArrived, isCancelled])

  // Timer effect for transit countdown (26:03 -> 00:00)
  useEffect(() => {
    if (
      screen !== "package_status" ||
      !isRiderAccepted ||
      isPackageArrived ||
      activeOrderId ||
      initialPackageDetails?.orderId
    )
      return
    if (transitCountdown <= 0) {
      setIsPackageArrived(true)
      return
    }
    const timer = setInterval(() => {
      setTransitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setIsPackageArrived(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [
    screen,
    isRiderAccepted,
    isPackageArrived,
    transitCountdown,
    activeOrderId,
    initialPackageDetails?.orderId,
  ])

  // Close expanded image with Escape key
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

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}m:${secs.toString().padStart(2, "0")}s`
  }

  const formatTransitTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Final booking confirmation with chosen rider -> shows package_status screen next!
  const handleConfirmPayment = async () => {
    if (isConfirmingPayment) return
    if (isCalculatingQuote || !estimatedFee || quoteError) {
      setCheckoutError("Please wait for a valid delivery quote before continuing.")
      return
    }
    setIsConfirmingPayment(true)
    setCheckoutError(null)

    try {
      let orderId = activeOrderId
      if (!orderId) {
        const photoUrl = capturedImage?.file
          ? await preparePackagePhoto(capturedImage.file)
          : undefined
        const createdPkg: any = await packagesApi.createPackage({
          name: packageName || "Customer Package",
          photoUrl,
          category:
            selectedCategory === "Electronics"
              ? "ELECTRONICS"
              : selectedCategory === "Clothes"
                ? "CLOTHING"
                : selectedCategory === "Documents"
                  ? "DOCUMENT"
                  : "PARCEL",
          weightKg:
            selectedWeight === "heavy"
              ? 5.0
              : selectedWeight === "medium"
                ? 2.5
                : 1.0,
          isFragile,
          pickupAddress: {
            title: "Pickup",
            street: fromLocation || "Auchi, Edo State",
            city: "Auchi",
            state: "Edo State",
            latitude: (pickupCoordinates || getLocationCoords(fromLocation)).lat,
            longitude: (pickupCoordinates || getLocationCoords(fromLocation)).lng,
          },
          destinationAddress: {
            title: "Destination",
            street: toLocation || "Benin, Edo State",
            city: "Benin",
            state: "Edo State",
            latitude: getLocationCoords(toLocation).lat,
            longitude: getLocationCoords(toLocation).lng,
          },
        })

        orderId = createdPkg?.order?.id || createdPkg?.id
        if (!orderId) throw new Error("The order could not be created.")
        setActiveOrderId(orderId)
        const trackingId = createdPkg?.order?.trackingId || createdPkg?.trackingId
        if (trackingId) setActiveOrderTrackingId(trackingId)
      }

      const authoritativeOrder = await ordersApi.getOrder(orderId)
      const authoritativeTotal = Number(authoritativeOrder.totalPrice)
      if (!Number.isFinite(authoritativeTotal) || authoritativeTotal < 0) {
        throw new Error("The server returned an invalid order total.")
      }
      const authoritativeFee = authoritativeTotal.toLocaleString()
      setEstimatedFee(authoritativeFee)

      const selectionKey = `${orderId}:${selectedRiderId}`
      if (riderSelectionKey !== selectionKey) {
        await ordersApi.selectRider(orderId, selectedRiderId)
        setRiderSelectionKey(selectionKey)
      }

      const defaultCard = savedCards.find((card) => card.isDefault) || savedCards[0]
      const paymentResult = await ordersApi.processPayment(orderId, {
        paymentMethod:
          selectedPaymentMethod === "wallet"
            ? "WALLET"
            : selectedPaymentMethod === "card"
              ? "CARD"
              : "CASH_ON_DELIVERY",
        cardId: selectedPaymentMethod === "card" ? defaultCard?.id : undefined,
        callbackUrl: `${window.location.origin}/`,
      })

      if (paymentResult?.authorizationUrl) {
        window.location.assign(paymentResult.authorizationUrl)
        return
      }
      if (!paymentResult?.success || paymentResult.status === "PENDING") {
        throw new Error("Payment is not confirmed yet. Please try again.")
      }

      if (selectedPaymentMethod === "wallet") {
        setWalletBalance((prev) => Math.max(0, prev - authoritativeTotal))
      }

      try {
        const codeRes = await ordersApi.getHandoverCode(orderId)
        if (codeRes?.code) setDropOffCode(codeRes.code)
      } catch (error) {
        console.warn("[SendPackageFlow] Handover code note:", error)
      }

      if (activeDraftId) {
        deletePackageDraft(activeDraftId)
        setActiveDraftId(null)
      }

      setCountdown(40)
      setTransitCountdown(1563)
      liveEtaDeadlineRef.current = null
      setLiveEtaDeadline(null)
      setEtaClock(Date.now())
      lastEtaDistanceRef.current = null
      setIsPackageArrived(false)
      setShowCancelModal(false)
      setShowDropOffCodeModal(false)
      setIsRiderAccepted(false)
      setIsCancelled(false)
      setShowCancelledToast(false)
      setShowAcceptedToast(false)
      setShowReportModal(false)
      setScreen("package_status")
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not complete the booking.",
      )
    } finally {
      setIsConfirmingPayment(false)
    }
  }

  const handleCancelDelivery = async () => {
    if (isCancelling) return
    setIsCancelling(true)
    setCancelError(null)
    try {
      const orderId = activeOrderId || initialPackageDetails?.orderId
      if (orderId) {
        await ordersApi.cancelOrder(orderId, "Customer cancelled delivery")
      }
      setShowCancelModal(false)
      setIsCancelled(true)
      setShowCancelledToast(true)
      setTimeout(() => {
        setShowCancelledToast(false)
        onBack()
      }, 3200)
    } catch (error) {
      setCancelError(
        error instanceof Error ? error.message : "Could not cancel this delivery.",
      )
    } finally {
      setIsCancelling(false)
    }
  }

  const handleRiderAccept = async () => {
    if (activeOrderId) {
      try {
        await ordersApi.simulateRiderAccept(activeOrderId)
      } catch (e) {
        console.warn("[SendPackageFlow] simulateRiderAccept note:", e)
      }
    }
    setIsRiderAccepted(true)
    setShowAcceptedToast(true)
    setTimeout(() => {
      setShowAcceptedToast(false)
    }, 3500)
  }

  const handleExtendWait = async () => {
    setCountdown(40)
    if (activeOrderId) {
      try {
        await ordersApi.extendWait(activeOrderId)
      } catch (e) {
        console.warn("[SendPackageFlow] extendWait note:", e)
      }
    }
  }

  const handleReassignRider = async (newRiderId: string) => {
    setIsReassigningRider(true)
    try {
      setSelectedRiderId(newRiderId)
      setCountdown(40)
      setShowReassignRiderModal(false)
      if (activeOrderId) {
        await ordersApi.reassignRider(activeOrderId, newRiderId)
      }
    } catch (e) {
      console.warn("[SendPackageFlow] reassignRider note:", e)
    } finally {
      setIsReassigningRider(false)
    }
  }

  const handlePackageReceived = async () => {
    if (activeOrderId) {
      try {
        await ordersApi.confirmReceipt(activeOrderId)
      } catch (e) {
        console.warn("[SendPackageFlow] Confirm receipt note:", e)
      }
    }
    setScreen("success")
  }

  const handleFinishSuccess = () => {
    if (activeDraftId) {
      deletePackageDraft(activeDraftId)
      setActiveDraftId(null)
    }
    const chosenRider = getSelectedRider()
    onComplete?.({
      packageName: packageName.trim() || "Delivery Package",
      category: selectedCategory,
      weight: selectedWeight || "light",
      imageFile: capturedImage?.file,
      fromLocation,
      toLocation,
      estimatedFee,
      riderName: chosenRider.name,
      riderEta: "Delivered",
      paymentMethod: selectedPaymentMethod,
    })
    onBack()
  }

  return (
    <div
      className={`w-full max-w-xl mx-auto flex-1 flex flex-col min-h-full bg-transparent relative transition-colors ${
        screen === "success" || screen === "package_status"
          ? "pb-0"
          : "pb-28 md:pb-16"
      }`}
    >
      {/* Request Accepted Toast (Matches user screenshot exactly) */}
      {/* Request Accepted Toast (Matches user screenshot exactly) */}
      {showAcceptedToast && (
        <div className="fixed top-6 inset-x-0 md:left-64 xl:right-[340px] 2xl:right-[380px] z-[150] flex justify-center items-center pointer-events-none px-4">
          <div
            onClick={() => setShowAcceptedToast(false)}
            className="pointer-events-auto w-full max-w-sm sm:max-w-md bg-white dark:bg-[#1c1d22] border border-gray-100 dark:border-white/10 rounded-2xl sm:rounded-full px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.14)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300 cursor-pointer"
          >
            {/* Dark Circular Badge with Yellow Box + Green Checkmark Badge */}
            <div className="w-11 h-11 rounded-full bg-[#181a20] dark:bg-[#252830] flex items-center justify-center shrink-0 relative">
              <div className="relative">
                {/* Cardboard Box with Red Tape */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7.5L12 3L20 7.5V17.5C20 18.6046 19.1046 19.5 18 19.5H6C4.89543 19.5 4 18.6046 4 17.5V7.5Z"
                    fill="#F5A623"
                  />
                  <path
                    d="M4 7.5L12 12L20 7.5"
                    fill="#D98207"
                    fillOpacity="0.4"
                  />
                  <path
                    d="M10.75 3.8L10.75 12L13.25 12L13.25 3.8"
                    fill="#E53935"
                  />
                  <path
                    d="M8 9.75H16"
                    stroke="#D98207"
                    strokeWidth="0.75"
                    strokeDasharray="1.5 1.5"
                  />
                </svg>
                {/* Green Circle with white Checkmark badge */}
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#22C55E] flex items-center justify-center border border-[#181a20] dark:border-[#252830] shadow-xs">
                  <Check className="w-2.5 h-2.5 text-white stroke-[3.5]" />
                </div>
              </div>
            </div>

            {/* Text block */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-gray-950 dark:text-white leading-tight">
                Request accepted
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                Rider has accept your request
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Toast Notice */}
      {showCancelledToast && (
        <div className="fixed top-6 inset-x-0 md:left-64 xl:right-[340px] 2xl:right-[380px] z-[150] flex justify-center items-center pointer-events-none px-4">
          <div
            onClick={() => setShowCancelledToast(false)}
            className="pointer-events-auto w-full max-w-sm sm:max-w-md bg-white dark:bg-[#1c1d22] border border-gray-100 dark:border-white/10 rounded-2xl sm:rounded-full px-4 py-3 sm:px-5 sm:py-3.5 shadow-[0_10px_35px_rgba(0,0,0,0.14)] dark:shadow-[0_10px_35px_rgba(0,0,0,0.6)] flex items-center gap-3.5 animate-in fade-in slide-in-from-top-4 duration-300 cursor-pointer"
          >
            {/* Dark Circular Badge with Yellow Box + Red X Badge */}
            <div className="w-11 h-11 rounded-full bg-[#181a20] dark:bg-[#252830] flex items-center justify-center shrink-0 relative">
              <div className="relative">
                {/* Cardboard Box with Red Tape */}
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 7.5L12 3L20 7.5V17.5C20 18.6046 19.1046 19.5 18 19.5H6C4.89543 19.5 4 18.6046 4 17.5V7.5Z"
                    fill="#F5A623"
                  />
                  <path
                    d="M4 7.5L12 12L20 7.5"
                    fill="#D98207"
                    fillOpacity="0.4"
                  />
                  <path
                    d="M10.75 3.8L10.75 12L13.25 12L13.25 3.8"
                    fill="#E53935"
                  />
                  <path
                    d="M8 9.75H16"
                    stroke="#D98207"
                    strokeWidth="0.75"
                    strokeDasharray="1.5 1.5"
                  />
                </svg>
                {/* Red Circle with white X badge */}
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#E53935] flex items-center justify-center border border-[#181a20] dark:border-[#252830] shadow-xs">
                  <X className="w-2 h-2 text-white stroke-[3.5]" />
                </div>
              </div>
            </div>

            {/* Text block */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-semibold text-gray-950 dark:text-white leading-tight">
                This delivery was cancelled
              </h4>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                You cancelled this delivery
              </p>
            </div>
          </div>
        </div>
      )}

      {copyToast && (
        <div className="fixed top-6 inset-x-0 md:left-64 xl:right-[340px] 2xl:right-[380px] z-[100] flex justify-center items-center pointer-events-none px-4">
          <div className="pointer-events-auto bg-gray-900 dark:bg-white text-white dark:text-black text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{copyToast}</span>
          </div>
        </div>
      )}
      {inviteToast && (
        <div className="fixed top-6 inset-x-0 md:left-64 xl:right-[340px] 2xl:right-[380px] z-[100] flex justify-center items-center pointer-events-none px-4">
          <div className="pointer-events-auto bg-[#FFCC00] text-gray-950 text-xs font-bold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{inviteToast}</span>
          </div>
        </div>
      )}

      {/* Camera / Prompt Modal: Kept as modal popup as explicitly requested */}
      <SendPackageModal
        isOpen={isCameraModalOpen}
        initialMode={cameraModalInitialMode}
        onClose={() => setIsCameraModalOpen(false)}
        onPhotoConfirmed={(photo) => {
          setCapturedImage(photo)
          setIsCameraModalOpen(false)
        }}
      />

      {/* Selected Rider Modal (Matching User's Screenshot Exactly) */}
      {showSelectedRiderModal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            onClick={() => setShowSelectedRiderModal(false)}
            className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity"
          />

          {/* Modal / Bottom Sheet Card matching user's design */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[480px] bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-7 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-200 border-t sm:border border-gray-100 dark:border-white/10 pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))] sm:pb-7 space-y-6"
          >
            {/* Mobile pull indicator */}
            <div
              onClick={() => setShowSelectedRiderModal(false)}
              className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto -mt-1 mb-2 sm:hidden cursor-pointer"
            />

            {/* Row 1: Rider Avatar, "Selected Rider", and Name + Green Check */}
            {(() => {
              const chosenRider = getSelectedRider()
              return (
                <>
                  <div className="flex items-center gap-3.5">
                    <img
                      src={chosenRider.avatar}
                      alt={chosenRider.name}
                      className="w-14 h-14 rounded-full object-cover shrink-0 ring-1 ring-gray-100 dark:ring-white/10"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block leading-tight">
                        Selected Rider
                      </span>
                      <h3 className="text-xl font-bold text-gray-950 dark:text-white flex items-center gap-1.5 mt-0.5 tracking-tight truncate">
                        <span>{chosenRider.name}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      </h3>
                    </div>
                  </div>

                  {/* Row 2: Estimated Fee and Amount */}
                  <div className="flex items-center justify-between pt-1 pb-1">
                    <span className="text-base sm:text-lg font-normal text-gray-500 dark:text-gray-400">
                      Estimated Fee
                    </span>
                    <span className="text-2xl sm:text-[26px] font-bold text-gray-950 dark:text-white tracking-tight">
                      ₦{estimatedFee}
                    </span>
                  </div>

                  {/* Row 3: Continue -> Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowSelectedRiderModal(false)
                      setScreen("confirm_delivery")
                    }}
                    className="w-full py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                  >
                    <span>Continue</span>
                    <span className="text-lg leading-none">→</span>
                  </button>
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 1: PACKAGE DETAILS (Rendered on Middle Parent Component)            */}
      {/* ========================================================================= */}
      {screen === "details" && (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
          {mode === "pickup" ? (
            /* ========================================================================= */
            /* REQUEST PICKUP: ENTER PACKAGE INFORMATION (Exact Screenshot Match)        */
            /* ========================================================================= */
            <div className="flex-1 flex flex-col px-3.5 sm:px-8 py-4 sm:py-5 max-w-xl mx-auto w-full">
              {/* Header: Back Arrow (Left) & Circular Close Button (Right) */}
              <div className="flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={handleExitFlow}
                  className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-colors cursor-pointer touch-manipulation"
                  title="Go back"
                >
                  <ArrowLeft className="w-6 h-6 stroke-[2.4]" />
                </button>

                <button
                  type="button"
                  onClick={handleExitFlow}
                  className="w-9 h-9 rounded-full bg-neutral-400/25 dark:bg-white/15 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-neutral-400/40 dark:hover:bg-white/25 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4 stroke-[2.4]" />
                </button>
              </div>

              {/* Title & Subtitle */}
              <div className="mb-6">
                <h1 className="text-2xl sm:text-[28px] font-extrabold text-gray-950 dark:text-white tracking-tight leading-tight">
                  Enter package information
                </h1>
                <p className="text-sm text-gray-400 dark:text-gray-400 mt-1.5 font-normal">
                  Select the destination of this package
                </p>
              </div>

              {/* Form Content */}
              <div className="space-y-6 flex-1">
                {/* 1. Package name */}
                <div>
                  <label className="block text-[16px] font-bold text-gray-950 dark:text-white mb-2 tracking-tight">
                    Package name
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="Enter package name"
                      className="w-full px-4 py-3.5 pr-11 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161618] text-gray-900 dark:text-white font-medium text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-[#fed766] focus:ring-2 focus:ring-[#fed766]/30 transition-all shadow-2xs"
                    />
                    {packageName && (
                      <button
                        type="button"
                        onClick={() => setPackageName("")}
                        className="absolute right-3.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                        title="Clear input"
                      >
                        <X className="w-4 h-4 stroke-[2.2]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Select category */}
                <div>
                  <label className="block text-[16px] font-bold text-gray-950 dark:text-white mb-2.5 tracking-tight">
                    Select category
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {[
                      {
                        id: "Electronics",
                        label: "Electronics",
                        icon: Smartphone,
                      },
                      { id: "Documents", label: "Documents", icon: FileText },
                      { id: "Clothes", label: "Clothes", icon: Shirt },
                      { id: "Others", label: "Others", icon: Package },
                    ].map((cat) => {
                      const IconComp = cat.icon
                      const isSelected = selectedCategory === cat.id
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.id as any)}
                          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl sm:rounded-full text-sm font-medium transition-all cursor-pointer border ${
                            isSelected
                              ? "border-[#fed766] bg-[#fed766]/15 text-gray-950 dark:text-white font-semibold ring-1 ring-[#fed766]/50 shadow-2xs"
                              : "border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#161618] text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20"
                          }`}
                        >
                          <IconComp
                            className="w-4 h-4 text-gray-700 dark:text-gray-200"
                            strokeWidth={isSelected ? 2.2 : 1.8}
                          />
                          <span>{cat.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 3. Estimated Weight */}
                <div>
                  <label className="block text-[16px] font-bold text-gray-950 dark:text-white mb-2.5 tracking-tight">
                    Estimated Weight
                  </label>
                  <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-2xs">
                    {/* Weight Option 1 */}
                    <div
                      onClick={() => setSelectedWeight("light")}
                      className="p-4 flex items-start gap-3.5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                          selectedWeight === "light"
                            ? "border-[#fed766]"
                            : "border-gray-300 dark:border-neutral-600"
                        }`}
                      >
                        {selectedWeight === "light" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#fed766]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[14px] sm:text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                          Lightweight (&lt; 5kg)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          E.g Documents, smartphone, shoes, or makeup kits.
                        </p>
                      </div>
                    </div>

                    {/* Weight Option 2 */}
                    <div
                      onClick={() => setSelectedWeight("medium")}
                      className="p-4 flex items-start gap-3.5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                          selectedWeight === "medium"
                            ? "border-[#fed766]"
                            : "border-gray-300 dark:border-neutral-600"
                        }`}
                      >
                        {selectedWeight === "medium" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#fed766]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[14px] sm:text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                          Medium Weight (6kg – 25kg)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          E.g microwave, a desktop monitor, or box of clothes.
                        </p>
                      </div>
                    </div>

                    {/* Weight Option 3 */}
                    <div
                      onClick={() => setSelectedWeight("heavy")}
                      className="p-4 flex items-start gap-3.5 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                          selectedWeight === "heavy"
                            ? "border-[#fed766]"
                            : "border-gray-300 dark:border-neutral-600"
                        }`}
                      >
                        {selectedWeight === "heavy" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#fed766]" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[14px] sm:text-[15px] font-bold text-gray-900 dark:text-white leading-tight">
                          Heavy Weight (&gt; 25kg)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          E.g generator, TV, or large vehicle spare parts.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Fragile Item Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 flex items-center justify-center text-red-500 shrink-0">
                      <AlertOctagon className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-gray-950 dark:text-white leading-tight">
                        Fragile Item
                      </h4>
                      <p className="text-xs italic text-gray-400 dark:text-gray-500 mt-0.5">
                        Needs extra care during delivery
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={isFragile}
                    onClick={() => setIsFragile(!isFragile)}
                    className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0 ${
                      isFragile
                        ? "bg-[#fed766]"
                        : "bg-gray-200 dark:bg-neutral-700"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full bg-white shadow-sm transform transition-transform ${
                        isFragile ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* 5. Bottom Action Button */}
                <div className="pt-4 pb-4">
                  <button
                    type="button"
                    onClick={() => {
                      if (!packageName.trim()) {
                        alert("Please enter a package name to proceed.")
                        return
                      }
                      setScreen("destination")
                    }}
                    className="w-full py-4 px-5 rounded-2xl bg-[#fed766] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                  >
                    <span>Choose Destination</span>
                    <span className="text-lg leading-none">→</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ========================================================================= */
            /* SEND PACKAGE DETAILS SCREEN WITH PHOTO BANNER                             */
            /* ========================================================================= */
            <>
              {/* Header Bar */}
              <div className="px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-white/5">
                <button
                  type="button"
                  onClick={handleExitFlow}
                  className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer touch-manipulation"
                  title="Go back"
                >
                  <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
                </button>

                <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                  Package details
                </h1>

                <button
                  type="button"
                  onClick={handleExitFlow}
                  className="w-10 h-10 rounded-full bg-gray-500/10 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-500/20 dark:hover:bg-white/15 transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-5 h-5 stroke-[2.2]" />
                </button>
              </div>

              {/* Form Body */}
              <div className="flex-1 px-5 sm:px-8 py-6 space-y-6">
                {/* Package Image Card with Retake/Change Camera Action */}
                {capturedImage?.previewUrl ? (
                  <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-[24px] overflow-hidden bg-neutral-900 border border-gray-200/60 dark:border-white/10 shadow-sm group">
                    <img
                      src={capturedImage.previewUrl}
                      alt={packageName || "Package"}
                      className="w-full h-full object-cover"
                    />

                    {/* Retake Camera Button Overlay */}
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraModalInitialMode("camera")
                          setIsCameraModalOpen(true)
                        }}
                        className="px-4 py-2 rounded-full bg-white/90 text-gray-900 font-semibold text-xs flex items-center gap-2 shadow-lg backdrop-blur-md cursor-pointer hover:bg-white transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Retake Photo</span>
                      </button>
                    </div>

                    {/* Top-Right Change Picture Badge */}
                    <button
                      type="button"
                      onClick={() => {
                        setCameraModalInitialMode("prompt")
                        setIsCameraModalOpen(true)
                      }}
                      className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/50 hover:bg-black/75 backdrop-blur-md flex items-center gap-1.5 text-white/90 text-xs font-medium transition-colors cursor-pointer"
                      title="Change picture"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Change</span>
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => {
                      setCameraModalInitialMode("prompt")
                      setIsCameraModalOpen(true)
                    }}
                    className="w-full py-8 px-4 rounded-[24px] border-2 border-dashed border-gray-300 dark:border-white/15 bg-gray-50/80 dark:bg-white/5 flex flex-col items-center justify-center text-center cursor-pointer hover:border-yellow-400 dark:hover:border-yellow-400 hover:bg-yellow-50/30 dark:hover:bg-yellow-400/5 transition-all group shadow-2xs"
                  >
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-white/10 shadow-xs border border-gray-200/80 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-300 group-hover:scale-105 group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-all mb-2">
                      <Camera className="w-6 h-6 stroke-[1.8]" />
                    </div>
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      Take or upload package photo
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Clear photos help your rider identify and verify the item
                    </p>
                  </div>
                )}

                {/* Package name Section */}
                <div>
                  <label className="block text-[17px] font-bold text-gray-950 dark:text-white mb-2 tracking-tight">
                    Package name
                  </label>
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                      placeholder="Enter package name"
                      className="w-full px-4 py-3.5 pr-10 rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#161618] text-gray-900 dark:text-white font-medium text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-[#FFCC00] focus:ring-2 focus:ring-[#FFCC00]/30 transition-all shadow-2xs"
                    />
                    {packageName && (
                      <button
                        type="button"
                        onClick={() => setPackageName("")}
                        className="absolute right-3.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                        title="Clear input"
                      >
                        <X className="w-4 h-4 stroke-[2]" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Category Selection Section */}
                <div>
                  <label className="block text-[17px] font-bold text-gray-950 dark:text-white mb-2.5 tracking-tight">
                    Category
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {/* Electronics */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("Electronics")}
                      className={`py-3 px-3 rounded-2xl flex items-center justify-center gap-2 border font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                        selectedCategory === "Electronics"
                          ? "bg-amber-400/15 dark:bg-[#FFCC00]/15 border-[#FFCC00] text-amber-900 dark:text-[#FFCC00] font-bold shadow-xs"
                          : "bg-white dark:bg-[#161618] border-gray-200/90 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Electronics</span>
                    </button>

                    {/* Documents */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("Documents")}
                      className={`py-3 px-3 rounded-2xl flex items-center justify-center gap-2 border font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                        selectedCategory === "Documents"
                          ? "bg-amber-400/15 dark:bg-[#FFCC00]/15 border-[#FFCC00] text-amber-900 dark:text-[#FFCC00] font-bold shadow-xs"
                          : "bg-white dark:bg-[#161618] border-gray-200/90 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      <span>Documents</span>
                    </button>

                    {/* Clothes */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("Clothes")}
                      className={`py-3 px-3 rounded-2xl flex items-center justify-center gap-2 border font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                        selectedCategory === "Clothes"
                          ? "bg-amber-400/15 dark:bg-[#FFCC00]/15 border-[#FFCC00] text-amber-900 dark:text-[#FFCC00] font-bold shadow-xs"
                          : "bg-white dark:bg-[#161618] border-gray-200/90 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <Shirt className="w-4 h-4" />
                      <span>Clothes</span>
                    </button>

                    {/* Others */}
                    <button
                      type="button"
                      onClick={() => setSelectedCategory("Others")}
                      className={`py-3 px-3 rounded-2xl flex items-center justify-center gap-2 border font-medium text-xs sm:text-sm transition-all cursor-pointer ${
                        selectedCategory === "Others"
                          ? "bg-amber-400/15 dark:bg-[#FFCC00]/15 border-[#FFCC00] text-amber-900 dark:text-[#FFCC00] font-bold shadow-xs"
                          : "bg-white dark:bg-[#161618] border-gray-200/90 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-white/20"
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Others</span>
                    </button>
                  </div>
                </div>

                {/* Weight Section */}
                <div>
                  <label className="block text-[17px] font-bold text-gray-950 dark:text-white mb-2.5 tracking-tight">
                    Weight
                  </label>
                  <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-2xs">
                    {/* Weight Option 1: Light */}
                    <button
                      type="button"
                      onClick={() => setSelectedWeight("light")}
                      className="w-full p-4 flex items-start gap-3.5 text-left cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                          selectedWeight === "light"
                            ? "border-[#FFCC00]"
                            : "border-gray-300 dark:border-neutral-600"
                        }`}
                      >
                        {selectedWeight === "light" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                          Light Weight (&lt; 5kg)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          E.g food, document, shoe, shirt or phones.
                        </p>
                      </div>
                    </button>

                    {/* Weight Option 2: Medium */}
                    <button
                      type="button"
                      onClick={() => setSelectedWeight("medium")}
                      className="w-full p-4 flex items-start gap-3.5 text-left cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                          selectedWeight === "medium"
                            ? "border-[#FFCC00]"
                            : "border-gray-300 dark:border-neutral-600"
                        }`}
                      >
                        {selectedWeight === "medium" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                          Medium Weight (5kg - 25kg)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          E.g large bags, heavy carton, mini fridge.
                        </p>
                      </div>
                    </button>

                    {/* Weight Option 3: Heavy */}
                    <button
                      type="button"
                      onClick={() => setSelectedWeight("heavy")}
                      className="w-full p-4 flex items-start gap-3.5 text-left cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors"
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 mt-0.5 shrink-0 flex items-center justify-center transition-all ${
                          selectedWeight === "heavy"
                            ? "border-[#FFCC00]"
                            : "border-gray-300 dark:border-neutral-600"
                        }`}
                      >
                        {selectedWeight === "heavy" && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#FFCC00]" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">
                          Heavy Weight (&gt; 25kg)
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                          E.g generator, TV, or large vehicle spare parts.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bottom Continue Action Button */}
                <div className="pt-2 pb-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (!packageName.trim()) {
                        alert("Please enter a package name to proceed.")
                        return
                      }
                      setScreen("destination")
                    }}
                    className="w-full py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center cursor-pointer touch-manipulation"
                  >
                    <span>Continue</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 2: DESTINATION SELECTION (Where is it going?)                      */}
      {/* ========================================================================= */}
      {screen === "destination" && (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
          {/* Top Navigation Header */}
          <div className="px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setScreen("details")}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Where is it going?
            </h1>

            <button
              type="button"
              onClick={handleExitFlow}
              className="w-10 h-10 rounded-full bg-gray-500/10 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-500/20 dark:hover:bg-white/15 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 px-5 sm:px-8 py-6 space-y-6">
            {/* Route Timeline Card */}
            <div className="rounded-3xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#161618] p-5 sm:p-6 shadow-2xs">
              <div className="flex gap-4">
                {/* Timeline Dots & Connecting Dotted Line */}
                <div className="flex flex-col items-center pt-1 shrink-0">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#FFCC00] ring-4 ring-[#FFCC00]/20 shrink-0" />
                  <div className="w-[1.5px] flex-1 my-1.5 border-l-2 border-dashed border-gray-300 dark:border-neutral-700 min-h-[44px]" />
                  <div className="w-3.5 h-3.5 rounded-full bg-gray-400 dark:bg-neutral-600 shrink-0" />
                </div>

                {/* Locations Text Stack */}
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  {/* FROM Row */}
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1 pr-3">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                        PICKUP LOCATION
                      </span>
                      <input
                        type="text"
                        value={fromLocation}
                        onChange={(event) => {
                          setFromLocation(event.target.value)
                          setPickupCoordinates(null)
                          setPickupLocationError(null)
                        }}
                        placeholder="Type your pickup address"
                        aria-label="Pickup location"
                        className="w-full mt-1 bg-transparent text-[15px] font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleUseCurrentPickupLocation}
                        disabled={isLocatingPickup}
                        className="inline-flex items-center gap-1.5 mt-2 text-xs font-semibold text-amber-600 dark:text-yellow-400 disabled:opacity-60"
                      >
                        {isLocatingPickup ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Navigation className="w-3.5 h-3.5" />
                        )}
                        {isLocatingPickup ? "Finding location..." : "Use my current location"}
                      </button>
                      {pickupLocationError && (
                        <p role="alert" className="text-xs text-red-600 dark:text-red-400 mt-1">
                          {pickupLocationError}
                        </p>
                      )}
                      {savedAddresses.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {savedAddresses.slice(0, 5).map((address) => {
                            const addressLabel = `${address.street}${address.city ? `, ${address.city}` : ""}`
                            return (
                              <button
                                key={address.id}
                                type="button"
                                onClick={() => {
                                  setFromLocation(addressLabel)
                                  setPickupCoordinates({
                                    lat: address.latitude,
                                    lng: address.longitude,
                                  })
                                  setPickupLocationError(null)
                                }}
                                className="max-w-full truncate rounded-full bg-gray-100 dark:bg-white/10 px-3 py-1.5 text-[11px] font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/15"
                                title={`Use ${address.title || address.street} as pickup`}
                              >
                                {address.title || address.street}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setFromLocation("")
                        setPickupCoordinates(null)
                      }}
                      className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer mt-1"
                      title="Clear origin"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* TO Row */}
                  <div className="flex items-start justify-between pt-4">
                    <div
                      onClick={() => setScreen("add_location")}
                      className="cursor-pointer group flex-1 pr-2"
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                        TO
                      </span>
                      <h4 className="text-[15px] font-bold text-gray-900 dark:text-white leading-snug group-hover:text-amber-600 dark:group-hover:text-yellow-400 transition-colors">
                        {toLocation || "Select drop-off location"}
                      </h4>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setScreen("add_location")
                        }}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-yellow-400 hover:text-amber-700 dark:hover:text-yellow-300 mt-1 cursor-pointer transition-all"
                      >
                        <span className="underline underline-offset-2">
                          Tap below or add new location
                        </span>
                        <span className="text-[10px] font-bold bg-yellow-400 text-black px-1.5 py-0.5 rounded-full shadow-2xs">
                          + Add
                        </span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setToLocation("")}
                      className="w-5 h-5 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer mt-1 shrink-0"
                      title="Clear destination"
                    >
                      <X className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Estimated Fee Separator & Row */}
              <div className="border-t border-gray-100 dark:border-white/5 pt-4 mt-5 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                  Backend delivery quote
                </span>
                <span
                  aria-live="polite"
                  className="text-lg font-bold text-gray-950 dark:text-white"
                >
                  {isCalculatingQuote
                    ? "Calculating..."
                    : estimatedFee
                      ? `₦${estimatedFee}`
                      : quoteError
                        ? "Unavailable"
                        : "Select a destination"}
                </span>
              </div>
              {quoteError && (
                <div className="mt-2 flex items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400">
                  <span>{quoteError}</span>
                  <button
                    type="button"
                    onClick={() => recalculateQuote()}
                    className="shrink-0 font-bold underline underline-offset-2"
                  >
                    Retry
                  </button>
                </div>
              )}
            </div>

            {/* Recent & Add Address Section */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {savedAddresses.length > 0
                    ? "Saved Addresses"
                    : "Select destination or add new"}
                </span>
                {savedAddresses.length > 0 && (
                  <span className="text-[11px] font-semibold text-amber-600 dark:text-yellow-400">
                    {savedAddresses.length} saved
                  </span>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200/90 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-2xs">
                {/* Real Saved Addresses from DB */}
                {savedAddresses.map((addr) => {
                  const addrText = `${addr.street}${addr.city ? `, ${addr.city}` : ""}`
                  const isSelected =
                    toLocation.toLowerCase().includes(addr.street.toLowerCase())
                  return (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => {
                        setToLocation(addrText)
                      }}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? "bg-[#FFCC00] text-gray-950 shadow-xs"
                              : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                          }`}
                        >
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors truncate">
                              {addr.title || addr.street}
                            </span>
                            {addr.isDefault && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 shrink-0">
                                Default
                              </span>
                            )}
                          </div>
                          {addr.title && addr.title !== addr.street && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {addr.street}
                              {addr.city ? `, ${addr.city}` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <History className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors shrink-0 ml-2" />
                    </button>
                  )
                })}

                {/* Default destinations if no saved addresses yet */}
                {savedAddresses.length === 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setToLocation("Iyapki, south Ibie")
                      }}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors">
                          Iyapki, south Ibie
                        </span>
                      </div>
                      <History className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setToLocation("Auchi, Igbe Road")
                      }}
                      className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-500 dark:text-gray-400">
                          <MapPin className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-amber-500 dark:group-hover:text-yellow-400 transition-colors">
                          Auchi, Igbe Road
                        </span>
                      </div>
                      <History className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                    </button>
                  </>
                )}

                {/* Add new address */}
                <button
                  type="button"
                  onClick={() => setScreen("add_location")}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-xl bg-[#FFCC00] flex items-center justify-center text-gray-950 shadow-xs">
                    <Plus className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Add new address
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom Book Rider CTA Button */}
            <div className="pt-4 pb-6">
              <button
                type="button"
                onClick={() => {
                  if (!toLocation.trim()) {
                    alert("Please select or add a destination address.")
                    return
                  }
                  if (isCalculatingQuote || !estimatedFee || quoteError) return
                  setScreen("choose_rider")
                }}
                disabled={isCalculatingQuote || !estimatedFee || Boolean(quoteError)}
                className="w-full py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span>Book Rider</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 3: ADD NEW LOCATION (Inline on Middle Parent Component)             */}
      {/* ========================================================================= */}
      {screen === "add_location" && (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
          {/* Top Navigation Header */}
          <div className="px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setScreen("destination")}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Add New Location
            </h1>

            <button
              type="button"
              onClick={handleExitFlow}
              className="w-10 h-10 rounded-full bg-gray-500/10 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-500/20 dark:hover:bg-white/15 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 px-5 sm:px-8 py-6 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-950 dark:text-white tracking-tight leading-tight">
                Add New location
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-normal font-normal">
                Please add the specific location of your package for safety
                reasons
              </p>
            </div>

            {/* Location Search Input Box */}
            <div className="relative flex items-center">
              <input
                type="text"
                value={newLocationSearch}
                onChange={(e) => setNewLocationSearch(e.target.value)}
                placeholder="Search location (e.g. Igbe Road, Auchi)"
                className="w-full px-4 py-3.5 pr-10 rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#161618] text-gray-900 dark:text-white font-medium text-[15px] placeholder:text-gray-400 focus:outline-none focus:border-[#FFCC00] focus:ring-2 focus:ring-[#FFCC00]/30 transition-all shadow-2xs"
              />
              {newLocationSearch && (
                <button
                  type="button"
                  onClick={() => setNewLocationSearch("")}
                  className="absolute right-3.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              )}
            </div>

            {/* Matched / Suggested Locations List */}
            <div className="rounded-3xl border border-gray-200/90 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-2xs">
              {/* Suggestion 1: Auchi, Igbe Road */}
              <button
                type="button"
                onClick={() => {
                  setSelectedNewLocation("Auchi, Igbe Road")
                  setToLocation("Auchi, Igbe Road")
                  setNewLocationSearch("Auchi, Igbe Road")
                }}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      selectedNewLocation === "Auchi, Igbe Road"
                        ? "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200"
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      selectedNewLocation === "Auchi, Igbe Road"
                        ? "text-gray-900 dark:text-white font-semibold"
                        : "text-gray-400 dark:text-gray-500 font-normal"
                    }`}
                  >
                    Auchi, Igbe Road
                  </span>
                </div>

                {selectedNewLocation === "Auchi, Igbe Road" && (
                  <div className="w-5 h-5 rounded-md bg-[#0080FF] flex items-center justify-center text-white shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Suggestion 2: Auchi delta Terminal */}
              <button
                type="button"
                onClick={() => {
                  setSelectedNewLocation("Auchi delta Terminal")
                  setToLocation("Auchi delta Terminal")
                  setNewLocationSearch("Auchi delta Terminal")
                }}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      selectedNewLocation === "Auchi delta Terminal"
                        ? "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200"
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      selectedNewLocation === "Auchi delta Terminal"
                        ? "text-gray-900 dark:text-white font-semibold"
                        : "text-gray-400 dark:text-gray-500 font-normal"
                    }`}
                  >
                    Auchi delta Terminal
                  </span>
                </div>

                {selectedNewLocation === "Auchi delta Terminal" && (
                  <div className="w-5 h-5 rounded-md bg-[#0080FF] flex items-center justify-center text-white shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Suggestion 3: Iyapki, south Ibie */}
              <button
                type="button"
                onClick={() => {
                  setSelectedNewLocation("Iyapki, south Ibie")
                  setToLocation("Iyapki, south Ibie")
                  setNewLocationSearch("Iyapki, south Ibie")
                }}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                      selectedNewLocation === "Iyapki, south Ibie"
                        ? "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200"
                        : "bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500"
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-sm transition-colors ${
                      selectedNewLocation === "Iyapki, south Ibie"
                        ? "text-gray-900 dark:text-white font-semibold"
                        : "text-gray-400 dark:text-gray-500 font-normal"
                    }`}
                  >
                    Iyapki, south Ibie
                  </span>
                </div>

                {selectedNewLocation === "Iyapki, south Ibie" && (
                  <div className="w-5 h-5 rounded-md bg-[#0080FF] flex items-center justify-center text-white shadow-xs">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>

            {/* Saved Addresses Section if user has any */}
            {savedAddresses.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">
                  Your Saved Addresses
                </h3>
                <div className="rounded-3xl border border-gray-200/90 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-2xs">
                  {savedAddresses.map((addr) => {
                    const addrText = `${addr.street}${addr.city ? `, ${addr.city}` : ""}`
                    const isSelected =
                      selectedNewLocation === addrText ||
                      newLocationSearch === addrText
                    return (
                      <button
                        key={addr.id}
                        type="button"
                        onClick={() => {
                          setSelectedNewLocation(addrText)
                          setToLocation(addrText)
                          setNewLocationSearch(addrText)
                        }}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                              isSelected
                                ? "bg-[#FFCC00] text-gray-950 shadow-xs"
                                : "bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400"
                            }`}
                          >
                            <MapPin className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-semibold text-gray-900 dark:text-white block truncate">
                              {addr.title || addr.street}
                            </span>
                            <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">
                              {addr.street}
                              {addr.city ? `, ${addr.city}` : ""}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-md bg-[#0080FF] flex items-center justify-center text-white shadow-xs shrink-0 ml-2">
                            <Check className="w-3.5 h-3.5 stroke-[3]" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Recents Section */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3 px-1">
                Recents
              </h3>
              <div className="rounded-3xl border border-gray-200/90 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-2xs">
                {/* Recent 1: Auchi, Edo State */}
                <button
                  type="button"
                  onClick={() => {
                    setToLocation("Auchi, Edo State")
                    setSelectedNewLocation("Auchi, Edo State")
                    setNewLocationSearch("Auchi, Edo State")
                    setToLocation("Auchi, Edo State")
                  }}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Auchi, Edo State
                  </span>
                </button>

                {/* Recent 2: Benin */}
                <button
                  type="button"
                  onClick={() => {
                    setToLocation("Benin")
                    setSelectedNewLocation("Benin")
                    setNewLocationSearch("Benin")
                    setToLocation("Benin")
                  }}
                  className="w-full p-4 flex items-center gap-3 text-left hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    Benin
                  </span>
                </button>
              </div>
            </div>

            {/* Save to address book toggle */}
            <label className={`flex items-center gap-3 p-4 bg-white dark:bg-[#161618] rounded-2xl border border-gray-200/90 dark:border-white/10 select-none shadow-2xs ${savedAddresses.length >= 5 ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}>
              <input
                type="checkbox"
                checked={saveToBook && savedAddresses.length < 5}
                disabled={savedAddresses.length >= 5}
                onChange={(e) => setSaveToBook(e.target.checked)}
                className="w-4 h-4 rounded text-yellow-500 focus:ring-yellow-400 cursor-pointer accent-[#FFCC00]"
              />
              <div className="text-xs">
                <span className="font-bold text-gray-900 dark:text-white block">
                  Save to address book
                </span>
                <span className="text-gray-500 dark:text-gray-400 block mt-0.5">
                  {savedAddresses.length >= 5
                    ? "Address book is full (maximum 5). You can still use this location for the delivery."
                    : "Save this destination to your account for future orders"}
                </span>
              </div>
            </label>

            {/* Confirm Location Button */}
            <div className="pt-2 pb-6">
              <button
                type="button"
                onClick={handleConfirmAddLocation}
                disabled={isSavingAddress}
                className="w-full py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-50"
              >
                {isSavingAddress ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Location...</span>
                  </>
                ) : (
                  <span>Confirm Location</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 4: CHOOSE RIDER (Inline on Middle Parent Component)                 */}
      {/* ========================================================================= */}
      {screen === "choose_rider" && (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
          {/* Top Navigation Header */}
          <div className="px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setScreen("destination")}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <div className="text-center">
              <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
                Choose Rider
              </h1>
              <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">
                {isLoadingRiders
                  ? "Locating closest riders..."
                  : ridersList.length === 1
                    ? "1 Rider closest to you"
                    : `${ridersList.length} Riders near you`}
              </p>
            </div>

            <button
              type="button"
              onClick={handleExitFlow}
              className="w-10 h-10 rounded-full bg-gray-500/10 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-500/20 dark:hover:bg-white/15 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 px-5 sm:px-8 py-6 space-y-6">
            {/* BEST MATCH: Closest Database Rider (Hero Card) */}
            {ridersList.length > 0 &&
              (() => {
                const closestRider = ridersList[0]
                const isSelected = selectedRiderId === closestRider.id
                return (
                  <div>
                    <div className="flex items-center justify-between mb-2.5 px-1">
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100">
                        Closest to you
                      </span>
                      <span className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        Available Now
                      </span>
                    </div>

                    <div
                      onClick={() => {
                        setSelectedRiderId(closestRider.id)
                        setShowSelectedRiderModal(true)
                      }}
                      className={`relative rounded-3xl p-5 sm:p-6 transition-all cursor-pointer bg-white dark:bg-[#161618] shadow-sm ${
                        isSelected
                          ? "ring-2 ring-[#FFCC00] bg-amber-50/20 dark:bg-yellow-400/5"
                          : "hover:bg-gray-50/80 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Rider Avatar with Status Dot */}
                        <div className="relative shrink-0">
                          <img
                            src={closestRider.avatar}
                            alt={closestRider.name}
                            className="w-16 h-16 sm:w-18 sm:h-18 rounded-2xl object-cover"
                          />
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white stroke-[3]" />
                          </div>
                        </div>

                        {/* Rider Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="text-base sm:text-[17px] font-bold text-gray-900 dark:text-white truncate">
                              {closestRider.name}
                            </h3>
                            {closestRider.isVerified && (
                              <ShieldCheck className="w-4 h-4 text-[#FFCC00] shrink-0" />
                            )}
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                            <div className="flex items-center gap-1 text-amber-500 font-bold">
                              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                              <span>{closestRider.rating}</span>
                              <span className="text-gray-400 font-normal">
                                ({closestRider.reviews})
                              </span>
                            </div>
                            <span>•</span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {closestRider.distanceKm != null
                                ? `${closestRider.distanceKm} km away`
                                : `${closestRider.etaMinutes} mins away`}
                            </span>
                          </div>

                          <div className="mt-2 text-sm font-bold text-gray-950 dark:text-white">
                            ₦{estimatedFee}
                          </div>
                        </div>

                        {/* Selection Radio */}
                        <div
                          className={`w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-[#FFCC00] bg-[#FFCC00]"
                              : "border-gray-300 dark:border-neutral-600"
                          }`}
                        >
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-gray-950 stroke-[3]" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

            {/* Empty state if no riders */}
            {ridersList.length === 0 && (
              <div className="rounded-3xl border border-dashed border-gray-200 dark:border-white/10 p-8 text-center bg-white/50 dark:bg-[#161618]/50">
                {isLoadingRiders ? (
                  <div className="flex flex-col items-center justify-center py-4">
                    <Loader2 className="w-8 h-8 text-[#FFCC00] animate-spin mb-3" />
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      Locating closest riders...
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Searching active riders in database near{" "}
                      {fromLocation || "your location"}
                    </p>
                  </div>
                ) : (
                  <div className="py-4">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <p className="font-bold text-sm text-gray-900 dark:text-white">
                      No online riders found nearby
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                      There are currently no active riders online in this
                      immediate delivery radius.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* OTHER RIDERS SECTION */}
            {ridersList.length > 1 && (
              <div>
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Other available riders
                  </span>
                  <button
                    type="button"
                    onClick={() => setScreen("all_riders")}
                    className="text-xs font-bold text-gray-900 dark:text-gray-100 hover:text-black dark:hover:text-white hover:underline cursor-pointer"
                  >
                    View all riders ({ridersList.length}) →
                  </button>
                </div>

                <div className="rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-sm">
                  {ridersList.slice(1).map((rider) => (
                    <button
                      key={rider.id}
                      type="button"
                      onClick={() => {
                        setSelectedRiderId(rider.id)
                        setShowSelectedRiderModal(true)
                      }}
                      className={`w-full p-4 flex items-center justify-between text-left transition-colors cursor-pointer ${
                        selectedRiderId === rider.id
                          ? "bg-amber-400/10 dark:bg-yellow-400/10"
                          : "hover:bg-gray-50/80 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={rider.avatar}
                          alt={rider.name}
                          className="w-11 h-11 rounded-xl object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                            {rider.name}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                              {rider.rating}
                            </span>
                            <span>•</span>
                            <span>
                              {rider.distanceKm != null
                                ? `${rider.distanceKm} km away`
                                : `${rider.etaMinutes} mins`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ml-2 ${
                          selectedRiderId === rider.id
                            ? "border-[#FFCC00] bg-[#FFCC00]"
                            : "border-gray-300 dark:border-neutral-600"
                        }`}
                      >
                        {selectedRiderId === rider.id && (
                          <Check className="w-3 h-3 text-gray-950 stroke-[3]" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2 pb-6 w-full">
              <button
                type="button"
                onClick={() => setShowSelectedRiderModal(true)}
                className="w-full sm:flex-1 py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center cursor-pointer touch-manipulation"
              >
                <span>Confirm Rider</span>
              </button>

              <button
                type="button"
                onClick={() => setScreen("all_riders")}
                className="w-full sm:flex-1 py-4 px-4 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-800 dark:text-gray-200 font-semibold text-sm sm:text-base hover:bg-gray-50 dark:hover:bg-white/5 transition-all cursor-pointer flex items-center justify-center"
              >
                <span>View all riders (Directory)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 5: ALL RIDERS DIRECTORY (Matching User's Screenshot Exactly)       */}
      {/* ========================================================================= */}
      {screen === "all_riders" && (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
          {/* Top Bar: Back button and + Invite Rider button */}
          <div className="px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-2 flex items-center justify-between sticky top-0 z-20 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setScreen("choose_rider")}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white transition-colors cursor-pointer touch-manipulation"
              title="Go back"
            >
              <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
            </button>

            <button
              type="button"
              onClick={() => {
                copyToClipboard(
                  "https://dart.app/rider-invite/HUD-99P",
                  "Rider invitation link",
                )
                setInviteToast("Rider invitation link copied!")
                setTimeout(() => setInviteToast(null), 2500)
              }}
              className="flex items-center gap-1.5 bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-xs sm:text-sm px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs active:scale-95 touch-manipulation"
            >
              <Plus className="w-4 h-4 stroke-[2.8]" />
              <span>Invite Rider</span>
            </button>
          </div>

          {/* Title & Subtitle Row with Bookmark Icon */}
          <div className="flex items-start justify-between px-5 sm:px-8 mt-3 mb-4">
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-gray-950 dark:text-white tracking-tight leading-tight">
                Available Riders
              </h1>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  24 Riders near you
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsBookmarked(!isBookmarked)}
              className="p-2 -mr-1 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 transition-colors cursor-pointer"
              title="Bookmark riders"
            >
              <Bookmark
                className={`w-6 h-6 stroke-[1.8] ${
                  isBookmarked ? "fill-[#FFCC00] text-[#FFCC00]" : ""
                }`}
              />
            </button>
          </div>

          {/* Form / List Content Area */}
          <div className="flex-1 px-5 sm:px-8 pb-8 space-y-4">
            {/* Search Input Bar */}
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-gray-400 absolute left-4 pointer-events-none" />
              <input
                type="text"
                value={riderSearchQuery}
                onChange={(e) => setRiderSearchQuery(e.target.value)}
                placeholder="Search Rider"
                className="w-full pl-11 pr-10 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#161618] text-gray-900 dark:text-white text-sm placeholder:text-gray-400 focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00] transition-all shadow-2xs"
              />
              {riderSearchQuery && (
                <button
                  type="button"
                  onClick={() => setRiderSearchQuery("")}
                  className="absolute right-3.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-4 h-4 stroke-[2]" />
                </button>
              )}
            </div>

            {/* Banner: "Earn by delivering packages" (All Available Riders Ads Card) */}
            <div className="w-full rounded-2xl overflow-hidden bg-[#181920] dark:bg-[#151518] p-4 sm:p-5 flex items-center gap-4 text-white shadow-sm relative border border-gray-100/10 dark:border-white/5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 flex items-center justify-center relative overflow-hidden">
                <img
                  src={allRidersImage}
                  alt="Dart Delivery Rider"
                  className="w-full h-full object-contain object-bottom scale-110"
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-[17px] font-bold leading-tight text-white">
                  Earn by delivering packages
                </h3>
                <p className="text-xs sm:text-[13px] text-gray-300 mt-1 leading-relaxed font-normal">
                  Become a verified Dart rider and earn on your own schedule.
                </p>
              </div>
            </div>

            {/* Filter Tabs (Pills matching screenshot) */}
            <div className="flex items-center gap-2.5 overflow-x-auto pt-1 pb-1 no-scrollbar">
              {/* Recommended */}
              <button
                type="button"
                onClick={() => setRiderFilterTab("recommended")}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  riderFilterTab === "recommended"
                    ? "bg-[#FFF9E6] dark:bg-[#FFCC00]/15 border border-[#FFCC00] text-gray-950 dark:text-[#FFCC00] font-bold shadow-2xs"
                    : "bg-white dark:bg-[#161618] border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${
                    riderFilterTab === "recommended"
                      ? "fill-[#FFCC00] text-amber-500"
                      : "text-gray-400"
                  }`}
                />
                <span>Recommended</span>
              </button>

              {/* Nearest */}
              <button
                type="button"
                onClick={() => setRiderFilterTab("nearest")}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  riderFilterTab === "nearest"
                    ? "bg-[#FFF9E6] dark:bg-[#FFCC00]/15 border border-[#FFCC00] text-gray-950 dark:text-[#FFCC00] font-bold shadow-2xs"
                    : "bg-white dark:bg-[#161618] border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <Navigation
                  className={`w-3.5 h-3.5 rotate-45 ${
                    riderFilterTab === "nearest"
                      ? "fill-[#FFCC00] text-amber-500"
                      : "text-gray-400"
                  }`}
                />
                <span>Nearest</span>
              </button>

              {/* Highest Rated */}
              <button
                type="button"
                onClick={() => setRiderFilterTab("highest")}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
                  riderFilterTab === "highest"
                    ? "bg-[#FFF9E6] dark:bg-[#FFCC00]/15 border border-[#FFCC00] text-gray-950 dark:text-[#FFCC00] font-bold shadow-2xs"
                    : "bg-white dark:bg-[#161618] border border-gray-100 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <Star
                  className={`w-3.5 h-3.5 ${
                    riderFilterTab === "highest"
                      ? "fill-[#FFCC00] text-amber-500"
                      : "text-gray-400"
                  }`}
                />
                <span>Highest Rated</span>
              </button>
            </div>

            {/* Riders Directory List (Matching Reference Cards Exactly) */}
            <div className="space-y-3 pt-1 pb-8">
              {filteredRiders.map((rider) => {
                const isSelected = selectedRiderId === rider.id
                return (
                  <div
                    key={rider.id}
                    className="p-4 sm:p-5 rounded-2xl transition-all bg-white dark:bg-[#161618] border border-gray-100/90 dark:border-white/5 flex items-center justify-between gap-3 shadow-2xs hover:shadow-xs"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Round Avatar matching screenshot */}
                      <img
                        src={rider.avatar}
                        alt={rider.name}
                        className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover shrink-0"
                      />

                      <div className="min-w-0">
                        {/* Name + Verified Badge */}
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                            {rider.name}
                          </h4>
                          {rider.isVerified && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                        </div>

                        {/* Rating • (reviews) | ETA */}
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                          <span className="font-bold text-gray-900 dark:text-white">
                            {rider.rating}
                          </span>
                          <span>• ({rider.reviews || 251})</span>
                          <span className="text-gray-300 dark:text-gray-600 mx-0.5">
                            |
                          </span>
                          <span>{rider.etaMinutes} mins away</span>
                        </div>

                        {/* Available status with green dot */}
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                          <span>Available</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Select Button matching screenshot */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRiderId(rider.id)
                        setShowSelectedRiderModal(true)
                      }}
                      className={`px-5 py-2 rounded-full font-semibold text-xs sm:text-sm transition-all cursor-pointer shrink-0 ${
                        isSelected
                          ? "bg-[#FFCC00] text-gray-950 font-bold shadow-xs"
                          : "bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-white hover:bg-[#FFCC00] hover:text-gray-950"
                      }`}
                    >
                      Select
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 6: CONFIRM DELIVERY INFO (Inline on Middle Parent Component)       */}
      {/* ========================================================================= */}
      {screen === "confirm_delivery" && (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
          {/* Top Navigation Header */}
          <div className="px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setScreen("choose_rider")}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Confirm Delivery Info
            </h1>

            <button
              type="button"
              onClick={handleExitFlow}
              className="w-10 h-10 rounded-full bg-gray-500/10 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-500/20 dark:hover:bg-white/15 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 px-5 sm:px-8 py-5 space-y-5">
            {/* "You're in safe hands" Security Banner */}
            <div className="bg-[#FFF9DB] dark:bg-[#252210] border border-yellow-200/80 dark:border-yellow-500/20 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#FFCC00] flex items-center justify-center text-gray-950 shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <p className="font-bold text-sm text-gray-950 dark:text-white leading-tight">
                    You’re in safe hands
                  </p>
                  <p className="text-gray-600 dark:text-gray-300 text-xs mt-0.5 leading-normal">
                    All riders are verified and rated by our community
                  </p>
                </div>
              </div>
              <Info className="w-4 h-4 text-amber-700/60 dark:text-yellow-400/70 shrink-0" />
            </div>

            {/* Package Summary Header */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-gray-100 dark:bg-white/10 flex items-center justify-center overflow-hidden ring-1 ring-gray-100 dark:ring-white/10 shrink-0">
                {capturedImage?.previewUrl ? (
                  <img
                    src={capturedImage.previewUrl}
                    alt={packageName || "Package"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-8 h-8 text-gray-400 dark:text-gray-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="bg-[#FFCC00] text-gray-950 font-bold text-[11px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 uppercase tracking-wide">
                  <Smartphone className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{selectedCategory ? selectedCategory.toUpperCase() : "ELECTRONICS"}</span>
                </span>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1.5 leading-snug truncate">
                  {packageName || "Untitled Package"}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span className="font-medium font-mono">
                    {activeOrderTrackingId || "Generated upon booking"}
                  </span>
                  {activeOrderTrackingId && (
                    <button
                      type="button"
                      onClick={() => copyToClipboard(activeOrderTrackingId, "Tracking ID")}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer p-0.5"
                      title="Copy tracking ID"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Package Information Section */}
            <div className="pt-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3">
                Package Information
              </h3>

              {/* Locations Row */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">
                    Pickup-Location
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                    {fromLocation || "Origin not set"}
                  </p>
                </div>

                <div className="w-9 flex items-center justify-center shrink-0">
                  <ChevronsRight className="w-5 h-5 text-gray-300 dark:text-neutral-600" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">
                    Drop-Off Location
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                    {toLocation || "Destination not set"}
                  </p>
                </div>
              </div>

              {/* Dashed separator */}
              <div className="border-t border-dashed border-gray-200 dark:border-white/10 my-3.5" />

              {/* Weight & Time Row */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">
                    Estimated weight
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    {selectedWeight === "light"
                      ? "Light (< 5kg)"
                      : selectedWeight === "medium"
                        ? "Medium (5 - 25kg)"
                        : selectedWeight === "heavy"
                          ? "Heavy (> 25kg)"
                          : "Standard"}
                  </p>
                </div>

                <div className="w-9 shrink-0" aria-hidden="true" />

                <div className="min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-400 font-medium">
                    Time
                  </p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5">
                    Today • {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              {/* Fragile badge */}
              {isFragile && (
                <div className="pt-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-red-300 dark:border-red-500/40 text-red-500 dark:text-red-400 text-xs font-bold tracking-wide">
                    <AlertTriangle className="w-3.5 h-3.5 stroke-[2.2]" />
                    FRAGILE
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Card Container */}
            {(() => {
              const rider = getSelectedRider()

              return (
                <div className="rounded-3xl border border-gray-100 dark:border-white/10 bg-white dark:bg-[#161618] p-4 sm:p-5 shadow-xs space-y-4 mt-4">
                  {/* Selected Rider */}
                  <div className="bg-[#FFF9DB] dark:bg-[#252210] border border-yellow-200/80 dark:border-yellow-500/20 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3.5">
                    <img
                      src={rider.avatar || divineAvatar}
                      alt={rider.name}
                      className="w-12 h-12 rounded-full object-cover shrink-0 ring-1 ring-yellow-400/30"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        Selected Rider
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                          {rider.name || "Assigned Rider"}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 fill-emerald-100 dark:fill-emerald-950 stroke-[2.2] shrink-0" />
                      </div>
                      {rider.plateNumber && (
                        <span className="text-[11px] text-gray-500 font-mono">
                          {rider.plateNumber}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Estimated Fee Row */}
                  <div className="flex items-center justify-between py-0.5">
                    <span className="text-base font-medium text-gray-900 dark:text-gray-100">
                      Estimated Fee
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-gray-950 dark:text-white">
                        {isCalculatingQuote
                          ? "Calculating..."
                          : estimatedFee
                            ? `₦${estimatedFee}`
                            : "Quote unavailable"}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            `₦${estimatedFee}`,
                            "Estimated fee",
                          )
                        }
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer p-0.5"
                        title="Copy fee"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Safe & Reliable Notice */}
                  <div className="bg-[#f8f9fa] dark:bg-white/5 rounded-2xl p-3.5 flex items-start gap-3 border border-gray-100 dark:border-white/5">
                    <ShieldCheck className="w-5 h-5 text-gray-700 dark:text-gray-300 shrink-0 mt-0.5" />
                    <div className="text-xs">
                      <p className="font-bold text-gray-900 dark:text-white">
                        Safe & Reliable
                      </p>
                      <p className="text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                        Your payment is held securely and only released when the delivery is complete
                      </p>
                    </div>
                  </div>

                  {/* Continue to Payment CTA */}
                  <button
                    type="button"
                    onClick={() => setScreen("payment_method")}
                    disabled={isCalculatingQuote || !estimatedFee || Boolean(quoteError)}
                    className="w-full py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span>Continue to Payment</span>
                    <ArrowRight className="w-5 h-5 stroke-[2.2]" />
                  </button>

                  {/* Cancel Anytime Disclaimer */}
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-1 pb-1">
                    You can cancel anytime befor the rider accepts.
                  </p>
                </div>
              )
            })()}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 7: SELECT PAYMENT METHOD (Inline on Middle Parent Component)       */}
      {/* ========================================================================= */}
      {screen === "payment_method" && (
        <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200">
          {/* Top Navigation Header */}
          <div className="px-5 sm:px-8 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md sticky top-0 z-20 border-b border-gray-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => setScreen("confirm_delivery")}
              className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </button>

            <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
              Select Payment Method
            </h1>

            <button
              type="button"
              onClick={handleExitFlow}
              className="w-10 h-10 rounded-full bg-gray-500/10 dark:bg-white/10 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-500/20 dark:hover:bg-white/15 transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Form Body */}
          <div className="flex-1 px-5 sm:px-8 py-6 space-y-6">
            {/* Secure Payment Header Banner */}
            <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FFCC00] flex items-center justify-center text-gray-950 shrink-0 shadow-xs">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="text-xs sm:text-sm">
                  <p className="font-bold text-gray-950 dark:text-white leading-tight">
                    Your payment is secure
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 text-[11px] sm:text-xs mt-0.5 leading-normal">
                    Encrypted transactions powered by bank-grade security
                    protocols.
                  </p>
                </div>
              </div>
              <Info className="w-4 h-4 text-gray-400 shrink-0" />
            </div>

            {/* Payment Options Stack */}
            <div className="rounded-3xl border border-gray-200/90 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 bg-white dark:bg-[#161618] shadow-2xs">
              {/* Option 1: Dart Wallet */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("wallet")}
                className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                  selectedPaymentMethod === "wallet"
                    ? "bg-amber-400/10 dark:bg-yellow-400/10"
                    : "hover:bg-gray-50/80 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#FFCC00]/20 text-amber-900 dark:text-yellow-300 flex items-center justify-center">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                      Dart Wallet
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Available balance:{" "}
                      <span className="font-bold text-gray-900 dark:text-white">
                        ₦{walletBalance.toLocaleString()}
                      </span>
                      {walletBalance <
                        Number(estimatedFee.replace(/,/g, "")) && (
                        <span className="ml-2 text-rose-500 font-semibold text-[11px]">
                          (Low balance)
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    selectedPaymentMethod === "wallet"
                      ? "border-[#FFCC00] bg-[#FFCC00]"
                      : "border-gray-300 dark:border-neutral-600"
                  }`}
                >
                  {selectedPaymentMethod === "wallet" && (
                    <Check className="w-3 h-3 text-gray-950 stroke-[3]" />
                  )}
                </div>
              </button>

              {/* Option 2: Debit/Credit Card */}
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("card")}
                className={`w-full p-4 sm:p-5 flex items-center justify-between text-left transition-colors cursor-pointer ${
                  selectedPaymentMethod === "card"
                    ? "bg-amber-400/10 dark:bg-yellow-400/10"
                    : "hover:bg-gray-50/80 dark:hover:bg-white/5"
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                      Debit / Credit Card
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {savedCards.length > 0 ? (
                        <>
                          {(
                            savedCards.find((c) => c.isDefault) || savedCards[0]
                          ).cardType.toUpperCase()}{" "}
                          ending in{" "}
                          <span className="font-bold">
                            {(
                              savedCards.find((c) => c.isDefault) ||
                              savedCards[0]
                            ).last4}
                          </span>
                        </>
                      ) : (
                        "Pay via saved card or gateway"
                      )}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all ${
                    selectedPaymentMethod === "card"
                      ? "border-[#FFCC00] bg-[#FFCC00]"
                      : "border-gray-300 dark:border-neutral-600"
                  }`}
                >
                  {selectedPaymentMethod === "card" && (
                    <Check className="w-3 h-3 text-gray-950 stroke-[3]" />
                  )}
                </div>
              </button>

              {/* Option 3: Cash on Delivery (Disabled / Coming Soon) */}
              <div className="w-full p-4 sm:p-5 flex items-center justify-between opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 dark:bg-white/5 text-gray-400 flex items-center justify-center">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                      Cash on Delivery
                    </h4>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      COMING SOON
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notice Box */}
            <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
              <Info className="w-4 h-4 shrink-0 text-gray-400" />
              <span>
                You will only be charged after your package has been confirmed
                by the rider.
              </span>
            </div>

            {/* Low Wallet Balance Warning Banner */}
            {selectedPaymentMethod === "wallet" &&
              walletBalance < Number(estimatedFee.replace(/,/g, "")) && (
                <div className="p-3.5 bg-amber-50 dark:bg-yellow-500/10 border border-amber-200 dark:border-yellow-500/20 rounded-2xl flex items-center gap-2.5 text-xs text-amber-800 dark:text-yellow-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-yellow-400" />
                  <span>
                    Your Dart Wallet balance is ₦{walletBalance.toLocaleString()},
                    which is below the delivery fee (₦{estimatedFee}). You may
                    switch to Card payment or proceed.
                  </span>
                </div>
              )}

            {/* Total Fee Row */}
            <div className="rounded-2xl border border-gray-200/90 dark:border-white/10 bg-white dark:bg-[#161618] p-4 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
                Total Amount
              </span>
              <span className="text-xl font-bold text-gray-950 dark:text-white">
                {estimatedFee ? `₦${estimatedFee}` : "Quote unavailable"}
              </span>
            </div>

            {/* Bottom Confirm Payment Method CTA */}
            <div className="pt-2 pb-6">
              {checkoutError && (
                <p role="alert" className="mb-3 text-sm text-red-600 dark:text-red-400">
                  {checkoutError}
                </p>
              )}
              <button
                type="button"
                onClick={handleConfirmPayment}
                disabled={isConfirmingPayment || isCalculatingQuote || !estimatedFee || Boolean(quoteError)}
                className="w-full py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:cursor-wait disabled:opacity-60"
              >
                <Check className="w-5 h-5 stroke-[3]" />
                <span>{isConfirmingPayment ? "Processing..." : "Confirm Payment Method"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SCREEN 8: PACKAGE STATUS (Matches User's Screenshot Exactly)              */}
      {/* ========================================================================= */}
      {screen === "package_status" &&
        (() => {
          const fallbackRider = getSelectedRider()
          const liveRider =
            liveOrderStatus?.rider?.name &&
            liveOrderStatus.rider.name !== "Pending Rider Assignment"
              ? liveOrderStatus.rider
              : null
          const riderInfo = liveRider
            ? liveRider
            : initialPackageDetails?.rider
              ? {
                  name: initialPackageDetails.rider.name,
                  avatar: initialPackageDetails.rider.avatar,
                  rating: initialPackageDetails.rider.rating,
                  reviews: initialPackageDetails.rider.reviewCount,
                  distanceKm: undefined,
                  plateNumber: initialPackageDetails.rider.plateNumber,
                }
              : null
          const isRestoredOrder = Boolean(initialPackageDetails?.orderId)
          const chosenRider: Rider = riderInfo
            ? {
                ...fallbackRider,
                id: riderInfo.id || initialPackageDetails?.rider?.idCode || fallbackRider.id,
                name: riderInfo.name || "Assigned Rider",
                avatar: riderInfo.avatar || "",
                rating: riderInfo.rating ?? 0,
                reviews: riderInfo.reviews ?? 0,
                etaMinutes: riderInfo.etaMinutes ?? fallbackRider.etaMinutes,
                distanceKm: riderInfo.distanceKm,
                plateNumber:
                  riderInfo.plateNumber ||
                  (isRestoredOrder ? undefined : fallbackRider.plateNumber),
              }
            : isRestoredOrder
              ? {
                  ...fallbackRider,
                  name: "Rider details unavailable",
                  avatar: "",
                }
              : fallbackRider
          const displayTrackingId =
            liveOrderStatus?.trackingId ||
            activeOrderTrackingId ||
            initialPackageDetails?.trackingId ||
            "Tracking ID unavailable"
          const displayPackageName =
            liveOrderStatus?.packageName ||
            initialPackageDetails?.packageName ||
            packageName ||
            "Delivery Package"
          const currentOrderStatus =
            liveOrderStatus?.status || initialPackageDetails?.status
          const isLiveOrder = Boolean(activeOrderId || initialPackageDetails?.orderId)
          const displayStatus = isCancelled
            ? "CANCELLED"
            : isPackageArrived
              ? "DELIVERED"
              : liveOrderStatus?.isArrivalImminent
                ? "RIDER NEARBY"
                : currentOrderStatus === "PICKUP_PENDING"
                  ? "RIDER TO PICKUP"
                  : currentOrderStatus === "PICKED_UP" || currentOrderStatus === "IN_TRANSIT"
                    ? "IN-TRANSIT"
                    : isRiderAccepted
                      ? "RIDER TO PICKUP"
                      : "PENDING"
          const hasPickedUp =
            !isLiveOrder ||
            Boolean(
              currentOrderStatus &&
                [
                  "PICKED_UP",
                  "IN_TRANSIT",
                  "DELIVERED",
                  "CUSTOMER_CONFIRMED",
                  "SETTLED",
                ].includes(currentOrderStatus),
            )
          const hasDelivered =
            isPackageArrived ||
            Boolean(
              currentOrderStatus &&
                ["DELIVERED", "CUSTOMER_CONFIRMED", "SETTLED"].includes(
                  currentOrderStatus,
                ),
            )
          const hasArrivedNearDestination =
            Boolean(liveOrderStatus?.isArrivalImminent) || hasDelivered
          const liveEtaRemaining = isLiveOrder
            ? liveEtaDeadline === null
              ? null
              : Math.max(0, Math.ceil((liveEtaDeadline - etaClock) / 1000))
            : transitCountdown
          const canCancelOngoingOrder =
            !isPackageArrived &&
            !isCancelled &&
            liveEtaRemaining === 0
          const canCancelPendingOrder = countdown === 0 && !isCancelled

          if (showRiderChat) {
            return (
              <div className="w-full flex-1 min-h-full h-full flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] animate-in fade-in duration-200">
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
                        src={chosenRider.avatar || divineAvatar}
                        alt={chosenRider.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white dark:ring-[#161618]" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                        {chosenRider.name}
                      </h2>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <span className="text-yellow-500 font-semibold">
                          ★ {chosenRider.rating}
                        </span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          Verified Rider
                        </span>
                        <span>•</span>
                        <span>
                          {isRiderAccepted ? "On the way" : "Pending request"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          chosenRider.name,
                          `Calling ${chosenRider.name}`,
                        )
                      }
                      className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
                      title="Call rider"
                    >
                      <Phone className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRiderChat(false)}
                      className="flex px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 text-xs font-bold transition-all shadow-xs cursor-pointer items-center gap-1"
                      title="Back to delivery status"
                    >
                      <span className="hidden xs:inline sm:inline">
                        Back to{" "}
                      </span>
                      Status
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
                        {packageName || "Package Delivery"}
                      </h4>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-mono">
                        Tracking ID: {activeOrderTrackingId || "TRK-DART-ACTIVE"} •{" "}
                        {isRiderAccepted ? "IN-TRANSIT" : "PENDING"}
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
                      Today • 10:11 AM
                    </span>
                  </div>

                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500">
                      <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                      <p className="text-xs">No messages yet. Send a message to {chosenRider.name}!</p>
                    </div>
                  )}

                  {chatMessages.map((msg) => {
                    const isUser =
                      msg.sender === "user" ||
                      msg.senderRole === "customer" ||
                      msg.senderRole === "user" ||
                      Boolean(user?.id && msg.senderId === user.id)
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 max-w-[85%] sm:max-w-[75%] ${
                          isUser ? "self-end flex-row-reverse" : "self-start"
                        } animate-in fade-in slide-in-from-bottom-1 duration-150`}
                      >
                        {!isUser && (
                          <img
                            src={chosenRider.avatar || divineAvatar}
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
                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Shared attachment"
                              className="w-full max-h-48 rounded-xl object-cover mb-1.5 shadow-xs"
                            />
                          )}
                          {msg.text && (
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
                            {msg.time || "Just now"}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Quick Suggestion Pills & Input Area */}
                <div className="p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom,0.75rem))] bg-white dark:bg-[#161618] border-t border-gray-100 dark:border-white/5 shrink-0">
                  {/* Horizontal Quick Pills */}
                  <div className="flex gap-2 mb-2.5 overflow-x-auto pb-1 hide-scrollbar">
                    {[
                      "Call me",
                      "I'm outside waiting",
                      "What's your current ETA?",
                      "Please handle with care",
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

                  {/* Input Bar */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleSendMessage()
                    }}
                    className="flex items-center gap-2"
                  >
                    <input
                      type="file"
                      ref={chatFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleChatImageUpload}
                    />
                    <button
                      type="button"
                      onClick={() => chatFileInputRef.current?.click()}
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
                        placeholder={`Message ${chosenRider.name}...`}
                        className="bg-transparent w-full focus:outline-none text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={!chatInputText.trim() || isSendingChat}
                      className="w-10 h-10 flex items-center justify-center bg-[#FFCC00] hover:bg-[#f5c400] disabled:opacity-40 disabled:hover:bg-[#FFCC00] text-gray-950 rounded-full shrink-0 transition-all cursor-pointer shadow-xs active:scale-95"
                      title="Send message"
                    >
                      <Send className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </form>
                </div>
              </div>
            )
          }

          return (
            <div className="w-full flex-1 flex flex-col animate-in fade-in duration-200 bg-[#fcfcfc] dark:bg-[#0c0c0e] rounded-none pb-6 sm:pb-8">
              {/* Top Hero Image with Dark Gradient & Controls (Click to expand full image) */}
              <div
                onClick={() => {
                  if (packagePhoto) setShowExpandedImage(true)
                }}
                className={`relative w-full h-[260px] sm:h-[290px] bg-neutral-900 overflow-hidden shrink-0 group select-none ${
                  packagePhoto ? "cursor-pointer" : ""
                }`}
                title={packagePhoto ? "Click to view complete full image" : undefined}
              >
                {packagePhoto ? (
                  <img
                    src={packagePhoto}
                    alt={displayPackageName}
                    onError={(event) => {
                      event.currentTarget.style.display = "none"
                    }}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-white/40">
                    <Package className="h-16 w-16" aria-hidden="true" />
                  </div>
                )}

                {/* Top & Bottom Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/85 pointer-events-none" />

                {/* Floating "Tap to expand" badge */}
                {packagePhoto && (
                <div className="absolute top-14 sm:top-16 right-4 sm:right-6 z-20 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowExpandedImage(true)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/85 backdrop-blur-md text-white text-xs font-medium border border-white/20 shadow-md transition-all cursor-pointer hover:scale-105 active:scale-95"
                    title="Click to view complete full image"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[11px] font-semibold">
                      Expand photo
                    </span>
                  </button>
                </div>
                )}

                {/* Floating Top Navigation Header */}
                <div className="absolute top-0 left-0 right-0 px-4 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between z-20 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (initialScreen === "package_status") {
                        onBack()
                      } else {
                        setScreen("payment_method")
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-white hover:bg-white/10 transition-colors cursor-pointer touch-manipulation"
                    title="Go back"
                  >
                    <ArrowLeft className="w-6 h-6 stroke-[2.2]" />
                  </button>

                  <h1 className="text-lg font-semibold text-white tracking-tight">
                    Package Status
                  </h1>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onBack()
                    }}
                    className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors cursor-pointer"
                    title="Close"
                  >
                    <X className="w-5 h-5 stroke-[2.2]" />
                  </button>
                </div>

                {/* Hero Bottom Information (Package Title, Tracking Code, Status Badge) */}
                <div className="absolute bottom-4 sm:bottom-5 left-0 right-0 px-4 sm:px-6 flex items-end justify-between z-10 pointer-events-auto">
                  <div className="min-w-0 pr-3">
                    <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
                      {displayPackageName}
                    </h2>
                    <div className="flex items-center gap-1.5 text-white/80 text-xs sm:text-sm mt-1">
                      <span className="font-medium">{displayTrackingId}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(displayTrackingId, "Tracking Code")
                        }}
                        className="hover:text-white transition-colors cursor-pointer p-0.5"
                        title="Copy Tracking ID"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase shrink-0 ${
                      isCancelled
                        ? "bg-red-500 text-white"
                        : isPackageArrived
                          ? "bg-emerald-500 text-white"
                        : "bg-yellow-400 text-black shadow-xs"
                    }`}
                  >
                    {displayStatus}
                  </span>
                </div>
              </div>

              {/* White / Dark Card Body */}
              <div className="flex-1 bg-white dark:bg-[#161618] rounded-none mt-0 pt-5 sm:pt-6 pb-6 sm:pb-8 px-4 sm:px-8 relative z-10 shadow-sm flex flex-col justify-between transition-colors">
                <div>
                  {/* Condition: Rider Accepted / IN-TRANSIT (Matches Image 1 and Image 2) */}
                  {isRiderAccepted ? (
                    <>
                      {/* Header with Countdown Badge (Image 1: 26:03, Image 2: 00:00) */}
                      <div className="flex items-start justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                            Package status
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {isPackageArrived
                              ? "Your package has been delivered"
                              : hasArrivedNearDestination
                                ? "Your rider is near the delivery location"
                              : "Your package is on the way"}
                          </p>
                        </div>

                        {/* Yellow Timer Pill */}
                        <div className="px-3.5 py-1.5 rounded-xl bg-[#FFCC00] text-gray-950 font-bold text-xs sm:text-sm border border-black/80 flex items-center gap-1.5 shadow-xs shrink-0">
                          <Timer className="w-4 h-4 text-gray-950 stroke-[2.5]" />
                          <span>
                            {isPackageArrived
                              ? "Delivered"
                              : liveEtaRemaining === null
                                ? isLiveOrder
                                  ? "Locating rider"
                                  : "Estimating"
                                : formatTransitTime(liveEtaRemaining)}
                          </span>
                        </div>
                      </div>

                      {/* Timeline Stepper */}
                      <div className="space-y-0 mb-6 pl-1">
                        {/* Step 1: Rider on the way */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-[#FFCC00] flex items-center justify-center shrink-0 shadow-xs">
                              <Check className="w-3 h-3 text-white stroke-[3.5]" />
                            </div>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Rider on the way
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {isLiveOrder
                              ? formatMilestoneTime(liveOrderStatus?.milestones?.riderEnRouteAt)
                              : "In progress"}
                          </span>
                        </div>

                        {/* Solid vertical connecting line */}
                        <div className="w-0.5 h-6 bg-gray-300 dark:bg-gray-700 ml-2.5 my-0.5" />

                        {/* Step 2: Package Collected */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs ${hasPickedUp ? "bg-[#FFCC00]" : "border-2 border-gray-300 dark:border-gray-600"}`}>
                              {hasPickedUp && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                            </div>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Package Collected
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {isLiveOrder
                              ? formatMilestoneTime(liveOrderStatus?.milestones?.packageCollectedAt) ||
                                (hasPickedUp ? "" : "Waiting")
                              : hasPickedUp
                                ? "Collected"
                                : "--"}
                          </span>
                        </div>

                        {/* Dashed vertical connecting line */}
                        <div className="w-0.5 h-6 border-l-2 border-dashed border-gray-400 dark:border-gray-600 ml-2.5 my-0.5" />

                        {/* Step 3: Package has arrived */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${hasArrivedNearDestination ? "bg-emerald-500" : "border-2 border-gray-900 dark:border-gray-300"}`}>
                              {hasArrivedNearDestination && <Check className="w-3 h-3 text-white stroke-[3.5]" />}
                            </div>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                              Package has arrived
                            </span>
                          </div>
                          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            {isLiveOrder
                              ? formatMilestoneTime(liveOrderStatus?.milestones?.packageArrivedAt) ||
                                (hasArrivedNearDestination ? "" : "On the way")
                              : hasArrivedNearDestination
                                ? "Arrived"
                                : "--"}
                          </span>
                        </div>
                      </div>

                      {/* Rider's Information Card */}
                      {(!isRestoredOrder || riderInfo) && (
                      <div className="bg-gray-50/90 dark:bg-[#1f1f23] p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3.5 mb-6">
                        <h4 className="font-bold text-base text-gray-900 dark:text-white">
                          Rider’s information
                        </h4>

                        {/* Rider Profile Row with Chat Action */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                chosenRider.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(chosenRider.name)}&background=ffcc00&color=000000`
                              }
                              alt={chosenRider.name}
                              className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200/80 dark:border-white/10"
                            />
                            <div>
                              <h5 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white">
                                {chosenRider.name}
                              </h5>
                              <div className="flex items-center gap-1 text-xs text-gray-700 dark:text-gray-300 mt-0.5">
                                {chosenRider.rating > 0 ? (
                                  <>
                                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold">
                                      {chosenRider.rating}
                                    </span>
                                    <span className="text-gray-500">
                                      ({chosenRider.reviews} deliveries)
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-gray-500">Rating unavailable</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Chat Button with Rider */}
                          <button
                            type="button"
                            onClick={() => setShowRiderChat(true)}
                            className="w-11 h-11 rounded-2xl bg-white dark:bg-[#242428] border border-gray-200/80 dark:border-white/10 flex items-center justify-center text-gray-800 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-white/10 hover:border-yellow-400 transition-all cursor-pointer"
                            title="Message rider"
                          >
                            <MessageSquareText className="w-5 h-5 stroke-[1.8]" />
                          </button>
                        </div>

                        {/* Distance Slider Progress Bar */}
                        {!isRestoredOrder && (
                        <div className="relative w-full py-2">
                          <div className="relative flex items-center w-full h-1.5 bg-transparent">
                            {/* Solid Black Track */}
                            <div
                              className="h-1.5 bg-gray-950 dark:bg-white rounded-l-full transition-all duration-500"
                              style={{
                                width: isPackageArrived ? "100%" : "50%",
                              }}
                            />
                            {/* Yellow Slider Badge (1.30km) */}
                            <div
                              className="absolute top-1/2 bg-[#FFCC00] text-gray-950 font-bold text-[10.5px] px-2.5 py-0.5 rounded-full border border-black/80 shadow-xs z-10 whitespace-nowrap transition-all duration-500 flex items-center justify-center"
                              style={
                                isPackageArrived
                                  ? {
                                      right: 0,
                                      transform: "translate(0, -50%)",
                                    }
                                  : {
                                      left: "50%",
                                      transform: "translate(-50%, -50%)",
                                    }
                              }
                            >
                              {chosenRider.distanceKm != null ? `${chosenRider.distanceKm}km` : "1.30km"}
                            </div>
                            {/* Dashed Line Remaining Track */}
                            {!isPackageArrived && (
                              <div className="flex-1 h-0 border-b-2 border-dashed border-gray-400 dark:border-gray-500" />
                            )}
                          </div>
                        </div>
                        )}

                        {/* Price Row */}
                        <div className="flex items-center justify-between text-sm pt-0.5">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            Price :
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-base text-gray-900 dark:text-white">
                            <span>₦{estimatedFee}</span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(`₦${estimatedFee}`, "Price")
                              }
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                              title="Copy Price"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Bottom Action Buttons: Package Received & Flag */}
                      <div className="flex items-center gap-3 pt-2">
                        {isTransactionComplete ? (
                          <div
                            role="status"
                            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-300"
                          >
                            <CheckCircle2 className="h-5 w-5 shrink-0" />
                            <span>Delivered · Payment released</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setShowDropOffCodeModal(true)}
                            className={`flex-1 py-4 px-5 rounded-2xl font-bold text-base transition-all flex items-center justify-center cursor-pointer active:scale-[0.99] ${
                              isPackageArrived
                                ? "bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 shadow-xs"
                                : "bg-[#FFF4C7] hover:bg-[#ffefa8] text-gray-900 dark:bg-[#2c2612] dark:text-amber-100 shadow-2xs"
                            }`}
                          >
                            <span>Package Received</span>
                          </button>
                        )}

                        {/* Flag / Report Issue Button */}
                        <button
                          type="button"
                          onClick={() => setShowReportModal(true)}
                          className="w-14 h-14 rounded-2xl border border-red-300/90 dark:border-red-500/40 bg-white dark:bg-transparent flex items-center justify-center text-[#ea3829] hover:bg-red-50 dark:hover:bg-red-500/10 cursor-pointer transition-colors shrink-0 shadow-2xs"
                          title="Report Issue"
                        >
                          <Flag className="w-6 h-6 stroke-[2]" />
                        </button>
                      </div>

                      {!isTransactionComplete && !isPackageArrived && (
                        <button
                          type="button"
                          disabled={!canCancelOngoingOrder || isCancelling}
                          onClick={() => {
                            setCancelError(null)
                            setShowCancelModal(true)
                          }}
                          className={`mt-3 w-full rounded-2xl border px-5 py-3 text-sm font-semibold transition-colors ${
                            canCancelOngoingOrder && !isCancelling
                              ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-500/40 dark:text-red-400 dark:hover:bg-red-500/10"
                              : "cursor-not-allowed border-gray-200 text-gray-400 dark:border-white/10 dark:text-gray-500"
                          }`}
                        >
                          {canCancelOngoingOrder
                            ? "Cancel delivery"
                            : liveEtaRemaining === null
                              ? "Waiting for fresh rider location"
                              : `Cancel delivery when ETA reaches 00:00 (${formatTransitTime(liveEtaRemaining)})`}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Condition: Pending / Waiting for rider to accept */}
                      <div className="mb-6">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                          Package status
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                          {isCancelled
                            ? "This delivery has been cancelled"
                            : "Waiting for a rider to accept"}
                        </p>
                      </div>

                      {/* Pickup & Drop-Off Locations */}
                      <div className="flex items-center justify-between gap-3">
                        {/* Pickup */}
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium block">
                            Pickup-Location
                          </span>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                            {fromLocation || "Pickup location"}
                          </p>
                        </div>

                        {/* Arrow Indicator */}
                        <div className="shrink-0 flex items-center justify-center text-gray-300 dark:text-gray-600 px-2">
                          <ChevronsRight className="w-5 h-5" />
                        </div>

                        {/* Drop-Off */}
                        <div className="flex-1 min-w-0 text-left sm:text-right">
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium block">
                            Drop-Off Location
                          </span>
                          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                            {toLocation || "Drop-off destination"}
                          </p>
                        </div>
                      </div>

                      {/* Dashed Separator */}
                      <div className="border-b border-dashed border-gray-200 dark:border-white/10 my-6" />

                      {/* Rider's Information Card */}
                      {(!isRestoredOrder || riderInfo) && (
                      <div className="bg-gray-50/90 dark:bg-[#1f1f23] p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3.5 mb-8">
                        <h4 className="font-bold text-base text-gray-900 dark:text-white">
                          Rider’s information
                        </h4>

                        {/* Rider Profile Row with Message Button */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <img
                              src={
                                chosenRider.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(chosenRider.name)}&background=ffcc00&color=000000`
                              }
                              alt={chosenRider.name}
                              className="w-12 h-12 rounded-full object-cover shrink-0 border border-gray-200/80 dark:border-white/10"
                            />
                            <div className="min-w-0">
                              <h5 className="font-bold text-sm sm:text-base text-gray-900 dark:text-white truncate">
                                {chosenRider.name}
                              </h5>
                              <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                <span className="truncate font-mono">
                                  {chosenRider.plateNumber || "License plate unavailable"}
                                </span>
                                {chosenRider.plateNumber && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      chosenRider.plateNumber &&
                                      copyToClipboard(chosenRider.plateNumber, "Rider Plate")
                                    }
                                    className="hover:text-gray-700 dark:hover:text-gray-300 p-0.5 cursor-pointer"
                                    title="Copy Rider Plate"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Message Icon Button */}
                          <button
                            type="button"
                            onClick={() => setShowRiderChat(true)}
                            className="w-11 h-11 rounded-2xl bg-white dark:bg-[#242428] border border-gray-200/90 dark:border-white/10 flex items-center justify-center text-gray-800 dark:text-gray-200 shadow-2xs hover:bg-gray-50 dark:hover:bg-white/10 hover:border-yellow-400 transition-all cursor-pointer shrink-0 touch-manipulation"
                            title="Message rider"
                          >
                            <MessageSquareText className="w-5 h-5 stroke-[1.8]" />
                          </button>
                        </div>

                        {/* Inner Dashed Line */}
                        <div className="border-b border-dashed border-gray-200 dark:border-white/10 pt-1" />

                        {/* Rating */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            Rating :
                          </span>
                          <div className="flex items-center gap-1 font-bold text-gray-900 dark:text-white">
                            {chosenRider.rating > 0 ? (
                              <>
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span>
                                  {chosenRider.rating} ({chosenRider.reviews} deliveries)
                                </span>
                              </>
                            ) : (
                              <span>Rating unavailable</span>
                            )}
                          </div>
                        </div>

                        {/* Price */}
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            Price :
                          </span>
                          <div className="flex items-center gap-1.5 font-bold text-base text-gray-900 dark:text-white">
                            <span>₦{estimatedFee}</span>
                            <button
                              type="button"
                              onClick={() =>
                                copyToClipboard(`₦${estimatedFee}`, "Price")
                              }
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-0.5"
                              title="Copy Price"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                      )}

                      {/* Bottom Actions for Pending State */}
                      {isRestoredOrder ? (
                        <div className="space-y-3 pt-4">
                          <p
                            role="status"
                            className="text-center text-sm text-gray-500 dark:text-gray-400"
                          >
                            This order status refreshes automatically from the server.
                          </p>
                          <button
                            type="button"
                            disabled={!canCancelPendingOrder || isCancelling}
                            onClick={() => {
                              setCancelError(null)
                              setShowCancelModal(true)
                            }}
                            className={`w-full text-center text-xs underline underline-offset-2 font-medium ${
                              !canCancelPendingOrder || isCancelling
                                ? "cursor-not-allowed text-gray-400"
                                : "cursor-pointer text-red-500 hover:text-red-600 dark:hover:text-red-400"
                            }`}
                          >
                            Cancel delivery request{" "}
                            {countdown > 0 ? `(${formatCountdown(countdown)})` : ""}
                          </button>
                        </div>
                      ) : (
                      <div className="space-y-3 pt-2 w-full">
                        {/* 2 Buttons: Choose a new rider & Wait (stacked on mobile, side-by-side on desktop) */}
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                          {/* Button 1: Choose a new rider (disabled while wait counter is running, enabled when counter is 0) */}
                          <button
                            type="button"
                            disabled={countdown > 0}
                            onClick={() => setShowReassignRiderModal(true)}
                            className={`w-full sm:flex-1 py-4 px-6 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 touch-manipulation ${
                              countdown > 0
                                ? "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-gray-200/50 dark:border-white/5 opacity-80"
                                : "bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 shadow-xs cursor-pointer"
                            }`}
                          >
                            <span>Choose a new rider</span>
                          </button>

                          {/* Button 2: Wait (clicking extends wait counter to 40s) */}
                          <button
                            type="button"
                            onClick={handleExtendWait}
                            className={`w-full sm:flex-1 py-4 px-6 rounded-2xl font-bold text-base transition-all flex items-center justify-center gap-2 touch-manipulation border ${
                              countdown > 0
                                ? "border-yellow-400/80 bg-yellow-50/70 dark:bg-yellow-400/10 text-yellow-900 dark:text-yellow-300 hover:bg-yellow-100/80 cursor-pointer shadow-2xs"
                                : "border-gray-300 dark:border-white/20 hover:border-yellow-400 hover:bg-yellow-50/50 dark:hover:bg-yellow-400/10 text-gray-800 dark:text-gray-200 cursor-pointer"
                            }`}
                            title={
                              countdown > 0
                                ? "Click to reset wait counter to 40s"
                                : "Extend wait by 40 seconds"
                            }
                          >
                            <span>
                              {countdown > 0
                                ? `Wait (${formatCountdown(countdown)})`
                                : "Wait for rider (+40s)"}
                            </span>
                          </button>
                        </div>

                        {/* Cancel Request text link with countdown */}
                        <div className="text-center pt-0.5">
                          <button
                            type="button"
                            disabled={!canCancelPendingOrder || isCancelling}
                            onClick={() => {
                              setCancelError(null)
                              setShowCancelModal(true)
                            }}
                            className={`text-xs underline underline-offset-2 font-medium ${
                              !canCancelPendingOrder || isCancelling
                                ? "cursor-not-allowed text-gray-400"
                                : "cursor-pointer text-red-500 hover:text-red-600 dark:hover:text-red-400"
                            }`}
                          >
                            Cancel delivery request{" "}
                            {countdown > 0 ? `(${formatCountdown(countdown)})` : ""}
                          </button>
                        </div>
                      </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Cancel Confirmation Modal (Matches User's Screenshot Exactly) */}
              {showCancelModal && (
                <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 border-t sm:border border-gray-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-200 text-center pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))] sm:pb-8"
                  >
                    {/* Pull Indicator Bar */}
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-6 sm:hidden" />

                    {/* Red Circle with White X */}
                    <div className="w-20 h-20 rounded-full bg-[#ea3829] flex items-center justify-center mx-auto mb-6 shadow-sm">
                      <X className="w-10 h-10 text-white stroke-[2.8]" />
                    </div>

                    {/* Question Heading matching user's screenshot */}
                    <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white text-center mb-7 tracking-tight leading-snug">
                      Are u sure you want to
                      <br />
                      cancel this Request?
                    </h3>
                    {cancelError && (
                      <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">
                        {cancelError}
                      </p>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-3.5 w-full">
                      {/* Top Yellow Button: No Go Back */}
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={() => setShowCancelModal(false)}
                        className="w-full sm:flex-1 py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span>No Go Back</span>
                      </button>

                      {/* Bottom Red Outlined Button: Yes Continue */}
                      <button
                        type="button"
                        disabled={isCancelling}
                        onClick={handleCancelDelivery}
                        className="w-full sm:flex-1 py-4 px-5 rounded-2xl border border-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 text-[#ea3829] font-bold text-base transition-all flex items-center justify-center cursor-pointer touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span>{isCancelling ? "Cancelling..." : "Yes Continue"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Choose Another Rider Modal (Triggered when 40s wait counter expires) */}
              {showReassignRiderModal && (
                <div className="fixed inset-0 z-[125] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-5 sm:p-6 border-t sm:border border-gray-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))] sm:pb-6 max-h-[85vh] flex flex-col"
                  >
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4 sm:hidden" />

                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          Choose Another Rider
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Select a new rider to assign this delivery to
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowReassignRiderModal(false)}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Rider List */}
                    <div className="space-y-2.5 overflow-y-auto max-h-[50vh] pr-1">
                      {ridersList
                        .filter((r) => r.id !== selectedRiderId)
                        .map((rider) => (
                          <div
                            key={rider.id}
                            onClick={() => handleReassignRider(rider.id)}
                            className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 hover:bg-yellow-50 dark:hover:bg-yellow-400/10 border border-gray-200/70 dark:border-white/10 hover:border-yellow-400/60 rounded-2xl cursor-pointer transition-all group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={rider.avatar || divineAvatar}
                                alt={rider.name}
                                className="w-11 h-11 rounded-full object-cover shrink-0 border border-gray-200 dark:border-white/10"
                              />
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                  {rider.name}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                  <span className="text-yellow-500 font-bold">★ {rider.rating}</span>
                                  <span>•</span>
                                  <span>{rider.distanceKm} km away</span>
                                  <span>•</span>
                                  <span>{rider.etaMinutes} mins</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={isReassigningRider}
                              className="px-3.5 py-1.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-xs shrink-0 shadow-xs cursor-pointer"
                            >
                              Assign
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Report Issue Modal */}
              {showReportModal && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-7 border-t sm:border border-gray-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))] sm:pb-7"
                  >
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4 sm:hidden" />
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Report an Issue
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowReportModal(false)}
                        className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                      Please select the issue you are experiencing with this
                      delivery:
                    </p>
                    <div className="space-y-2 mb-2">
                      {[
                        "Rider is delayed / not moving",
                        "Package damaged / mishandled",
                        "Cannot reach rider via phone",
                        "Wrong delivery address",
                        "Other issue",
                      ].map((issue, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setShowReportModal(false)
                            copyToClipboard(issue, "Report submitted")
                          }}
                          className="w-full p-3 text-left rounded-xl border border-gray-200 dark:border-white/10 hover:border-yellow-400 dark:hover:border-yellow-400 text-xs sm:text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-yellow-50/50 dark:hover:bg-yellow-400/10 transition-colors cursor-pointer"
                        >
                          {issue}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Drop-off Confirmation Code Modal (Matches User's Screenshot Exactly) */}
              {showDropOffCodeModal && !isTransactionComplete && (
                <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-7 border-t sm:border border-gray-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-200 pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))] sm:pb-7 space-y-5"
                  >
                    {/* Top Pull Handle */}
                    <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto -mt-1 mb-3 sm:hidden" />

                    {/* Header Row: Box Icon with Blue Checkmark + Title & Subtitle */}
                    <div className="flex items-center gap-4">
                      {/* Yellow Box with Red Tape & Cyan Checkmark Badge (User's Exact Asset) */}
                      <div className="w-14 h-14 shrink-0 flex items-center justify-center">
                        <img
                          src={dropOffBoxGoodMarkIcon}
                          alt="Drop-off confirmed"
                          className="w-full h-full object-contain"
                        />
                      </div>

                      {/* Title & Subtitle */}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-xl sm:text-2xl font-bold text-gray-950 dark:text-white tracking-tight leading-tight">
                          Drop-off code
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                          give this code to the rider to allow payment release.
                        </p>
                      </div>
                    </div>

                    {/* Dark Card Container */}
                    <div className="bg-[#1c1d21] dark:bg-[#121316] rounded-[24px] p-5 sm:p-6 text-center shadow-lg">
                      <p className="text-xs sm:text-sm text-gray-300 font-medium mb-4">
                        Drop-off Confirmation code for the rider
                      </p>

                      {/* Handover code digits + copy button */}
                      <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                        {dropOffCode.split("").map((digit, idx) => (
                          <div
                            key={idx}
                            className="w-9 h-11 sm:w-12 sm:h-14 rounded-xl sm:rounded-2xl bg-[#2e3036] flex items-center justify-center text-2xl sm:text-3xl font-bold text-white shadow-inner select-all"
                          >
                            {digit}
                          </div>
                        ))}

                        {/* Yellow Circular Copy / Good Mark (Check) Button */}
                        <button
                          type="button"
                          onClick={() => {
                            copyToClipboard(dropOffCode, "Confirmation code")
                            setIsCodeCopied(true)
                            setTimeout(() => setIsCodeCopied(false), 2400)
                          }}
                          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full active:scale-95 flex items-center justify-center text-gray-950 shadow-md cursor-pointer transition-all shrink-0 ml-1 ${
                            isCodeCopied
                              ? "bg-[#FFCC00] ring-2 ring-yellow-400/80"
                              : "bg-[#FFCC00] hover:bg-[#f5c400]"
                          }`}
                          title={isCodeCopied ? "Code Copied!" : "Copy Code"}
                        >
                          {isCodeCopied ? (
                            <Check className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3] text-gray-950 animate-in zoom-in-50 duration-150" />
                          ) : (
                            <Copy className="w-5 h-5 stroke-[2.2]" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Please Note Notice Box */}
                    <div className="bg-[#F8F9FA] dark:bg-[#202125] p-4 rounded-2xl border border-gray-100 dark:border-white/5 flex items-start gap-3">
                      <div className="w-5 h-5 text-gray-900 dark:text-white shrink-0 mt-0.5">
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                          <circle cx="12" cy="10" r="1.5" />
                          <path d="M12 11.5v3.5" />
                        </svg>
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                          Please Note
                        </h5>
                        <p className="text-[11.5px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                          Only give this to the rider after your package has
                          been delivered to your preferred destination
                        </p>
                      </div>
                    </div>

                    {/* Help and close actions */}
                    <div className="pt-2 flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDropOffCodeModal(false)
                          setShowReportModal(true)
                        }}
                        className="w-full py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center cursor-pointer touch-manipulation"
                      >
                        <span>Need help?</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDropOffCodeModal(false)}
                        className="w-full py-2.5 text-center text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white cursor-pointer font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

      {/* ========================================================================= */}
      {/* SCREEN 9: DELIVERY SUCCESSFUL (Matches User's Screenshot Exactly)         */}
      {/* ========================================================================= */}
      {screen === "success" &&
        (() => {
          const chosenRider = getSelectedRider()

          return (
            <div className="w-full flex-1 min-h-[100dvh] overflow-y-auto bg-white dark:bg-[#0c0c0e] rounded-none m-0 shadow-none relative select-none">
              {/* Celebration Confetti in upper half (Hardcoded Static SVG, Not Animated) */}
              <div className="absolute inset-x-0 top-0 h-64 sm:h-72 pointer-events-none overflow-hidden z-0 flex items-start justify-center">
                <ConfettiBackground className="w-full max-w-2xl h-full opacity-90" />
              </div>

              <div className="w-full min-h-[100dvh] flex flex-col justify-between px-[22px] sm:px-10 pt-[max(9rem,calc(env(safe-area-inset-top)+9rem))] pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:pt-8 sm:pb-10 relative z-10 animate-in fade-in duration-300">
                {/* Top Center: Scalloped Green Badge, Pill, Title & Subtitle */}
                <div className="flex flex-col items-center text-center shrink-0">
                  {/* Large Green Scalloped Badge with Checkmark (User's Exact Asset) */}
                  <div className="relative w-32 h-32 sm:w-32 sm:h-32 drop-shadow-[0_12px_24px_rgba(34,197,94,0.3)] animate-in zoom-in-75 duration-300 flex items-center justify-center">
                    <img
                      src={greenSuccessBadge}
                      alt="Delivery Successful"
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Payment Released Successful Pill */}
                  <div className="mt-6 px-2.5 py-1 rounded-full bg-[#DCFCE7] dark:bg-[#143320]">
                    <span className="text-[#15803D] dark:text-[#4ade80] text-[11px] sm:text-xs font-bold tracking-wider uppercase">
                      PAYMENT RELEASED SUCCESSFUL
                    </span>
                  </div>

                  {/* Congratulation */}
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-950 dark:text-white mt-6 tracking-tight">
                    Congratulation
                  </h2>

                  {/* Subtitle */}
                  <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mt-2 max-w-xs leading-relaxed">
                    Your package was delivered
                    <br />
                    successfully
                  </p>
                </div>

                {/* Middle: Total Amount Row */}
                <div className="w-full max-w-xl mx-auto flex items-center justify-between py-2 my-6 shrink-0">
                  <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                    Total Amount
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight">
                    {estimatedFee ? `₦${estimatedFee}` : "Quote unavailable"}
                  </span>
                </div>

                {/* Bottom Actions: Rating Card & Go Back Home Button */}
                <div className="w-full max-w-xl mx-auto space-y-8 shrink-0">
                  {/* Courier Experience Card */}
                  <div className="w-full bg-[#18191d] dark:bg-[#1c1d22] text-white p-4 sm:p-4.5 rounded-2xl flex items-center gap-3.5 sm:gap-4 shadow-md">
                    {/* Courier with yellow helmet & vest */}
                    <div className="w-16 h-16 sm:w-18 sm:h-18 overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={courierRatingAvatar}
                        alt="Dart Courier"
                        className="w-full h-full object-contain object-bottom"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-sm sm:text-base text-white leading-snug">
                        Are you loving your experience with us so far?
                      </h4>
                      <button
                        type="button"
                        onClick={() => setShowRatingModal(true)}
                        className="text-[#FFCC00] hover:text-[#ffd633] text-xs sm:text-sm font-semibold underline underline-offset-2 cursor-pointer mt-1 inline-block text-left"
                      >
                        Give us a Rating
                      </button>
                    </div>
                  </div>

                  {/* Go back home CTA */}
                  <button
                    type="button"
                    onClick={handleFinishSuccess}
                    className="w-full h-[58px] px-6 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                  >
                    <span>Go back home</span>
                    <span className="text-lg leading-none font-bold">→</span>
                  </button>
                </div>
              </div>

              {/* Rate Rider Modal matching screenshot */}
              <RateRiderModal
                isOpen={showRatingModal}
                onClose={() => setShowRatingModal(false)}
                riderName={chosenRider.name || "Assigned Rider"}
                onSubmit={(data) => {
                  copyToClipboard(
                    "Thank you for your rating!",
                    "Rating submitted",
                  )
                }}
              />
            </div>
          )
        })()}

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
                title="Back to delivery status"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
              </button>
              <div className="min-w-0">
                <h3 className="text-white font-bold text-sm sm:text-base leading-tight truncate">
                  {packageName || "Delivery Package"}
                </h3>
                <p className="text-[11px] text-yellow-400 font-mono mt-0.5 truncate">
                  MV324-H247P • Complete Full Package Photo
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowExpandedImage(false)}
                className="px-3 py-1.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1 active:scale-95"
                title="Close full view"
              >
                <span>Close</span>
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Center: Full Uncropped Image Showcase */}
          <div
            className="flex-1 flex items-center justify-center p-2 sm:p-4 min-h-0 w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative max-h-full max-w-full flex items-center justify-center">
              <img
                src={packagePhoto}
                alt={packageName || "Delivery Package"}
                className="max-h-[75vh] sm:max-h-[82vh] max-w-[94vw] w-auto h-auto object-contain rounded-2xl shadow-2xl ring-1 ring-white/15 animate-in zoom-in-95 duration-200 select-none"
              />
            </div>
          </div>

          {/* Bottom Bar: Instructions / Back to Status */}
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
              Back to Status →
            </button>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[250] bg-gray-900/90 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
          {copyToast}
        </div>
      )}
    </div>
  )
}
