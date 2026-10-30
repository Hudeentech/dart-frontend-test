import React, { createContext, useContext, useState, useEffect, useCallback } from "react"
import { notificationsApi } from "../api/notifications.api"
import { ApiNotification } from "../types/api.types"

export type NotificationTab = "All" | "Delivery" | "System"

export interface NotificationItem {
  id: string | number
  type: "Delivery" | "System"
  title: string
  message?: string
  time: string
  isUnread?: boolean
  dateGroup: "Today" | "This week"
  icon?: string
  rawType?: string
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = []


function formatRelativeTime(dateStr?: string | Date): string {
  if (!dateStr) return "Just Now"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 2) return "Just Now"
  if (diffMins < 60) return `${diffMins} mins ago`
  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }
  if (diffDays === 1) return "Yesterday"
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

function calculateDateGroup(dateStr?: string | Date): "Today" | "This week" {
  if (!dateStr) return "Today"
  const date = new Date(dateStr)
  const now = new Date()
  const isSameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  return isSameDay ? "Today" : "This week"
}

function mapApiNotification(apiNotif: ApiNotification): NotificationItem {
  const typeStr = (apiNotif.type || "").toUpperCase()
  const text = `${typeStr} ${apiNotif.title || ""} ${apiNotif.message || ""}`.toLowerCase()

  const isDelivery =
    typeStr.includes("DELIVERY") ||
    typeStr.includes("ORDER") ||
    text.includes("package") ||
    text.includes("pickup") ||
    text.includes("dropoff")

  let iconKey = "system"
  if (text.includes("cancel") || text.includes("fail") || text.includes("dispute")) {
    iconKey = "alert"
  } else if (text.includes("wallet") || text.includes("payment") || text.includes("payout") || text.includes("fund") || text.includes("deposit")) {
    iconKey = "wallet"
  } else if (text.includes("delivered") || text.includes("completed") || text.includes("settled") || text.includes("confirmed")) {
    iconKey = "delivered"
  } else if (text.includes("transit") || text.includes("on the way") || text.includes("picked up") || text.includes("en route") || text.includes("dispatch")) {
    iconKey = "transit"
  } else if (text.includes("rating") || text.includes("review") || text.includes("star") || text.includes("feedback")) {
    iconKey = "rating"
  } else if (text.includes("verif") || text.includes("identity") || text.includes("nin") || text.includes("security") || text.includes("kyc")) {
    iconKey = "verification"
  } else if (isDelivery || text.includes("package") || text.includes("order")) {
    iconKey = "package"
  }

  return {
    id: apiNotif.id,
    type: isDelivery ? "Delivery" : "System",
    title: apiNotif.title || apiNotif.message,
    message: apiNotif.message && apiNotif.message !== apiNotif.title ? apiNotif.message : undefined,
    time: formatRelativeTime(apiNotif.createdAt),
    isUnread: !apiNotif.isRead,
    dateGroup: calculateDateGroup(apiNotif.createdAt),
    icon: iconKey,
    rawType: apiNotif.type,
  }
}

interface NotificationContextType {
  notifications: NotificationItem[]
  unreadCount: number
  isNotificationsOpen: boolean
  highlightTrigger: number
  openNotifications: () => void
  closeNotifications: () => void
  toggleNotifications: () => void
  markAllAsRead: () => void
  markAsRead: (id: string | number) => void
  clearNotifications: () => void
  addNotification: (item: Omit<NotificationItem, "id">) => void
  refreshNotifications: () => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined,
)

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    try {
      const saved = localStorage.getItem("dart_notifications")
      if (saved) {
        return JSON.parse(saved)
      }
    } catch {
      // Fallback to initial
    }
    return INITIAL_NOTIFICATIONS
  })

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [highlightTrigger, setHighlightTrigger] = useState(0)

  // Fetch live notifications from backend
  const refreshNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem("dart_access_token")
      if (!token) return

      const res = await notificationsApi.getNotifications({ limit: 50 })
      if (res?.notifications && Array.isArray(res.notifications)) {
        const mapped = res.notifications.map(mapApiNotification)
        setNotifications(mapped)
      }
    } catch (err) {
      console.warn("[NotificationContext] Backend sync note:", err)
    }
  }, [])

  // Initial fetch on mount or when token is present
  useEffect(() => {
    refreshNotifications()
  }, [refreshNotifications])

  // Sync to local storage for offline resilience
  useEffect(() => {
    try {
      localStorage.setItem("dart_notifications", JSON.stringify(notifications))
    } catch {
      // Ignore storage errors
    }
  }, [notifications])

  const unreadCount = notifications.filter((n) => n.isUnread).length

  const openNotifications = () => {
    setIsNotificationsOpen(true)
    setHighlightTrigger((prev) => prev + 1)
    refreshNotifications()
  }

  const closeNotifications = () => {
    setIsNotificationsOpen(false)
  }

  const toggleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev)
    setHighlightTrigger((prev) => prev + 1)
    if (!isNotificationsOpen) {
      refreshNotifications()
    }
  }

  const markAllAsRead = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })))

    try {
      const token = localStorage.getItem("dart_access_token")
      if (token) {
        await notificationsApi.markAllAsRead()
      }
    } catch (e) {
      console.warn("[NotificationContext] markAllAsRead sync note:", e)
    }
  }

  const markAsRead = async (id: string | number) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isUnread: false } : n)),
    )

    try {
      const token = localStorage.getItem("dart_access_token")
      if (token && typeof id === "string" && !id.startsWith("init-")) {
        await notificationsApi.markAsRead(id)
      }
    } catch (e) {
      console.warn("[NotificationContext] markAsRead sync note:", e)
    }
  }

  const clearNotifications = async () => {
    setNotifications([])

    try {
      const token = localStorage.getItem("dart_access_token")
      if (token) {
        await notificationsApi.clearNotifications()
      }
    } catch (e) {
      console.warn("[NotificationContext] clearNotifications sync note:", e)
    }
  }

  const addNotification = (item: Omit<NotificationItem, "id">) => {
    const newItem: NotificationItem = {
      ...item,
      id: `local-${Date.now()}`,
      isUnread: true,
    }
    setNotifications((prev) => [newItem, ...prev])
  }

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isNotificationsOpen,
        highlightTrigger,
        openNotifications,
        closeNotifications,
        toggleNotifications,
        markAllAsRead,
        markAsRead,
        clearNotifications,
        addNotification,
        refreshNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    )
  }
  return context
}
