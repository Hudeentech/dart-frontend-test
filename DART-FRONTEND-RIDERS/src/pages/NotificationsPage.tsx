import { useEffect, useState } from "react"
import { notificationsApi } from "../api/account.api"
import { useRider } from "../context/RiderContext"
import { useToast } from "../context/ToastContext"
import { goBack } from "../hooks/router"
import { PageLoader } from "../components/ui"
import {
  ArrowLeft,
  MoreVertical,
  Wallet,
  Package,
  Check,
  Trash2,
  Bell,
  CheckCheck,
  CheckCircle2,
  Truck,
  Star,
  ShieldCheck,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import type { AppNotification } from "../types/api.types"
import CustomDeleteModal from "../components/CustomDeleteModal"
import SwipeToDeleteItem from "../components/SwipeToDeleteItem"

type Tab = "All" | "Delivery" | "System"

function getNotificationVisual(item: { type?: string; title?: string; message?: string }) {
  const text = `${item.type || ""} ${item.title || ""} ${item.message || ""}`.toLowerCase()

  if (text.includes("alert") || text.includes("cancel") || text.includes("fail") || text.includes("dispute")) {
    return {
      icon: <AlertCircle className="size-4" />,
      bg: "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400",
    }
  }
  if (text.includes("wallet") || text.includes("payment") || text.includes("payout") || text.includes("fund") || text.includes("deposit")) {
    return {
      icon: <Wallet className="size-4" />,
      bg: "bg-yellow-400 text-black shadow-xs",
    }
  }
  if (text.includes("delivered") || text.includes("completed") || text.includes("settled") || text.includes("confirmed")) {
    return {
      icon: <CheckCircle2 className="size-4" />,
      bg: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    }
  }
  if (text.includes("transit") || text.includes("on the way") || text.includes("picked up") || text.includes("en route") || text.includes("dispatch")) {
    return {
      icon: <Truck className="size-4" />,
      bg: "bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400",
    }
  }
  if (text.includes("rating") || text.includes("review") || text.includes("star") || text.includes("feedback")) {
    return {
      icon: <Star className="size-4 fill-amber-400 text-amber-500" />,
      bg: "bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300",
    }
  }
  if (text.includes("verif") || text.includes("identity") || text.includes("nin") || text.includes("security") || text.includes("kyc")) {
    return {
      icon: <ShieldCheck className="size-4" />,
      bg: "bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300",
    }
  }
  if (text.includes("package") || text.includes("order") || text.includes("delivery") || text.includes("request")) {
    return {
      icon: <Package className="size-4" />,
      bg: "bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400",
    }
  }
  return {
    icon: <Sparkles className="size-4" />,
    bg: "bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300",
  }
}

export function NotificationsPage({ embedded = false }: { embedded?: boolean } = {}) {
  const { reloadUnread } = useRider()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<Tab>("All")
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [deletePrompt, setDeletePrompt] = useState<{
    isOpen: boolean
    title: string
    message: string
    itemCount?: number
    confirmText?: string
    onConfirm: () => Promise<void> | void
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(true)

  const loadNotifications = async () => {
    try {
      const res = await notificationsApi.list()
      setNotifications(res?.notifications || [])
    } catch (err: any) {
      toast(err.message || "Failed to load notifications", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadNotifications()
    const refreshTimer = window.setInterval(loadNotifications, 15000)
    return () => window.clearInterval(refreshTimer)
  }, [])

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setShowMenu(false)
    try {
      await notificationsApi.markAllRead()
      await reloadUnread()
      toast("All marked as read", "success")
    } catch {
      // Ignore
    }
  }

  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    try {
      await notificationsApi.markRead(id)
      await reloadUnread()
    } catch {
      // Ignore
    }
  }

  const promptDeleteSingle = (id: string, title?: string) => {
    setDeletePrompt({
      isOpen: true,
      title: "Delete notification?",
      message: `Are you sure you want to delete "${title || "this notification"}"?`,
      itemCount: 1,
      confirmText: "Delete",
      onConfirm: async () => {
        setDeletePrompt((prev) => ({ ...prev, isOpen: false }))
        setNotifications((prev) => prev.filter((n) => n.id !== id))
        try {
          await notificationsApi.remove(id)
          await reloadUnread()
          toast("Notification deleted", "info")
        } catch {
          // Ignore
        }
      },
    })
  }

  const promptClearAll = () => {
    setShowMenu(false)
    if (notifications.length === 0) return
    setDeletePrompt({
      isOpen: true,
      title: "Clear all notifications?",
      message: "Are you sure you want to remove all notifications from your rider notification list?",
      itemCount: notifications.length,
      confirmText: "Clear All",
      onConfirm: async () => {
        setDeletePrompt((prev) => ({ ...prev, isOpen: false }))
        setNotifications([])
        try {
          await notificationsApi.clear()
          await reloadUnread()
          toast("All notifications cleared", "info")
        } catch {
          // Ignore
        }
      },
    })
  }

  const filteredNotifications = notifications.filter((item) => {
    if (filterUnreadOnly && item.isRead) return false
    const typeUpper = (item.type || "").toUpperCase()
    if (activeTab === "Delivery") return typeUpper.includes("ORDER") || typeUpper.includes("DELIVERY")
    if (activeTab === "System") return typeUpper.includes("SYSTEM") || typeUpper.includes("WALLET")
    return true
  })

  // Date grouping helper
  const isToday = (dateStr?: string) => {
    if (!dateStr) return true
    const d = new Date(dateStr)
    const now = new Date()
    return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }

  const todayItems = filteredNotifications.filter((n) => isToday(n.createdAt))
  const earlierItems = filteredNotifications.filter((n) => !isToday(n.createdAt))

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "Just Now"
    const d = new Date(dateStr)
    const diffMs = Date.now() - d.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 2) return "Just Now"
    if (diffMins < 60) return `${diffMins} mins ago`
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (loading) return <PageLoader />

  return (
    <div className={`flex flex-col min-h-full ${embedded ? "bg-white dark:bg-[#161618] h-full" : "bg-transparent pb-10"} text-gray-900 dark:text-white transition-colors`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-gray-200/80 dark:border-white/5 ${embedded ? "bg-white dark:bg-[#161618] px-4 py-3.5" : "bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 px-4 py-4"} backdrop-blur-md sticky top-0 z-20`}>
        <div className="flex items-center gap-2.5">
          {!embedded && (
            <button
              onClick={() => goBack("/")}
              className="size-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-white transition-colors cursor-pointer"
              title="Close notifications"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-yellow-400 text-black">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Notification settings"
            className="size-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <MoreVertical className="size-4" />
          </button>

          {/* Dropdown Menu */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#202024] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-2 z-30">
              <button
                onClick={() => {
                  setFilterUnreadOnly(false)
                  setShowMenu(false)
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between text-gray-900 dark:text-white cursor-pointer"
              >
                All Notifications
                {!filterUnreadOnly && <Check className="size-4 text-yellow-500" />}
              </button>
              <button
                onClick={() => {
                  setFilterUnreadOnly(true)
                  setShowMenu(false)
                }}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-between text-gray-900 dark:text-white cursor-pointer"
              >
                Unread only
                {filterUnreadOnly && <Check className="size-4 text-yellow-500" />}
              </button>
              <button
                onClick={handleMarkAllRead}
                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                <CheckCheck className="size-4" />
                Mark all as read
              </button>
              <div className="h-px bg-gray-100 dark:bg-white/10 my-1" />
              <button
                onClick={promptClearAll}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="size-4" />
                Delete all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 dark:border-white/5 px-4 py-3">
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
            onClick={handleMarkAllRead}
            className="ml-auto text-[11px] text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors cursor-pointer"
          >
            Mark read
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20 px-4">
            <div className="size-14 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 mb-3">
              <Bell className="size-7" />
            </div>
            <p className="text-gray-900 dark:text-white font-medium text-sm">
              No notifications found
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-[240px]">
              {filterUnreadOnly
                ? "No unread notifications at the moment."
                : "Updates about delivery assignments, settlements, and ratings will appear here."}
            </p>
          </div>
        ) : (
          <>
            {/* Today Section */}
            {todayItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Today
                </h3>

                <div className="space-y-2.5">
                  {todayItems.map((item) => {
                    const visual = getNotificationVisual(item)
                    return (
                      <SwipeToDeleteItem
                        key={item.id}
                        onDelete={() => promptDeleteSingle(item.id, item.title)}
                        deleteLabel="Delete"
                      >
                        <div
                          onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                          className={`group relative flex gap-3 p-3.5 rounded-2xl transition-all border cursor-pointer ${
                            !item.isRead
                              ? "bg-yellow-50/70 dark:bg-yellow-400/10 border-yellow-200/50 dark:border-yellow-400/20 shadow-2xs"
                              : "bg-gray-50/60 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                          }`}
                        >
                          <div
                            className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${visual.bg}`}
                          >
                            {visual.icon}
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                              {item.message}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                              {formatTime(item.createdAt)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0 self-start">
                            {!item.isRead && (
                              <div className="size-2 bg-yellow-500 rounded-full mt-1.5 shrink-0 animate-pulse" title="Unread" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                promptDeleteSingle(item.id, item.title)
                              }}
                              title="Delete notification"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </SwipeToDeleteItem>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Earlier Section */}
            {earlierItems.length > 0 && (
              <div>
                <h3 className="font-semibold text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
                  Earlier
                </h3>

                <div className="space-y-2.5">
                  {earlierItems.map((item) => {
                    const visual = getNotificationVisual(item)
                    return (
                      <SwipeToDeleteItem
                        key={item.id}
                        onDelete={() => promptDeleteSingle(item.id, item.title)}
                        deleteLabel="Delete"
                      >
                        <div
                          onClick={() => !item.isRead && handleMarkAsRead(item.id)}
                          className={`group relative flex gap-3 p-3.5 rounded-2xl transition-all border cursor-pointer ${
                            !item.isRead
                              ? "bg-yellow-50/70 dark:bg-yellow-400/10 border-yellow-200/50 dark:border-yellow-400/20 shadow-2xs"
                              : "bg-gray-50/60 dark:bg-white/5 border-transparent hover:border-gray-200 dark:hover:border-white/10"
                          }`}
                        >
                          <div
                            className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${visual.bg}`}
                          >
                            {visual.icon}
                          </div>
                          <div className="flex-1 min-w-0 pr-8">
                            <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white leading-snug">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                              {item.message}
                            </p>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                              {formatTime(item.createdAt)}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0 self-start">
                            {!item.isRead && (
                              <div className="size-2 bg-yellow-500 rounded-full mt-1.5 shrink-0 animate-pulse" title="Unread" />
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                promptDeleteSingle(item.id, item.title)
                              }}
                              title="Delete notification"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      </SwipeToDeleteItem>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <CustomDeleteModal
        isOpen={deletePrompt.isOpen}
        title={deletePrompt.title}
        message={deletePrompt.message}
        itemCount={deletePrompt.itemCount}
        confirmText={deletePrompt.confirmText}
        onCancel={() => setDeletePrompt((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deletePrompt.onConfirm}
      />
    </div>
  )
}
