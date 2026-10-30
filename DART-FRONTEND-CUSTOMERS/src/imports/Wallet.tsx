import { useState, useEffect, useMemo } from "react"
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Plus,
  ChevronRight,
  Filter,
  CheckCircle2,
  CreditCard,
  Landmark,
  Info,
  Loader2,
  Copy,
  Check,
  Search,
  RefreshCw,
  AlertCircle,
  ExternalLink,
} from "lucide-react"
import { useTheme } from "../context/ThemeContext"
import NotificationButton from "../components/NotificationButton"
import { walletApi } from "../api/wallet.api"
import { cardsApi, SavedCard } from "../api/cards.api"
import { userApi } from "../api/user.api"
import goodMark from "../assets/good-mark.svg"
import ConfettiBackground from "../components/ConfettiBackground"

type View =
  | "home"
  | "all_transactions"
  | "add_funds"
  | "review"
  | "success"
  | "transaction_details"

const PRESET_AMOUNTS = ["5000", "10000", "15000", "20000", "50000"]

const NIGERIAN_BANKS = [
  { code: "044", name: "Access Bank" },
  { code: "058", name: "Guaranty Trust Bank (GTB)" },
  { code: "057", name: "Zenith Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa (UBA)" },
  { code: "50211", name: "Kuda Bank" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "214", name: "FCMB" },
  { code: "035", name: "Wema Bank" },
]

