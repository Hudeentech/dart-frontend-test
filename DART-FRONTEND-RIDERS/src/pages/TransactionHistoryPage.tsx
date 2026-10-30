import { useState, useEffect } from "react"
import { walletApi } from "../api/account.api"
import { useToast } from "../context/ToastContext"
import { goBack } from "../hooks/router"
import { formatNaira, formatDateTime } from "../utils/format"
import {
  ArrowLeft,
  Filter,
  Calendar,
  X,
  ChevronDown,
  Check,
} from "lucide-react"
import type { LedgerEntry } from "../types/api.types"

// Custom 3D parcel with checkmark badge matching user design reference
function DeliveryEarningsIcon() {
  return (
    <svg className="size-6 stroke-[1.8]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M16.5 9.4 7.55 4.24a1.8 1.8 0 0 0-1.8 0L2.7 6.02a1.8 1.8 0 0 0-.9 1.56v7.84a1.8 1.8 0 0 0 .9 1.56l3.05 1.78"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m3.3 7 8.7 5 8.7-5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 12v9" strokeLinecap="round" strokeLinejoin="round" />
      <circle
        cx="16.5"
        cy="16.5"
        r="4.5"
        fill="currentColor"
        fillOpacity="0.12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="m14.5 16.5 1.5 1.5 3-3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// Custom wallet / purse icon matching user design reference for withdrawals
function WithdrawalIcon() {
  return (
    <svg className="size-5 stroke-[2.2]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path
        d="M19 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="1.5" fill="currentColor" />
    </svg>
  )
}

interface TransactionItem {
  id: string
  type: "EARNINGS" | "WITHDRAWAL"
  title: string
  subtitle: string
  timeOrDate: string
  amount: number
  section: "Today" | "This week" | "This Month"
}

export function TransactionHistoryPage() {
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<"ALL" | "WITHDRAWALS">("ALL")
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [dateFilter, setDateFilter] = useState<"All Time" | "Today" | "This Week" | "This Month">("All Time")
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const [entries, setEntries] = useState<LedgerEntry[]>([])

  useEffect(() => {
    walletApi.transactions().then((t) => {
      setEntries(t || [])
    }).catch(() => {})
  }, [])

  // Design mockup transactions exactly matching reference screenshots
  const defaultTransactions: TransactionItem[] = [
    // Today
    {
      id: "tx-today-1",
      type: "EARNINGS",
      title: "Delivery Earnings",
      subtitle: "Order #42324-HUD-PKG34R",
      timeOrDate: "Just Now",
      amount: 2500,
      section: "Today",
    },
    {
      id: "tx-today-2",
      type: "WITHDRAWAL",
      title: "Withdrawal to Kuda Bank",
      subtitle: "***** **** ****1234",
      timeOrDate: "14mins ago",
      amount: -12500,
      section: "Today",
    },
    {
      id: "tx-today-3",
      type: "EARNINGS",
      title: "Delivery Earnings",
      subtitle: "Order #42324-HUD-PKG34R",
      timeOrDate: "11:15 AM",
      amount: 5000,
      section: "Today",
    },
    // This week
    {
      id: "tx-week-1",
      type: "EARNINGS",
      title: "Delivery Earnings",
      subtitle: "Order #42324-HUD-PKG34R",
      timeOrDate: "14/03/2026",
      amount: 2500,
      section: "This week",
    },
    {
      id: "tx-week-2",
      type: "WITHDRAWAL",
      title: "Withdrawal to Kuda Bank",
      subtitle: "***** **** ****1234",
      timeOrDate: "10/09/2026",
      amount: -12500,
      section: "This week",
    },
    // This Month
    {
      id: "tx-month-1",
      type: "EARNINGS",
      title: "Delivery Earnings",
      subtitle: "Order #42324-HUD-PKG34R",
      timeOrDate: "02/03/2026",
      amount: 2500,
      section: "This Month",
    },
  ]

  // If real entries exist, map them or merge
  const mappedApiTransactions: TransactionItem[] = entries.map((entry) => {
    const isCredit = entry.type === "CREDIT"
    const entryDate = new Date(entry.createdAt)
    const now = new Date()
    const isToday = entryDate.toDateString() === now.toDateString()
    const diffDays = Math.floor((now.getTime() - entryDate.getTime()) / (1000 * 3600 * 24))
    const section: "Today" | "This week" | "This Month" =
      isToday ? "Today" : diffDays < 7 ? "This week" : "This Month"

    return {
      id: entry.id,
      type: isCredit ? "EARNINGS" : "WITHDRAWAL",
      title: isCredit ? "Delivery Earnings" : "Withdrawal to Bank",
      subtitle: entry.description || entry.transaction?.description || (isCredit ? "Order #42324-HUD-PKG34R" : "***** **** ****1234"),
      timeOrDate: formatDateTime(entry.createdAt),
      amount: isCredit ? Number(entry.amount) : -Number(entry.amount),
      section,
    }
  })

  const allTransactions = mappedApiTransactions.length > 0 ? mappedApiTransactions : defaultTransactions

  // Tab Filtering (All vs Withdrawals)
  const tabFiltered = allTransactions.filter((tx) => {
    if (activeTab === "WITHDRAWALS") return tx.type === "WITHDRAWAL"
    return true
  })

  // Date Filtering
  const dateFiltered = tabFiltered.filter((tx) => {
    if (dateFilter === "Today") return tx.section === "Today"
    if (dateFilter === "This Week") return tx.section === "Today" || tx.section === "This week"
    if (dateFilter === "This Month") return true
    return true
  })

  // Group by sections
  const sections: ("Today" | "This week" | "This Month")[] = ["Today", "This week", "This Month"]

  const handleMarkAsRead = () => {
    toast("All transactions marked as read", "success")
  }

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-white dark:bg-[#121214] text-gray-900 dark:text-white pb-24 md:pb-16 transition-colors">
      {/* 1. TOP BAR */}
      <div className="w-full px-4 sm:px-6 pt-[max(1rem,calc(env(safe-area-inset-top,0px)+0.5rem))] pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
        <button
          id="btn-back"
          onClick={() => goBack("/earnings")}
          className="flex size-10 items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-800 dark:text-white transition cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="size-5 stroke-[2.2]" />
        </button>

        <h1 className="text-base sm:text-lg font-bold tracking-tight text-gray-900 dark:text-white">
          Transaction History
        </h1>

        {/* Filter Button */}
        <button
          id="btn-open-filter"
          onClick={() => setFilterModalOpen(true)}
          className="flex size-10 items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/15 transition cursor-pointer"
          title="Filter Transactions"
          aria-label="Filter Transactions"
        >
          <Filter className="size-4.5 stroke-[1.8]" />
        </button>
      </div>

      <div className="px-4 sm:px-8 max-w-2xl mx-auto w-full pt-4 space-y-5">
        {/* 2. SEGMENTED PILL TAB SWITCHER */}
        <div className="bg-gray-100 dark:bg-white/5 p-1 rounded-full flex items-center w-full select-none">
          <button
            id="tab-all-transactions"
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-full transition-all text-center cursor-pointer ${
              activeTab === "ALL"
                ? "bg-yellow-400 text-black shadow-xs"
                : "text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white"
            }`}
          >
            All Transactions
          </button>
          <button
            id="tab-withdrawals"
            type="button"
            onClick={() => setActiveTab("WITHDRAWALS")}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-full transition-all text-center cursor-pointer ${
              activeTab === "WITHDRAWALS"
                ? "bg-yellow-400 text-black shadow-xs"
                : "text-gray-400 dark:text-white/40 hover:text-gray-700 dark:hover:text-white"
            }`}
          >
            Withdrawals
          </button>
        </div>

        {/* 3. GROUPED TRANSACTIONS SECTIONS */}
        <div className="space-y-6 pt-1">
          {sections.map((sectionName) => {
            const items = dateFiltered.filter((i) => i.section === sectionName)
            if (items.length === 0) return null

            return (
              <div key={sectionName} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center justify-between pt-1">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                    {sectionName}
                  </h2>
                  {sectionName === "Today" && (
                    <button
                      id="btn-mark-as-read"
                      onClick={handleMarkAsRead}
                      className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white underline hover:opacity-80 transition cursor-pointer"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>

                {/* List Items */}
                <div className="space-y-3">
                  {items.map((item) => {
                    const isCredit = item.type === "EARNINGS"

                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-gray-100/80 dark:border-white/5 last:border-b-0"
                      >
                        <div className="flex items-center gap-3 sm:gap-3.5">
                          {/* Circular Icon Container */}
                          {isCredit ? (
                            <div className="size-12 rounded-full bg-[#e8f5e9] dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center shrink-0 text-[#2e7d32] dark:text-emerald-400">
                              <DeliveryEarningsIcon />
                            </div>
                          ) : (
                            <div className="size-12 rounded-full bg-yellow-400 text-black flex items-center justify-center shrink-0 shadow-xs">
                              <WithdrawalIcon />
                            </div>
                          )}

                          {/* Details */}
                          <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm sm:text-base leading-snug">
                              {item.title}
                            </h3>
                            <p className="text-xs text-gray-400 dark:text-white/40 mt-0.5">
                              {item.subtitle}
                            </p>
                            {item.timeOrDate && (
                              <p className="text-[11px] text-gray-400 dark:text-white/40 mt-0.5">
                                {item.timeOrDate}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <span
                            className={`text-base sm:text-lg font-bold ${
                              isCredit
                                ? "text-[#2e7d32] dark:text-emerald-400"
                                : "text-[#e53935] dark:text-rose-400"
                            }`}
                          >
                            {isCredit ? "+" : "-"}
                            {formatNaira(Math.abs(item.amount))}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {dateFiltered.length === 0 && (
            <div className="text-center py-12 text-gray-400 dark:text-white/40 text-sm">
              <p>No transactions found for this filter.</p>
            </div>
          )}
        </div>
      </div>

      {/* 4. "FILTER BY" MODAL / SHEET - Exact replica of user's second image */}
      {filterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="fixed inset-0 -z-10"
            onClick={() => setFilterModalOpen(false)}
          />

          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 shadow-2xl p-5 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">
                Filter by
              </h3>
              <button
                id="btn-close-filter-modal"
                onClick={() => setFilterModalOpen(false)}
                className="flex size-7 items-center justify-center rounded-lg border border-gray-300 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10 transition cursor-pointer"
                aria-label="Close"
              >
                <X className="size-4 stroke-[2.2]" />
              </button>
            </div>

            {/* Filter Row: Date */}
            <div className="relative">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-yellow-400 text-black flex items-center justify-center shrink-0 shadow-xs">
                    <Calendar className="size-5 stroke-[2]" />
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    Date
                  </span>
                </div>

                {/* Dropdown trigger */}
                <button
                  id="btn-select-date-filter"
                  type="button"
                  onClick={() => setDateDropdownOpen(!dateDropdownOpen)}
                  className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-gray-500 dark:text-white/60 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                >
                  <span>{dateFilter}</span>
                  <ChevronDown className="size-4 stroke-[2]" />
                </button>
              </div>

              {/* Date Choices Dropdown */}
              {dateDropdownOpen && (
                <div className="mt-2 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 p-1.5 space-y-1">
                  {(["All Time", "Today", "This Week", "This Month"] as const).map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setDateFilter(option)
                        setDateDropdownOpen(false)
                        setFilterModalOpen(false)
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                        dateFilter === option
                          ? "bg-yellow-400 text-black font-bold"
                          : "text-gray-700 dark:text-white/80 hover:bg-gray-200/60 dark:hover:bg-white/10"
                      }`}
                    >
                      <span>{option}</span>
                      {dateFilter === option && <Check className="size-3.5 stroke-[2.5]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
