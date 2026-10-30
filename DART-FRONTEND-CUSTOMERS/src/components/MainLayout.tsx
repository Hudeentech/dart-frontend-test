import { useState, useEffect, useRef } from "react"
import {
  Home,
  Package,
  Wallet,
  MessageSquare,
  User,
  Sun,
  Moon,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import { useNotifications } from "../context/NotificationContext"
import { useAuth } from "../context/AuthContext"
import HomeScreen from "../imports/Home"
import PackagesScreen from "../imports/Packages"
import WalletScreen from "../imports/Wallet"
import MessagesScreen from "../imports/Messages"
import AccountScreen from "../imports/Account"
import NotificationsScreen from "../imports/Notifications"
import DartLogo from "./DartLogo"

type Tab = "home" | "packages" | "wallet" | "messages" | "account"

export default function MainLayout() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [inPackageProcedure, setInPackageProcedure] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { isNotificationsOpen, openNotifications, closeNotifications } =
    useNotifications()
  const { resolvedTheme, toggleTheme } = useTheme()

  // Tablet mode auto-collapse: defaults to collapsed on tablet screens (768px <= width < 1280px)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768 && window.innerWidth < 1280
    }
    return false
  })

  const userToggledRef = useRef(false)

  useEffect(() => {
    const handleResize = () => {
      if (!userToggledRef.current) {
        const isTablet = window.innerWidth >= 768 && window.innerWidth < 1280
        setIsSidebarCollapsed(isTablet)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const handleToggleSidebar = () => {
    userToggledRef.current = true
    setIsSidebarCollapsed((prev) => !prev)
  }

  // Bottom navigation visibility on mobile screens:
  // Visible ONLY on Home (idle), Packages (idle), and Messages list (when no active chat conversation is open).
  // Hidden during package procedure screens (SendPackage, RequestPickup, DeliveryDetails) or active chat screens.
  const isBottomNavVisible =
    !inPackageProcedure &&
    !isChatOpen &&
    (activeTab === "home" ||
      activeTab === "packages" ||
      activeTab === "messages")

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-[#fcfcfc] dark:bg-[#0c0c0e] flex-col md:flex-row w-full overflow-hidden relative transition-colors">
      {/* Notifications Overlay (for Mobile / small screens) */}
      {isNotificationsOpen && (
        <NotificationsScreen onClose={closeNotifications} />
      )}

      {/* Left Navigation (Sidebar on Desktop & Tablet, Bottom Bar on Mobile) */}
      <nav
        className={`bg-white/95 dark:bg-[#161618]/95 backdrop-blur-md border-gray-200/70 dark:border-white/5 order-last md:order-first 
                      border-t md:border-t-0 md:border-r 
                      px-2 sm:px-6 py-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0px))] 
                      ${
                        isSidebarCollapsed
                          ? "md:px-2 md:py-6 md:w-20"
                          : "md:px-4 md:py-8 md:w-64"
                      }
                      ${
                        isBottomNavVisible ? "flex" : "hidden md:flex"
                      } md:flex-col justify-around md:justify-start gap-0.5 md:gap-2
                      w-full z-40 shrink-0 transition-all duration-300 ease-in-out shadow-[0_-4px_20px_rgba(0,0,0,0.04)] dark:shadow-none`}
      >
        {/* Sidebar Header with Logo & Collapse Toggle (Desktop & Tablet) */}
        <div className="hidden md:flex items-center mb-7 transition-all duration-300">
          {isSidebarCollapsed ? (
            <div className="w-full flex flex-col items-center gap-3">
              <button
                type="button"
                onClick={handleToggleSidebar}
                className="p-1.5 rounded-xl hover:bg-gray-100/80 dark:hover:bg-white/5 active:scale-95 transition-all cursor-pointer touch-manipulation focus:outline-none flex items-center justify-center"
                title="Dart - Click to expand"
                aria-label="Expand side menu"
              >
                <DartLogo variant="auto" className="h-7 w-auto max-w-[60px]" />
              </button>
              <button
                type="button"
                onClick={handleToggleSidebar}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer touch-manipulation"
                title="Expand side menu"
                aria-label="Expand side menu"
              >
                <PanelLeftOpen className="w-4.5 h-4.5" />
              </button>
            </div>
          ) : (
            <div className="w-full flex items-center justify-between px-1">
              <DartLogo variant="auto" className="h-8.5 w-auto" />
              <button
                type="button"
                onClick={handleToggleSidebar}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all cursor-pointer touch-manipulation"
                title="Collapse side menu"
                aria-label="Collapse side menu"
              >
                <PanelLeftClose className="w-4.5 h-4.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex md:flex-col justify-around md:justify-start w-full gap-0.5 md:gap-2">
          {[
            { id: "home", icon: Home, label: "Home" },
            { id: "packages", icon: Package, label: "Packages" },
            { id: "wallet", icon: Wallet, label: "Wallet" },
            { id: "messages", icon: MessageSquare, label: "Messages" },
            { id: "account", icon: User, label: "Account" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              title={item.label}
              className={`flex flex-col md:flex-row items-center ${
                isSidebarCollapsed
                  ? "md:justify-center md:px-0 md:py-3"
                  : "md:justify-start md:px-4 md:py-3"
              } justify-center gap-1 md:gap-3 py-1.5 rounded-xl relative transition-all duration-200 flex-1 md:flex-initial min-h-[44px] touch-manipulation cursor-pointer group ${
                activeTab === item.id
                  ? "text-gray-900 dark:text-white md:bg-yellow-400/10 font-semibold"
                  : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"
              }`}
            >
              <item.icon
                className="w-5 h-5 sm:w-6 sm:h-6 md:w-5 md:h-5 shrink-0"
                fill={
                  activeTab === item.id
                    ? item.id === "account"
                      ? "none"
                      : "currentColor"
                    : "none"
                }
                strokeWidth={activeTab === item.id ? 2 : 1.5}
              />

              {/* Label */}
              <span
                className={`text-[10px] sm:text-xs md:text-sm tracking-tight ${
                  isSidebarCollapsed ? "md:hidden" : ""
                }`}
              >
                {item.label}
              </span>

              {/* Mobile active indicator */}
              {activeTab === item.id && (
                <div className="h-1 w-8 bg-yellow-400 dark:bg-yellow-400 rounded-full absolute -bottom-0.5 left-1/2 -translate-x-1/2 md:hidden" />
              )}

              {/* Collapsed sidebar active vertical indicator */}
              {activeTab === item.id && isSidebarCollapsed && (
                <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-yellow-400 rounded-r-full" />
              )}

              {/* Collapsed sidebar hover tooltip on tablet/desktop */}
              {isSidebarCollapsed && (
                <span className="hidden md:group-hover:flex items-center absolute left-full ml-3 px-2.5 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-md whitespace-nowrap shadow-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {item.label}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Desktop & Tablet Profile Component & Controls at bottom of sidebar */}
        <div
          className={`hidden md:flex mt-auto pt-4 border-t border-gray-100 dark:border-white/5 flex-col ${
            isSidebarCollapsed ? "items-center gap-3" : "gap-2"
          }`}
        >
          {/* Quick Theme Switcher */}
          {isSidebarCollapsed ? (
            <button
              onClick={toggleTheme}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors cursor-pointer relative group"
              title={`Switch to ${
                resolvedTheme === "dark" ? "light" : "dark"
              } mode`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
              <span className="hidden md:group-hover:flex items-center absolute left-full ml-3 px-2.5 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-md whitespace-nowrap shadow-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            </button>
          ) : (
            <button
              onClick={toggleTheme}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Toggle theme"
            >
              <span className="flex items-center gap-2">
                {resolvedTheme === "dark" ? (
                  <Sun className="w-4 h-4 text-yellow-400" />
                ) : (
                  <Moon className="w-4 h-4 text-gray-600" />
                )}
                <span>
                  {resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}
                </span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                {resolvedTheme === "dark" ? "Dark" : "Light"}
              </span>
            </button>
          )}

          {/* Profile Component */}
          {(() => {
            const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
            const displayName =
              fullName ||
              (user?.email && user.email.includes("@")
                ? user.email.split("@")[0].charAt(0).toUpperCase() +
                  user.email.split("@")[0].slice(1)
                : "Personal Account")
            const displaySubtitle =
              user?.email || user?.phoneNumber || "Verified Account"
            const avatarSrc = user?.profileImageUrl || null
            const initialLetter = (displayName.charAt(0) || "U").toUpperCase()

            return isSidebarCollapsed ? (
              <div
                onClick={() => setActiveTab("account")}
                className="relative p-1 rounded-full cursor-pointer group touch-manipulation"
                title={`Account: ${displayName}`}
              >
                <div className="relative">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className={`w-10 h-10 rounded-full object-cover ring-2 transition-all ${
                        activeTab === "account"
                          ? "ring-yellow-400 scale-105"
                          : "ring-yellow-400/20 group-hover:ring-yellow-400"
                      }`}
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback") as HTMLElement
                        if (fallback) fallback.style.display = "flex"
                      }}
                    />
                  ) : null}
                  <div
                    className={`avatar-fallback w-10 h-10 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-bold flex items-center justify-center text-sm ring-2 transition-all ${
                      avatarSrc ? "hidden" : "flex"
                    } ${
                      activeTab === "account"
                        ? "ring-yellow-400 scale-105"
                        : "ring-yellow-400/20 group-hover:ring-yellow-400"
                    }`}
                  >
                    {initialLetter}
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161618] absolute bottom-0 right-0"></div>
                </div>
                <span className="hidden md:group-hover:flex items-center absolute left-full ml-3 px-2.5 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-md whitespace-nowrap shadow-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  {displayName} (Account)
                </span>
              </div>
            ) : (
              <div
                onClick={() => setActiveTab("account")}
                className={`flex items-center gap-3 p-2 rounded-2xl transition-all cursor-pointer group touch-manipulation border ${
                  activeTab === "account"
                    ? "bg-yellow-50 dark:bg-yellow-400/10 border-yellow-400/30 dark:border-yellow-400/20"
                    : "border-transparent hover:bg-gray-100/80 dark:hover:bg-white/5 hover:border-gray-200/50 dark:hover:border-white/5"
                }`}
              >
                {/* Avatar with Status Indicator */}
                <div className="relative shrink-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={displayName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-yellow-400/20 group-hover:ring-yellow-400 transition-all"
                      onError={(e) => {
                        e.currentTarget.style.display = "none"
                        const fallback = e.currentTarget.parentElement?.querySelector(".avatar-fallback") as HTMLElement
                        if (fallback) fallback.style.display = "flex"
                      }}
                    />
                  ) : null}
                  <div
                    className={`avatar-fallback w-10 h-10 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-bold flex items-center justify-center text-sm ring-2 ring-yellow-400/20 group-hover:ring-yellow-400 transition-all ${
                      avatarSrc ? "hidden" : "flex"
                    }`}
                  >
                    {initialLetter}
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161618] absolute bottom-0 right-0"></div>
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                    {displayName}
                  </span>
                  <p className="text-xs text-gray-400 dark:text-gray-400 truncate">
                    {displaySubtitle}
                  </p>
                </div>

                {/* Navigation Chevron */}
                <ChevronRight
                  className={`w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ${
                    activeTab === "account" ? "text-yellow-500" : ""
                  }`}
                />
              </div>
            )
          })()}
        </div>
      </nav>

      {/* Main Content Area: Middle parent component with padding & active scrolling (no top padding) */}
      <main className="flex-1 min-h-0 h-full w-full relative bg-transparent transition-colors flex flex-col overflow-y-auto pt-0 md:pt-0 xl:pt-0 md:px-4 md:pb-4 xl:px-6 xl:pb-6">
        {activeTab === "home" && (
          <HomeScreen
            onOpenNotifications={openNotifications}
            onNavigateToPackages={() => setActiveTab("packages")}
            onProcedureChange={setInPackageProcedure}
            onNavigateToAccount={() => setActiveTab("account")}
          />
        )}
        {activeTab === "packages" && (
          <PackagesScreen
            onOpenNotifications={openNotifications}
            onProcedureChange={setInPackageProcedure}
          />
        )}
        {activeTab === "wallet" && (
          <WalletScreen
            onBack={() => setActiveTab("home")}
            onOpenNotifications={openNotifications}
          />
        )}
        {activeTab === "messages" && (
          <MessagesScreen onChatOpenChange={setIsChatOpen} />
        )}
        {activeTab === "account" && (
          <AccountScreen
            onOpenNotifications={openNotifications}
            onBack={() => setActiveTab("home")}
          />
        )}
      </main>

      {/* Right Sidebar: Notifications Panel on Desktop (Replaces old Dashboard) */}
      <aside className="hidden xl:flex w-[340px] 2xl:w-[380px] bg-white dark:bg-[#161618] border-l border-gray-200/70 dark:border-white/5 shrink-0 flex-col h-full transition-colors z-20 overflow-hidden">
        <NotificationsScreen embedded={true} />
      </aside>
    </div>
  )
}
