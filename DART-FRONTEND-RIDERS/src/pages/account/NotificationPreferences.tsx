import { useState } from "react"
import {
  ArrowLeft,
  Package,
  BellRing,
  Volume2,
  MessageSquare,
  Wallet,
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
  const [dispatchSettings, setDispatchSettings] = useState<NotificationToggle[]>([
    {
      id: "order-alerts",
      title: "Instant Dispatch Alerts",
      subtitle: "Get notified immediately when new nearby delivery requests are available",
      icon: <Package className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      enabled: true,
    },
    {
      id: "sound-alerts",
      title: "Audio Alert Chime",
      subtitle: "Play high-priority loud alert sounds on incoming order requests",
      icon: <Volume2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      enabled: true,
    },
  ])

  const [messageSettings, setMessageSettings] = useState<NotificationToggle[]>([
    {
      id: "chat-messages",
      title: "Dispatch & Customer Messages",
      subtitle: "Get instant alerts when customers or fleet controllers send messages",
      icon: <MessageSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      enabled: true,
    },
  ])

  const [settlementSettings, setSettlementSettings] = useState<NotificationToggle[]>([
    {
      id: "wallet-alerts",
      title: "Wallet Settlement Alerts",
      subtitle: "Instant notification when customer handover is verified and payout is credited",
      icon: <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      enabled: true,
    },
    {
      id: "system-alerts",
      title: "Fleet Updates & Incentives",
      subtitle: "Bonus milestones, surge pay notifications, and maintenance alerts",
      icon: <BellRing className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
      enabled: true,
    },
  ])

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2000)
  }

  const toggleItem = (
    list: NotificationToggle[],
    setList: React.Dispatch<React.SetStateAction<NotificationToggle[]>>,
    id: string
  ) => {
    setList((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextState = !item.enabled
          triggerToast(`${item.title} ${nextState ? "enabled" : "disabled"}`)
          return { ...item, enabled: nextState }
        }
        return item
      })
    )
  }

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
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-sm z-10">
        <button
          type="button"
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-white transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Notification Preferences
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Section 1: Orders & Dispatch */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">
            Orders & Dispatch
          </h2>
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
            {dispatchSettings.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-4 pr-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 border border-gray-100 dark:border-white/10">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                {/* Custom Toggle Switch */}
                <button
                  type="button"
                  onClick={() =>
                    toggleItem(dispatchSettings, setDispatchSettings, item.id)
                  }
                  className={`w-12 h-6.5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    item.enabled ? "bg-yellow-400" : "bg-gray-200 dark:bg-white/10"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      item.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Messages */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">
            Communication
          </h2>
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
            {messageSettings.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-4 pr-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 border border-gray-100 dark:border-white/10">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleItem(messageSettings, setMessageSettings, item.id)
                  }
                  className={`w-12 h-6.5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    item.enabled ? "bg-yellow-400" : "bg-gray-200 dark:bg-white/10"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      item.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Settlements & System */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">
            Settlement & Updates
          </h2>
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
            {settlementSettings.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-4 pr-3">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 border border-gray-100 dark:border-white/10">
                    {item.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {item.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                      {item.subtitle}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    toggleItem(settlementSettings, setSettlementSettings, item.id)
                  }
                  className={`w-12 h-6.5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                    item.enabled ? "bg-yellow-400" : "bg-gray-200 dark:bg-white/10"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform transform ${
                      item.enabled ? "translate-x-6" : "translate-x-1"
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
