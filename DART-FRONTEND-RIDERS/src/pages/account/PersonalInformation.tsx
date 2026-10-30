import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Mail,
  Phone,
  User,
  Check,
  X,
  Camera,
  ChevronRight,
  Bell,
} from "lucide-react"
import { usersApi } from "../../api/account.api"
import { useAuth } from "../../context/AuthContext"
import { fullName } from "../../utils/format"

interface PersonalInformationProps {
  onBack: () => void
  onOpenNotifications?: () => void
  onVerifyIdentity?: () => void
}

export default function PersonalInformation({
  onBack,
  onOpenNotifications,
}: PersonalInformationProps) {
  const { user, refresh } = useAuth()

  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [email, setEmail] = useState(user?.email || "")
  const [phone, setPhone] = useState(user?.phoneNumber || "")
  const [gender, setGender] = useState((user as any)?.gender || "Male")

  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<
    "firstName" | "lastName" | "email" | "phone" | "gender" | null
  >(null)
  const [tempValue, setTempValue] = useState<string>("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "")
      setLastName(user.lastName || "")
      setEmail(user.email || "")
      setPhone(user.phoneNumber || "")
      if ((user as any)?.gender) setGender((user as any).gender)
    }
  }, [user])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 2200)
  }

  const handleOpenEdit = (
    field: "firstName" | "lastName" | "email" | "phone" | "gender"
  ) => {
    setEditingField(field)
    if (field === "firstName") setTempValue(firstName)
    if (field === "lastName") setTempValue(lastName)
    if (field === "email") setTempValue(email)
    if (field === "phone") setTempValue(phone)
    if (field === "gender") setTempValue(gender)
  }

  const handleSaveField = async () => {
    setIsSaving(true)
    try {
      if (editingField === "firstName") {
        await usersApi.update({ firstName: tempValue })
        setFirstName(tempValue)
      } else if (editingField === "lastName") {
        await usersApi.update({ lastName: tempValue })
        setLastName(tempValue)
      } else if (editingField === "phone") {
        await usersApi.update({ phoneNumber: tempValue })
        setPhone(tempValue)
      }
      showToast("Updated successfully!")
      setEditingField(null)
      await refresh()
    } catch (err: any) {
      showToast(err.message || "Failed to update")
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = fullName(user) || `${firstName} ${lastName}`.trim() || "Rider"

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-[#fcfcfc] dark:bg-[#0c0c0e] relative pb-16 transition-colors">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-yellow-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
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
          Personal Information
        </h1>

        <button
          type="button"
          onClick={onOpenNotifications}
          className="w-10 h-10 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black shadow-xs flex md:hidden items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-5 h-5 fill-black/15 stroke-[2.2]" />
        </button>
        <div className="w-10 hidden md:block" aria-hidden="true" />
      </div>

      {/* Main Form Content */}
      <div className="flex-1 px-4 sm:px-8 py-5 sm:py-8 max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto w-full flex flex-col justify-between">
        <div className="space-y-6">
          {/* Avatar Header Block */}
          <div className="flex flex-col items-center justify-center pt-2 pb-4">
            <div className="relative group shrink-0">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-yellow-400 shadow-sm flex items-center justify-center">
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={displayName}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none"
                      const fb = e.currentTarget.parentElement?.querySelector(".personal-avatar-initials") as HTMLElement
                      if (fb) fb.style.display = "flex"
                    }}
                  />
                ) : null}
                <div
                  className={`personal-avatar-initials w-full h-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-bold text-3xl sm:text-4xl flex items-center justify-center ${
                    user?.profileImageUrl ? "hidden" : "flex"
                  }`}
                >
                  {displayName.charAt(0).toUpperCase() || "R"}
                </div>
              </div>

              <div
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-yellow-400 border-2 border-white dark:border-[#18181b] flex items-center justify-center text-gray-950 shadow-md cursor-pointer"
                title="Change photo"
              >
                <Camera className="w-4 h-4 stroke-[2.2]" />
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 font-medium">
              Tap any field below to update details
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-white dark:bg-[#18181b] rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xs overflow-hidden divide-y divide-gray-100 dark:divide-white/5 transition-colors">
            {/* First Name */}
            <div
              onClick={() => handleOpenEdit("firstName")}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <User className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    First Name
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                    {firstName || "----"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
            </div>

            {/* Last Name */}
            <div
              onClick={() => handleOpenEdit("lastName")}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <User className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Last Name
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                    {lastName || "----"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
            </div>

            {/* Email */}
            <div
              onClick={() => showToast("Email is linked to courier security account")}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <Mail className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Email Address
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block font-mono">
                    {email || "rider@dart.ng"}
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                Locked
              </span>
            </div>

            {/* Phone */}
            <div
              onClick={() => handleOpenEdit("phone")}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <Phone className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Phone Number
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block font-mono">
                    {phone || "+234 703 101 3632"}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
            </div>

            {/* Gender */}
            <div
              onClick={() => handleOpenEdit("gender")}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <User className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Gender
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                    {gender}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Field Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setEditingField(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Edit {editingField === "firstName" ? "First Name" : editingField === "lastName" ? "Last Name" : editingField === "phone" ? "Phone Number" : "Gender"}
              </h3>
              <button
                type="button"
                onClick={() => setEditingField(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-black dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {editingField === "gender" ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {["Male", "Female"].map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-3 rounded-2xl border text-sm font-semibold transition cursor-pointer ${
                      gender === g
                        ? "bg-yellow-400 border-yellow-400 text-black"
                        : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            ) : (
              <input
                type={editingField === "phone" ? "tel" : "text"}
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-6"
                autoFocus
              />
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveField}
              className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-semibold text-black text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
