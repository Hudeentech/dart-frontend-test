import { useState, useEffect, useRef, type ReactNode } from "react"
import {
  Home,
  Package,
  Wallet,
  MessageCircle,
  User,
  MapPin,
  Navigation,
  Bike,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
} from "lucide-react"
import { navigate } from "../hooks/router"
import { useRider } from "../context/RiderContext"
import { useAuth } from "../context/AuthContext"
import { useTheme } from "../context/ThemeContext"
import { Badge, cx } from "./ui"
import { STATUS_BUCKET, STATUS_LABEL, STATUS_TONE, formatAddress, formatNaira, riderEarning, timeAgo } from "../utils/format"
import type { Order } from "../types/api.types"

import DartLogo from "./DartLogo"
import { NotificationsPage } from "../pages/NotificationsPage"

export function Logo({ className }: { className?: string }) {
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <DartLogo variant="auto" className="h-8.5 w-auto" />
      <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-black bg-[#FFCC00] px-2 py-0.5 rounded-full shadow-2xs">
        Rider
      </span>
    </div>
  )
}

const NAV = [
  { path: "/", label: "Home", icon: Home, match: (p: string) => p === "/" },
  { path: "/jobs", label: "Orders", icon: Package, match: (p: string) => p.startsWith("/jobs") },
  { path: "/earnings", label: "Wallet", icon: Wallet, match: (p: string) => p.startsWith("/earnings") },
  { path: "/messages", label: "Messages", icon: MessageCircle, match: (p: string) => p.startsWith("/messages") },
  { path: "/profile", label: "Account", icon: User, match: (p: string) => p.startsWith("/profile") },
]

