import { useState } from "react"
import {
  ArrowLeft,
  Sparkles,
  MessageSquareHeart,
  Users,
  Star,
  Check,
} from "lucide-react"
import DartLogo from "../../components/DartLogo"
import goodMark from "../../assets/good-mark.svg"

interface RateDartProps {
  onBack: () => void
  onDone?: () => void
}

export default function RateDart({ onBack, onDone }: RateDartProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [rating, setRating] = useState<number>(5)
  const [hoveredRating, setHoveredRating] = useState<number>(0)
  const [comment, setComment] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const TAGS = [
    "Quick Dispatch",
    "Timely Payouts",
    "Accurate GPS",
    "Great Support",
    "Fair Earnings",
    "Reliable App",
  ]

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Dart Logistics Courier",
          text: "Earn with Dart Courier - fastest delivery network in Nigeria!",
          url: window.location.origin,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.origin)
      alert("Referral link copied to clipboard!")
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-12 transition-colors">
      {/* Top Header */}
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-sm z-10">
        <button
          onClick={() => {
            if (step === 1) onBack()
            else if (step === 2) setStep(1)
            else if (step === 3) setStep(2)
          }}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-white transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Rate our app
        </h1>
        <div className="w-10" />
      </div>

      {/* Main Container */}
      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col justify-between">
        {/* Step 1: Enjoying Dart.ng? */}
        {step === 1 && (
          <div className="flex flex-col flex-1">
            <div className="my-6 flex justify-center">
              <div className="w-24 h-24 bg-amber-50 dark:bg-amber-400/10 rounded-3xl flex items-center justify-center border border-amber-200/50 dark:border-amber-400/20 shadow-xs transition-transform hover:scale-105 duration-300">
                <DartLogo variant="auto" className="h-10 w-auto" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Enjoying Dart Rider?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mx-auto mb-8">
              If you enjoy courier partnerships with Dart, please take a moment to rate us.
            </p>

            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 mb-8 shadow-xs">
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-200/30 dark:border-amber-400/10">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    It only takes a minute
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Quick and easy courier evaluation
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-200/30 dark:border-amber-400/10">
                  <MessageSquareHeart className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    Your feedback matters
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Help us improve payout speed and dispatch algorithms
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-200/30 dark:border-amber-400/10">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    Over 5,000 active riders
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Thank you for being part of Nigeria's best logistics fleet
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-[0.99] cursor-pointer"
              >
                Rate dart
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Rate Experience */}
        {step === 2 && (
          <div className="flex flex-col flex-1">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mt-4 mb-2">
              How would you rate Dart?
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
              Tap the stars below to evaluate your experience
            </p>

            <div className="flex items-center justify-center gap-3 py-4 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="size-11 rounded-full flex items-center justify-center transition-transform hover:scale-125 active:scale-95 cursor-pointer"
                >
                  <Star
                    className={`size-8 ${
                      star <= (hoveredRating || rating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>

            <div className="mb-4">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-2 px-1">
                What did you like the most?
              </span>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border cursor-pointer ${
                        isSelected
                          ? "bg-yellow-400 border-yellow-400 text-black"
                          : "bg-white dark:bg-[#1a1a1e] border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell us more about your experience (optional)..."
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#1a1a1e] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 mb-6"
            />

            <div className="mt-auto">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-[0.99] cursor-pointer"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Thank you */}
        {step === 3 && (
          <div className="flex flex-col flex-1 items-center justify-center text-center py-8">
            <div className="mb-6">
              <img src={goodMark} alt="Success" className="w-20 h-20 object-contain" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Thank You!
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-8 leading-relaxed">
              Your rating has been received. We appreciate your partnership in making Dart the premier on-demand delivery platform.
            </p>

            <div className="w-full space-y-3">
              <button
                type="button"
                onClick={handleShare}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-[0.99] cursor-pointer"
              >
                Share Dart with Friends
              </button>
              <button
                type="button"
                onClick={onDone || onBack}
                className="w-full h-12 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-900 dark:text-white font-medium rounded-2xl flex items-center justify-center transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
