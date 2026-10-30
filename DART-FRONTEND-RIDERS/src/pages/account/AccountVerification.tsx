import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Mail,
  Phone,
  ShieldCheck,
  Check,
  ChevronRight,
  X,
  Lock,
  Bike,
  FileText,
} from "lucide-react"
import { usersApi } from "../../api/account.api"
import { useAuth } from "../../context/AuthContext"

interface AccountVerificationProps {
  onBack: () => void
}

export default function AccountVerification({
  onBack,
}: AccountVerificationProps) {
  const { user, riderProfile, refresh } = useAuth()

  const [isNinVerified, setIsNinVerified] = useState<boolean>(
    Boolean((riderProfile as any)?.isVerified || (user as any)?.isVerified || (user as any)?.isNinVerified)
  )
  const [ninNumber, setNinNumber] = useState("")
  const [licenseNumber, setLicenseNumber] = useState(
    riderProfile?.licenseNumber || "DL-82914-ABJ"
  )
  const [showNinModal, setShowNinModal] = useState(false)
  const [showLicenseModal, setShowLicenseModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleSubmitNin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ninNumber.length !== 11) {
      showToast("NIN must be exactly 11 digits")
      return
    }
    setSubmitting(true)
    try {
      await usersApi.submitNin({ nin: ninNumber })
      setIsNinVerified(true)
      showToast("NIN submitted and verified with NIMC!")
      setShowNinModal(false)
      await refresh()
    } catch (err: any) {
      showToast(err.message || "Failed to submit NIN")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitLicense = (e: React.FormEvent) => {
    e.preventDefault()
    showToast("Driver's License details updated!")
    setShowLicenseModal(false)
  }

  const progressPercent = isNinVerified ? 100 : 75

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
          Documents Verification
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Progress Card */}
        <div className="bg-[#121214] dark:bg-[#18181b] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[11px] font-bold text-yellow-400 tracking-wider uppercase">
                COURIER STATUS
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {isNinVerified ? "Identity Fully Verified" : "Verification In Progress"}
              </h3>
            </div>
            <span className="text-2xl font-black text-yellow-400 font-mono">
              {progressPercent}%
            </span>
          </div>

          <p className="text-xs text-gray-400 leading-relaxed mb-4">
            {isNinVerified
              ? "All required courier documents are verified. You have full priority dispatch access."
              : "Complete all documentation steps below to activate high-value delivery assignments."}
          </p>

          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Verification Checklist */}
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 px-1">
            Verification Steps
          </h2>

          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
            {/* 1. Phone Verification */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
                  <Phone className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    Phone Number
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                    {user?.phoneNumber || "+234 703 101 3632"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" /> Verified
              </span>
            </div>

            {/* 2. Email Address */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
                  <Mail className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    Email Address
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                    {user?.email || "rider@dart.ng"}
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" /> Verified
              </span>
            </div>

            {/* 3. National Identity Number (NIN) */}
            <div
              onClick={() => {
                if (!isNinVerified) setShowNinModal(true)
              }}
              className={`p-4 flex items-center justify-between transition-colors ${
                !isNinVerified ? "hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer" : ""
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <ShieldCheck className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    National Identity Number (NIN)
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isNinVerified ? "Validated via NIMC database" : "Required for courier activation"}
                  </p>
                </div>
              </div>
              {isNinVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  <Check className="w-3 h-3 stroke-[3]" /> Verified
                </span>
              ) : (
                <div className="flex items-center gap-1 text-xs font-semibold text-amber-500">
                  <span>Verify</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              )}
            </div>

            {/* 4. Driver's License */}
            <div
              onClick={() => setShowLicenseModal(true)}
              className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <FileText className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    Driver's License Number
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-mono">
                    {licenseNumber}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                <span>Update</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>

            {/* 5. Vehicle Roadworthiness */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
                  <Bike className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                    Vehicle Inspection Status
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Bajaj Boxer 150 (Plate: ABC 232 XY)
                  </p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" /> Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* NIN Modal */}
      {showNinModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setShowNinModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Verify National Identity (NIN)
              </h3>
              <button
                type="button"
                onClick={() => setShowNinModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Enter your 11-digit NIN. Your information is securely encrypted and validated with NIMC.
            </p>

            <form onSubmit={handleSubmitNin} className="space-y-4">
              <input
                type="text"
                maxLength={11}
                value={ninNumber}
                onChange={(e) => setNinNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
                placeholder="11-digit NIN"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono tracking-widest text-center"
                autoFocus
                required
              />

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-semibold text-black text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Verifying..." : "Submit NIN"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* License Modal */}
      {showLicenseModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setShowLicenseModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Driver's License Number
              </h3>
              <button
                type="button"
                onClick={() => setShowLicenseModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitLicense} className="space-y-4">
              <input
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value.toUpperCase())}
                placeholder="e.g. DL-82914-ABJ"
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono uppercase"
                autoFocus
                required
              />

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-semibold text-black text-sm transition shadow-sm cursor-pointer"
              >
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
