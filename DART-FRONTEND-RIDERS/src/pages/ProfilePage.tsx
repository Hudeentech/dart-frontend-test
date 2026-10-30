import { useState } from "react"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { useToast } from "../context/ToastContext"
import { fullName } from "../utils/format"
import { navigate } from "../hooks/router"
import NotificationButton from "../components/NotificationButton"
import {
  ArrowLeft,
  Bell,
  Camera,
  ChevronRight,
  User,
  ShieldCheck,
  Wallet,
  MapPin,
  Bike,
  Moon,
  Sun,
  Globe,
  MessageCircleQuestion,
  Headphones,
  Star,
  Users,
  Shield,
  Info,
  Smartphone,
  LogOut,
  Copy,
  Check,
  TrendingUp,
} from "lucide-react"

// Import Sub-Screens matching Customer App
import Profile from "./account/Profile"
import PersonalInformation from "./account/PersonalInformation"
import AccountVerification from "./account/AccountVerification"
import PaymentMethod from "./account/PaymentMethod"
import SavedAddress from "./account/SavedAddress"
import VehicleInformation from "./account/VehicleInformation"
import NotificationPreferences from "./account/NotificationPreferences"
import HelpCentre from "./account/HelpCentre"
import ContactSupport from "./account/ContactSupport"
import RateDart from "./account/RateDart"
import AboutDart from "./account/AboutDart"
import AppearanceModal from "./account/AppearanceModal"
import LanguageModal, { LanguageOption } from "./account/LanguageModal"
import ChooseAccountType from "./account/ChooseAccountType"

type AccountView =
  | "main"
  | "profile"
  | "personal"
  | "verification"
  | "account-type"
  | "payment"
  | "location"
  | "vehicle"
  | "notifications"
  | "help"
  | "contact"
  | "rate"
  | "about"