export default function Wallet({
  onBack,
  onOpenNotifications,
}: {
  onBack?: () => void
  onOpenNotifications?: () => void
} = {}) {
  const { resolvedTheme } = useTheme()
  const [view, setView] = useState<View>("home")
  const [fundsTab, setFundsTab] = useState<"deposit" | "withdraw">("deposit")
  const [amount, setAmount] = useState("10000")
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card")

  // Wallet State
  const [balance, setBalance] = useState<number>(0)
  const [availableBalance, setAvailableBalance] = useState<number>(0)
  const [holdsBalance, setHoldsBalance] = useState<number>(0)
  const [currency, setCurrency] = useState<string>("NGN")
  const [txList, setTxList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Saved Cards & Bank State
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [selectedBankCode, setSelectedBankCode] = useState<string>("044")
  const [selectedBankName, setSelectedBankName] = useState<string>("Access Bank")
  const [accountNumber, setAccountNumber] = useState<string>("")
  const [accountName, setAccountName] = useState<string>("")

  // Selected Transaction for Details
  const [selectedTx, setSelectedTx] = useState<any>(null)

  // All Transactions Filter & Search
  const [txFilter, setTxFilter] = useState<"all" | "credit" | "debit">("all")
  const [searchQuery, setSearchQuery] = useState<string>("")

  // Last Success Result
  const [lastResult, setLastResult] = useState<{
    reference: string
    amount: number
    balance: number
    type: "deposit" | "withdraw"
    timestamp: string
    methodOrBank: string
  } | null>(null)

  // Copy Feedback
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Load initial wallet, transactions, saved cards, and user info
  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.allSettled([
        refreshWallet(),
        loadCards(),
        loadUserProfile(),
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const refreshWallet = async () => {
    setIsRefreshing(true)
    try {
      const wallet = await walletApi.getWallet()
      if (wallet) {
        setBalance(Number(wallet.totalBalance ?? wallet.balance ?? 0))
        setAvailableBalance(Number(wallet.availableBalance ?? wallet.balance ?? 0))
        setHoldsBalance(Number(wallet.holdsBalance ?? 0))
        if (wallet.currency) setCurrency(wallet.currency)
      }

      const history = await walletApi.getTransactions()
      if (Array.isArray(history)) {
        const mapped = history.map((t: any, idx: number) => {
          const isCredit = t.type === "CREDIT" || t.type === "DEPOSIT"
          const amountNum = Math.abs(Number(t.amount || 0))
          const ref =
            t.transaction?.reference ||
            t.reference ||
            `TXN-${String(t.id || idx).slice(0, 8).toUpperCase()}`
          const desc =
            t.transaction?.description ||
            t.description ||
            (isCredit ? "Wallet Top-up" : "Delivery Payment")
          const createdAt = new Date(t.createdAt || Date.now())

          return {
            id: t.id || `tx-${idx}`,
            reference: ref,
            title: desc,
            subtitle: formatRelativeDate(createdAt),
            rawAmount: amountNum,
            amount: `${isCredit ? "+" : "-"}₦${amountNum.toLocaleString("en-NG", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
            isCredit,
            type: t.type,
            balanceBefore: Number(t.balanceBefore || 0),
            balanceAfter: Number(t.balanceAfter || 0),
            createdAt,
            dateGroup: getDateGroup(createdAt),
            dateFormatted: formatFullDate(createdAt),
          }
        })
        setTxList(mapped)
      }
    } catch (err) {
      console.warn("[Wallet] Error refreshing wallet data:", err)
    } finally {
      setIsRefreshing(false)
    }
  }

  const loadCards = async () => {
    try {
      const cards = await cardsApi.listCards()
      if (Array.isArray(cards)) {
        setSavedCards(cards)
      }
    } catch (e) {
      console.warn("[Wallet] Could not load saved cards:", e)
    }
  }

  const loadUserProfile = async () => {
    try {
      const profile = await userApi.getProfile()
      if (profile) {
        const fullName = [profile.firstName, profile.lastName]
          .filter(Boolean)
          .join(" ")
        if (fullName) setAccountName(fullName)
      }
    } catch (e) {
      console.warn("[Wallet] Could not load profile:", e)
    }
  }

  const formatRelativeDate = (d: Date) => {
    const now = new Date()
    const isToday = d.toDateString() === now.toDateString()
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    const isYesterday = d.toDateString() === yesterday.toDateString()

    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    if (isToday) return `Today • ${timeStr}`
    if (isYesterday) return `Yesterday • ${timeStr}`
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} • ${timeStr}`
  }

  const formatFullDate = (d: Date) => {
    const datePart = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    const timePart = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })
    return `${datePart} | ${timePart}`
  }

  const getDateGroup = (d: Date) => {
    const now = new Date()
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    )
    if (diffDays === 0) return "Today"
    if (diffDays <= 7) return "This week"
    return "Earlier"
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  const goBack = () => {
    setErrorMessage(null)
    if (
      view === "all_transactions" ||
      view === "add_funds" ||
      view === "transaction_details"
    ) {
      setView("home")
    } else if (view === "review") {
      setView("add_funds")
    } else if (view === "success") {
      setView("home")
    } else {
      onBack?.()
    }
  }

  // Amount validations
  const isWithdraw = fundsTab === "withdraw"
  const numAmount = Number(amount || 0)
  const exceedsBalance = isWithdraw && numAmount > availableBalance
  const isAmountValid = numAmount > 0 && (!isWithdraw || numAmount <= availableBalance)

  // Filtered transactions in All Transactions View
  const filteredTransactions = useMemo(() => {
    return txList.filter((tx) => {
      if (txFilter === "credit" && !tx.isCredit) return false
      if (txFilter === "debit" && tx.isCredit) return false
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        return (
          tx.title.toLowerCase().includes(q) ||
          tx.reference.toLowerCase().includes(q) ||
          tx.amount.includes(q)
        )
      }
      return true
    })
  }, [txList, txFilter, searchQuery])

  // Grouped transactions
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: any[] } = {}
    filteredTransactions.forEach((tx) => {
      const g = tx.dateGroup || "Recent"
      if (!groups[g]) groups[g] = []
      groups[g].push(tx)
    })
    return groups
  }, [filteredTransactions])

  // Execute Deposit or Withdrawal
  const handleConfirmFundAction = async () => {
    setIsProcessing(true)
    setErrorMessage(null)

    try {
      if (fundsTab === "deposit") {
        const res: any = await walletApi.deposit({
          amount: numAmount,
          paymentMethod: paymentMethod === "card" ? "CARD" : "BANK_TRANSFER",
        })

        const newBal =
          typeof res?.balance !== "undefined"
            ? Number(res.balance)
            : balance + numAmount

        setBalance(newBal)
        setAvailableBalance(newBal - holdsBalance)

        setLastResult({
          reference:
            res?.reference || `TX-DEP-${Date.now().toString(36).toUpperCase()}`,
          amount: numAmount,
          balance: newBal,
          type: "deposit",
          timestamp: formatFullDate(new Date()),
          methodOrBank:
            paymentMethod === "card"
              ? savedCards.length > 0
                ? `${(
                    savedCards.find((c) => c.isDefault) || savedCards[0]
                  ).cardType.toUpperCase()} •••• ${(
                    savedCards.find((c) => c.isDefault) || savedCards[0]
                  ).last4}`
                : "Debit / Credit Card"
              : "Bank Transfer",
        })

        await refreshWallet()
        setView("success")
      } else {
        const res: any = await walletApi.withdraw({
          amount: numAmount,
          bankCode: selectedBankCode,
          bankName: selectedBankName,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim(),
        })

        const newBal =
          typeof res?.balance !== "undefined"
            ? Number(res.balance)
            : Math.max(0, balance - numAmount)

        setBalance(newBal)
        setAvailableBalance(newBal - holdsBalance)

        setLastResult({
          reference:
            res?.reference || `TX-WTD-${Date.now().toString(36).toUpperCase()}`,
          amount: numAmount,
          balance: newBal,
          type: "withdraw",
          timestamp: formatFullDate(new Date()),
          methodOrBank: `${selectedBankName} •••• ${accountNumber.slice(-4)}`,
        })

        await refreshWallet()
        setView("success")
      }
    } catch (err: any) {
      console.error("Fund action failed:", err)
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Transaction could not be processed. Please check details and try again."
      setErrorMessage(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  // =========================================================================
  // VIEW 1: HOME
  // =========================================================================
  const renderHome = () => (
    <div className="flex flex-col min-h-full pb-20 md:pb-10 bg-transparent transition-colors">
      {/* Header: Dark in light mode, top to bottom gradient in dark mode */}
      <div
        className="text-white dark:text-black px-4 sm:px-6 pt-[max(1.75rem,calc(env(safe-area-inset-top,0px)+0.75rem))] pb-6 sm:pb-8 rounded-b-[30px] sm:rounded-b-[40px] relative overflow-hidden shrink-0 transition-all shadow-sm"
        style={{
          background:
            resolvedTheme === "dark"
              ? "linear-gradient(to bottom, #FFA600 0%, #FFCC00 100%)"
              : "#1a1a1a",
        }}
      >
        {/* Sunburst Ray Pattern & Glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            maskImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.08) 18%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.85) 75%, rgba(0, 0, 0, 0.85) 100%)",
            WebkitMaskImage:
              "linear-gradient(to top, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.08) 18%, rgba(0, 0, 0, 0.5) 45%, rgba(0, 0, 0, 0.85) 75%, rgba(0, 0, 0, 0.85) 100%)",
            background:
              resolvedTheme === "dark"
                ? `
                radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.16) 0%, rgba(255, 255, 255, 0.035) 45%, transparent 75%),
                repeating-conic-gradient(
                  from -5deg at 50% 105%,
                  rgba(0, 0, 0, 0.035) 0deg,
                  rgba(0, 0, 0, 0.035) 10deg,
                  transparent 10deg,
                  transparent 20deg
                )
              `
                : `
                radial-gradient(ellipse at 50% 100%, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.015) 40%, transparent 75%),
                repeating-conic-gradient(
                  from -5deg at 50% 105%,
                  rgba(255, 255, 255, 0.028) 0deg,
                  rgba(255, 255, 255, 0.028) 10deg,
                  transparent 10deg,
                  transparent 20deg
                )
              `,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
            <button
              type="button"
              onClick={onBack || goBack}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 dark:hover:bg-black/10 transition-colors cursor-pointer"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-white dark:text-black" />
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={refreshWallet}
                className={`w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/10 dark:hover:bg-black/10 text-white/80 dark:text-black/80 transition-colors cursor-pointer ${
                  isRefreshing ? "animate-spin" : ""
                }`}
                title="Refresh Balance"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <NotificationButton
                variant="dark-header"
                onClick={onOpenNotifications}
              />
            </div>
          </div>

          <div className="text-center mb-7 sm:mb-10">
            <p className="text-xs sm:text-sm md:text-base text-gray-400 dark:text-black/80 font-medium mb-1 sm:mb-1.5">
              Wallet balance
            </p>
            <h2 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white dark:text-black leading-none">
              <span className="text-xl sm:text-3xl md:text-4xl lg:text-5xl mr-1 font-bold text-white dark:text-black">
                ₦
              </span>
              {balance.toLocaleString("en-NG", {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
              <span className="text-lg sm:text-2xl md:text-3xl lg:text-4xl text-gray-400 dark:text-black/70 font-semibold">
                .00
              </span>
            </h2>

            {holdsBalance > 0 && (
              <p className="mt-2 text-xs text-amber-300 dark:text-black/70 font-medium">
                (₦{holdsBalance.toLocaleString()} on active delivery escrow)
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3.5 sm:gap-6 justify-center">
            <button
              onClick={() => {
                setErrorMessage(null)
                setFundsTab("deposit")
                setView("add_funds")
              }}
              className="bg-[#242426] dark:bg-[#18181a] hover:bg-[#2e2e30] dark:hover:bg-[#232326] border border-white/10 dark:border-transparent rounded-full px-4 sm:px-7 py-2.5 sm:py-3.5 flex items-center gap-2 sm:gap-3 transition-all shadow-sm group cursor-pointer touch-manipulation active:scale-[0.98]"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[2.5]" />
              </div>
              <span className="font-semibold text-xs sm:text-base text-white">
                Add funds
              </span>
            </button>

            <button
              onClick={() => {
                setErrorMessage(null)
                setFundsTab("withdraw")
                setView("add_funds")
              }}
              className="bg-[#242426] dark:bg-[#18181a] hover:bg-[#2e2e30] dark:hover:bg-[#232326] border border-white/10 dark:border-transparent rounded-full px-4 sm:px-7 py-2.5 sm:py-3.5 flex items-center gap-2 sm:gap-3 transition-all shadow-sm group cursor-pointer touch-manipulation active:scale-[0.98]"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-yellow-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black stroke-[2.5]" />
              </div>
              <span className="font-semibold text-xs sm:text-base text-white">
                Withdraw
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="px-3 sm:px-5 pt-4 pb-5 sm:py-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
            Recent Transactions
          </h3>
          <button
            onClick={() => setView("all_transactions")}
            className="text-xs sm:text-sm font-medium text-gray-500 dark:text-white underline decoration-gray-300 dark:decoration-white underline-offset-4 hover:opacity-80 transition-opacity cursor-pointer"
          >
            See all
          </button>
        </div>

        {/* Transactions Container */}
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
            <span className="text-xs">Loading wallet activity...</span>
          </div>
        ) : txList.length === 0 ? (
          <div className="bg-white dark:bg-[#1e1e20] border border-gray-100 dark:border-white/5 rounded-2xl p-8 text-center space-y-2">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              No transactions yet
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mx-auto">
              Top up your wallet to start paying for instant deliveries easily.
            </p>
            <button
              onClick={() => {
                setFundsTab("deposit")
                setView("add_funds")
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-xs font-bold text-gray-950 transition-colors cursor-pointer shadow-xs"
            >
              Add Funds Now
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#1e1e20] border border-gray-100 dark:border-white/5 rounded-2xl p-3 sm:p-4 divide-y divide-gray-50 dark:divide-white/5 shadow-xs">
            {txList.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                onClick={() => {
                  setSelectedTx(tx)
                  setView("transaction_details")
                }}
                className="flex items-center justify-between cursor-pointer group py-3 first:pt-0.5 last:pb-0.5"
              >
                <div className="flex gap-3 items-center min-w-0 pr-2">
                  <div
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                      tx.isCredit
                        ? "bg-green-50 dark:bg-emerald-950/40 text-green-600 dark:text-emerald-400 border border-green-100 dark:border-emerald-500/20"
                        : "bg-red-50 dark:bg-rose-950/40 text-red-500 dark:text-rose-400 border border-red-100 dark:border-rose-500/20"
                    }`}
                  >
                    {tx.isCredit ? (
                      <ArrowDown className="w-4 h-4" />
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors truncate">
                      {tx.title}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {tx.subtitle}
                    </span>
                  </div>
                </div>
                <span
                  className={`font-bold text-sm shrink-0 ${
                    tx.isCredit
                      ? "text-green-600 dark:text-emerald-400"
                      : "text-red-500 dark:text-rose-400"
                  }`}
                >
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // =========================================================================
  // VIEW 2: ALL TRANSACTIONS
  // =========================================================================
  const renderAllTransactions = () => (
    <div className="flex flex-col min-h-full bg-transparent transition-colors pb-16">
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md z-10">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white">
          Transaction History
        </h1>
        <button
          onClick={refreshWallet}
          className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer ${
            isRefreshing ? "animate-spin" : ""
          }`}
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by description or reference..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white dark:bg-[#1e1e20] border border-gray-200 dark:border-white/10 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-yellow-400"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTxFilter("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
              txFilter === "all"
                ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-2xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            All ({txList.length})
          </button>
          <button
            onClick={() => setTxFilter("credit")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              txFilter === "credit"
                ? "bg-emerald-500 text-white shadow-2xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            <ArrowDown className="w-3.5 h-3.5" />
            <span>Inflows</span>
          </button>
          <button
            onClick={() => setTxFilter("debit")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              txFilter === "debit"
                ? "bg-rose-500 text-white shadow-2xs"
                : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
            }`}
          >
            <ArrowUp className="w-3.5 h-3.5" />
            <span>Outflows</span>
          </button>
        </div>

        {/* Grouped Transactions List */}
        {Object.keys(groupedTransactions).length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 space-y-2">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              No matching transactions
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Try adjusting your filter or search query.
            </p>
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([group, list]) => (
            <div key={group} className="space-y-2">
              <p className="text-[11px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                {group}
              </p>
              <div className="bg-white dark:bg-[#1e1e20] border border-gray-100 dark:border-white/5 rounded-2xl p-3 sm:p-4 divide-y divide-gray-50 dark:divide-white/5 shadow-xs">
                {list.map((tx) => (
                  <div
                    key={tx.id}
                    onClick={() => {
                      setSelectedTx(tx)
                      setView("transaction_details")
                    }}
                    className="flex items-center justify-between cursor-pointer group py-3 first:pt-0.5 last:pb-0.5"
                  >
                    <div className="flex gap-3 items-center min-w-0 pr-2">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 ${
                          tx.isCredit
                            ? "bg-green-50 dark:bg-emerald-950/40 text-green-600 dark:text-emerald-400 border border-green-100 dark:border-emerald-500/20"
                            : "bg-red-50 dark:bg-rose-950/40 text-red-500 dark:text-rose-400 border border-red-100 dark:border-rose-500/20"
                        }`}
                      >
                        {tx.isCredit ? (
                          <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUp className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors truncate">
                          {tx.title}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {tx.subtitle}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`font-bold text-sm shrink-0 ${
                        tx.isCredit
                          ? "text-green-600 dark:text-emerald-400"
                          : "text-red-500 dark:text-rose-400"
                      }`}
                    >
                      {tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  // =========================================================================
  // VIEW 3: ADD FUNDS / WITHDRAW INPUT
  // =========================================================================
  const renderAddFunds = () => (
    <div className="flex flex-col min-h-full bg-transparent transition-colors">
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md z-10 border-b border-gray-100 dark:border-white/5">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          {fundsTab === "deposit" ? "Add funds" : "Withdraw funds"}
        </h1>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col flex-1">
        {/* Toggle Switch */}
        <div className="bg-gray-100 dark:bg-[#1f1f23] p-1 rounded-full flex mb-6 sm:mb-8 w-full max-w-xs mx-auto border border-gray-100 dark:border-white/5">
          <button
            onClick={() => {
              setErrorMessage(null)
              setFundsTab("deposit")
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer touch-manipulation ${
              fundsTab === "deposit"
                ? "bg-yellow-400 text-black shadow-sm font-bold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Deposit
          </button>
          <button
            onClick={() => {
              setErrorMessage(null)
              setFundsTab("withdraw")
            }}
            className={`flex-1 py-2 text-sm font-semibold rounded-full transition-all cursor-pointer touch-manipulation ${
              fundsTab === "withdraw"
                ? "bg-yellow-400 text-black shadow-sm font-bold"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            Withdraw
          </button>
        </div>

        {/* Available Balance in Withdraw Mode */}
        {fundsTab === "withdraw" && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
              Available balance:{" "}
              <strong className="text-gray-900 dark:text-white font-bold">
                ₦{availableBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </strong>
            </span>
          </div>
        )}

        {/* Amount Input */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center">
            <span className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mr-1">
              ₦
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "")
                setAmount(val)
              }}
              placeholder="0"
              className="text-4xl sm:text-6xl font-extrabold text-gray-900 dark:text-white bg-transparent outline-none w-auto max-w-[280px] sm:max-w-xs text-center border-b-2 border-transparent focus:border-yellow-400 transition-colors"
            />
          </div>

          {exceedsBalance && (
            <p className="text-xs text-red-500 mt-2 font-medium">
              Amount exceeds your available balance of ₦{availableBalance.toLocaleString()}
            </p>
          )}
        </div>

        {/* Preset Amount Chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {PRESET_AMOUNTS.map((val) => {
            const numVal = Number(val)
            const disabled = isWithdraw && numVal > availableBalance
            return (
              <button
                key={val}
                type="button"
                disabled={disabled}
                onClick={() => setAmount(val)}
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors border cursor-pointer touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed ${
                  amount === val
                    ? "bg-yellow-400 border-yellow-400 text-black shadow-xs font-bold"
                    : "bg-white dark:bg-[#202024] border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-yellow-400"
                }`}
              >
                ₦{Number(val).toLocaleString()}
              </button>
            )
          })}
        </div>

        {/* Deposit: Payment Method / Withdraw: Bank Account Input */}
        {fundsTab === "deposit" ? (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
              Payment method
            </p>

            {/* Option 1: Saved Debit/Credit Card */}
            <button
              type="button"
              onClick={() => setPaymentMethod("card")}
              className={`p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                paymentMethod === "card"
                  ? "bg-yellow-50 dark:bg-yellow-400/10 border-yellow-400"
                  : "bg-white dark:bg-[#1f1f23] border-gray-100 dark:border-white/5 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#28282d] flex items-center justify-center shadow-sm border border-gray-100 dark:border-white/10 text-blue-600 dark:text-blue-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    Debit / Credit Card
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {savedCards.length > 0
                      ? `${(
                          savedCards.find((c) => c.isDefault) || savedCards[0]
                        ).cardType.toUpperCase()} •••• ${(
                          savedCards.find((c) => c.isDefault) || savedCards[0]
                        ).last4}`
                      : "Instant charge via verified card"}
                  </span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "card"
                    ? "border-yellow-400 bg-yellow-400"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {paymentMethod === "card" && (
                  <div className="w-2 h-2 bg-black rounded-full" />
                )}
              </div>
            </button>

            {/* Option 2: Bank Transfer */}
            <button
              type="button"
              onClick={() => setPaymentMethod("bank")}
              className={`p-4 rounded-2xl flex items-center justify-between border transition-all cursor-pointer ${
                paymentMethod === "bank"
                  ? "bg-yellow-50 dark:bg-yellow-400/10 border-yellow-400"
                  : "bg-white dark:bg-[#1f1f23] border-gray-100 dark:border-white/5 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-[#28282d] flex items-center justify-center shadow-sm border border-gray-100 dark:border-white/10 text-gray-800 dark:text-white">
                  <Landmark className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    Bank Transfer
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Direct transfer to DART virtual account
                  </span>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  paymentMethod === "bank"
                    ? "border-yellow-400 bg-yellow-400"
                    : "border-gray-300 dark:border-gray-600"
                }`}
              >
                {paymentMethod === "bank" && (
                  <div className="w-2 h-2 bg-black rounded-full" />
                )}
              </div>
            </button>
          </div>
        ) : (
          /* Withdrawal Destination Bank Inputs */
          <div className="flex flex-col gap-4 bg-white dark:bg-[#1f1f23] p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-white/5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Payout Bank Account
            </p>

            {/* Bank Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Select Bank
              </label>
              <select
                value={selectedBankCode}
                onChange={(e) => {
                  const b = NIGERIAN_BANKS.find((x) => x.code === e.target.value)
                  setSelectedBankCode(e.target.value)
                  if (b) setSelectedBankName(b.name)
                }}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#28282d] border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-yellow-400"
              >
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b.code} value={b.code} className="bg-white dark:bg-[#1c1c20]">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Account Number (10 Digits)
              </label>
              <input
                type="text"
                maxLength={10}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="0123456789"
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#28282d] border border-gray-200 dark:border-white/10 text-sm font-mono font-medium text-gray-900 dark:text-white outline-none focus:border-yellow-400"
              />
            </div>

            {/* Account Holder Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                Account Name
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Account Holder Name"
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-[#28282d] border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-900 dark:text-white outline-none focus:border-yellow-400"
              />
            </div>
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-auto pt-6 pb-4">
          <button
            disabled={!isAmountValid}
            onClick={() => {
              setErrorMessage(null)
              setView("review")
            }}
            className={`w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              isAmountValid
                ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900 shadow-sm"
                : "bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            <span>
              {fundsTab === "deposit"
                ? "Continue to Deposit"
                : "Continue to Withdraw"}
            </span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )

  // =========================================================================
  // VIEW 4: REVIEW DETAILS
  // =========================================================================
  const renderReviewDetails = () => (
    <div className="flex flex-col min-h-full bg-transparent transition-colors">
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md z-10 border-b border-gray-50 dark:border-white/5">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          {fundsTab === "deposit" ? "Review deposit" : "Review withdrawal"}
        </h1>
      </div>

      <div className="px-4 sm:px-6 py-4 sm:py-6 flex flex-col flex-1">
        {/* Error Banner if submission failed */}
        {errorMessage && (
          <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="bg-gray-50 dark:bg-[#1f1f23] rounded-2xl p-4 border border-gray-100 dark:border-white/5 mb-6 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {fundsTab === "deposit" ? "Payment Method" : "Destination Account"}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {fundsTab === "deposit"
                ? paymentMethod === "card"
                  ? "Debit / Credit Card"
                  : "Bank Transfer"
                : `${selectedBankName} •••• ${accountNumber.slice(-4)}`}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              ₦{numAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {fundsTab === "deposit" ? "Transfer fee" : "Withdrawal fee"}
            </span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              Free
            </span>
          </div>
          <div className="h-px w-full bg-gray-200 dark:bg-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900 dark:text-white font-medium">Total</span>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              ₦{numAmount.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400 text-xs bg-gray-50 dark:bg-[#1f1f23] p-3 rounded-lg mb-6 border border-gray-100 dark:border-white/5">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-yellow-500" />
          <p>
            {fundsTab === "deposit"
              ? "Funds will be credited immediately to your Dart Wallet balance upon confirmation."
              : `Funds will be transferred directly to ${accountName} (${accountNumber}) at ${selectedBankName}.`}
          </p>
        </div>

        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          {fundsTab === "deposit"
            ? "Deposit Information"
            : "Payout Account Details"}
        </h3>

        <div className="flex flex-col gap-3.5 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Bank Name</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {fundsTab === "deposit" ? "Providus Bank / Wema" : selectedBankName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Account Name</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {fundsTab === "deposit" ? "DART Technologies Ltd" : accountName}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Account Number</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white font-mono">
              {fundsTab === "deposit" ? "7031013632" : accountNumber}
            </span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-auto pt-6 pb-4">
          <button
            disabled={isProcessing}
            onClick={handleConfirmFundAction}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-gray-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99]"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  {fundsTab === "deposit"
                    ? "Processing Deposit..."
                    : "Processing Withdrawal..."}
                </span>
              </>
            ) : (
              <span>
                {fundsTab === "deposit"
                  ? `Confirm Deposit (₦${numAmount.toLocaleString()})`
                  : `Confirm Withdrawal (₦${numAmount.toLocaleString()})`}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  )

  // =========================================================================
  // VIEW 5: SUCCESS RECEIPT
  // =========================================================================
  const renderSuccess = () => (
    <div className="flex flex-col min-h-full bg-transparent transition-colors">
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md z-10 border-b border-gray-100 dark:border-white/5">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          {lastResult?.type === "deposit" ? "Deposit status" : "Withdrawal status"}
        </h1>
      </div>

      <div className="px-4 sm:px-6 py-6 sm:py-8 flex flex-col flex-1 items-center justify-center">
        <div className="relative w-28 h-28 flex items-center justify-center mb-5">
          {lastResult?.type === "deposit" && (
            <ConfettiBackground className="absolute inset-0 w-full h-full" />
          )}
          <img
            src={goodMark}
            alt="Success"
            className="relative z-10 w-20 h-20 object-contain animate-in zoom-in-50 duration-300"
          />
        </div>

        <span className="bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2">
          {lastResult?.type === "deposit"
            ? "DEPOSIT COMPLETED"
            : "WITHDRAWAL COMPLETED"}
        </span>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1.5 text-center">
          {lastResult?.type === "deposit"
            ? "Funds Added Successfully!"
            : "Withdrawal Processed!"}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8 max-w-xs">
          {lastResult?.type === "deposit"
            ? `₦${(lastResult?.amount || 0).toLocaleString()} has been added to your Dart Wallet.`
            : `₦${(lastResult?.amount || 0).toLocaleString()} has been sent to ${lastResult?.methodOrBank}.`}
        </p>

        {/* Real Summary Card */}
        <div className="w-full flex flex-col gap-3.5 bg-gray-50 dark:bg-[#1f1f23] p-5 rounded-2xl border border-gray-100 dark:border-white/5 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {lastResult?.type === "deposit" ? "Amount Added" : "Amount Withdrawn"}
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              ₦{(lastResult?.amount || 0).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Reference ID</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                {lastResult?.reference}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(lastResult?.reference || "", "ref-success")
                }
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy reference"
              >
                {copiedText === "ref-success" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Date & Time</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {lastResult?.timestamp}
            </span>
          </div>

          <div className="h-px w-full bg-gray-200 dark:bg-white/10" />

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900 dark:text-white font-medium">
              New Balance
            </span>
            <span className="text-base font-bold text-gray-900 dark:text-white">
              ₦{(lastResult?.balance || balance).toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-auto w-full pt-4 pb-4 flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => setView("home")}
            className="w-full sm:flex-1 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            Back to Wallet
          </button>
          <button
            onClick={() => setView("all_transactions")}
            className="w-full sm:flex-1 text-gray-600 dark:text-gray-300 font-semibold py-4 hover:text-gray-900 dark:hover:text-white transition-colors cursor-pointer text-center"
          >
            View Transaction History
          </button>
        </div>
      </div>
    </div>
  )

  // =========================================================================
  // VIEW 6: TRANSACTION DETAILS RECEIPT
  // =========================================================================
  const renderTransactionDetails = () => (
    <div className="flex flex-col min-h-full bg-transparent transition-colors">
      <div className="px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 bg-[#fcfcfc]/95 dark:bg-[#0c0c0e]/95 backdrop-blur-md z-10 border-b border-gray-50 dark:border-white/5">
        <button
          onClick={goBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
        </button>
        <h1 className="text-base font-semibold text-gray-900 dark:text-white absolute left-1/2 -translate-x-1/2">
          Transaction details
        </h1>
      </div>

      <div className="px-4 sm:px-6 py-6 sm:py-8 flex flex-col flex-1 items-center">
        <div
          className={`rounded-3xl p-5 mb-4 shadow-lg ${
            selectedTx?.isCredit
              ? "bg-emerald-500 shadow-emerald-500/20"
              : "bg-gray-900 dark:bg-white shadow-black/20"
          }`}
        >
          {selectedTx?.isCredit ? (
            <ArrowDown className="w-10 h-10 text-white" />
          ) : (
            <ArrowUp className="w-10 h-10 text-white dark:text-gray-950" />
          )}
        </div>

        <span className="bg-green-100 dark:bg-green-400/10 text-green-700 dark:text-green-400 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
          TRANSACTION SUCCESSFUL
        </span>

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1 text-center">
          {selectedTx?.title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
          {selectedTx?.subtitle}
        </p>

        {/* Receipt Key-Value Rows */}
        <div className="w-full flex flex-col gap-4 border-t border-gray-100 dark:border-white/10 pt-6 mb-8">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Amount</span>
            <span
              className={`text-base font-bold ${
                selectedTx?.isCredit
                  ? "text-green-600 dark:text-emerald-400"
                  : "text-red-500 dark:text-rose-400"
              }`}
            >
              {selectedTx?.amount}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Transaction Type
            </span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedTx?.isCredit ? "Credit / Inflow" : "Debit / Outflow"}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Reference ID</span>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-mono font-bold text-gray-900 dark:text-white">
                {selectedTx?.reference}
              </span>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(selectedTx?.reference || "", "ref-details")
                }
                className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                title="Copy reference"
              >
                {copiedText === "ref-details" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Fee</span>
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              Free (₦0.00)
            </span>
          </div>

          {selectedTx?.balanceAfter > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Balance After Transaction
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                ₦{selectedTx.balanceAfter.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500 dark:text-gray-400">Date & Time</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {selectedTx?.dateFormatted || selectedTx?.subtitle}
            </span>
          </div>
        </div>

        <div className="mt-auto w-full pt-6 pb-4">
          <button
            onClick={() => setView("home")}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-bold py-4 rounded-xl transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
          >
            Back to Wallet
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="w-full flex-1 flex flex-col min-h-full bg-transparent relative transition-colors">
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative pb-12 transition-colors">
        {view === "home" && renderHome()}
        {view === "all_transactions" && renderAllTransactions()}
        {view === "add_funds" && renderAddFunds()}
        {view === "review" && renderReviewDetails()}
        {view === "success" && renderSuccess()}
        {view === "transaction_details" && renderTransactionDetails()}
      </div>
    </div>
  )
}
