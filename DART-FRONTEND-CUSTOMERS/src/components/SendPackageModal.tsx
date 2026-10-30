import React, { useEffect, useRef, useState } from "react"
import {
  X,
  Camera,
  RotateCcw,
  Check,
  RefreshCw,
  Image as ImageIcon,
  Zap,
  SunMedium,
  Scan,
  Smartphone,
} from "lucide-react"

interface SendPackageModalProps {
  isOpen: boolean
  initialMode?: "prompt" | "camera"
  onClose: () => void
  onPhotoConfirmed?: (photo: { file?: File; previewUrl: string }) => void
  onImageSelected?: (file: File) => void
}

type ModalMode = "prompt" | "camera" | "preview"

export default function SendPackageModal({
  isOpen,
  initialMode = "prompt",
  onClose,
  onPhotoConfirmed,
  onImageSelected,
}: SendPackageModalProps) {
  const [mode, setMode] = useState<ModalMode>(initialMode)
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  )
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [isFlashOn, setIsFlashOn] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedImage, setCapturedImage] = useState<{
    file: File
    previewUrl: string
  } | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  // Stop camera helper
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsFlashOn(false)
  }

  // Toggle flash/torch if supported
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
          console.warn("Torch constraint not supported on this device/track", e)
        }
      }
    }
  }

  // Reset or start camera on open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden"
      setCameraError(null)
      if (initialMode === "camera") {
        startCamera()
      } else {
        setMode("prompt")
      }
    } else {
      document.body.style.overflow = ""
      stopCameraStream()
      if (capturedImage?.previewUrl) {
        URL.revokeObjectURL(capturedImage.previewUrl)
        setCapturedImage(null)
      }
    }
    return () => {
      document.body.style.overflow = ""
      stopCameraStream()
    }
  }, [isOpen, initialMode])

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream()
      if (capturedImage?.previewUrl) {
        URL.revokeObjectURL(capturedImage.previewUrl)
      }
    }
  }, [capturedImage])

  if (!isOpen) return null

  // Start live camera stream
  const startCamera = async (
    targetFacing: "environment" | "user" = facingMode,
  ) => {
    try {
      setIsStartingCamera(true)
      setCameraError(null)
      stopCameraStream()

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Direct camera not supported on this browser.")
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setMode("camera")

      // Attach stream to video when element is mounted
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch((err) => {
            console.warn("Video play error:", err)
          })
        }
      }, 50)
    } catch (err: any) {
      console.warn("Camera stream launch error:", err)
      // Fallback to native OS camera file picker
      if (cameraInputRef.current) {
        cameraInputRef.current.click()
      } else {
        setCameraError(
          "Camera unavailable. Please choose from gallery or allow camera permissions.",
        )
      }
    } finally {
      setIsStartingCamera(false)
    }
  }

  // Switch front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment"
    setFacingMode(nextMode)
    startCamera(nextMode)
  }

  // Snap photo from video frame
  const snapPhoto = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], `package-photo-${Date.now()}.jpg`, {
            type: "image/jpeg",
          })
          const previewUrl = URL.createObjectURL(blob)
          setCapturedImage({ file, previewUrl })
          stopCameraStream()
          setMode("preview")
        }
      },
      "image/jpeg",
      0.92,
    )
  }

  // Handle native file picker / camera input -> complete selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const previewUrl = URL.createObjectURL(file)
      onPhotoConfirmed?.({ file, previewUrl })
      onImageSelected?.(file)
      stopCameraStream()
      onClose()
    }
  }

  // Confirm photo from in-app camera -> complete selection
  const confirmPhoto = () => {
    if (capturedImage) {
      onPhotoConfirmed?.(capturedImage)
      onImageSelected?.(capturedImage.file)
      stopCameraStream()
      onClose()
    }
  }

  // Retake photo
  const retakePhoto = () => {
    if (capturedImage?.previewUrl) {
      URL.revokeObjectURL(capturedImage.previewUrl)
      setCapturedImage(null)
    }
    startCamera(facingMode)
  }

  const handleClose = () => {
    stopCameraStream()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Hidden File Inputs (Native OS camera capture & Gallery picker) */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* VIEW 1: Initial Prompt Modal ("Select or take a picture of your package") */}
      {mode === "prompt" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-full sm:max-w-[540px] md:max-w-[620px] bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-[32px] p-6 sm:p-8 md:p-9 border border-gray-100 dark:border-white/10 shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 ease-out transition-colors max-h-[92dvh] overflow-y-auto pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-8"
        >
          {/* Pull handle bar for mobile */}
          <div
            className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-5 sm:hidden cursor-pointer"
            onClick={handleClose}
          />

          {/* Header Row: Title & Close Button */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="text-xl sm:text-[22px] font-bold text-gray-900 dark:text-white tracking-tight leading-snug">
              Select or take a picture of your package
            </h2>

            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer shrink-0 -mr-1 -mt-0.5"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-normal leading-relaxed">
            Follow these simple steps for a smooth verification
          </p>

          {/* Accepted Formats Dashed Box */}
          <div className="border border-dashed border-gray-200 dark:border-white/15 rounded-2xl py-4 px-4 text-center bg-gray-50/40 dark:bg-white/5 mb-6">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Accepted formats
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-400 mt-1 font-normal">
              JPG, PNG or PDF • Max 12MB
            </p>
          </div>

          {/* Optional Error Notice */}
          {cameraError && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
              {cameraError}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            {/* Got it, take a picture (Solid Yellow) */}
            <button
              onClick={() => startCamera()}
              disabled={isStartingCamera}
              className="w-full sm:flex-1 py-4 px-5 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.99] text-gray-950 font-bold text-sm sm:text-base transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer touch-manipulation disabled:opacity-75"
            >
              <Camera className="w-5 h-5" />
              <span>
                {isStartingCamera
                  ? "Starting camera..."
                  : "Got it, take a picture"}
              </span>
            </button>

            {/* Choose from gallery (Outlined) */}
            <button
              onClick={() => galleryInputRef.current?.click()}
              className="w-full sm:flex-1 py-4 px-5 rounded-2xl border border-gray-900 dark:border-white text-gray-900 dark:text-white font-bold text-sm sm:text-base hover:bg-gray-50 dark:hover:bg-white/5 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
            >
              <ImageIcon className="w-5 h-5" />
              <span>Choose from gallery</span>
            </button>
          </div>
        </div>
      )}

      {/* VIEW 2: Live In-App Camera Viewfinder */}
      {mode === "camera" && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[80] sm:relative sm:inset-auto sm:z-10 w-full h-full sm:h-auto sm:max-w-[560px] md:max-w-[640px] bg-[#121214] text-white sm:rounded-[36px] sm:border sm:border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between animate-in slide-in-from-bottom duration-300 ease-out select-none"
          style={{ maxHeight: "100dvh" }}
        >
          {/* Top Bar Overlay */}
          <div className="flex items-center justify-between px-5 sm:px-7 pt-[max(1.25rem,env(safe-area-inset-top,1rem))] pb-3 shrink-0">
            {/* Flash / Torch Toggle */}
            <button
              type="button"
              onClick={toggleFlash}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                isFlashOn
                  ? "bg-[#FFCC00] text-black shadow-lg shadow-[#FFCC00]/30"
                  : "bg-white/10 hover:bg-white/15 text-white backdrop-blur-md"
              }`}
              title="Toggle Flash"
            >
              <Zap className={`w-5 h-5 ${isFlashOn ? "fill-black" : ""}`} />
            </button>

            {/* Title & Subtitle */}
            <div className="text-center px-2">
              <h2 className="text-lg sm:text-[19px] font-bold text-white tracking-tight leading-tight">
                Snap your package
              </h2>
              <p className="text-xs sm:text-[13px] text-gray-300 font-normal mt-0.5">
                Make sure its clearly visible
              </p>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                stopCameraStream()
                setMode("prompt")
              }}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md flex items-center justify-center text-white transition-colors cursor-pointer"
              title="Close camera"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Central Rounded Camera Viewport */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-2 min-h-0">
            <div className="relative w-full max-w-[360px] sm:max-w-[460px] md:max-w-[500px] aspect-[4/4.5] sm:aspect-square rounded-[32px] overflow-hidden bg-neutral-900 shadow-2xl border border-white/10 flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Subtle Scanning Guideline */}
              <div className="absolute inset-0 pointer-events-none rounded-[32px] ring-1 ring-inset ring-white/15" />
            </div>
          </div>

          {/* Guidance Tips Card: Good lighting, All sides visible, No blur */}
          <div className="px-5 sm:px-8 py-2 shrink-0">
            <div className="max-w-[360px] sm:max-w-[460px] md:max-w-[500px] mx-auto bg-neutral-900/90 border border-white/10 rounded-2xl py-3 px-4 flex items-center justify-between text-center backdrop-blur-md">
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <SunMedium className="w-4 h-4 text-gray-300 stroke-[2]" />
                <span className="text-[11px] text-gray-300 font-medium tracking-tight">
                  Good lighting
                </span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <Scan className="w-4 h-4 text-gray-300 stroke-[2]" />
                <span className="text-[11px] text-gray-300 font-medium tracking-tight">
                  All sides visible
                </span>
              </div>
              <div className="w-[1px] h-6 bg-white/10" />
              <div className="flex-1 flex flex-col items-center gap-1.5">
                <Smartphone className="w-4 h-4 text-gray-300 stroke-[2]" />
                <span className="text-[11px] text-gray-300 font-medium tracking-tight">
                  No blur
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Shutter Controls Row */}
          <div className="px-6 sm:px-8 pt-3 pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))] shrink-0">
            <div className="max-w-[360px] sm:max-w-[460px] md:max-w-[500px] mx-auto flex items-center justify-between">
              {/* Flip Camera Button */}
              <button
                type="button"
                onClick={toggleFacingMode}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Switch Camera"
              >
                <RefreshCw className="w-6 h-6 stroke-[2]" />
              </button>

              {/* Central Shutter Button */}
              <button
                type="button"
                onClick={snapPhoto}
                className="w-20 h-20 rounded-full border-[5px] border-white flex items-center justify-center p-1.5 cursor-pointer active:scale-95 transition-all touch-manipulation shadow-xl shadow-black/60"
                title="Capture Photo"
              >
                <div className="w-full h-full rounded-full bg-white active:bg-gray-200 transition-colors" />
              </button>

              {/* Choose from Gallery Button */}
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="w-12 h-12 rounded-full flex items-center justify-center text-white/90 hover:text-white active:scale-90 transition-all cursor-pointer"
                title="Choose from gallery"
              >
                <ImageIcon className="w-6 h-6 stroke-[1.8]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Photo Preview / Confirmation View */}
      {mode === "preview" && capturedImage && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed inset-0 z-[80] sm:relative sm:inset-auto sm:z-10 w-full h-full sm:h-auto sm:max-w-[560px] md:max-w-[640px] bg-[#121214] text-white sm:rounded-[36px] sm:border sm:border-white/10 overflow-hidden shadow-2xl flex flex-col justify-between animate-in slide-in-from-bottom duration-300 ease-out select-none"
          style={{ maxHeight: "100dvh" }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-5 sm:px-7 pt-[max(1.25rem,env(safe-area-inset-top,1rem))] pb-3 shrink-0">
            <div className="w-11" />
            <div className="text-center">
              <h2 className="text-lg sm:text-[19px] font-bold text-white tracking-tight leading-tight">
                Review package photo
              </h2>
              <p className="text-xs sm:text-[13px] text-gray-300 font-normal mt-0.5">
                Ensure details and labels are sharp
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-11 h-11 rounded-full bg-white/10 hover:bg-white/15 backdrop-blur-md flex items-center justify-center text-white cursor-pointer transition-colors"
              title="Close"
            >
              <X className="w-5 h-5 stroke-[2.2]" />
            </button>
          </div>

          {/* Photo Preview Container */}
          <div className="flex-1 flex items-center justify-center px-4 sm:px-8 py-2 min-h-0">
            <div className="relative w-full max-w-[360px] sm:max-w-[460px] md:max-w-[500px] aspect-[4/4.5] sm:aspect-square rounded-[32px] overflow-hidden bg-neutral-900 shadow-2xl border border-white/10 flex items-center justify-center">
              <img
                src={capturedImage.previewUrl}
                alt="Snapped package"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Action Controls Row */}
          <div className="px-6 sm:px-8 pt-3 pb-[max(2rem,env(safe-area-inset-bottom,1.5rem))] shrink-0">
            <div className="max-w-[360px] sm:max-w-[460px] md:max-w-[500px] mx-auto grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={retakePhoto}
                className="py-4 px-4 rounded-2xl border border-white/20 hover:bg-white/10 active:scale-[0.98] text-white font-semibold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retake</span>
              </button>

              <button
                type="button"
                onClick={confirmPhoto}
                className="py-4 px-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] active:scale-[0.98] text-gray-950 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation shadow-md shadow-[#FFCC00]/25"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Use Photo</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
