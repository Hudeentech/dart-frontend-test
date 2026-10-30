import React, { useState, useEffect, useRef } from "react"
import {
  ArrowLeft,
  X,
  Copy,
  QrCode,
  ChevronRight,
  AlertCircle,
  FileText,
  Truck,
  Calendar,
  Clock,
  MapPin,
  Shirt,
  Check,
  Search,
  Camera,
  Image as ImageIcon,
  Zap,
  ZapOff,
  RefreshCw,
  Scan,
  CheckCircle2,
  Package,
  Tag,
  ShoppingBag,
  Store,
  Sparkles,
} from "lucide-react"
import ConfettiBackground from "./ConfettiBackground"
import courierRatingAvatar from "../assets/courier_rating_avatar.png"
import dropOffBoxGoodMark from "../assets/Good-box.svg"
import loadingBoxSvg from "../assets/loading-box.svg"
import linkedBoxSvg from "../assets/Linked-box.svg"
import PackageStateIcon from "./PackageStateIcon"
import { packagesApi } from "../api/packages.api"
import {
  cleanTrackingText,
  detectCourier,
  formatTrackingTime,
  deriveStatusFromAction,
} from "../utils/tracking"

export interface InboundPackageItem {
  id: string
  trackingId: string
  title: string
  store?: string
  category: string
  courier: string
  shippedDate: string
  estimatedArrival: string
  fromLocation: string
  toLocation: string
  status: "In-Transit" | "Pending" | "Delivered" | "Cancelled"
  tracks?: any[]
  payUrl?: string
  latestActionName?: string
  latestTime?: string
}

interface LinkInboundFlowProps {
  onBack: () => void
  onComplete: (pkg: InboundPackageItem) => void
  initialTrackingId?: string
}

const RECENT_IDS = [
  { id: "NG021358672334", time: "Live SpeedAF / Inbound" },
  { id: "MV-2312XCP", time: "Added yesterday" },
  { id: "MV-3412XCP", time: "Added 2 days ago" },
  { id: "MV-5332XCP", time: "Added 3 days ago" },
]

