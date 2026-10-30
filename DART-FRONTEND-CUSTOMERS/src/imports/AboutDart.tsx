import React, { useState } from "react"
import {
  ArrowLeft,
  Globe,
  Shield,
  FileText,
  Award,
  ChevronRight,
  X,
} from "lucide-react"
import DartLogo from "../components/DartLogo"

interface AboutDartProps {
  onBack: () => void
}

export default function AboutDart({ onBack }: AboutDartProps) {
  const [activeModal, setActiveModal] =
    useState<"privacy" | "terms" | "licences" | null>(null)

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
                Version 1.0.0.0
              </h2>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                The smarter way to send and receive packages across Nigeria.
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

      {/* Info Dialog Modal for Privacy, Terms, Licences */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-white/10 animate-in slide-in-from-bottom duration-300 ease-out pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                {activeModal === "privacy" && "Privacy Policy"}
                {activeModal === "terms" && "Terms of Services"}
                {activeModal === "licences" && "Open Source Licences"}
              </h3>
              <button
                onClick={() => setActiveModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-300 space-y-3 max-h-60 overflow-y-auto pr-1">
              {activeModal === "privacy" && (
                <>
                  <p>
                    Dart Technologies Ltd. ("Dart") is committed to protecting
                    your privacy and security. We collect minimal personal
                    information necessary to deliver packages safely and verify
                    identity.
                  </p>
                  <p>
                    Your location data is only accessed when an active delivery
                    or pickup is being coordinated, and never sold to third
                    parties.
                  </p>
                </>
              )}
              {activeModal === "terms" && (
                <>
                  <p>
                    By using Dart, you agree to our terms regarding fair use,
                    verified package contents, safety guidelines, and escrow
                    payment processing.
                  </p>
                  <p>
                    Users must comply with Nigerian logistics regulations and
                    prohibited item guidelines at all times.
                  </p>
                </>
              )}
              {activeModal === "licences" && (
                <>
                  <p>
                    Dart applications are built using open-source technologies
                    including React, Tailwind CSS, Lucide Icons, and Vite under
                    the MIT license.
                  </p>
                  <p>
                    Copyright © 2026 Dart Technologies Ltd. and individual
                    project contributors.
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => setActiveModal(null)}
              className="w-full mt-6 py-3 rounded-xl bg-[#FFCC00] hover:bg-[#f5a623] text-gray-950 font-bold text-sm transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
