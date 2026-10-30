import React, { useState } from "react"
import {
  ArrowLeft,
  Sparkles,
  MessageSquareHeart,
  Users,
  Star,
  ShieldCheck,
  Share2,
  Mail,
  ChevronRight,
} from "lucide-react"
import DartLogo from "../components/DartLogo"
import goodMark from "../assets/good-mark.svg"

interface RateDartProps {
  onBack: () => void
  onDone?: () => void
}

export default function RateDart({ onBack, onDone }: RateDartProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [rating, setRating] = useState<number>(0)
  const [hoveredRating, setHoveredRating] = useState<number>(0)

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: "Dart Delivery",
          text: "Try Dart for fast and reliable deliveries!",
          url: window.location.origin,
        })
        .catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.origin)
      alert("Link copied to clipboard!")
    }
  }

  const handleSendFeedback = () => {
    window.location.href = "mailto:support@dart.ng?subject=App%20Feedback"
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
            {/* Center Logo Emblem */}
            <div className="my-6 flex justify-center">
              <div className="w-24 h-24 bg-amber-50 dark:bg-amber-400/10 rounded-3xl flex items-center justify-center border border-amber-200/50 dark:border-amber-400/20 shadow-xs transition-transform hover:scale-105 duration-300">
                <DartLogo variant="auto" className="h-10 w-auto" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Enjoying Dart.ng?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mx-auto mb-8">
              If you love using dart.ng, please take a moment to rate us on the
              Playstore.
            </p>

            {/* Benefit Points */}
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 mb-8 shadow-xs">
              {/* Feature 1 */}
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-200/30 dark:border-amber-400/10">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    It only takes a minute
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Quick and easy
                  </p>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-200/30 dark:border-amber-400/10">
                  <MessageSquareHeart className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    Your feedback matters
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Help us improve and serve you better
                  </p>
                </div>
              </div>

              {/* Feature 3 */}
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-400/10 flex items-center justify-center shrink-0 border border-amber-200/30 dark:border-amber-400/10">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                    Join thousands of happy users
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Thank you for being part of dart.ng
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={() => setStep(2)}
                className="w-full sm:flex-1 h-14 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
              >
                Rate dart
              </button>
              <button
                onClick={onBack}
                className="w-full sm:flex-1 h-14 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
            </div>
          </div>
        )}

        {/* Step 2: How would you rate dart? */}
        {step === 2 && (
          <div className="flex flex-col flex-1">
            {/* Center Star Badge */}
            <div className="my-6 flex justify-center">
              <div className="w-24 h-24 rounded-full bg-amber-100/70 dark:bg-amber-400/15 flex items-center justify-center border border-amber-300/40 dark:border-amber-400/20 shadow-xs transition-transform hover:scale-105 duration-300">
                <Star className="w-12 h-12 text-amber-400 fill-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]" />
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
              How would you rate dart?
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
              Tap a star to rate us on the Playstore
            </p>

            {/* Star Rating Selectors */}
            <div className="flex items-center justify-center gap-3 sm:gap-4 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 focus:outline-none transition-transform hover:scale-115 active:scale-90"
                  aria-label={`Rate ${star} star`}
                >
                  <Star
                    className={`w-9 h-9 sm:w-11 sm:h-11 transition-all duration-200 ${
                      (hoveredRating || rating) >= star
                        ? "text-amber-400 fill-amber-400 drop-shadow-[0_3px_10px_rgba(251,191,36,0.45)]"
                        : "text-amber-300/70 dark:text-gray-600 fill-none"
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Labels */}
            <div className="flex items-center justify-between px-3 text-xs font-medium text-gray-400 dark:text-gray-500 mb-8 max-w-[280px] sm:max-w-[320px] mx-auto w-full">
              <span>Not good</span>
              <span>Excellent</span>
            </div>

            {/* Security Badge Card */}
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl p-4 sm:p-5 flex items-start gap-3.5 mb-8 shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-gray-50 dark:bg-white/5 flex items-center justify-center shrink-0 border border-gray-200/50 dark:border-white/10 mt-0.5">
                <ShieldCheck className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                  Secure & fast
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  You'll be redirected to the Play store to submit your rating
                </p>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-auto pt-4 flex flex-col sm:flex-row items-center gap-3 w-full">
              <button
                onClick={() => setStep(3)}
                className="w-full sm:flex-1 h-14 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-[0.99] cursor-pointer"
              >
                Continue
              </button>
              <button
                onClick={onBack}
                className="w-full sm:flex-1 h-14 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Thank you! */}
        {step === 3 && (
          <div className="flex flex-col flex-1">
            <div className="my-6 flex justify-center">
              <img src={goodMark} alt="Success" className="w-24 h-24 object-contain" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
              Thank you!
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mx-auto mb-8">
              Your support helps us keep Dart moving forward.
            </p>

            {/* Action Cards */}
            <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 mb-8 shadow-xs">
              <button
                onClick={handleShare}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shrink-0 text-black shadow-2xs">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                      Share dart with friends
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Spread the word
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>

              <button
                onClick={handleSendFeedback}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0 border border-gray-200/50 dark:border-white/10">
                    <Mail className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                      Send feedback
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Let us know what you think
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
              </button>
            </div>

            {/* Done Button */}
            <div className="mt-auto pt-4">
              <button
                onClick={onDone || onBack}
                className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold rounded-2xl flex items-center justify-center transition-all shadow-sm hover:shadow active:scale-[0.99]"
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