export default function LinkInboundFlow({
  onBack,
  onComplete,
  initialTrackingId,
}: LinkInboundFlowProps) {
  const [step, setStep] =
    useState<"input" | "scanner" | "searching" | "found" | "details" | "success">(
      initialTrackingId ? "searching" : "input",
    )
  const [trackingInput, setTrackingInput] = useState(initialTrackingId || "")
  const [isQrModalOpen, setIsQrModalOpen] = useState(false)
  const [isCopiedNotice, setIsCopiedNotice] = useState(false)
  const [isAddedSuccess, setIsAddedSuccess] = useState(false)
  const [apiRawTracks, setApiRawTracks] = useState<any[]>([])
  const [payUrl, setPayUrl] = useState<string>("")
  const [apiNotice, setApiNotice] = useState<string | null>(null)

  // Package naming & store origin modal state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false)
  const [customPackageName, setCustomPackageName] = useState("")
  const [customOrderedFrom, setCustomOrderedFrom] = useState("")

  // Camera & Scanner State
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  )
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isDetected, setIsDetected] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement | null>(null)

  // Selected or active package details
  const [packageDetails, setPackageDetails] = useState<InboundPackageItem>({
    id: "inbound-" + Date.now(),
    trackingId: initialTrackingId || "NGS213-2324-23243",
    title: "Inbound Package",
    category: "GENERAL",
    courier: "Dart Express",
    shippedDate: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    estimatedArrival: new Date(
      Date.now() + 5 * 24 * 3600 * 1000,
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    fromLocation: "Regional Distribution Hub",
    toLocation: "Akpakpava, Benin",
    status: "In-Transit",
  })

  // Stop camera helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsFlashOn(false)
  }

  // Start live camera stream
  const startCamera = async (
    targetFacing: "environment" | "user" = facingMode,
  ) => {
    try {
      setCameraError(null)
      stopCameraStream()

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError(
          "Camera preview not supported in this browser environment.",
        )
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch((err) => {
            console.warn("Video playback error:", err)
          })
        }
      }, 80)
    } catch (err: any) {
      console.warn("Camera start error:", err)
      setCameraError(
        "Camera unavailable or permission denied. You can upload an image from your gallery or tap scan.",
      )
    }
  }

  // Toggle flash
  const toggleFlash = async () => {
    const nextState = !isFlashOn
    setIsFlashOn(nextState)
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0]
      if (track) {
        try {
          const capabilities = (track.getCapabilities?.() || {}) as any
          if (capabilities.torch) {
            await (track as any).applyConstraints({
              advanced: [{ torch: nextState }],
            })
          }
        } catch (e) {
          console.warn("Flashlight not supported", e)
        }
      }
    }
  }

  // Flip front/back camera
  const flipCamera = () => {
    const nextFacing = facingMode === "environment" ? "user" : "environment"
    setFacingMode(nextFacing)
    startCamera(nextFacing)
  }

  // Lifecycle for scanner camera
  useEffect(() => {
    if (step === "scanner") {
      setIsDetected(false)
      startCamera(facingMode)
    } else {
      stopCameraStream()
    }
    return () => {
      stopCameraStream()
    }
  }, [step])

  // Handle detection from camera or gallery
  const handleScanSuccess = (code = "NGS213-2324-23243") => {
    setIsDetected(true)
    stopCameraStream()
    setTimeout(() => {
      startSearch(code)
    }, 700)
  }

  // Handle gallery file selection
  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleScanSuccess("NGS213-2324-23243")
    }
  }

  // Handle native camera capture file
  const handleCameraCaptureChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      handleScanSuccess("NGS213-2324-23243")
    }
  }

  // Handle Search Submission & Live Query from http://localhost:3000/api/track/
  const startSearch = async (code?: string) => {
    const idToSearch = (code || trackingInput || "NGS213-2324-23243").trim()
    setStep("searching")
    setApiNotice(null)

    const startTime = Date.now()

    try {
      let data: any = null
      try {
        data = await packagesApi.trackInboundPackage(idToSearch)
      } catch (apiErr) {
        // Fallback to legacy local port 3000 if available
        try {
          const res = await fetch(
            `http://localhost:3000/api/track/${encodeURIComponent(idToSearch)}`,
          )
          if (res.ok) {
            data = await res.json()
          }
        } catch {
          // Proceed to catch below
        }
      }

      // Ensure searching loading animation lasts until after the package info is fetched,
      // with a minimum smooth time of 1000ms to avoid abrupt flickers
      const elapsed = Date.now() - startTime
      const minLoadingRemaining = Math.max(0, 1000 - elapsed)
      if (minLoadingRemaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingRemaining))
      }

      if (data?.success && Array.isArray(data.data) && data.data.length > 0) {
        const item = data.data[0]
        const tracks = Array.isArray(item.tracks) ? item.tracks : []
        setApiRawTracks(tracks)
        setPayUrl(item.payUrl || "")

        // tracks[0] is the latest event, tracks[tracks.length - 1] is the earliest event
        const latestTrack = tracks.length > 0 ? tracks[0] : null
        const earliestTrack =
          tracks.length > 0 ? tracks[tracks.length - 1] : null
        const todayStr = new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })

        const derivedStatus = deriveStatusFromAction(latestTrack?.actionName)
        const courierName =
          item.courier || detectCourier(item.mailNo || idToSearch)
        const originDesc =
          cleanTrackingText(
            earliestTrack?.msgEng || earliestTrack?.actionName,
          ) ||
          (latestTrack?.receiverCountryCode
            ? `Origin Terminal (${latestTrack.receiverCountryCode})`
            : "International Sorting Center")
        const currentDesc =
          cleanTrackingText(latestTrack?.msgEng || latestTrack?.actionName) ||
          "Central Distribution Hub"
        const shippedFormatted = earliestTrack?.time
          ? formatTrackingTime(earliestTrack.time)
          : todayStr
        const lastScanFormatted = latestTrack?.time
          ? formatTrackingTime(latestTrack.time)
          : todayStr

        const eventTitle = latestTrack?.actionName
          ? `${latestTrack.actionName} - ${item.mailNo || idToSearch}`
          : `Inbound Package (${item.mailNo || idToSearch})`

        setPackageDetails({
          id: "inbound-" + Date.now(),
          trackingId: item.mailNo || idToSearch,
          title: item.title || eventTitle,
          category:
            item.category ||
            (idToSearch.toLowerCase().includes("doc")
              ? "DOCUMENTS"
              : "GENERAL"),
          courier: courierName,
          shippedDate: shippedFormatted,
          estimatedArrival: lastScanFormatted,
          fromLocation: item.origin || originDesc,
          toLocation: item.destination || currentDesc,
          status: derivedStatus,
          tracks: tracks,
          payUrl: item.payUrl || "",
          latestActionName: latestTrack?.actionName,
          latestTime: latestTrack?.time,
        })

        // Package information has been fetched -> show "Package found" state before details!
        setStep("found")
        setTimeout(() => {
          setStep("details")
        }, 1100)
      } else {
        setPackageDetails((prev) => ({
          ...prev,
          trackingId: idToSearch,
          title: `Inbound Package (${idToSearch})`,
        }))
        setStep("found")
        setTimeout(() => {
          setStep("details")
        }, 1100)
      }
    } catch (err: any) {
      console.warn(
        "Could not query http://localhost:3000/api/track/ - proceeding with local template:",
        err,
      )
      const elapsed = Date.now() - startTime
      const minLoadingRemaining = Math.max(0, 1000 - elapsed)
      if (minLoadingRemaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, minLoadingRemaining))
      }
      setApiNotice(
        "Live server lookup unreachable, package linked with specified ID",
      )
      setPackageDetails((prev) => ({
        ...prev,
        trackingId: idToSearch,
        title: `Inbound Package (${idToSearch})`,
      }))
      setStep("found")
      setTimeout(() => {
        setStep("details")
      }, 1100)
    }
  }

  useEffect(() => {
    if (initialTrackingId) {
      startSearch(initialTrackingId)
    }
  }, [initialTrackingId])

  // Clipboard Paste handler
  const handlePaste = async () => {
    try {
      if (navigator.clipboard?.readText) {
        const text = await navigator.clipboard.readText()
        if (text) {
          setTrackingInput(text.trim())
          setIsCopiedNotice(true)
          setTimeout(() => setIsCopiedNotice(false), 1500)
          return
        }
      }
    } catch {
      // Fallback
    }
    setTrackingInput("MV-2312XCP")
    setIsCopiedNotice(true)
    setTimeout(() => setIsCopiedNotice(false), 1500)
  }

  // Handle finalize addition -> prompt user for name & where ordered
  const handleAddPackage = () => {
    // If not customized yet, initialize inputs from current details
    if (!customPackageName) {
      if (
        packageDetails.title &&
        !packageDetails.title.startsWith("Inbound Package")
      ) {
        setCustomPackageName(packageDetails.title)
      }
    }
    if (!customOrderedFrom && packageDetails.store) {
      setCustomOrderedFrom(packageDetails.store)
    }
    setIsNameModalOpen(true)
  }

  // Confirm custom name & store and proceed to success
  const handleConfirmNameAndSave = () => {
    const finalTitle =
      customPackageName.trim() || packageDetails.title || "Inbound Package"
    const finalStore = customOrderedFrom.trim() || packageDetails.store || ""

    const updated = {
      ...packageDetails,
      title: finalTitle,
      store: finalStore,
    }
    setPackageDetails(updated)
    packagesApi.linkInboundPackage(updated).catch((err) => {
      console.warn("Inbound package auto-persist note:", err)
    })
    setIsNameModalOpen(false)
    setIsAddedSuccess(true)
    setStep("success")
  }

  // Skip naming and proceed with defaults
  const handleSkipNaming = () => {
    packagesApi.linkInboundPackage(packageDetails).catch((err) => {
      console.warn("Inbound package auto-persist note:", err)
    })
    setIsNameModalOpen(false)
    setIsAddedSuccess(true)
    setStep("success")
  }

  // ----------------------------------------------------
  // SCREEN: LIVE CAMERA / GALLERY QR CODE SCANNER
  // ----------------------------------------------------
  if (step === "scanner") {
    return (
      <div className="w-full max-w-xl mx-auto flex-1 flex flex-col min-h-screen bg-[#0c0c0e] text-white relative select-none overflow-hidden animate-in fade-in duration-200">
        <style>{`
          @keyframes scannerLaser {
            0% { top: 6%; opacity: 0.8; }
            50% { top: 88%; opacity: 1; }
            100% { top: 6%; opacity: 0.8; }
          }
          .animate-scanner-laser {
            animation: scannerLaser 2.2s ease-in-out infinite;
          }
        `}</style>

        {/* Top Floating Control Bar */}
        <div className="w-full px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between z-30 bg-gradient-to-b from-black/80 to-transparent">
          <button
            onClick={() => {
              stopCameraStream()
              setStep("input")
            }}
            className="w-10 h-10 -ml-2 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer"
            title="Back to search"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <span className="text-sm sm:text-base font-bold tracking-tight text-white/90">
            Scan QR Code
          </span>

          <div className="flex items-center gap-2">
            {/* Flash Toggle */}
            <button
              onClick={toggleFlash}
              className={`w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer ${
                isFlashOn
                  ? "bg-yellow-400 text-black shadow-[0_0_12px_#facc15]"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title="Toggle Flash"
            >
              {isFlashOn ? (
                <Zap className="w-5 h-5 fill-current" />
              ) : (
                <ZapOff className="w-5 h-5" />
              )}
            </button>

            {/* Flip Camera */}
            <button
              onClick={flipCamera}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Flip Camera"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Viewfinder Center Area */}
        <div className="flex-1 relative flex flex-col items-center justify-center px-6">
          {/* Background Live Video Feed */}
          <div className="absolute inset-0 z-0 overflow-hidden bg-black flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover opacity-80"
            />
            {/* Subtle grid pattern when video is dark or simulated */}
            <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />
          </div>

          {/* Dark Vignette Overlay Mask */}
          <div className="absolute inset-0 bg-black/40 pointer-events-none z-10" />

          {/* Scanner Targeting Frame */}
          <div
            onClick={() => handleScanSuccess()}
            className={`relative z-20 w-64 h-64 sm:w-72 sm:h-72 rounded-3xl overflow-hidden border-2 transition-all duration-300 backdrop-blur-[1px] cursor-pointer ${
              isDetected
                ? "border-emerald-400 shadow-[0_0_24px_rgba(52,211,153,0.6)]"
                : "border-white/20 shadow-2xl"
            }`}
          >
            {/* Corner Markers in Dart Yellow */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-2xl pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-2xl pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-2xl pointer-events-none" />

            {/* Sweeping Laser Line */}
            {!isDetected && (
              <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent shadow-[0_0_14px_#facc15] animate-scanner-laser pointer-events-none" />
            )}

            {/* Detection Overlay feedback */}
            {isDetected && (
              <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-xs flex flex-col items-center justify-center text-emerald-400 animate-in zoom-in-95 duration-200">
                <CheckCircle2 className="w-12 h-12 stroke-[2.2] animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wider mt-2 text-white bg-black/60 px-3 py-1 rounded-full">
                  QR Code Detected
                </span>
              </div>
            )}
          </div>

          {/* Helper instructions text */}
          <div className="relative z-20 mt-6 text-center max-w-xs px-4">
            <p className="text-sm font-medium text-white/90 drop-shadow-md">
              Align the QR code within the frame to scan automatically
            </p>
            {cameraError && (
              <p className="text-xs text-yellow-400/90 mt-2 bg-black/60 px-3 py-1.5 rounded-xl backdrop-blur-sm">
                {cameraError}
              </p>
            )}
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="w-full px-6 pt-4 pb-[max(2rem,calc(env(safe-area-inset-bottom,0px)+1rem))] bg-gradient-to-t from-black via-black/90 to-transparent relative z-30 flex flex-col items-center gap-4">
          <div className="w-full flex items-center justify-between gap-4 max-w-md">
            {/* Gallery Upload Option */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-white/10 hover:bg-white/20 active:scale-98 border border-white/10 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-2 backdrop-blur-md transition-all cursor-pointer touch-manipulation"
            >
              <ImageIcon className="w-4 h-4 text-yellow-400" />
              <span>Upload from gallery</span>
            </button>

            {/* Native Camera Trigger / Tap to Scan */}
            <button
              type="button"
              onClick={() => {
                if (cameraError && cameraInputRef.current) {
                  cameraInputRef.current.click()
                } else {
                  handleScanSuccess()
                }
              }}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 active:scale-98 text-black font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer touch-manipulation"
            >
              <Camera className="w-4 h-4" />
              <span>Tap to scan</span>
            </button>
          </div>

          {/* Hidden File Inputs for native gallery and camera */}
          <input
            type="file"
            ref={galleryInputRef}
            accept="image/*"
            onChange={handleGalleryChange}
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            accept="image/*"
            capture="environment"
            onChange={handleCameraCaptureChange}
            className="hidden"
          />
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // SCREEN 2: SEARCHING LOADER (Box & Magnifying Glass)
  // ----------------------------------------------------
  if (step === "searching") {
    return (
      <div className="w-full min-h-[92dvh] flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0c0c0e] text-center select-none animate-in fade-in duration-300">
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
          {/* Animated Glow Halo */}
          <div className="absolute inset-0 bg-yellow-400/15 dark:bg-yellow-400/10 rounded-full blur-2xl animate-pulse" />

          {/* Loading Box Graphic */}
          <img
            src={loadingBoxSvg}
            alt="Searching for package"
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-md select-none relative z-10 animate-pulse"
          />
        </div>

        {/* Text */}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-8 mb-2 tracking-tight">
          Searching for package
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
          Please wait while we fetch the package details
        </p>
      </div>
    )
  }

  // ----------------------------------------------------
  // SCREEN: PACKAGE FOUND NOTIFICATION STATE
  // ----------------------------------------------------
  if (step === "found") {
    return (
      <div className="w-full min-h-[92dvh] flex flex-col items-center justify-center px-4 bg-white dark:bg-[#0c0c0e] text-center select-none animate-in fade-in zoom-in-95 duration-300">
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 flex items-center justify-center">
          {/* Animated Glow Halo */}
          <div className="absolute inset-0 bg-emerald-500/15 dark:bg-emerald-500/10 rounded-full blur-2xl animate-pulse" />

          {/* Package Found Graphic with Checkmark */}
          <img
            src={dropOffBoxGoodMark}
            alt="Package Found"
            className="w-36 h-36 sm:w-44 sm:h-44 object-contain drop-shadow-md select-none relative z-10 animate-in zoom-in-90 duration-300"
          />
        </div>

        {/* Status Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mt-6 mb-2">
          <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Package Found</span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
          {packageDetails.latestActionName || "Shipment Located"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mt-1">
          {packageDetails.courier} •{" "}
          <span className="font-mono font-medium">
            {packageDetails.trackingId}
          </span>
        </p>
      </div>
    )
  }

  // ----------------------------------------------------
  // SCREEN 3: PACKAGE DETAILS (Review & Add)
  // ----------------------------------------------------
  if (step === "details") {
    return (
      <div className="w-full flex-1 flex flex-col min-h-full bg-[#fcfcfc] dark:bg-[#0c0c0e] pb-12 transition-colors">
        {/* Top Header */}
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between sticky top-0 z-20 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md">
          <button
            onClick={() => setStep("input")}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
            title="Back to search"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </button>
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-gray-200/80 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4 stroke-[2.2]" />
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
              Review the details before adding to your packages.
            </p>
          </div>

          {/* Card 1: Item & Category Summary */}
          <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4">
            {/* Linked Box Illustration Badge */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-yellow-50 dark:bg-white/5 border border-yellow-100 dark:border-white/5 flex items-center justify-center shrink-0 p-2.5">
              <img
                src={linkedBoxSvg}
                alt="Package Found"
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              {/* Category & Live Status Badge */}
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-yellow-400 text-black text-[11px] font-bold uppercase tracking-wider shadow-2xs">
                  <Package className="w-3.5 h-3.5 stroke-[2.2]" />
                  <span>{packageDetails.category}</span>
                </span>
                {packageDetails.store && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-400/10 text-yellow-800 dark:text-yellow-300 text-[10px] font-bold uppercase tracking-wider border border-yellow-200/60 dark:border-yellow-400/20">
                    From {packageDetails.store}
                  </span>
                )}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    packageDetails.status === "Delivered"
                      ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                      : "bg-yellow-100 dark:bg-yellow-400/20 text-yellow-800 dark:text-yellow-400"
                  }`}
                >
                  {packageDetails.latestActionName || packageDetails.status}
                </span>
              </div>
              <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                {packageDetails.title}
              </h3>
              <p className="font-mono text-xs text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                {packageDetails.trackingId}
              </p>
            </div>
          </div>

          {/* Card 2: Tracking Route Stepper */}
          <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col gap-6 relative">
              {/* Origin Node */}
              <div className="flex items-start gap-3.5">
                <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-500 dark:border-yellow-300 shrink-0 mt-0.5 shadow-2xs" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 block">
                      INBOUND ORIGIN
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                    {packageDetails.fromLocation}
                  </p>
                </div>
              </div>

              {/* Connecting Vertical Dashed Line */}
              <div className="absolute left-2.5 top-5 bottom-5 w-px border-l-2 border-dashed border-gray-300 dark:border-gray-700 -translate-x-1/2" />

              {/* Destination / Current Node */}
              <div className="flex items-start gap-3.5">
                <div className="w-5 h-5 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 fill-red-500/20 stroke-red-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-yellow-600 dark:text-yellow-400 block">
                      CURRENT STATION / DROP-OFF
                    </span>
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white mt-0.5">
                    {packageDetails.toLocation}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3: Courier Shipping Metadata */}
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
                {packageDetails.courier}
              </span>
            </div>

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
                {packageDetails.shippedDate}
              </span>
            </div>

            {/* Last Scanned / Status Time */}
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
                {packageDetails.estimatedArrival}
              </span>
            </div>
          </div>

          {/* Pay Customs / Duty URL Notice from API if available */}
          {payUrl && (
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
                href={payUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs transition-all shrink-0 shadow-xs"
              >
                Pay Now
              </a>
            </div>
          )}

          {/* Real-time Tracking Events from API */}
          {apiRawTracks && apiRawTracks.length > 0 && (
            <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Tracking Updates ({apiRawTracks.length})
                </h4>
                <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full">
                  Live API
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {apiRawTracks.map((tr, idx) => {
                  const eventTitle =
                    tr.actionName ||
                    tr.context ||
                    tr.description ||
                    tr.status ||
                    "Status Update"
                  const eventDetail = tr.msgEng
                    ? tr.msgEng.replace(/\?/g, " ").trim()
                    : tr.message || ""
                  return (
                    <div key={idx} className="flex items-start gap-3 text-xs">
                      <div
                        className={`w-3 h-3 rounded-full mt-1 shrink-0 ${
                          idx === 0
                            ? "bg-yellow-400 ring-4 ring-yellow-400/25 animate-pulse"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900 dark:text-white">
                            {eventTitle}
                          </p>
                          {tr.time && (
                            <span className="text-gray-400 dark:text-gray-500 text-[11px] shrink-0 font-mono">
                              {tr.time}
                            </span>
                          )}
                        </div>
                        {eventDetail && eventDetail !== eventTitle && (
                          <p className="text-gray-600 dark:text-gray-300 text-xs mt-1 leading-relaxed">
                            {eventDetail}
                          </p>
                        )}
                        {(tr.scanSource || tr.location) && (
                          <span className="text-gray-400 dark:text-gray-500 text-[11px] block mt-1">
                            {tr.location ? `📍 ${tr.location}` : ""}{" "}
                            {tr.scanSource ? `• Source: ${tr.scanSource}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-4 pb-6 mt-auto">
            <button
              type="button"
              onClick={handleAddPackage}
              className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 active:scale-[0.99] text-black font-bold text-base transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <Package className="w-5 h-5 stroke-[2.2]" />
              <span>Add to My Packages</span>
            </button>
            <button
              type="button"
              onClick={onBack}
              className="w-full py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-[0.99] text-gray-900 dark:text-white font-semibold text-base transition-colors cursor-pointer touch-manipulation text-center"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* ---------------------------------------------------- */}
        {/* NAME YOUR PACKAGE & STORE MODAL                      */}
        {/* ---------------------------------------------------- */}
        {isNameModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
              onClick={() => setIsNameModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            />

            {/* Modal Container */}
            <div
              className="w-full sm:max-w-lg bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 border-t sm:border border-gray-100 dark:border-white/10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 ease-out flex flex-col max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag handle for mobile view */}
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-3 sm:hidden shrink-0" />

              {/* Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center text-yellow-600 dark:text-yellow-400 shrink-0">
                    <Tag className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white leading-tight">
                      Name your package
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Remember what it is & where it was ordered
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNameModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Fields */}
              <div className="flex flex-col gap-4">
                {/* Field 1: What is this package? */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <span>What is in this package?</span>
                    <span className="text-yellow-500 font-bold">*</span>
                  </label>
                  <div className="flex items-center bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-yellow-400/50 focus-within:border-yellow-400 transition-all">
                    <Package className="w-4.5 h-4.5 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={customPackageName}
                      onChange={(e) => setCustomPackageName(e.target.value)}
                      placeholder="e.g. Nike Air Force 1, Laptop Charger, Dress"
                      className="flex-1 bg-transparent border-none text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleConfirmNameAndSave()
                        }
                      }}
                    />
                    {customPackageName && (
                      <button
                        type="button"
                        onClick={() => setCustomPackageName("")}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white ml-2 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Field 2: Where was it ordered? */}
                <div className="space-y-1.5">
                  <label className="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4 text-yellow-500" />
                    <span>Where did you order it from?</span>
                  </label>
                  <div className="flex items-center bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 focus-within:ring-2 focus-within:ring-yellow-400/50 focus-within:border-yellow-400 transition-all">
                    <Store className="w-4.5 h-4.5 text-gray-400 mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={customOrderedFrom}
                      onChange={(e) => setCustomOrderedFrom(e.target.value)}
                      placeholder="e.g. AliExpress, Amazon, Shein, Apple"
                      className="flex-1 bg-transparent border-none text-sm sm:text-base text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleConfirmNameAndSave()
                        }
                      }}
                    />
                    {customOrderedFrom && (
                      <button
                        type="button"
                        onClick={() => setCustomOrderedFrom("")}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-white ml-2 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Popular Store Pills */}
                  <div className="pt-1">
                    <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500 mb-1.5">
                      Quick select store:
                    </p>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {[
                        "AliExpress",
                        "Amazon",
                        "Shein",
                        "Taobao",
                        "Apple",
                        "Zara",
                        "eBay",
                        "ASOS",
                      ].map((storeName) => {
                        const isSelected =
                          customOrderedFrom.toLowerCase() ===
                          storeName.toLowerCase()
                        return (
                          <button
                            key={storeName}
                            type="button"
                            onClick={() =>
                              setCustomOrderedFrom(isSelected ? "" : storeName)
                            }
                            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer touch-manipulation ${
                              isSelected
                                ? "bg-yellow-400 text-black font-bold shadow-xs scale-105"
                                : "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200/60 dark:border-white/5"
                            }`}
                          >
                            {storeName}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Live Waybill Preview Snippet */}
                <div className="bg-yellow-50/70 dark:bg-yellow-400/5 border border-yellow-200/70 dark:border-yellow-400/15 rounded-2xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 flex items-center justify-center font-bold text-xs">
                      #
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        Tracking ID
                      </p>
                      <p className="text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {packageDetails.trackingId}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-yellow-700 dark:text-yellow-400 bg-yellow-400/20 px-2 py-0.5 rounded-full">
                    {packageDetails.courier}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={handleConfirmNameAndSave}
                  className="w-full py-3.5 sm:py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 active:scale-[0.99] text-black font-bold text-sm sm:text-base transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                  <span>Save & Add to My Packages</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipNaming}
                  className="w-full py-2.5 rounded-xl text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white font-medium text-xs sm:text-sm transition-colors cursor-pointer text-center"
                >
                  Skip & Keep Default Name
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ----------------------------------------------------
  // SCREEN: PACKAGE LINKED SUCCESSFULLY (Success Screen)
  // ----------------------------------------------------
  if (step === "success") {
    return (
      <div className="w-full flex-1 flex flex-col min-h-screen bg-white dark:bg-[#0c0c0e] relative select-none overflow-hidden animate-in fade-in duration-300">
        {/* Celebration Confetti in top half (Hardcoded Static SVG) */}
        <div className="absolute top-0 left-0 right-0 h-72 sm:h-80 pointer-events-none overflow-hidden z-0 flex justify-center opacity-95">
          <ConfettiBackground />
        </div>

        {/* Content Container */}
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-[max(2rem,calc(env(safe-area-inset-top,0px)+1rem))] pb-8 flex-1 flex flex-col items-center justify-between relative z-10">
          <div className="w-full flex flex-col items-center">
            {/* 3D Delivery Box with Cyan Checkmark Badge (drop_off_box_good_mark) */}
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center mt-3 sm:mt-5">
              <img
                src={dropOffBoxGoodMark}
                alt="Package linked successfully"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain drop-shadow-sm animate-in zoom-in-95 duration-300"
              />
            </div>

            {/* Header Titles */}
            <h1 className="text-2xl sm:text-[28px] font-bold text-gray-900 dark:text-white tracking-tight mt-6 text-center">
              Package linked successfully!
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1.5 text-center max-w-xs">
              You can now track this package in your dashboard
            </p>

            {/* Package Summary Card */}
            <div className="w-full bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/10 rounded-2xl p-4 sm:p-4.5 shadow-xs flex items-center gap-3.5 mt-6">
              <div className="w-12 h-12 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center shrink-0 p-1.5">
                <PackageStateIcon
                  status={packageDetails.status || "In-Transit"}
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white truncate">
                    {packageDetails.title}
                  </h3>
                  {packageDetails.store && (
                    <span className="px-2 py-0.5 rounded-md bg-yellow-400/20 text-yellow-800 dark:text-yellow-300 text-xs font-semibold">
                      From {packageDetails.store}
                    </span>
                  )}
                </div>
                <p className="font-mono text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                  {packageDetails.trackingId} • {packageDetails.courier}
                </p>
              </div>
            </div>

            {/* Experience Rating Banner Card */}
            <div className="w-full bg-[#181920] dark:bg-[#151518] rounded-2xl p-3 sm:p-4 text-white flex items-center gap-3.5 mt-4 shadow-sm overflow-hidden">
              <div className="w-16 h-16 sm:w-18 sm:h-18 shrink-0 relative overflow-hidden flex items-center justify-center">
                <img
                  src={courierRatingAvatar}
                  alt="Dart Courier"
                  className="w-full h-full object-contain object-bottom"
                />
              </div>
              <div className="min-w-0 flex-1 pr-1">
                <h4 className="font-bold text-sm sm:text-base text-white leading-snug">
                  Are you loving your experience with us so far?
                </h4>
                <a
                  href="#rate"
                  onClick={(e) => {
                    e.preventDefault()
                  }}
                  className="text-xs sm:text-sm text-yellow-400 font-semibold underline underline-offset-2 hover:text-yellow-300 mt-1 inline-block cursor-pointer"
                >
                  Give us a Rating
                </a>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full flex flex-col gap-3 pt-6 mt-6">
            <button
              type="button"
              onClick={() => onComplete(packageDetails)}
              className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 active:scale-[0.99] text-black font-bold text-base transition-all shadow-sm flex items-center justify-center cursor-pointer touch-manipulation"
            >
              View My Packages
            </button>
            <button
              type="button"
              onClick={() => onComplete(packageDetails)}
              className="w-full py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 active:scale-[0.99] text-gray-900 dark:text-white font-semibold text-base transition-colors cursor-pointer touch-manipulation text-center"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ----------------------------------------------------
  // SCREEN 1: INPUT & SEARCH SCREEN
  // ----------------------------------------------------
  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-[#fcfcfc] dark:bg-[#0c0c0e] pb-12 transition-colors">
      {/* Top Header */}
      <div className="w-full max-w-xl mx-auto px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between sticky top-0 z-20 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md">
        <button
          onClick={onBack}
          className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
          title="Go back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
        </button>
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-gray-200/80 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 flex items-center justify-center text-gray-700 dark:text-gray-200 transition-colors cursor-pointer"
          title="Close"
        >
          <X className="w-4 h-4 stroke-[2.2]" />
        </button>
      </div>

      <div className="w-full max-w-xl mx-auto px-4 sm:px-6 flex flex-col gap-5 flex-1">
        {/* Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
            Link your inbound package
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            Add a tracking ID to see details and track in your dashboard.
          </p>
        </div>

        {/* Tracking Input Card with Divider & Paste Button */}
        <div className="flex items-center bg-white dark:bg-[#18181b] border border-gray-200/80 dark:border-white/10 rounded-2xl px-4 py-3.5 shadow-2xs focus-within:ring-2 focus-within:ring-yellow-400/50 focus-within:border-yellow-400 transition-all">
          <input
            type="text"
            value={trackingInput}
            onChange={(e) => setTrackingInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && trackingInput.trim()) {
                startSearch()
              }
            }}
            placeholder="Enter or paste Tracking ID"
            className="flex-1 bg-transparent border-none text-sm sm:text-base font-normal text-gray-900 dark:text-white placeholder:font-light placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
          />

          {/* Divider */}
          <div className="h-6 w-px bg-gray-200 dark:bg-white/10 mx-2.5 shrink-0" />

          {/* Paste Button */}
          <button
            type="button"
            onClick={handlePaste}
            className="flex items-center gap-1 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer shrink-0"
          >
            {isCopiedNotice ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                Pasted!
              </span>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gray-400" />
                <span>Paste</span>
              </>
            )}
          </button>
        </div>

        {/* Submit button if user entered something */}
        {trackingInput.trim() && (
          <button
            type="button"
            onClick={() => startSearch()}
            className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm sm:text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span>Search Package</span>
          </button>
        )}

        {/* Or Divider */}
        <div className="flex items-center gap-3 my-1">
          <div className="h-px bg-gray-200 dark:bg-white/10 flex-1" />
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
            Or
          </span>
          <div className="h-px bg-gray-200 dark:bg-white/10 flex-1" />
        </div>

        {/* Scan QR Code Card */}
        <div
          onClick={() => setIsQrModalOpen(true)}
          className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-yellow-50/50 dark:hover:bg-yellow-400/5 hover:border-yellow-300/80 dark:hover:border-yellow-400/30 transition-all cursor-pointer group shadow-2xs touch-manipulation"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 flex items-center justify-center text-gray-800 dark:text-gray-100 shrink-0 group-hover:scale-105 transition-transform">
              <QrCode className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <h4 className="font-bold text-base text-gray-900 dark:text-white">
                Scan QR Code
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                From shipping receipt
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
        </div>

        {/* Tracking ID format notice banner */}
        <div className="bg-[#FFF9E6] dark:bg-yellow-400/10 border border-yellow-200/80 dark:border-yellow-400/20 rounded-2xl p-4 flex items-start gap-3 shadow-2xs">
          <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-500 shrink-0 mt-0.5">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
            <p className="text-gray-600 dark:text-gray-400">
              Tracking ID usually looks like:
            </p>
            <p className="font-bold text-gray-950 dark:text-white text-xs sm:text-sm mt-0.5">
              MV-2312XCP or 1234-ABCD-5678
            </p>
          </div>
        </div>

        {/* Recent IDs Section */}
        <div className="mt-2">
          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-3">
            Recent IDs
          </h3>
          <div className="bg-white dark:bg-[#18181b] border border-gray-100 dark:border-white/5 rounded-2xl divide-y divide-gray-100 dark:divide-white/5 shadow-2xs overflow-hidden">
            {RECENT_IDS.map((item) => (
              <div
                key={item.id}
                onClick={() => startSearch(item.id)}
                className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer group touch-manipulation"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                    <FileText className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                      {item.id}
                    </h4>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {item.time}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SCAN QR CODE MODAL (Matches Screen 2)                */}
      {/* ---------------------------------------------------- */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            onClick={() => setIsQrModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          {/* Modal Container */}
          <div
            className="w-full max-w-sm bg-white dark:bg-[#18181b] rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 ease-out text-center flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header */}
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-1">
              Scan QR Code
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-6">
              Click on continue to scan qr code
            </p>

            {/* QR Code Graphic Frame */}
            <div className="w-48 h-48 sm:w-56 sm:h-56 p-4 rounded-3xl border border-gray-200 dark:border-white/10 bg-white flex items-center justify-center shadow-xs mb-6">
              <svg
                className="w-full h-full text-black"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                {/* QR Corner Markers */}
                <rect
                  x="5"
                  y="5"
                  width="28"
                  height="28"
                  rx="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                />
                <rect
                  x="12"
                  y="12"
                  width="14"
                  height="14"
                  rx="2"
                  fill="currentColor"
                />

                <rect
                  x="67"
                  y="5"
                  width="28"
                  height="28"
                  rx="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                />
                <rect
                  x="74"
                  y="12"
                  width="14"
                  height="14"
                  rx="2"
                  fill="currentColor"
                />

                <rect
                  x="5"
                  y="67"
                  width="28"
                  height="28"
                  rx="6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="5"
                />
                <rect
                  x="12"
                  y="74"
                  width="14"
                  height="14"
                  rx="2"
                  fill="currentColor"
                />

                {/* QR Pattern Blocks */}
                <rect x="38" y="10" width="6" height="6" />
                <rect x="50" y="8" width="8" height="6" />
                <rect x="38" y="24" width="18" height="6" />
                <rect x="42" y="36" width="16" height="6" />
                <rect x="10" y="38" width="8" height="6" />
                <rect x="24" y="46" width="10" height="6" />
                <rect x="67" y="38" width="8" height="8" />
                <rect x="80" y="44" width="14" height="6" />
                <rect x="38" y="50" width="8" height="14" />
                <rect x="52" y="52" width="10" height="8" />
                <rect x="68" y="56" width="12" height="6" />
                <rect x="42" y="70" width="8" height="8" />
                <rect x="56" y="68" width="14" height="6" />
                <rect x="76" y="70" width="18" height="8" />
                <rect x="38" y="84" width="14" height="8" />
                <rect x="58" y="82" width="10" height="10" />
                <rect x="74" y="86" width="8" height="8" />
              </svg>
            </div>

            {/* "Got it" Button */}
            <button
              type="button"
              onClick={() => {
                setIsQrModalOpen(false)
                setStep("scanner")
              }}
              className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm sm:text-base transition-colors shadow-xs cursor-pointer touch-manipulation"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
