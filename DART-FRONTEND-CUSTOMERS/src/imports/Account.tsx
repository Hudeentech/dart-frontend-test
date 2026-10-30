import React, { useState, useEffect } from "react"
import {
  Bell,
  ArrowLeft,
  ChevronRight,
  User,
  ShieldCheck,
  MapPin,
  Wallet,
  Moon,
  Sun,
  Globe,
  MessageCircleQuestion,
  Headphones,
  Sparkles,
  Users,
  Shield,
  Info,
  Smartphone,
  Star,
  LogOut,
  Camera,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useAuth, formatMemberId } from "../context/AuthContext"
import { userApi } from "../api/user.api"
import RateDart from "./RateDart"
import RateRiderModal from "../components/RateRiderModal"
import HelpCentre from "./HelpCentre"
import ContactSupport from "./ContactSupport"
import ReportIssue from "./ReportIssue"
import AboutDart from "./AboutDart"
import PersonalInformation, { UserProfileInfo } from "./PersonalInformation"
import Profile from "./Profile"
import AccountVerification from "./AccountVerification"
import ChooseAccountType from "./ChooseAccountType"
import PaymentMethod from "./PaymentMethod"
import NotificationPreferences from "./NotificationPreferences"
import SavedAddress from "./SavedAddress"
import LanguageModal, { LanguageOption } from "../components/LanguageModal"
import AppearanceModal from "../components/AppearanceModal"
import NotificationButton from "../components/NotificationButton"

type AccountView = "main" | "profile" | "rate" | "help" | "contact" | "report" | "about" | "personal" | "verification" | "payment" | "notifications" | "address" | "account-type"

