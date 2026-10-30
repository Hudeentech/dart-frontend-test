import { useState } from "react"
import {
  ArrowLeft,
  Headphones,
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  ChevronRight,
  X,
  Check,
} from "lucide-react"
import { supportApi } from "../../api/account.api"

interface ContactSupportProps {
  onBack: () => void
}

export default function ContactSupport({ onBack }: ContactSupportProps) {
  const [showTicketModal, setShowTicketModal] = useState(false)
  const [category, setCategory] = useState("Dispatch & Orders")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleEmail = () => {
    window.location.href = "mailto:support@dart.ng?subject=Fleet%20Support%20Request"
  }

  const handleCall = () => {
    window.location.href = "tel:+23470412244455"
  }

  const handleWhatsApp = () => {
    window.open("https://wa.me/23470412244455?text=Hello%20Dart%20Fleet%20Support", "_blank")
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description.trim()) return
    setSubmitting(true)
    try {
      await supportApi.create({
        category,
        description: description.trim(),
      })
      showToast("Support ticket dispatched to fleet controller!")
      setShowTicketModal(false)
      setDescription("")
    } catch (err: any) {
      showToast(err.message || "Failed to submit ticket")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative pb-12 transition-colors">
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
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-white transition-colors cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Contact support
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Top Notice Banner */}
        <div className="bg-[#FFF8E7] dark:bg-amber-400/10 border border-[#FFE7A3] dark:border-amber-400/20 rounded-2xl p-4 sm:p-5 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center text-black shrink-0 shadow-2xs">
            <Headphones className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              How can we help you ?
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              Fleet operations desk is active 24/7 for all couriers
            </span>
          </div>
        </div>

        {/* Support Channels List */}
        <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
          {/* Chat with support */}
          <button
            onClick={() => setShowTicketModal(true)}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">
                  Chat with dispatch support
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Open a high-priority dispatch ticket
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Email support */}
          <button
            onClick={handleEmail}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                <Mail className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">
                  Email fleet support
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Support@dart.ng
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* Call us */}
          <button
            onClick={handleCall}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                <Phone className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">
                  Call fleet hotline
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  +234 704 122 444 55 <br />
                  <span className="text-[11px] text-gray-400">
                    24/7 Courier Hotline
                  </span>
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
          </button>

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">
                  WhatsApp Support
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Instant messaging with controllers
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
          </button>
        </div>
      </div>

      {/* Ticket Modal */}
      {showTicketModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setShowTicketModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Dispatch Support Request
              </h3>
              <button
                type="button"
                onClick={() => setShowTicketModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="Dispatch & Orders">Dispatch & Orders</option>
                  <option value="Wallet & Payouts">Wallet & Payouts</option>
                  <option value="Customer Handover Issue">Customer Handover Issue</option>
                  <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Describe what happened
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide details or active order number..."
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-semibold text-black text-sm transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Submit to Fleet Operations"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
