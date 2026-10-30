import { ArrowLeft } from "lucide-react"

export default function EmailOTP({
  onNext,
  onBack,
}: {
  onNext?: () => void
  onBack?: () => void
}) {
  return (
    <div className="flex flex-col w-full bg-transparent relative">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors mb-6 -ml-2 text-gray-800 dark:text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Enter the 6-digit code
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-normal">
          We sent a code to{" "}
          <span className="text-gray-900 dark:text-white font-semibold">
            hudeen09@gmail.com
          </span>
        </p>
      </div>

      {/* OTP Inputs */}
      <div className="flex items-center justify-center gap-2.5 sm:gap-3 mb-8">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <input
            key={idx}
            type="text"
            maxLength={1}
            className="w-11 sm:w-12 h-14 sm:h-16 text-center text-2xl sm:text-3xl font-bold bg-gray-100 dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl focus:bg-white dark:focus:bg-[#202024] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20 text-gray-900 dark:text-white outline-none transition-all"
            defaultValue={idx === 1 ? "4" : idx === 2 ? "8" : ""}
          />
        ))}
      </div>

      {/* Resend Code */}
      <div className="text-center mb-8">
        <p className="text-gray-500 dark:text-gray-400 font-normal mb-1">
          Didn't receive the code?
        </p>
        <p className="text-gray-900 dark:text-white font-medium text-sm">
          Re-send code in{" "}
          <span className="text-yellow-500 font-semibold">0:20</span>
        </p>
      </div>

      {/* Bottom Actions */}
      <div className="mt-4 flex flex-col gap-3">
        <button
          onClick={onNext}
          className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center shadow-sm hover:shadow-md active:scale-[0.99] text-base"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  )
}
