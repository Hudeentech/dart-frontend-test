import React from "react"
import {
  ArrowLeft,
  Headphones,
  MessageSquare,
  Mail,
  Phone,
  MessageCircle,
  ChevronRight,
  AlertCircle,
} from "lucide-react"

interface ContactSupportProps {
  onBack: () => void
  onReportIssue?: () => void
}

export default function ContactSupport({
  onBack,
  onReportIssue,
}: ContactSupportProps) {
  const handleEmail = () => {
    window.location.href = "mailto:Support@dart.ng?subject=Support%20Request"
  }

  const handleCall = () => {
    window.location.href = "tel:+23470412244455"
  }

  const handleWhatsApp = () => {
    window.open(
      "https://wa.me/23470412244455?text=Hello%20Dart%20Support",
      "_blank",
    )
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
              Our support team is here for you
            </span>
          </div>
        </div>

        {/* Support Channels List */}
        <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
          {/* Chat with support */}
          <button
            onClick={onReportIssue || handleWhatsApp}
            className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">
                  Chat with support
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Start a conversation
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
                  Email support
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
                  Call us
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  +234 704 122 444 55 <br />
                  <span className="text-[11px] text-gray-400">
                    Mon - Friday • 8AM - 8PM
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
              <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
                <MessageCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium text-gray-900 dark:text-white">
                  WhatsApp
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Chat with us on whatsApp
                </span>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
          </button>
        </div>

        {/* Option to report a specific issue */}
        {onReportIssue && (
          <div
            onClick={onReportIssue}
            className="p-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 hover:border-amber-400 dark:hover:border-amber-400 bg-white/50 dark:bg-white/[0.02] flex items-center justify-between cursor-pointer transition-all group"
          >
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  Have a specific complaint?
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Submit a detailed issue report
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 group-hover:underline">
              Report issue →
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
