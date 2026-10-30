import React, { useState, useRef } from "react"
import {
  X,
  Camera,
  Upload,
  Check,
  Trash2,
  Loader2,
} from "lucide-react"

export interface ProfilePhotoModalProps {
  isOpen: boolean
  onClose: () => void
  currentPhotoUrl?: string
  onSave: (newPhotoUrl: string) => Promise<void> | void
  userName?: string
}

const getDefaultAvatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || "User",
  )}&background=FFCC00&color=121212&bold=true`

/**
 * Optimizes an uploaded image file into a square, high-DPI Base64 JPEG data URL (~30-60KB).
 */
export const optimizeImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const size = 360 // 360x360 px: retina-sharp for avatars & ultra-lightweight
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          resolve(readerEvent.target?.result as string)
          return
        }

        // Center crop math
        const minDim = Math.min(img.width, img.height)
        const sx = (img.width - minDim) / 2
        const sy = (img.height - minDim) / 2

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85)
        resolve(dataUrl)
      }
      img.onerror = () => reject(new Error("Failed to load image file"))
      img.src = readerEvent.target?.result as string
    }
    reader.onerror = () => reject(new Error("Failed to read image file"))
    reader.readAsDataURL(file)
  })
}

export default function ProfilePhotoModal({
  isOpen,
  onClose,
  currentPhotoUrl,
  onSave,
  userName = "User",
}: ProfilePhotoModalProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<string>(
    currentPhotoUrl || getDefaultAvatar(userName),
  )
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedPhoto(currentPhotoUrl || getDefaultAvatar(userName))
      setErrorMsg(null)
    }
  }, [isOpen, currentPhotoUrl, userName])

  if (!isOpen) return null

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select an image file (PNG, JPG, JPEG, WEBP).")
      return
    }

    try {
      setErrorMsg(null)
      const optimized = await optimizeImageFile(file)
      setSelectedPhoto(optimized)
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process photo.")
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setErrorMsg(null)
    try {
      await onSave(selectedPhoto)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update profile photo.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemovePhoto = () => {
    const defaultAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      userName,
    )}&background=FFCC00&color=121212&bold=true`
    setSelectedPhoto(defaultAvatar)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-[#18181b] w-full max-w-md rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 pt-5 pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              Change Profile Photo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col items-center">
          {/* Main Photo Preview */}
          <div className="relative mb-5 group">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-yellow-400/80 shadow-lg bg-gray-100 dark:bg-gray-800">
              <img
                src={selectedPhoto}
                alt="Selected Avatar Preview"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Overlay button to trigger file picker directly */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-semibold cursor-pointer backdrop-blur-[1px]"
              title="Click to choose a new photo"
            >
              <Upload className="w-5 h-5 mb-1" />
              <span>Change</span>
            </button>
          </div>

          {/* Hidden native file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {errorMsg && (
            <div className="w-full mb-4 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400 text-center">
              {errorMsg}
            </div>
          )}

          {/* Action Buttons: Upload custom / Remove */}
          <div className="flex items-center gap-2.5 w-full mb-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-800 dark:text-gray-200 font-semibold text-xs flex items-center justify-center gap-2 border border-gray-200/80 dark:border-white/10 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-yellow-500" />
              <span>Upload from device</span>
            </button>
            <button
              type="button"
              onClick={handleRemovePhoto}
              className="py-2.5 px-3 rounded-xl bg-gray-50 dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 font-semibold text-xs flex items-center justify-center gap-1.5 border border-gray-200/80 dark:border-white/10 transition-colors cursor-pointer"
              title="Reset to default initials"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>

          {/* Photo Guidelines / Info */}
          <div className="w-full p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 text-center">
            <p className="text-xs font-semibold text-gray-900 dark:text-white">
              Upload a clear photo
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
              Square images with good lighting work best. Photos are automatically optimized for fast loading and crisp display across Dart.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50/50 dark:bg-white/2 border-t border-gray-100 dark:border-white/5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-yellow-400 hover:bg-yellow-500 active:scale-95 text-gray-950 font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Updating...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save Photo</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
