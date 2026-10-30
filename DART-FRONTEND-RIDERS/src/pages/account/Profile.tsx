import { useState } from "react"
import {
  ArrowLeft,
  MapPin,
  Mail,
  Phone,
  Copy,
  X,
  Check,
  ShieldAlert,
  ShieldCheck,
  Edit3,
  Camera,
  Bike,
  Bell,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"
import { fullName } from "../../utils/format"
import NotificationButton from "../../components/NotificationButton"

interface ProfileProps {
  onBack: () => void
  onOpenNotifications?: () => void
  onVerifyIdentity?: () => void
  onEditPersonalInformation?: () => void
}

export default function Profile({
  onBack,
  onOpenNotifications,
  onVerifyIdentity,
  onEditPersonalInformation,
}: ProfileProps) {
  const { user, riderProfile } = useAuth()
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [showVerifyBanner, setShowVerifyBanner] = useState<boolean>(true)

  const isVerified = Boolean((riderProfile as any)?.isVerified || (user as any)?.isVerified || (user as any)?.isNinVerified)
  const riderIdString = (riderProfile as any)?.riderNumber || (user as any)?.riderNumber || (user as any)?.memberId || (user?.id ? `RDR-${user.id.slice(-6).toUpperCase()}` : "RDR-FLEET")
  const displayName = fullName(user) || "Rider"
  const emailDisplay = user?.email || "Not provided"
  const phoneDisplay = user?.phoneNumber || "Not provided"
  const locationDisplay = (user as any)?.city || (riderProfile as any)?.city || "Nigeria"
  const vehicleDisplay = riderProfile?.vehicleType && riderProfile?.plateNumber
    ? `${riderProfile.vehicleType} | ${riderProfile.plateNumber}`
    : riderProfile?.plateNumber || "Not registered"

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 2200)
  }

  const copyRiderId = () => {
    navigator.clipboard.writeText(riderIdString)
    showToast("Rider ID copied to clipboard")
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-[#fcfcfc] dark:bg-[#0c0c0e] relative pb-16 transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-yellow-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <div className="px-4 sm:px-6 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-sm z-10">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
          Profile
        </h1>

        <NotificationButton onClick={onOpenNotifications} />
        <div className="w-10 hidden md:block" aria-hidden="true" />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 px-4 sm:px-8 py-5 sm:py-8 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full flex flex-col justify-between">
        <div className="space-y-5">
          {/* Main Profile Card Container */}
          <div className="bg-white dark:bg-[#18181b] rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xs overflow-hidden transition-colors">
            {/* Avatar & Verification Badge Section */}
            <div className="pt-8 pb-6 px-4 flex flex-col items-center text-center">
              <div
                className="relative group cursor-pointer shrink-0"
                onClick={onEditPersonalInformation}
                title="Change profile details"
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-yellow-400 shadow-sm transition-transform group-hover:scale-[1.02] flex items-center justify-center">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt={displayName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        const fb = e.currentTarget.parentElement?.querySelector(".profile-avatar-initials") as HTMLElement
                        if (fb) fb.style.display = "flex"
                      }}
                    />
                  ) : null}
                  <div
                    className={`profile-avatar-initials w-full h-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-bold text-3xl sm:text-4xl flex items-center justify-center ${
                      user?.profileImageUrl ? "hidden" : "flex"
                    }`}
                  >
                    {displayName.charAt(0).toUpperCase() || "R"}
                  </div>
                </div>

                <div
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-yellow-400 hover:bg-yellow-500 border-2 border-white dark:border-[#18181b] flex items-center justify-center text-gray-950 shadow-md transition-transform group-hover:scale-110 cursor-pointer"
                  title="Change profile photo"
                >
                  <Camera className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>

              {/* Verification Status Pill Badge */}
              <div className="mt-3.5">
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/90 dark:border-emerald-500/30 uppercase">
                    <ShieldCheck className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>IDENTITY VERIFIED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200/90 dark:border-rose-500/30 uppercase">
                    <ShieldAlert className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>IDENTITY UNVERIFIED</span>
                  </span>
                )}
              </div>

              {/* Rider Full Name */}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mt-2.5 tracking-tight">
                {displayName}
              </h2>
            </div>

            {/* Subtle Divider Line */}
            <div className="w-full border-b border-gray-100 dark:border-white/5" />

            {/* Profile Information Rows */}
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {/* Row 1: Rider ID */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0">
                    <MapPin className="w-4 h-4 stroke-[2]" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    Rider ID:
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
                    {riderIdString}
                  </span>
                  <button
                    type="button"
                    onClick={copyRiderId}
                    className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer p-0.5"
                    title="Copy Rider ID"
                  >
                    <Copy className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                </div>
              </div>

              {/* Row 2: Email */}
              <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">
                    Email:
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 block font-mono">
                    {emailDisplay}
                  </span>
                </div>
              </div>

              {/* Row 3: Operating Location */}
              <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0 mt-0.5">
                  <MapPin className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">
                    Operating Hub:
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 block">
                    {locationDisplay}
                  </span>
                </div>
              </div>

              {/* Row 4: Phone Number */}
              <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">
                    Phone Number:
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 block font-mono">
                    {phoneDisplay}
                  </span>
                </div>
              </div>

              {/* Row 5: Vehicle Information */}
              <div className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-700 dark:text-gray-300 shrink-0 mt-0.5">
                  <Bike className="w-4 h-4 stroke-[2]" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-white block">
                    Vehicle Information:
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 block font-mono">
                    {vehicleDisplay}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Action: Edit Personal Info */}
            <div className="p-4 bg-gray-50/50 dark:bg-white/2 border-t border-gray-100 dark:border-white/5">
              <button
                type="button"
                onClick={onEditPersonalInformation}
                className="w-full py-3 px-4 rounded-2xl bg-white dark:bg-[#202024] hover:bg-gray-100 dark:hover:bg-white/10 text-gray-900 dark:text-white font-semibold text-xs sm:text-sm border border-gray-200 dark:border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
              >
                <Edit3 className="w-4 h-4 text-yellow-500" />
                <span>Edit Personal Information</span>
              </button>
            </div>
          </div>

          {/* Bottom Dark Banner: "Verify your Courier Identity" */}
          {showVerifyBanner && !isVerified && (
            <div className="bg-[#18181b] text-white rounded-3xl p-5 sm:p-6 relative overflow-hidden shadow-xl border border-white/5 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => setShowVerifyBanner(false)}
                className="absolute top-4 right-4 w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 hover:text-white transition-colors cursor-pointer z-10"
                title="Dismiss banner"
              >
                <X className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>

              <div className="relative z-10 max-w-sm">
                <span className="text-[11px] font-bold text-yellow-400 tracking-wider uppercase mb-1 block">
                  COURIER BADGE REQUIRED
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                  Verify your Courier Identity
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-4">
                  Submit your 11-digit NIN and Driver's License to unlock high-tier deliveries, instant wallet settlements, and verified courier status.
                </p>
                <button
                  type="button"
                  onClick={onVerifyIdentity}
                  className="px-4 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Start Verification
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
