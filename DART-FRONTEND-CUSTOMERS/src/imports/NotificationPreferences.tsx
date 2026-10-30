import React, { useState } from "react"
import {
  ArrowLeft,
  Package,
  Bike,
  Tag,
  MessageSquare,
  Wallet,
  BellRing,
  Check,
} from "lucide-react"

interface NotificationPreferencesProps {
  onBack: () => void
}

interface NotificationToggle {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  enabled: boolean
}

export default function NotificationPreferences({
  onBack,
}: NotificationPreferencesProps) {
  // Section 1: Deliveries & Orders
  const [deliverySettings, setDeliverySettings] =
    useState<NotificationToggle[]>([
      {
        id: "package-updates",
        title: "Package updates",
        subtitle: "Get notified about your package pickup and delivery status",
        icon: (
          <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        ),
        enabled: true,
      },
      {
        id: "rider-updates",
        title: "Rider updates",
        subtitle:
          "Notifications about assigned riders, arrival, and live location",
        icon: <Bike className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
        enabled: true,
      },
      {
        id: "promotions",
        title: "Promotions",
        subtitle: "Exclusive discount codes, promotional events, and rewards",
        icon: <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />,
        enabled: false,
      },
    ])

  // Section 2: Messages
  const [messageSettings, setMessageSettings] = useState<NotificationToggle[]>([
    {
      id: "chat-messages",
      title: "Messages",
      subtitle: "Get instant alerts when riders or support send you a message",
      icon: (
        <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
      ),
      enabled: true,
    },
  ])

  // Section 3: Reminders & System Services
  const [serviceSettings, setServiceSettings] = useState<NotificationToggle[]>([
    {
      id: "payment-reminders",
      title: "Payment reminders",
      subtitle:
        "Instant confirmation for wallet top-ups and delivery transactions",
      icon: <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      enabled: true,
    },
    {
      id: "general-updates",
      title: "General updates",
      subtitle: "App feature updates, security alerts, and service maintenance",
      icon: <BellRing className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
      enabled: false,
    },
  ])

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const toggleDelivery = (id: string) => {
    setDeliverySettings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.enabled
          triggerToast(`${item.title} ${nextState ? "enabled" : "disabled"}`)
          return { ...item, enabled: nextState }
        }
        return item
      }),
    )
  }

  const toggleMessage = (id: string) => {
    setMessageSettings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.enabled
          triggerToast(`${item.title} ${nextState ? "enabled" : "disabled"}`)
          return { ...item, enabled: nextState }
        }
        return item
      }),
    )
  }

  const toggleService = (id: string) => {
    setServiceSettings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.enabled
          triggerToast(`${item.title} ${nextState ? "enabled" : "disabled"}`)
          return { ...item, enabled: nextState }
        }
        return item
      }),
    )
  }

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-12 transition-colors">
      {/* Top Header */}
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-sm z-10">
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-white transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Animated Toast */}
        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xs">
            <Check className="w-4 h-4 stroke-[3]" />
            <span className="text-xs font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Section 1: Delivery & Package updates */}
        <div>
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors shadow-xs">
            {deliverySettings.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => toggleDelivery(item.id)}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                    item.enabled
                      ? "bg-[#FFCC00]"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  aria-checked={item.enabled}
                  role="switch"
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                      item.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Messages */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5 px-1">
            Messages
          </h2>
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors shadow-xs">
            {messageSettings.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => toggleMessage(item.id)}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                    item.enabled
                      ? "bg-[#FFCC00]"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  aria-checked={item.enabled}
                  role="switch"
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                      item.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Reminders & Services */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2.5 px-1">
            Services
          </h2>
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors shadow-xs">
            {serviceSettings.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0 pr-3">
                  <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                      {item.subtitle}
                    </span>
                  </div>
                </div>

                {/* Switch Toggle */}
                <button
                  type="button"
                  onClick={() => toggleService(item.id)}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 p-0.5 cursor-pointer ${
                    item.enabled
                      ? "bg-[#FFCC00]"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                  aria-checked={item.enabled}
                  role="switch"
                >
                  <div
                    className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                      item.enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
