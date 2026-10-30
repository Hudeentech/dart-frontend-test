import React from "react"
import { Bell } from "lucide-react"
import { navigate } from "../hooks/router"
import { useRider } from "../context/RiderContext"

export interface NotificationButtonProps {
  variant?: "dark-header" | "standard"
  onClick?: () => void
  className?: string
  title?: string
  hideOnDesktop?: boolean
  id?: string
}

export default function NotificationButton({
  variant = "standard",
  onClick,
  className = "",
  title,
  hideOnDesktop = true,
  id,
}: NotificationButtonProps) {
  let unreadCount = 0
  try {
    const rider = useRider()
    unreadCount = rider.unreadCount || 0
  } catch {
    unreadCount = 0
  }

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (onClick) {
      onClick()
    } else {
      navigate("/notifications")
    }
  }

  const baseStyles = `w-10 h-10 rounded-full flex ${
    hideOnDesktop ? "md:hidden" : ""
  } items-center justify-center shrink-0 cursor-pointer relative transition-all duration-200 hover:scale-105 active:scale-95 touch-manipulation focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400`

  const variantStyles =
    variant === "dark-header"
      ? "bg-yellow-400 hover:bg-yellow-500 dark:bg-black/15 dark:hover:bg-black/25 text-black shadow-xs"
      : "bg-yellow-400 hover:bg-yellow-500 text-black shadow-xs"

  const dotRingStyles =
    variant === "dark-header"
      ? "ring-2 ring-[#1a1a1a] dark:ring-amber-500"
      : "ring-2 ring-white dark:ring-[#161618]"

  const defaultTitle =
    unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"

  return (
    <button
      id={id}
      type="button"
      onClick={handleClick}
      aria-label={title || defaultTitle}
      title={title || defaultTitle}
      className={`${baseStyles} ${variantStyles} ${className}`}
    >
      <Bell className="w-5 h-5 fill-black/15 text-black stroke-[2.2]" />

      {unreadCount > 0 && (
        <span className="absolute top-2 right-2 flex h-2.5 w-2.5 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ${dotRingStyles}`}
          ></span>
        </span>
      )}
    </button>
  )
}
