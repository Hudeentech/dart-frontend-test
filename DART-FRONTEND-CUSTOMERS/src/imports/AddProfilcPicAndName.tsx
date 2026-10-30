import { useState } from "react"
import {
  ArrowLeft,
  User as UserIcon,
  Camera,
  Loader2,
  ShieldCheck,
  Home,
  Check,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { userApi } from "../api/user.api"
import { optimizeImageFile } from "../components/ProfilePhotoModal"

export default function AddProfilcPicAndName({
  onNext,
  onGoToHome,
  onVerifyAccount,
  onBack,
}: {
  onNext?: () => void
  onGoToHome?: () => void
  onVerifyAccount?: () => void
  onBack?: () => void
}) {
  const { user, saveOnboardingProfile, updateUserProfile } = useAuth()
  const [firstName, setFirstName] = useState(
    user?.firstName && user.firstName !== "Customer" ? user.firstName : "",
  )
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [gender, setGender] = useState(user?.gender || "male")
  const [avatarPreview, setAvatarPreview] = useState<string | null>(
    user?.profileImageUrl || null,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [photoSavedNotice, setPhotoSavedNotice] = useState(false)
  const [activeAction, setActiveAction] = useState<"home" | "verify" | "nin">("home")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please select a valid image file (PNG, JPG, JPEG, WEBP).")
      return
    }

    try {
      setErrorMsg(null)
      setIsUploadingPhoto(true)
      const dataUrl = await optimizeImageFile(file)
      setAvatarPreview(dataUrl)

      // Directly persist image to database and session auth state immediately
      await userApi.updateProfile({ profileImageUrl: dataUrl })
      await updateUserProfile({ profileImageUrl: dataUrl })

      setPhotoSavedNotice(true)
      setTimeout(() => setPhotoSavedNotice(false), 2500)
    } catch (err: any) {
      console.warn("[AddProfile] Error processing photo:", err)
      setErrorMsg("Failed to process photo: " + (err.message || "Unknown error"))
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  // Save basic profile and proceed to Home (limited privileges, verify later)
  const handleProceedToHome = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("Please enter both your first and last name to proceed.")
      return
    }

    setErrorMsg(null)
    setActiveAction("home")
    setIsSaving(true)
    try {
      await saveOnboardingProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        profileImageUrl: avatarPreview || user?.profileImageUrl || undefined,
        verifyNow: false,
      })

      if (onGoToHome) {
        onGoToHome()
      } else if (onNext) {
        onNext()
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile.")
      if (onGoToHome) {
        onGoToHome()
      } else if (onNext) {
        onNext()
      }
    } finally {
      setIsSaving(false)
    }
  }

  // Save profile and proceed directly to NIN verification
  const handleContinueWithNin = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg("Please enter both your first and last name to continue.")
      return
    }

    setErrorMsg(null)
    setActiveAction("nin")
    setIsSaving(true)
    try {
      await saveOnboardingProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender,
        profileImageUrl: avatarPreview || user?.profileImageUrl || undefined,
        verifyNow: false,
      })

      if (onVerifyAccount) {
        onVerifyAccount()
      } else if (onNext) {
        onNext()
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save profile.")
      if (onVerifyAccount) {
        onVerifyAccount()
      } else if (onNext) {
        onNext()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col w-full bg-transparent relative">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          type="button"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors mb-6 -ml-2 text-gray-800 dark:text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Set up your profile
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-normal text-sm">
          Add your photo, names, and gender to personalize your account.
        </p>
      </div>

      {/* Profile Picture Upload */}
      <div className="flex flex-col items-center justify-center mb-6">
        <label className="relative cursor-pointer group">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImagePick}
            disabled={isUploadingPhoto}
          />
          <div className="w-24 h-24 sm:w-28 sm:h-28 bg-gray-100 dark:bg-[#202024] rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-white/15 group-hover:border-yellow-400 transition-colors">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <UserIcon className="w-12 h-12 text-gray-400 dark:text-gray-500" />
            )}
          </div>
          <div className="absolute bottom-0 right-0 w-8 h-8 sm:w-9 sm:h-9 bg-yellow-400 border-2 border-white dark:border-[#121212] rounded-full flex items-center justify-center group-hover:bg-yellow-500 transition-colors shadow-xs">
            {isUploadingPhoto ? (
              <Loader2 className="w-4 h-4 text-gray-950 animate-spin" />
            ) : photoSavedNotice ? (
              <Check className="w-4 h-4 text-gray-950 stroke-[2.5]" />
            ) : (
              <Camera className="w-4 h-4 text-gray-950" />
            )}
          </div>
        </label>
        {photoSavedNotice && (
          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-2 animate-in fade-in">
            Photo saved to profile!
          </span>
        )}
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/30 text-xs text-red-600 dark:text-red-400">
          {errorMsg}
        </div>
      )}

      {/* Inputs */}
      <div className="flex flex-col gap-4 mb-8">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            First Name
          </label>
          <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all shadow-2xs">
            <UserIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Enter your first name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base font-semibold"
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Last Name
          </label>
          <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all shadow-2xs">
            <UserIcon className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Enter your last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-base font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
            Gender
          </label>
          <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all shadow-2xs">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full bg-transparent outline-none text-gray-900 dark:text-white appearance-none cursor-pointer text-base font-medium"
            >
              <option
                value="male"
                className="bg-white dark:bg-[#18181b] text-gray-900 dark:text-white"
              >
                Male
              </option>
              <option
                value="female"
                className="bg-white dark:bg-[#18181b] text-gray-900 dark:text-white"
              >
                Female
              </option>
              <option
                value="other"
                className="bg-white dark:bg-[#18181b] text-gray-900 dark:text-white"
              >
                Prefer not to say / Other
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Dual Options: Continue with NIN Verification OR Go Home */}
      <div className="flex flex-col gap-3">
        {/* Primary Option: Continue with NIN Verification */}
        <button
          type="button"
          onClick={handleContinueWithNin}
          disabled={isSaving}
          className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
        >
          {isSaving && activeAction === "nin" ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span>Continue with NIN verification</span>
            </>
          )}
        </button>

        {/* Secondary Option: Go Home */}
        <button
          type="button"
          onClick={handleProceedToHome}
          disabled={isSaving}
          className="w-full h-13 border border-gray-200 dark:border-white/10 bg-white dark:bg-[#18181b] hover:bg-gray-50 dark:hover:bg-white/5 text-gray-800 dark:text-white font-semibold rounded-2xl transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer shadow-2xs"
        >
          {isSaving && activeAction === "home" ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Profile...</span>
            </>
          ) : (
            <>
              <Home className="w-4 h-4 text-gray-400" />
              <span>Go Home</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
