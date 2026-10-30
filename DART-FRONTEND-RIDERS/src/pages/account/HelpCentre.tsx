import { useState } from "react"
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Headphones,
  HelpCircle,
  Package,
  CreditCard,
  Bike,
  ShieldCheck,
  X,
} from "lucide-react"

interface HelpCentreProps {
  onBack: () => void
  onContactSupport: () => void
}

interface HelpTopic {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  articles: string[]
}

export default function HelpCentre({
  onBack,
  onContactSupport,
}: HelpCentreProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTopic, setActiveTopic] = useState<string | null>(null)

  const topics: HelpTopic[] = [
    {
      id: "dispatch-flow",
      title: "Dispatch & Delivery Flow",
      subtitle: "Accepting orders, pickup navigation, and recipient handover",
      icon: <Package className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
      articles: [
        "How incoming order matching works based on GPS proximity",
        "Step-by-step parcel pickup verification at sender address",
        "Mandatory 5-digit receiver handover code protocol",
        "What to do if the receiver is not answering calls",
      ],
    },
    {
      id: "earnings-wallet",
      title: "Earnings & Wallet Settlement",
      subtitle: "Instant earnings balance, bank withdrawals, and tip incentives",
      icon: <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
      articles: [
        "Instant wallet balance credit upon delivery completion",
        "How to initiate an instant bank account withdrawal",
        "Daily automated settlement schedule to verified accounts",
        "Understanding cancellation compensation fees",
      ],
    },
    {
      id: "vehicle-safety",
      title: "Vehicle & On-Road Safety",
      subtitle: "Safety gear, roadworthiness standards, and accident protocol",
      icon: <Bike className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
      articles: [
        "What to do in case of vehicle breakdown during active order",
        "Accident reporting and 24/7 fleet rescue helpline",
        "Helmet and safety vest compliance requirements",
        "Package weight and dimensional handling limits",
      ],
    },
    {
      id: "courier-ratings",
      title: "Ratings & Tier Benefits",
      subtitle: "Maintaining 4.8+ courier score and unlocking bonus rewards",
      icon: <ShieldCheck className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
      articles: [
        "How customer ratings impact order priority",
        "Weekly completion bonuses and performance tiers",
        "Disputing false negative customer reviews",
        "How to maintain verified courier status",
      ],
    },
    {
      id: "general-faqs",
      title: "Account & Fleet Settings",
      subtitle: "Updating phone number, license renewal, and operating hub",
      icon: <HelpCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />,
      articles: [
        "Changing your primary base city or operating radius",
        "Updating driver's license or vehicle plate number",
        "Managing push and chime audio notification volume",
        "Pausing active orders (Go Offline) when taking breaks",
      ],
    },
  ]

  const filteredTopics = topics.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.articles.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()))
  )

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
          Help centre
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for help ...."
            className="w-full pl-11 pr-10 py-3.5 bg-gray-50 dark:bg-[#18181b] border border-gray-100 dark:border-white/10 rounded-2xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFCC00] transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Section: Popular Topics */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">
            Courier Guides & Topics
          </h2>
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
            {filteredTopics.map((topic) => {
              const isExpanded = activeTopic === topic.id
              return (
                <div key={topic.id} className="transition-colors">
                  <button
                    onClick={() => setActiveTopic(isExpanded ? null : topic.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900 dark:text-white group-hover:text-amber-500 transition-colors">
                          {topic.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {topic.subtitle}
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-transform ${
                        isExpanded ? "rotate-90 text-amber-500" : ""
                      }`}
                    />
                  </button>

                  {/* Expanded Articles List */}
                  {isExpanded && (
                    <div className="bg-gray-50/70 dark:bg-white/[0.02] px-5 py-3 border-t border-gray-50 dark:border-white/5 flex flex-col gap-2.5 animate-in slide-in-from-top-2 duration-150">
                      {topic.articles.map((article, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer transition-colors"
                        >
                          <span>• {article}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}

            {filteredTopics.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No matching help articles found for "{searchQuery}".
              </div>
            )}
          </div>
        </div>

        {/* Still need help? Card */}
        <div
          onClick={onContactSupport}
          className="bg-[#FFF8E7] dark:bg-amber-400/10 border border-[#FFE7A3] dark:border-amber-400/20 rounded-2xl p-4 sm:p-5 flex items-center justify-between cursor-pointer hover:shadow-sm hover:scale-[1.01] transition-all group"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black shrink-0 shadow-2xs">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                Still need help?
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-400">
                Contact our 24/7 fleet operations team
              </span>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </div>
  )
}
