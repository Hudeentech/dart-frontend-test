import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Info,
  Star,
  ChevronRight,
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  ThumbsUp,
  ShieldCheck,
  ChevronDown,
  X,
  Share2,
} from "lucide-react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { goBack, navigate } from "../hooks/router"
import { ratingsApi } from "../api/account.api"

interface ReviewItem {
  id: string
  name: string
  avatar: string
  rating: number
  timeAgo: string
  text: string
  packageId: string
  helpfulCount: number
  isHelpful?: boolean
}

const DEFAULT_REVIEWS: ReviewItem[] = [
  {
    id: "rev-1",
    name: "Ralph Edwards",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80",
    rating: 4,
    timeAgo: "2 hours ago",
    text: "Great service! Very friendly and delivered my order on time.",
    packageId: "Package #42324-HUD-PKG34R",
    helpfulCount: 3,
  },
  {
    id: "rev-2",
    name: "Cameron Williamson",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80",
    rating: 4,
    timeAgo: "1 weeks ago",
    text: "Excellent service as always. Very polite and professional.",
    packageId: "Package #42324-HUD-PKG34R",
    helpfulCount: 5,
  },
  {
    id: "rev-3",
    name: "Courtney Henry",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80",
    rating: 4,
    timeAgo: "2 days ago",
    text: "Good experience. Delivery was quick and hassle-free.",
    packageId: "Package #42324-HUD-PKG34R",
    helpfulCount: 2,
  },
  {
    id: "rev-4",
    name: "Cameron Williamson",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80",
    rating: 5,
    timeAgo: "1 weeks ago",
    text: "Handled fragile cargo with extreme care. Highly recommended!",
    packageId: "Package #42324-HUD-PKG34R",
    helpfulCount: 8,
  },
]

// Trend chart datapoints matching the screenshot
const CHART_POINTS = [
  { day: "01", val: 65, x: 20, y: 70 },
  { day: "06", val: 63.5, x: 70, y: 80 },
  { day: "11", val: 64, x: 120, y: 76 },
  { day: "16", val: 70, x: 170, y: 40 }, // Peak point highlighted in screenshot
  { day: "21", val: 63.5, x: 220, y: 80 },
  { day: "26", val: 64.5, x: 270, y: 73 },
  { day: "31", val: 72, x: 320, y: 30 },
]