export function ProfilePage() {
  const { user, riderProfile, logout } = useAuth()
  const { theme, resolvedTheme } = useTheme()
  const toast = useToast()

  const [view, setView] = useState<AccountView>("main")
  const [copiedId, setCopiedId] = useState(false)
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] = useState(false)
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>({
    id: "en",
    name: "English",
    isDefault: true,
  })

  const isVerified = Boolean(
    (riderProfile as any)?.isVerified ||
    (user as any)?.isVerified ||
    (user as any)?.isNinVerified
  )
  const riderIdString =
    (riderProfile as any)?.riderNumber ||
    (user as any)?.riderNumber ||
    (user as any)?.memberId ||
    (user?.id ? `RDR-${user.id.slice(-6).toUpperCase()}` : "RDR-FLEET")
  const displayName = fullName(user) || "Rider"
  const locationCity = (user as any)?.city || (riderProfile as any)?.city || "Nigeria"
  const vehicleString =
    riderProfile?.vehicleType && riderProfile?.plateNumber
      ? `${riderProfile.vehicleType} | ${riderProfile.plateNumber}`
      : riderProfile?.plateNumber || "Motorcycle Fleet"

  const handleCopyRiderId = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(riderIdString)
    setCopiedId(true)
    toast("Rider ID copied to clipboard!", "success")
    setTimeout(() => setCopiedId(false), 2200)
  }

  const handleInviteFriends = () => {
    navigator.clipboard.writeText(`https://dartlogistics.ng/rider/join?ref=DART-${riderIdString}`)
    toast("Referral link copied! Share to earn ₦1,000 bonus.", "success")
  }

  // =========================================================
  // SUB-VIEWS RENDERING (Matches Customer AccountView)
  // =========================================================
  if (view === "profile") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <Profile
            onBack={() => setView("main")}
            onOpenNotifications={() => navigate("/notifications")}
            onVerifyIdentity={() => setView("verification")}
            onEditPersonalInformation={() => setView("personal")}
          />
        </div>
      </div>
    )
  }

  if (view === "personal") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <PersonalInformation
            onBack={() => setView("main")}
            onOpenNotifications={() => navigate("/notifications")}
            onVerifyIdentity={() => setView("verification")}
          />
        </div>
      </div>
    )
  }

  if (view === "verification") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <AccountVerification onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  if (view === "account-type") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <ChooseAccountType
            onBack={() => setView("main")}
            currentType="rider"
          />
        </div>
      </div>
    )
  }

  if (view === "payment") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <PaymentMethod onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  if (view === "location") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <SavedAddress onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  if (view === "vehicle") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <VehicleInformation onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  if (view === "notifications") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <NotificationPreferences onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  if (view === "help") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <HelpCentre
            onBack={() => setView("main")}
            onContactSupport={() => setView("contact")}
          />
        </div>
      </div>
    )
  }

  if (view === "contact") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <ContactSupport onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  if (view === "rate") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <RateDart
            onBack={() => setView("main")}
            onDone={() => setView("main")}
          />
        </div>
      </div>
    )
  }

  if (view === "about") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <AboutDart onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  // =========================================================
  // MAIN ACCOUNT VIEW (Matches Customer Account.tsx)
  // =========================================================
  return (
    <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
      {/* Container for Desktop Centering matching Customer layout */}
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative pb-24 md:pb-12 transition-colors">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white">
            Account
          </h1>
          <NotificationButton />
          {/* Spacer to keep title centered on desktop */}
          <div className="w-10 hidden md:block" aria-hidden="true" />
        </div>

        <div className="flex-1 px-3.5 sm:px-8 md:px-10 py-5 sm:py-8 flex flex-col gap-6 sm:gap-8">
          {/* Profile Header Block */}
          <div
            onClick={() => setView("profile")}
            className="flex items-center justify-between cursor-pointer group hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-4">
              <div className="relative group/avatar shrink-0">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center border border-gray-100 dark:border-white/10 group-hover:ring-2 group-hover:ring-yellow-400 transition-all">
                  {user?.profileImageUrl ? (
                    <img
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        const fb = e.currentTarget.parentElement?.querySelector(".account-avatar-initials") as HTMLElement
                        if (fb) fb.style.display = "flex"
                      }}
                    />
                  ) : null}
                  <div
                    className={`account-avatar-initials w-full h-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-bold text-2xl flex items-center justify-center ${
                      user?.profileImageUrl ? "hidden" : "flex"
                    }`}
                  >
                    {displayName.charAt(0).toUpperCase() || "R"}
                  </div>
                </div>
                <div
                  className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-yellow-400 border-2 border-white dark:border-[#18181b] flex items-center justify-center text-gray-950 shadow-xs"
                  title="Profile Photo"
                >
                  <Camera className="w-3 h-3 stroke-[2.2]" />
                </div>
              </div>
              <div className="flex flex-col">
                <h2 className="text-xl font-medium text-gray-900 dark:text-white mb-1 group-hover:text-amber-500 transition-colors">
                  {displayName}
                </h2>
                {isVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400 w-max uppercase">
                    <ShieldCheck className="w-3 h-3" />
                    Identity Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wider bg-red-100 dark:bg-red-400/10 text-red-500 dark:text-red-400 w-max uppercase">
                    <ShieldCheck className="w-3 h-3" />
                    Identity Unverified
                  </span>
                )}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors" />
          </div>

          {/* ========================================================= */}
          {/* SECTION 1: ACCOUNT */}
          {/* ========================================================= */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              Account
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              {/* 1. Rider ID */}
              <div
                onClick={handleCopyRiderId}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    Rider ID:
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-2.5 py-1 text-xs font-mono font-medium text-gray-700 dark:text-gray-300">
                  <span>{riderIdString}</span>
                  {copiedId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500 stroke-[2.5]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-gray-400 stroke-[2]" />
                  )}
                </div>
              </div>

              {/* 2. Personal Information */}
              <button
                type="button"
                onClick={() => setView("personal")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Personal Information
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Manage your Name, phone number and email
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 3. Documents Verification */}
              <button
                type="button"
                onClick={() => setView("verification")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Documents Verification
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Driver's License & NIN KYC status
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* Account Type / Switch Account */}
              <button
                type="button"
                onClick={() => setView("account-type")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Account Type
                      </span>
                      <span className="text-[10px] font-bold text-gray-950 bg-[#FFCC00] px-2 py-0.5 rounded-full uppercase">
                        Rider
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Switch to personal account or manage roles
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 4. Payment Methods */}
              <button
                type="button"
                onClick={() => setView("payment")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Wallet className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Payment Methods
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Manage cards, bank account and wallets
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 5. Location */}
              <button
                type="button"
                onClick={() => setView("location")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Location:
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {locationCity}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 6. Vehicle Information */}
              <button
                type="button"
                onClick={() => setView("vehicle")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Bike className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Vehicle Information
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {vehicleString}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 7. Performance & Reviews */}
              <button
                type="button"
                onClick={() => navigate("/performance")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-yellow-400/10 dark:bg-yellow-400/15 flex items-center justify-center border border-yellow-400/30 dark:border-yellow-400/20 shrink-0 text-yellow-600 dark:text-yellow-400">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      Performance & Reviews
                      <span className="text-[11px] bg-yellow-400 text-black px-2 py-0.5 rounded-full font-bold">
                        4.8 ★
                      </span>
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Ratings, on-time rates & customer feedback
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 2: PREFERENCE */}
          {/* ========================================================= */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              Preference
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              {/* 1. Notification */}
              <button
                type="button"
                onClick={() => setView("notifications")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Notification
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Manage your notification preferences
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 2. Appearance */}
              <button
                type="button"
                onClick={() => setIsAppearanceModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    {resolvedTheme === "dark" ? (
                      <Moon className="w-5 h-5 text-yellow-400" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Appearance
                      </span>
                      <span className="text-[11px] font-bold text-black bg-yellow-400 px-2.5 py-0.5 rounded-full capitalize shadow-2xs">
                        {theme === "system" ? "Auto (System)" : `${theme} Mode`}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Choose your preferred app appearance
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 3. Language */}
              <button
                type="button"
                onClick={() => setIsLanguageModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Language
                      </span>
                      <span className="text-[11px] font-bold text-black bg-yellow-400 px-2.5 py-0.5 rounded-full shadow-2xs">
                        {selectedLanguage.name}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Choose your preferred language
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 3: SUPPORT */}
          {/* ========================================================= */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              Support
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              {/* 1. Help Centre */}
              <button
                type="button"
                onClick={() => setView("help")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <MessageCircleQuestion className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Help Centre
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      FAQs and helpful article
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 2. Contact Support */}
              <button
                type="button"
                onClick={() => setView("contact")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Headphones className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Contact Support
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Get help from our support team
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 3. Rate Dart */}
              <button
                type="button"
                onClick={() => setView("rate")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center border border-amber-200/40 dark:border-amber-400/20 shrink-0">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Rate Dart
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Share your experience with Dart
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 4. Invite friends */}
              <button
                type="button"
                onClick={handleInviteFriends}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Users className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Invite friends
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Invite friends and earn rewards
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          </section>

          {/* ========================================================= */}
          {/* SECTION 4: ABOUT */}
          {/* ========================================================= */}
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              About
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              {/* 1. Terms & Privacy */}
              <button
                type="button"
                onClick={() => setView("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Terms & Privacy
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Read our terms and privacy policy
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 2. About Dart */}
              <button
                type="button"
                onClick={() => setView("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Info className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      About Dart
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Learn more about Dart
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 3. App Version */}
              <button
                type="button"
                onClick={() => setView("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Smartphone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      App Version
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      You are Using the latest version (1.0.0.0)
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              {/* 4. Sign Out */}
              <button
                type="button"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to sign out?")) {
                    await logout()
                    navigate("/login")
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-red-50/60 dark:hover:bg-red-950/20 transition-colors group cursor-pointer text-red-600 dark:text-red-400"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-950/40 flex items-center justify-center border border-red-200 dark:border-red-900/30 shrink-0">
                    <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-red-600 dark:text-red-400">
                      Sign Out
                    </span>
                    <span className="text-xs text-red-400/80 dark:text-red-400/60">
                      Log out of your DART courier account
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-red-400 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Language Selection Modal */}
      <LanguageModal
        isOpen={isLanguageModalOpen}
        onClose={() => setIsLanguageModalOpen(false)}
        currentLanguage={selectedLanguage.id}
        onSaveLanguage={(lang) => {
          setSelectedLanguage(lang)
          toast(`Language switched to ${lang.name}`, "success")
        }}
      />

      {/* Appearance Selection Modal */}
      <AppearanceModal
        isOpen={isAppearanceModalOpen}
        onClose={() => setIsAppearanceModalOpen(false)}
      />
    </div>
  )
}