export default function Account({
  onOpenNotifications,
  onBack,
}: {
  onOpenNotifications?: () => void
  onBack?: () => void
}) {
  const { user, logout } = useAuth()
  const [view, setView] = useState<AccountView>("main")
  const initialMemberId = user?.memberId || formatMemberId(user?.id)
  const [isVerified, setIsVerified] = useState<boolean>(
    Boolean(user?.isProfileComplete || (user as any)?.isNinVerified),
  )
  const [userProfile, setUserProfile] = useState<UserProfileInfo>({
    firstName:
      user?.firstName && user.firstName !== "Customer" ? user.firstName : "",
    lastName: user?.lastName || "",
    email: user?.email && user.email !== "customer@dart.ng" ? user.email : "",
    phone:
      user?.phoneNumber &&
      user.phoneNumber !== "+234 703 101 3632" &&
      user.phoneNumber !== "+2347031013632"
        ? user.phoneNumber
        : "",
    gender: (user as any)?.gender || "",
    avatarUrl: user?.profileImageUrl || "",
    memberId: initialMemberId,
    isVerified: Boolean(user?.isProfileComplete || (user as any)?.isNinVerified),
    location: "",
  })
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState<boolean>(false)
  const [isAppearanceModalOpen, setIsAppearanceModalOpen] =
    useState<boolean>(false)
  const [isRateRiderModalOpen, setIsRateRiderModalOpen] =
    useState<boolean>(false)
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>({
    id: "en",
    name: "English",
    isDefault: true,
  })

  // Sync profile and verification status live from backend
  useEffect(() => {
    if (user) {
      setUserProfile((prev) => ({
        ...prev,
        firstName:
          user.firstName && user.firstName !== "Customer"
            ? user.firstName
            : prev.firstName,
        lastName: user.lastName || prev.lastName,
        email:
          user.email && user.email !== "customer@dart.ng"
            ? user.email
            : prev.email,
        phone:
          user.phoneNumber &&
          user.phoneNumber !== "+2347031013632" &&
          user.phoneNumber !== "+234 703 101 3632"
            ? user.phoneNumber
            : prev.phone,
        gender: (user as any)?.gender || prev.gender,
        avatarUrl: user.profileImageUrl || prev.avatarUrl,
        memberId: user.memberId || formatMemberId(user.id),
        isVerified: Boolean(user.isProfileComplete || (user as any)?.isNinVerified),
      }))
    }

    const loadFreshData = async () => {
      try {
        const [profileRes, verifRes, addrRes] = await Promise.allSettled([
          userApi.getProfile(),
          userApi.getVerificationStatus(),
          userApi.getAddresses(),
        ])

        const fresh = profileRes.status === "fulfilled" ? profileRes.value : null
        const verif = verifRes.status === "fulfilled" ? verifRes.value : null
        const addresses = addrRes.status === "fulfilled" ? addrRes.value : []
        const defaultAddr =
          (addresses as any[])?.find?.((a) => a.isDefault) ||
          (addresses as any[])?.[0]
        const locationStr = defaultAddr
          ? `${defaultAddr.city || ""}, ${defaultAddr.state || ""}`
              .trim()
              .replace(/^,|,$/g, "")
          : "Lagos, Nigeria"

        const verified = Boolean(
          fresh?.isProfileComplete ||
          verif?.isNinVerified ||
          verif?.identityProfile?.kycStatus === "VERIFIED",
        )
        setIsVerified(verified)

        setUserProfile((prev) => ({
          ...prev,
          firstName: fresh?.firstName || prev.firstName,
          lastName: fresh?.lastName || prev.lastName,
          email: fresh?.email || prev.email,
          phone: fresh?.phoneNumber || prev.phone,
          gender: (fresh as any)?.gender || prev.gender,
          avatarUrl: fresh?.profileImageUrl || prev.avatarUrl,
          memberId:
            fresh?.memberId ||
            formatMemberId(fresh?.id || user?.id),
          isVerified: verified,
          location: locationStr || prev.location,
        }))
      } catch (e) {
        console.warn("[Account] Sync note:", e)
      }
    }

    loadFreshData()
  }, [user])
  const { theme, setTheme, resolvedTheme } = useTheme()

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

  if (view === "help") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <HelpCentre
            onBack={() => setView("main")}
            onContactSupport={() => setView("contact")}
            onReportIssue={() => setView("report")}
          />
        </div>
      </div>
    )
  }

  if (view === "contact") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <ContactSupport
            onBack={() => setView("main")}
            onReportIssue={() => setView("report")}
          />
        </div>
      </div>
    )
  }

  if (view === "report") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <ReportIssue
            onBack={() => setView("main")}
            onSubmitSuccess={() => setView("main")}
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

  if (view === "profile") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <Profile
            onBack={() => setView("main")}
            userProfile={userProfile}
            onOpenNotifications={onOpenNotifications}
            onVerifyIdentity={() => setView("verification")}
            onEditPersonalInformation={() => setView("personal")}
            onUpdateProfile={(updated) =>
              setUserProfile((prev) => ({ ...prev, ...updated }))
            }
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
            initialProfile={userProfile}
            onSave={(updated) => setUserProfile(updated)}
            onOpenNotifications={onOpenNotifications}
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
            currentType="customer"
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

  if (view === "notifications") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <NotificationPreferences onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  if (view === "address") {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative transition-colors">
          <SavedAddress onBack={() => setView("main")} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
      {/* Container for Desktop Centering */}
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative pb-24 md:pb-12 transition-colors">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <button
            type="button"
            onClick={onBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>
          <h1 className="text-xl font-medium text-gray-900 dark:text-white">
            Account
          </h1>
          <NotificationButton
            variant="standard"
            onClick={onOpenNotifications}
          />
          {/* Spacer to keep title centered on desktop when notification button is hidden */}
          <div className="w-10 hidden xl:block" aria-hidden="true" />
        </div>

        <div className="flex-1 px-3.5 sm:px-8 md:px-10 py-5 sm:py-8 flex flex-col gap-6 sm:gap-8">
          {/* Profile Header */}
          <div
            onClick={() => setView("profile")}
            className="flex items-center justify-between cursor-pointer group hover:opacity-95 transition-opacity"
          >
            <div className="flex items-center gap-4">
              <div className="relative group/avatar shrink-0">
                <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center border border-gray-100 dark:border-white/10 group-hover:ring-2 group-hover:ring-yellow-400 transition-all">
                  {user?.profileImageUrl || userProfile.avatarUrl ? (
                    <img
                      src={user?.profileImageUrl || userProfile.avatarUrl}
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
                      user?.profileImageUrl || userProfile.avatarUrl ? "hidden" : "flex"
                    }`}
                  >
                    {(() => {
                      const name =
                        `${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() ||
                        (userProfile.email ? userProfile.email.split("@")[0] : "Account")
                      return (name.charAt(0) || "U").toUpperCase()
                    })()}
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
                  {`${userProfile.firstName || ""} ${userProfile.lastName || ""}`.trim() ||
                    (userProfile.email && userProfile.email.includes("@")
                      ? userProfile.email.split("@")[0].charAt(0).toUpperCase() +
                        userProfile.email.split("@")[0].slice(1)
                      : "Personal Account")}
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

          {/* Account Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              Account
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              <button
                onClick={() => setView("personal")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

              <button
                onClick={() => setView("verification")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <ShieldCheck className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Account Verification
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                      {userProfile.memberId || "DART-USR-88219"}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              <button
                onClick={() => setView("account-type")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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
                        Personal
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Switch account type or become a rider
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              <button
                onClick={() => setView("address")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Saved Address
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Manage your home , work and other address
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              <button
                onClick={() => setView("payment")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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
                      Manage cards bank account and wallets
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>
          </section>

          {/* Preference Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              Preference
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              <button
                onClick={() => setView("notifications")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

              {/* Appearance Interactive Row */}
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

              <button
                onClick={() => setIsLanguageModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

          {/* Support Section */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              Support
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              <button
                onClick={() => setView("help")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

              <button
                onClick={() => setView("contact")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

              <button
                onClick={() => setIsRateRiderModalOpen(true)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center border border-amber-200/40 dark:border-amber-400/20 shrink-0">
                    <Star className="w-5 h-5 text-amber-500" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Rate Riders
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Help us reward great riders
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              <button
                onClick={() => setView("rate")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
              >
                <div className="flex items-center gap-4 text-left">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0">
                    <Sparkles className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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

              <button className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group">
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

          {/* About Section */}
          <section className="mb-8">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 px-2">
              About
            </h3>
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
              <button
                onClick={() => setView("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

              <button
                onClick={() => setView("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

              <button
                onClick={() => setView("about")}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
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

              <button
                onClick={async () => {
                  if (window.confirm("Are you sure you want to sign out?")) {
                    await logout()
                    onBack?.()
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
                      Log out of your DART account
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
        onSaveLanguage={(lang) => setSelectedLanguage(lang)}
      />

      {/* Appearance Selection Modal */}
      <AppearanceModal
        isOpen={isAppearanceModalOpen}
        onClose={() => setIsAppearanceModalOpen(false)}
      />

      {/* Rate Rider Modal */}
      <RateRiderModal
        isOpen={isRateRiderModalOpen}
        onClose={() => setIsRateRiderModalOpen(false)}
        riderName="Assigned Rider"
      />
    </div>
  )
}
