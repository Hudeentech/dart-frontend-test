import { useState, useEffect } from "react"
import {
  ArrowLeft,
  MoreVertical,
  Wallet,
  Package,
  Check,
  Trash2,
  Bell,
  CheckCheck,
} from "lucide-react"
import {
  useNotifications,
  NotificationItem,
} from "../context/NotificationContext"

type Tab = "All" | "Delivery" | "System"

export default function Notifications({
  onClose,
  embedded = false,
}: {
  onClose?: () => void
  embedded?: boolean
}) {
  const [activeTab, setActiveTab] = useState<Tab>("All")
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [isHighlighted, setIsHighlighted] = useState(false)

  const {
    notifications,
    unreadCount,
    markAllAsRead,
    markAsRead,
    clearNotifications,
    highlightTrigger,
  } = useNotifications()

  // Desktop highlight effect when bell button is clicked
  useEffect(() => {
    if (embedded && highlightTrigger > 0) {
      setIsHighlighted(true)
      const timer = setTimeout(() => setIsHighlighted(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [highlightTrigger, embedded])

  const handleClear = () => {
    clearNotifications()
    setShowClearConfirm(false)
    setShowMenu(false)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
    setShowMenu(false)
  }

  const filteredNotifications = notifications.filter(
    (item: NotificationItem) => {
      if (filterUnreadOnly && !item.isUnread) return false
      if (activeTab === "Delivery") return item.type === "Delivery"
      if (activeTab === "System") return item.type === "System"
      return true
    },
  )

  const todayItems = filteredNotifications.filter(
    (n) => n.dateGroup === "Today",
  )
  const thisWeekItems = filteredNotifications.filter(
    (n) => n.dateGroup === "This week",
  )

  const containerClass = embedded
    ? `flex flex-col h-full w-full bg-white dark:bg-[#161618] relative transition-all duration-300 overflow-hidden ${
        isHighlighted
          ? "ring-2 ring-yellow-400/80 shadow-[0_0_20px_rgba(250,204,21,0.25)]"
          : ""
      }`
    : "absolute inset-0 bg-white dark:bg-[#161618] z-[60] flex flex-col h-full overflow-hidden transition-colors"

  return (
    <div className={containerClass}>
      <div
        className={
          embedded
            ? "flex flex-col h-full w-full relative"
            : "w-full max-w-2xl mx-auto flex flex-col h-full bg-white dark:bg-[#161618] relative transition-colors"
        }
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#161618] sticky top-0 z-10 ${
            embedded ? "px-5 py-4" : "px-4 py-4"
          }`}
        >
          {embedded ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black shadow-2xs">
                <Bell className="w-4 h-4" />
              </div>
              <h2 className="font-semibold text-gray-900 dark:text-white text-base">
                Notifications
              </h2>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-black animate-in fade-in zoom-in duration-150">
                  {unreadCount}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {onClose && (
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-white transition-colors cursor-pointer"
                  title="Close notifications"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-black animate-in fade-in zoom-in duration-150">
                  {unreadCount}
                </span>
              )}
            </div>
          )}

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              aria-label="Notification settings"
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#202024] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-2 z-20">
                <button
                  onClick={() => {
                    setFilterUnreadOnly(false)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between text-gray-900 dark:text-white cursor-pointer"
                >
                  All Notifications
                  {!filterUnreadOnly && (
                    <Check className="w-4 h-4 text-yellow-500" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setFilterUnreadOnly(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between text-gray-900 dark:text-white cursor-pointer"
                >
                  Unread only
                  {filterUnreadOnly && (
                    <Check className="w-4 h-4 text-yellow-500" />
                  )}
                </button>
                <button
                  onClick={handleMarkAllAsRead}
                  className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  <CheckCheck className="w-4 h-4" />
                  Mark all as read
                </button>
                <div className="h-px bg-gray-100 dark:bg-white/10 my-1"></div>
                <button
                  onClick={() => {
                    setShowClearConfirm(true)
                    setShowMenu(false)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete all
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          className={`flex items-center gap-1.5 border-b border-gray-50 dark:border-white/5 ${
            embedded ? "px-5 py-3" : "px-3.5 sm:px-6 py-3"
          }`}
        >
          {(["All", "Delivery", "System"] as Tab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab
                  ? "bg-yellow-400 text-black font-semibold shadow-xs"
                  : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="ml-auto text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              Mark read
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 mb-3">
                <Bell className="w-7 h-7" />
              </div>
              <p className="text-gray-900 dark:text-white font-medium text-sm">
                No notifications found
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[240px]">
                {filterUnreadOnly
                  ? "No unread notifications at the moment."
                  : "Updates about deliveries and promotions will appear here."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Today Section */}
              {todayItems.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      Today
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {todayItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => item.isUnread && markAsRead(item.id)}
                        className={`flex gap-3 p-3.5 rounded-2xl transition-all relative border cursor-pointer ${
                          item.isUnread
                            ? "bg-yellow-50/70 dark:bg-yellow-400/10 border-yellow-200/50 dark:border-yellow-400/20 shadow-2xs"
                            : "bg-gray-50/50 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            item.icon === "wallet"
                              ? "bg-yellow-400 text-black"
                              : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {item.icon === "wallet" ? (
                            <Wallet className="w-4 h-4" />
                          ) : (
                            <Package className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white leading-snug">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                            {item.time}
                          </p>
                        </div>
                        {item.isUnread && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 shrink-0 animate-pulse"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* This week Section */}
              {thisWeekItems.length > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      This week
                    </h3>
                  </div>

                  <div className="space-y-2.5">
                    {thisWeekItems.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => item.isUnread && markAsRead(item.id)}
                        className={`flex gap-3 p-3.5 rounded-2xl transition-all border cursor-pointer ${
                          item.isUnread
                            ? "bg-yellow-50/70 dark:bg-yellow-400/10 border-yellow-200/50 dark:border-yellow-400/20 shadow-2xs"
                            : "bg-gray-50/50 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            item.icon === "wallet"
                              ? "bg-yellow-400 text-black shadow-2xs"
                              : "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {item.icon === "wallet" ? (
                            <Wallet className="w-4 h-4" />
                          ) : (
                            <Package className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pr-2">
                          <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white leading-snug">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                            {item.time}
                          </p>
                        </div>
                        {item.isUnread && (
                          <div className="w-2 h-2 bg-yellow-500 rounded-full mt-1.5 shrink-0 animate-pulse"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Delete Confirmation Modal Overlay */}
          {showClearConfirm && (
            <div className="absolute inset-0 bg-black/60 z-50 flex items-end justify-center p-4">
              <div className="bg-white dark:bg-[#202024] w-full rounded-2xl p-5 shadow-2xl animate-in slide-in-from-bottom border border-gray-100 dark:border-white/10">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">
                    Clear notifications?
                  </h2>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="w-7 h-7 flex items-center justify-center bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-full text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-gray-500 dark:text-gray-400 mb-5 text-xs leading-relaxed">
                  We'll remove all notifications from your list.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/15 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClear}
                    className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-red-500 text-white hover:bg-red-600 transition-colors cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
