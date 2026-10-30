import React, { useState } from "react"
import {
  ArrowLeft,
  Star,
  CheckCircle2,
  ShieldCheck,
  ChevronRight,
  Check,
} from "lucide-react"
import divineAvatar from "../assets/divine_augustina_rider.jpg"
import goodMark from "../assets/good-mark.svg"
import { ridersApi } from "../api/riders.api"

interface RateRiderModalProps {
  isOpen?: boolean
  onClose: () => void
  onSubmit?: (data: { rating: number; tags: string[]; feedback: string }) => void
  riderName?: string
  riderAvatar?: string
  riderRating?: string
  deliveryTime?: string
  orderId?: string
}

const FEEDBACK_TAGS = [
  { id: "easy", label: "Easy to use" },
  { id: "friendly", label: "Rider was friendly" },
  { id: "fast", label: "Fast delivery" },
  { id: "communication", label: "Good communication" },
  { id: "safe", label: "Package was safe" },
]

export default function RateRiderModal({
  isOpen = true,
  onClose,
  onSubmit,
  riderName = "Assigned Rider",
  riderAvatar,
  riderRating = "4.8",
  deliveryTime = "Today, 10:24 AM",
  orderId = "ord-dev-1",
}: RateRiderModalProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [rating, setRating] = useState<number>(4)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [feedbackText, setFeedbackText] = useState("")

  if (!isOpen) return null

  const currentRiderAvatar =
    riderAvatar || divineAvatar || "https://i.pravatar.cc/100?img=11"

  const toggleTag = (tagLabel: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagLabel)
        ? prev.filter((t) => t !== tagLabel)
        : [...prev, tagLabel],
    )
  }

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await ridersApi.submitRating({
        orderId: orderId || "ord-dev-1",
        score: rating,
        review: feedbackText || undefined,
        tags: selectedTags,
      })
    } catch (err: any) {
      console.warn("[RateRiderModal] Submit rating note:", err?.message)
    }
    onSubmit?.({
      rating,
      tags: selectedTags,
      feedback: feedbackText,
    })
    setStep(2)
  }

  const handleDone = () => {
    setStep(1)
    onClose()
  }

  const handleBack = () => {
    if (step === 2) {
      setStep(1)
    } else {
      onClose()
    }
  }

  // Sentiment message based on current star selection
  const currentRating = hoveredRating || rating
  const isGoodExperience = currentRating >= 4
  const isAverageExperience = currentRating === 3

  return (
    <div
      className="fixed inset-0 z-[160] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto sm:overflow-hidden"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-[560px] md:max-w-[580px] bg-[#fcfcfc] dark:bg-[#0c0c0e] rounded-t-[32px] sm:rounded-[32px] p-4 sm:p-6 border-t sm:border border-gray-100 dark:border-white/10 shadow-2xl animate-in slide-in-from-bottom duration-250 pb-[max(1.75rem,env(safe-area-inset-bottom,1.25rem))] sm:pb-6 transition-all max-h-[90dvh] sm:max-h-none overflow-y-auto sm:overflow-visible flex flex-col overscroll-contain"
      >
        {/* Mobile Pull Handle */}
        <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto -mt-1 mb-2.5 sm:hidden shrink-0" />

        {/* Top Header Bar with Back Arrow and Centered Title */}
        <div className="flex items-center justify-between pb-2 sm:pb-3 mb-1 shrink-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition-colors cursor-pointer shrink-0"
            title="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white tracking-tight">
            Rate Our rider
          </h1>

          <div className="w-10 shrink-0" />
        </div>

        {/* ========================================================= */}
        {/* STEP 1: Rate Experience, Sentiment Banner & Tags Form     */}
        {/* ========================================================= */}
        {step === 1 && (
          <form
            onSubmit={handleSubmitRating}
            className="w-full flex flex-col space-y-3.5 sm:space-y-4 animate-in fade-in duration-200"
          >
            {/* White Rounded Container Card */}
            <div className="w-full bg-white dark:bg-[#18181b] rounded-3xl p-4 sm:p-5 sm:px-6 border border-gray-100 dark:border-white/5 shadow-2xs space-y-3 sm:space-y-3.5 shrink-0">
              {/* Question Heading */}
              <div className="text-center pt-0.5">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                  Thanks! How was your experience?
                </h2>
              </div>

              {/* 5-Star Rating */}
              <div className="flex flex-col items-center justify-center">
                <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = currentRating >= star
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="p-1 focus:outline-none transition-transform hover:scale-115 active:scale-95 cursor-pointer shrink-0"
                        aria-label={`Rate ${star} star`}
                      >
                        <Star
                          className={`w-9 h-9 sm:w-10 sm:h-10 transition-all duration-150 stroke-[1.4] ${
                            isFilled
                              ? "text-[#F59E0B] fill-[#FBBF24] drop-shadow-[0_2px_8px_rgba(251,191,36,0.35)]"
                              : "text-[#F59E0B] fill-none"
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>

                <span className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium">
                  You rated Us
                </span>
              </div>

              {/* Sentiment Banner Box */}
              <div
                className={`rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition-colors ${
                  isGoodExperience
                    ? "bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-500/20"
                    : isAverageExperience
                      ? "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-500/20"
                      : "bg-red-50/80 dark:bg-red-950/30 border border-red-200/60 dark:border-red-500/20"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isGoodExperience
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isAverageExperience
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                  }`}
                >
                  <ShieldCheck className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.6]" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4
                    className={`text-xs sm:text-sm font-bold leading-tight ${
                      isGoodExperience
                        ? "text-emerald-950 dark:text-emerald-200"
                        : isAverageExperience
                          ? "text-amber-950 dark:text-amber-200"
                          : "text-red-950 dark:text-red-200"
                    }`}
                  >
                    {isGoodExperience
                      ? "Good Experience!"
                      : isAverageExperience
                        ? "Average Experience"
                        : "Needs Improvement"}
                  </h4>
                  <p
                    className={`text-[11px] sm:text-xs mt-0.5 ${
                      isGoodExperience
                        ? "text-emerald-800/80 dark:text-emerald-300/80"
                        : isAverageExperience
                          ? "text-amber-800/80 dark:text-amber-300/80"
                          : "text-red-800/80 dark:text-red-300/80"
                    }`}
                  >
                    {isGoodExperience
                      ? "We’re glad it went well."
                      : isAverageExperience
                        ? "We'll work hard to make your next delivery better."
                        : "We are truly sorry and will make this right."}
                  </p>
                </div>
              </div>

              {/* Subtle Divider Line */}
              <div className="w-full border-b border-gray-100 dark:border-white/10" />

              {/* Want to tell us more? Section with 5 tags only */}
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                  Want to tell us more?{" "}
                  <span className="text-[11px] sm:text-xs font-normal text-gray-400 dark:text-gray-500">
                    (Optional)
                  </span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-2.5">
                  What went well?
                </p>

                {/* Exactly 5 Feedback Pills with no overlaps */}
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag.label)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.label)}
                        className={`px-3 py-1.5 rounded-full border text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                          isSelected
                            ? "border-yellow-400 bg-yellow-50/80 dark:bg-yellow-400/10 text-gray-900 dark:text-white font-medium shadow-2xs"
                            : "border-gray-300 dark:border-white/15 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-white/30"
                        }`}
                      >
                        <CheckCircle2
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected
                              ? "text-yellow-500 fill-yellow-400/30 stroke-[2.2]"
                              : "text-gray-400 dark:text-gray-500 stroke-[1.7]"
                          }`}
                        />
                        <span className="leading-none">{tag.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Feedback Textarea */}
              <div className="pt-0.5">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Send any additional feedback"
                  rows={2}
                  className="w-full p-3 sm:p-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-transparent text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-yellow-400 dark:focus:border-yellow-400 transition-colors resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* Bottom Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 sm:py-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-sm sm:text-base shadow-xs transition-all active:scale-[0.99] cursor-pointer shrink-0"
            >
              Submit
            </button>
          </form>
        )}

        {/* ========================================================= */}
        {/* STEP 2: Thank you! Confirmation & Rider Profile Card       */}
        {/* ========================================================= */}
        {step === 2 && (
          <div className="w-full flex flex-col space-y-3.5 sm:space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* White Rounded Container Card */}
            <div className="w-full bg-white dark:bg-[#18181b] rounded-3xl p-5 sm:p-7 border border-gray-100 dark:border-white/5 shadow-2xs flex flex-col items-center text-center shrink-0">
              <div className="my-2 sm:my-3 flex justify-center">
                <img src={goodMark} alt="Success" className="w-[88px] h-[88px] object-contain" />
              </div>

              {/* Thank you title */}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white tracking-tight mb-1.5">
                Thank you!
              </h2>

              {/* Subtitle */}
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed mb-4 sm:mb-5">
                We appreciate you taking the time to rate your experience.
              </p>

              {/* Subtle Divider Line */}
              <div className="w-full border-b border-gray-100 dark:border-white/10 my-1 sm:my-2" />

              {/* Rider Summary Row Card */}
              <div className="w-full pt-3 sm:pt-4 flex items-center justify-between group">
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Rider photo avatar */}
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 shrink-0 border border-gray-100 dark:border-white/10">
                    <img
                      src={currentRiderAvatar}
                      alt={riderName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Rider Info */}
                  <div className="text-left min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white truncate">
                        {riderName}
                      </h4>
                      {/* Verified Badge Check */}
                      <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 font-medium truncate">
                      {deliveryTime}
                    </p>
                  </div>
                </div>

                {/* Rating Badge & Chevron */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
                  <div className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-400/10 border border-amber-200/50 dark:border-amber-400/20 flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                    <span>{riderRating}</span>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
                </div>
              </div>
            </div>

            {/* Bottom Done Button */}
            <button
              type="button"
              onClick={handleDone}
              className="w-full py-3.5 sm:py-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5c400] text-gray-950 font-bold text-sm sm:text-base shadow-xs transition-all active:scale-[0.99] cursor-pointer shrink-0"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
