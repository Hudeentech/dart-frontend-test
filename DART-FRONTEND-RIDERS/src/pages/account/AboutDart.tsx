import { useState } from "react"
import {
  ArrowLeft,
  Globe,
  Shield,
  FileText,
  Award,
  ChevronRight,
  X,
} from "lucide-react"
import DartLogo from "../../components/DartLogo"

interface AboutDartProps {
  onBack: () => void
}

export default function AboutDart({ onBack }: AboutDartProps) {
  const [activeModal, setActiveModal] = useState<"privacy" | "terms" | "licences" | null>(null)

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
          About Dart.ng
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col justify-between">
        <div className="flex flex-col gap-6">
          {/* Top Hero Card with Dart Logo & Version */}
          <div className="bg-[#121214] dark:bg-[#18181b] text-white rounded-3xl p-6 sm:p-7 flex items-center gap-6 shadow-md border border-white/5">
            <div className="shrink-0 bg-black/40 p-3.5 rounded-2xl border border-white/10 flex items-center justify-center">
              <DartLogo variant="light" className="h-10 w-auto" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Version 2.4.1 (Build 142)
              </h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                Empowering courier entrepreneurs across Nigeria with smart logistics technology.
              </p>
            </div>
          </div>

          {/* Legal and Info Links */}
          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
            {/* Website */}
            <a
              href="https://www.dart.ng"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                  <Globe className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Our Website
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    https://www.dart.ng
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
            </a>

            {/* Privacy Policy */}
            <button
              onClick={() => setActiveModal("privacy")}
              className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Privacy Policy
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
            </button>

            {/* Terms of Services */}
            <button
              onClick={() => setActiveModal("terms")}
              className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Terms of Services
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
            </button>

            {/* Licences */}
            <button
              onClick={() => setActiveModal("licences")}
              className="w-full flex items-center justify-between p-4 sm:p-4.5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center border border-gray-100 dark:border-white/10 shrink-0 group-hover:scale-105 transition-transform">
                  <Award className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900 dark:text-white">
                    Licences
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-800 dark:group-hover:text-white transition-colors shrink-0" />
            </button>
          </div>
        </div>

        {/* Footer Copyright */}
        <div className="text-center pt-10 pb-2 text-xs text-gray-400 dark:text-gray-500 font-normal">
          <p>© 2026 Dart Technologies Ltd.</p>
          <p>All rights reserved.</p>
        </div>
      </div>

      {/* Info Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setActiveModal(null)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-lg bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-white/5">
              <h3 className="font-bold text-base text-gray-900 dark:text-white capitalize">
                {activeModal === "privacy"
                  ? "Privacy Policy"
                  : activeModal === "terms"
                  ? "Courier Partner Terms"
                  : "Platform Licences"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 text-xs text-gray-600 dark:text-gray-300 space-y-3 overflow-y-auto leading-relaxed">
              <p>
                Dart Technologies operates under statutory logistics regulations in the Federal Republic of Nigeria.
              </p>
              <p>
                As a verified courier partner, you agree to handle parcels professionally, adhere to traffic regulations, and uphold confidentiality regarding client parcel data and contact numbers.
              </p>
              <p>
                Data submitted for National Identity Number (NIN) verification is transmitted exclusively through encrypted channels to NIMC authorized verifiers and is never sold or shared with unauthorized third parties.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setActiveModal(null)}
                className="w-full py-3 bg-yellow-400 hover:bg-yellow-500 text-black font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