export function PerformancePage({ initialTab = "performance" }: { initialTab?: "performance" | "reviews" }) {
  const { user, riderProfile } = useAuth()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<"performance" | "reviews">(initialTab)
  const [period, setPeriod] = useState("This Month")
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false)
  const [infoModalOpen, setInfoModalOpen] = useState(false)
  const [activePointIndex, setActivePointIndex] = useState(3) // Default to Day 16 with tooltip "70"
  const [reviews, setReviews] = useState<ReviewItem[]>(DEFAULT_REVIEWS)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  // Try to load any real ratings from backend
  useEffect(() => {
    if (!user?.id) return
    ratingsApi.forRider(user.id).then((data) => {
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((r, idx) => ({
          id: r.id || `db-${idx}`,
          name: r.rater?.firstName || `Customer ${idx + 1}`,
          avatar: r.rater?.profileImageUrl || DEFAULT_REVIEWS[idx % DEFAULT_REVIEWS.length].avatar,
          rating: r.score || 5,
          timeAgo: "Recent",
          text: r.review || "Completed delivery with verified courier quality.",
          packageId: `Package #${(r.id || "PKG").slice(0, 8).toUpperCase()}`,
          helpfulCount: 1,
        }))
        setReviews(mapped)
      }
    }).catch(() => {
      // Keep rich defaults
    })
  }, [user?.id])

  const handleHelpfulToggle = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextHelpful = !r.isHelpful
          toast(nextHelpful ? "Marked review as helpful" : "Removed helpful feedback", "info")
          return {
            ...r,
            isHelpful: nextHelpful,
            helpfulCount: nextHelpful ? r.helpfulCount + 1 : Math.max(0, r.helpfulCount - 1),
          }
        }
        return r
      })
    )
  }

  const ratingScore = riderProfile?.averageRating ? riderProfile.averageRating.toFixed(1) : "4.8"
  const totalDeliveries = riderProfile?.totalDeliveries ?? 32

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-24 md:pb-16 transition-colors">
      <div className="w-full max-w-3xl lg:max-w-4xl 2xl:max-w-5xl mx-auto flex-1 flex flex-col px-3.5 sm:px-6 md:px-8 py-3 sm:py-5 space-y-5">
        
        {/* Top Header Bar matching Screenshot */}
        <header className="flex items-center justify-between py-1 relative">
          <button
            type="button"
            onClick={() => {
              if (activeTab === "reviews") {
                setActiveTab("performance")
              } else if (window.history.length > 1) {
                goBack()
              } else {
                navigate("/")
              }
            }}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 active:scale-95 transition cursor-pointer text-gray-800 dark:text-gray-100"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight absolute left-1/2 -translate-x-1/2">
            {activeTab === "performance" ? "Performance" : "Reviews"}
          </h1>

          <button
            type="button"
            onClick={() => setInfoModalOpen(true)}
            className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:scale-95 transition cursor-pointer"
            aria-label="Information"
            title="Performance metrics guide"
          >
            <Info className="w-5 h-5" />
          </button>
        </header>

        {/* Top Dark Rating Card (Present on both screens) */}
        <div className="bg-[#1c1c1e] text-white rounded-3xl p-5 sm:p-6 shadow-md relative overflow-hidden flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                {ratingScore}
              </span>
              <Star className="w-6 h-6 sm:w-7 sm:h-7 fill-[#FFCC00] text-[#FFCC00]" />
            </div>
            <p className="text-xs sm:text-sm text-gray-300 mt-1 font-medium">
              You're doing great! Keep it up.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab(activeTab === "performance" ? "reviews" : "performance")}
            className="text-xs sm:text-sm text-gray-300 hover:text-white font-medium flex items-center gap-1 cursor-pointer transition py-1.5 px-3 rounded-full hover:bg-white/10"
          >
            <span>{activeTab === "performance" ? "View Reviews" : "Performance"}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* =========================================================================
            SCREEN 1: PERFORMANCE VIEW
           ========================================================================= */}
        {activeTab === "performance" && (
          <div className="space-y-5 animate-in fade-in-50 duration-200">
            {/* Section Header: Title & Period Selector */}
            <div className="flex items-center justify-between relative">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Performance Trend
              </h2>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPeriodDropdownOpen((prev) => !prev)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 transition cursor-pointer"
                >
                  <span>{period}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {periodDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#1f1f23] rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 p-1 z-30 space-y-0.5">
                    {["This Month", "Last Month", "This Week", "All Time"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPeriod(p)
                          setPeriodDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition ${
                          period === p
                            ? "bg-yellow-400 text-black font-bold"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Performance Trend Chart Card */}
            <div className="bg-white dark:bg-[#161618] rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-white/5 shadow-2xs">
              <div className="relative w-full h-52 sm:h-56">
                <svg
                  className="w-full h-full overflow-visible"
                  viewBox="0 0 340 120"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="yellowGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFCC00" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#FFCC00" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Gridlines & Y-axis labels */}
                  {[
                    { label: "75", y: 20 },
                    { label: "70", y: 50 },
                    { label: "65", y: 80 },
                    { label: "60", y: 110 },
                  ].map((grid) => (
                    <g key={grid.label}>
                      <text
                        x="2"
                        y={grid.y + 3}
                        className="text-[9px] fill-gray-400 dark:fill-gray-500 font-mono"
                      >
                        {grid.label}
                      </text>
                      <line
                        x1="22"
                        y1={grid.y}
                        x2="335"
                        y2={grid.y}
                        stroke="currentColor"
                        className="text-gray-100 dark:text-white/5"
                        strokeWidth="1"
                      />
                    </g>
                  ))}

                  {/* Area fill under curve */}
                  <path
                    d={`M ${CHART_POINTS[0].x} ${CHART_POINTS[0].y} 
                       L ${CHART_POINTS[1].x} ${CHART_POINTS[1].y} 
                       L ${CHART_POINTS[2].x} ${CHART_POINTS[2].y} 
                       L ${CHART_POINTS[3].x} ${CHART_POINTS[3].y} 
                       L ${CHART_POINTS[4].x} ${CHART_POINTS[4].y} 
                       L ${CHART_POINTS[5].x} ${CHART_POINTS[5].y} 
                       L ${CHART_POINTS[6].x} ${CHART_POINTS[6].y} 
                       L ${CHART_POINTS[6].x} 110 
                       L ${CHART_POINTS[0].x} 110 Z`}
                    fill="url(#yellowGradient)"
                  />

                  {/* Vertical dashed line at active point */}
                  <line
                    x1={CHART_POINTS[activePointIndex].x}
                    y1={CHART_POINTS[activePointIndex].y}
                    x2={CHART_POINTS[activePointIndex].x}
                    y2="110"
                    stroke="#8E8E93"
                    strokeWidth="1.2"
                    strokeDasharray="3 3"
                  />

                  {/* Main Yellow Trend Line */}
                  <path
                    d={`M ${CHART_POINTS[0].x} ${CHART_POINTS[0].y} 
                       L ${CHART_POINTS[1].x} ${CHART_POINTS[1].y} 
                       L ${CHART_POINTS[2].x} ${CHART_POINTS[2].y} 
                       L ${CHART_POINTS[3].x} ${CHART_POINTS[3].y} 
                       L ${CHART_POINTS[4].x} ${CHART_POINTS[4].y} 
                       L ${CHART_POINTS[5].x} ${CHART_POINTS[5].y} 
                       L ${CHART_POINTS[6].x} ${CHART_POINTS[6].y}`}
                    fill="none"
                    stroke="#FFCC00"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Point circles */}
                  {CHART_POINTS.map((pt, idx) => (
                    <circle
                      key={pt.day}
                      cx={pt.x}
                      cy={pt.y}
                      r={activePointIndex === idx ? 4.5 : 3}
                      fill="#FFCC00"
                      stroke="#FFFFFF"
                      strokeWidth={activePointIndex === idx ? 2 : 1.5}
                      className="cursor-pointer transition-all hover:scale-125"
                      onClick={() => setActivePointIndex(idx)}
                    />
                  ))}
                </svg>

                {/* Floating Tooltip Pill (Showing active point score, e.g. "70") */}
                <div
                  className="absolute pointer-events-none -translate-x-1/2 transition-all duration-200"
                  style={{
                    left: `${(CHART_POINTS[activePointIndex].x / 340) * 100}%`,
                    top: `${(CHART_POINTS[activePointIndex].y / 120) * 85 - 28}px`,
                  }}
                >
                  <div className="bg-[#1c1c1e] text-white text-[11px] font-bold px-2 py-0.5 rounded-md shadow-md border border-white/10 text-center">
                    {CHART_POINTS[activePointIndex].val}
                  </div>
                </div>

                {/* X-Axis Date Labels matching Screenshot */}
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-medium px-4 mt-2">
                  {CHART_POINTS.map((pt, idx) => (
                    <button
                      key={pt.day}
                      type="button"
                      onClick={() => setActivePointIndex(idx)}
                      className={`cursor-pointer transition ${
                        activePointIndex === idx
                          ? "text-gray-900 dark:text-white font-bold"
                          : "hover:text-gray-700"
                      }`}
                    >
                      {pt.day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2x2 Metrics Cards Grid matching Screenshot */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {/* Card 1: Deliveries */}
              <div className="bg-white dark:bg-[#161618] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 dark:bg-yellow-400/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Package className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Deliveries
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-3 tracking-tight">
                  {totalDeliveries}
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  +1.2% from last month
                </p>
              </div>

              {/* Card 2: Completion Rate */}
              <div className="bg-white dark:bg-[#161618] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-purple-50 dark:bg-purple-400/10 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Completion Rate
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-3 tracking-tight">
                  98<span className="text-base sm:text-lg font-bold ml-0.5">%</span>
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  +0.8% from last month
                </p>
              </div>

              {/* Card 3: On-time Rate */}
              <div className="bg-white dark:bg-[#161618] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 dark:bg-blue-400/10 flex items-center justify-center text-blue-500 shrink-0">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
                    On-time Rate
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-3 tracking-tight">
                  76<span className="text-base sm:text-lg font-bold ml-0.5">%</span>
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  +0.6% from last month
                </p>
              </div>

              {/* Card 4: Customer Ratings */}
              <div className="bg-white dark:bg-[#161618] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-amber-50 dark:bg-yellow-400/10 flex items-center justify-center text-amber-500 shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">
                    Customer Ratings
                  </span>
                </div>
                <p className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mt-3 tracking-tight">
                  {ratingScore}
                </p>
                <p className="text-[11px] sm:text-xs font-semibold text-rose-500 mt-1">
                  -0.4% from last month
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 2: REVIEWS VIEW
           ========================================================================= */}
        {activeTab === "reviews" && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Section Header: Title & Period Selector */}
            <div className="flex items-center justify-between relative">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Recent Reviews
              </h2>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setPeriodDropdownOpen((prev) => !prev)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/5 border border-gray-200/60 dark:border-white/10 flex items-center gap-1.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 transition cursor-pointer"
                >
                  <span>{period}</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {periodDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-36 bg-white dark:bg-[#1f1f23] rounded-2xl shadow-lg border border-gray-100 dark:border-white/10 p-1 z-30 space-y-0.5">
                    {["This Month", "Last Month", "This Week", "All Time"].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setPeriod(p)
                          setPeriodDropdownOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 text-xs font-semibold rounded-xl transition ${
                          period === p
                            ? "bg-yellow-400 text-black font-bold"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reviews Cards List */}
            <div className="space-y-3.5">
              {reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white dark:bg-[#161618] rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-white/5 shadow-2xs space-y-3"
                >
                  {/* Review Header: Avatar, Name, Rating & Helpful pill */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden shrink-0 border border-gray-100 dark:border-white/10 bg-gray-100 dark:bg-white/5">
                        <img
                          src={rev.avatar}
                          alt={rev.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                            {rev.name}
                          </span>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <div className="flex items-center text-[#FFCC00]">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-3.5 h-3.5 ${
                                  star <= rev.rating
                                    ? "fill-[#FFCC00] text-[#FFCC00]"
                                    : "text-gray-300 dark:text-white/20"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            • {rev.timeAgo}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Helpful? Button matching Screenshot */}
                    <button
                      type="button"
                      onClick={() => handleHelpfulToggle(rev.id)}
                      className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                        rev.isHelpful
                          ? "bg-yellow-400 border-yellow-400 text-black font-bold shadow-xs"
                          : "bg-[#FFF9E6] dark:bg-yellow-400/10 text-yellow-900 dark:text-yellow-400 border-yellow-200/80 dark:border-yellow-400/20 hover:bg-yellow-100"
                      }`}
                    >
                      <span>👍 Helpful?</span>
                      {rev.helpfulCount > 0 && (
                        <span className="opacity-80">({rev.helpfulCount})</span>
                      )}
                    </button>
                  </div>

                  {/* Review Text */}
                  <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-normal">
                    {rev.text}
                  </p>

                  {/* Review Footer: Package Reference */}
                  <div className="flex items-center gap-1.5 pt-1 text-[11px] sm:text-xs text-gray-400 font-medium border-t border-gray-50 dark:border-white/5">
                    <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{rev.packageId}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info Modal / Explanation Dialog */}
      {infoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#1c1c20] rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 dark:border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 flex items-center justify-center font-bold">
                  <Info className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  About Performance
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInfoModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Your courier score is dynamically updated based on:
            </p>

            <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Customer Ratings:</strong> Direct star reviews received.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>On-Time Delivery:</strong> Packages delivered before ETA.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span><strong>Completion Rate:</strong> Successfully settled assignments.</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => setInfoModalOpen(false)}
              className="w-full bg-[#FFCC00] hover:bg-yellow-400 text-black font-semibold text-xs sm:text-sm py-2.5 rounded-full transition shadow-xs cursor-pointer mt-2"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