export function AppShell({
  path,
  children,
  hideNav,
  hideBottomNav,
}: {
  path: string
  children: ReactNode
  hideNav?: boolean
  hideBottomNav?: boolean
}) {
  const { orders } = useRider()
  const { user } = useAuth()
  const { resolvedTheme, toggleTheme } = useTheme()
  const requestCount = orders.filter((o) => o.status === "RIDER_ASSIGNED" || o.status === "PAYMENT_CONFIRMED").length

  const isHome = path === "/"

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

  const riderName = user?.firstName?.trim()
    ? `${user.firstName} ${user.lastName || ""}`.trim()
    : "Verified Rider"
  const riderInitial = user?.firstName?.charAt(0).toUpperCase() || "R"

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] bg-[#fcfcfc] dark:bg-[#0c0c0e] text-gray-900 dark:text-white flex-col md:flex-row w-full overflow-hidden relative transition-colors">
      {/* Navigation: Sidebar on Desktop & Tablet, Fixed Bottom Bar on Mobile */}
      {!hideNav && (
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
                        hideBottomNav ? "hidden md:flex" : "flex"
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
                  title="Dart Rider - Click to expand"
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
                <Logo />
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

          {/* Navigation Links */}
          <div className="flex md:flex-col justify-around md:justify-start w-full gap-0.5 md:gap-2">
            {NAV.map((item) => {
              const active = item.match(path)
              const Icon = item.icon
              return (
                <button
                  key={item.path}
                  id={`nav-${item.label.toLowerCase()}`}
                  onClick={() => navigate(item.path)}
                  title={item.label}
                  className={`flex flex-col md:flex-row items-center ${
                    isSidebarCollapsed
                      ? "md:justify-center md:px-0 md:py-3"
                      : "md:justify-start md:px-4 md:py-3"
                  } justify-center gap-1 md:gap-3 py-1.5 rounded-xl relative transition-all duration-200 flex-1 md:flex-initial min-h-[44px] touch-manipulation cursor-pointer group ${
                    active
                      ? "text-gray-900 dark:text-white md:bg-yellow-400/10 font-semibold"
                      : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 font-medium"
                  }`}
                >
                  <div className="relative">
                    <Icon
                      className="w-5 h-5 sm:w-6 sm:h-6 md:w-5 md:h-5 shrink-0"
                      fill={active ? (item.label === "Account" ? "none" : "currentColor") : "none"}
                      strokeWidth={active ? 2 : 1.5}
                    />
                    {item.label === "Orders" && requestCount > 0 && (
                      <span className="absolute -top-1 -right-2 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-sm">
                        {requestCount}
                      </span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] sm:text-xs md:text-sm tracking-tight ${
                      isSidebarCollapsed ? "md:hidden" : ""
                    }`}
                  >
                    {item.label}
                  </span>

                  {/* Mobile active indicator */}
                  {active && (
                    <div className="h-1 w-8 bg-yellow-400 dark:bg-yellow-400 rounded-full absolute -bottom-0.5 left-1/2 -translate-x-1/2 md:hidden" />
                  )}

                  {/* Collapsed sidebar active vertical indicator */}
                  {active && isSidebarCollapsed && (
                    <div className="hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-yellow-400 rounded-r-full" />
                  )}

                  {/* Tooltip on collapsed desktop view */}
                  {isSidebarCollapsed && (
                    <span className="hidden md:group-hover:flex items-center absolute left-full ml-3 px-2.5 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-xs font-semibold rounded-md whitespace-nowrap shadow-md z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      {item.label}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Bottom Sidebar Controls on Desktop/Tablet (Theme toggle & Rider Card) */}
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
                title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
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
                  <span>{resolvedTheme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-white/10 text-gray-600 dark:text-gray-300">
                  {resolvedTheme === "dark" ? "Dark" : "Light"}
                </span>
              </button>
            )}

            {/* Rider mini profile row */}
            {!isSidebarCollapsed && (
              <div
                onClick={() => navigate("/profile")}
                className="flex items-center gap-3 p-2 rounded-2xl transition-all cursor-pointer group touch-manipulation border border-transparent hover:bg-gray-100/80 dark:hover:bg-white/5 hover:border-gray-200/50 dark:hover:border-white/5"
              >
                <div className="relative shrink-0">
                  <div className="w-9 h-9 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 font-bold flex items-center justify-center text-sm ring-2 ring-yellow-400/20 group-hover:ring-yellow-400 transition-all">
                    {riderInitial}
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161618] absolute bottom-0 right-0" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-gray-900 dark:text-white truncate block group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
                    {riderName}
                  </span>
                  <p className="text-[11px] text-gray-400 dark:text-gray-400 truncate">
                    Verified Courier
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            )}
          </div>
        </nav>
      )}

      {/* Main Page Area */}
      <main
        key={path}
        className={cx(
          "flex-1 min-h-0 h-full w-full relative bg-transparent transition-colors flex flex-col pt-0 md:pt-0 xl:pt-0",
          hideBottomNav
            ? "overflow-y-auto pb-0 md:px-4 md:pb-4 xl:px-6 xl:pb-6"
            : !hideNav
              ? "overflow-y-auto pb-24 md:pb-6 md:px-4 xl:px-6"
              : "overflow-y-auto pb-6 md:px-4 xl:px-6",
        )}
      >
        <div className="w-full max-w-5xl mx-auto flex-1 min-h-0 h-full flex flex-col">
          {children}
        </div>
      </main>

      {/* Right Sidebar: Live Notifications Panel on Desktop (matching customer layout) */}
      {!hideNav && path !== "/notifications" && (
        <aside className="hidden xl:flex w-[340px] 2xl:w-[380px] bg-white dark:bg-[#161618] border-l border-gray-200/70 dark:border-white/5 shrink-0 flex-col h-full transition-colors z-20 overflow-hidden">
          <NotificationsPage embedded={true} />
        </aside>
      )}
    </div>
  )
}

export function JobCard({ order, compact }: { order: Order; compact?: boolean }) {
  const bucket = STATUS_BUCKET[order.status]
  return (
    <button
      id={`job-${order.id}`}
      onClick={() => navigate(`/jobs/${order.id}`)}
      className={cx(
        "glass block w-full rounded-3xl p-4 text-left transition hover:border-gray-300 dark:hover:border-white/15 active:scale-[0.99] text-gray-900 dark:text-white cursor-pointer",
        bucket === "requests" && (order.status === "RIDER_ASSIGNED" || order.status === "PAYMENT_CONFIRMED") && "border-yellow-400/40 dark:border-brand/30 ring-1 ring-yellow-400/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-gray-900 dark:text-white">{order.package?.name || "Package"}</p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-white/40">
            {order.orderNumber} · {timeAgo(order.createdAt)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-extrabold text-yellow-600 dark:text-brand">{formatNaira(riderEarning(order) || order.totalPrice)}</p>
          <p className="text-[10px] text-gray-500 dark:text-white/40">{riderEarning(order) ? "your earning" : "order total"}</p>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 space-y-2.5 border-l border-dashed border-gray-200 dark:border-white/15 pl-4">
          <div className="relative">
            <MapPin className="absolute -left-[22px] top-0.5 size-3.5 rounded-full bg-white dark:bg-ink-900 text-yellow-600 dark:text-brand ring-2 ring-white dark:ring-ink-900" />
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/35 font-medium">Pickup</p>
            <p className="truncate text-sm text-gray-800 dark:text-white/85 font-medium">{formatAddress(order.pickupAddress)}</p>
          </div>
          <div className="relative">
            <Navigation className="absolute -left-[22px] top-0.5 size-3.5 rounded-full bg-white dark:bg-ink-900 text-emerald-600 dark:text-emerald-400 ring-2 ring-white dark:ring-ink-900" />
            <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-white/35 font-medium">Drop-off</p>
            <p className="truncate text-sm text-gray-800 dark:text-white/85 font-medium">{formatAddress(order.destinationAddress)}</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Badge tone={STATUS_TONE[order.status]}>{STATUS_LABEL[order.status]}</Badge>
        {order.distanceKm != null && (
          <span className="text-xs text-gray-500 dark:text-white/40 font-medium">
            {order.distanceKm.toFixed(1)} km{order.estimatedMinutes ? ` · ~${order.estimatedMinutes} min` : ""}
          </span>
        )}
      </div>
    </button>
  )
}
