import React, { useState, useEffect } from "react"
import {
  ArrowLeft,
  Plus,
  Wallet,
  CreditCard,
  Banknote,
  MoreVertical,
  Check,
  Trash2,
  X,
  Lock,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { cardsApi, SavedCard } from "../api/cards.api"
import { walletApi } from "../api/wallet.api"

interface PaymentMethodProps {
  onBack: () => void
}

interface PaymentItem {
  id: string
  type: "wallet" | "card" | "cash"
  title: string
  subtitle: string
  isDefault: boolean
  cardBrand?: "mastercard" | "visa" | "verve"
  last4?: string
  expiry?: string
}

export default function PaymentMethod({ onBack }: PaymentMethodProps) {
  const [loading, setLoading] = useState<boolean>(true)
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [savedCards, setSavedCards] = useState<SavedCard[]>([])
  const [defaultMethodId, setDefaultMethodId] = useState<string>("wallet")

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSavingCard, setIsSavingCard] = useState<boolean>(false)

  // Add Card Form State
  const [cardNumber, setCardNumber] = useState("")
  const [cardHolder, setCardHolder] = useState("")
  const [cardExpiry, setCardExpiry] = useState("")
  const [cardCvv, setCardCvv] = useState("")
  const [setAsDefault, setSetAsDefault] = useState(false)

  // Fetch real payment methods on mount
  useEffect(() => {
    loadPaymentData()
  }, [])

  const loadPaymentData = async () => {
    setLoading(true)
    try {
      const [walletRes, cardsRes] = await Promise.allSettled([
        walletApi.getWallet(),
        cardsApi.listCards(),
      ])

      if (walletRes.status === "fulfilled" && walletRes.value) {
        const val = walletRes.value as any
        const bal = val?.balance ?? val?.availableBalance ?? 0
        setWalletBalance(Number(bal) || 0)
      }

      if (cardsRes.status === "fulfilled" && Array.isArray(cardsRes.value)) {
        setSavedCards(cardsRes.value)
        const defaultCard = cardsRes.value.find((c) => c.isDefault)
        if (defaultCard) {
          setDefaultMethodId(defaultCard.id)
        }
      }
    } catch (e) {
      console.warn("Failed to load payment methods:", e)
    } finally {
      setLoading(false)
    }
  }

  // Compose all payment items (Dart Wallet + Saved Cards + Cash on delivery)
  const methods: PaymentItem[] = [
    {
      id: "wallet",
      type: "wallet",
      title: "Dart Wallet",
      subtitle: `Instant payment with Dart balance (₦${walletBalance.toLocaleString(
        "en-NG",
        { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      )})`,
      isDefault: defaultMethodId === "wallet",
    },
    ...savedCards.map((card) => ({
      id: card.id,
      type: "card" as const,
      title: "Debit/Credit card",
      subtitle: `${card.cardType.toUpperCase()} •••• ${card.last4} (Exp: ${
        card.expMonth
      }/${card.expYear})`,
      isDefault: defaultMethodId === card.id || card.isDefault,
      cardBrand: card.cardType as "mastercard" | "visa" | "verve",
      last4: card.last4,
      expiry: `${card.expMonth}/${card.expYear}`,
    })),
    {
      id: "cash",
      type: "cash",
      title: "Cash on delivery",
      subtitle: "Pay with physical cash or POS upon delivery",
      isDefault: defaultMethodId === "cash",
    },
  ]

  const handleSetDefault = async (id: string) => {
    setActiveMenuId(null)
    setDefaultMethodId(id)

    if (id !== "wallet" && id !== "cash") {
      try {
        const updatedCards = await cardsApi.setDefaultCard(id)
        if (Array.isArray(updatedCards)) {
          setSavedCards(updatedCards)
        }
      } catch (err) {
        console.error("Failed to update default card on backend:", err)
      }
    }
    triggerToast("Default payment method updated")
  }

  const handleDeleteMethod = async (id: string) => {
    setActiveMenuId(null)
    try {
      await cardsApi.deleteCard(id)
      setSavedCards((prev) => prev.filter((m) => m.id !== id))
      if (defaultMethodId === id) {
        setDefaultMethodId("wallet")
      }
      triggerToast("Payment method removed")
    } catch (err: any) {
      console.error("Failed to delete card:", err)
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not delete card. Please try again."
      setErrorMessage(msg)
    }
  }

  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg)
    setTimeout(() => setShowSuccessToast(null), 2500)
  }

  const handleAddCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanNum = cardNumber.replace(/\s/g, "")
    if (cleanNum.length < 16) {
      alert("Please enter a valid 16-digit card number")
      return
    }

    setErrorMessage(null)
    setIsSavingCard(true)

    try {
      const newCard = await cardsApi.saveCard({
        cardNumber: cleanNum,
        cardHolder: cardHolder.trim() || undefined,
        expiry: cardExpiry || "12/28",
        cvv: cardCvv || undefined,
        setAsDefault,
      })

      setSavedCards((prev) => {
        if (setAsDefault || newCard.isDefault) {
          return [newCard, ...prev.map((c) => ({ ...c, isDefault: false }))]
        }
        return [...prev, newCard]
      })

      if (setAsDefault || newCard.isDefault) {
        setDefaultMethodId(newCard.id)
      }

      setShowAddModal(false)
      setCardNumber("")
      setCardHolder("")
      setCardExpiry("")
      setCardCvv("")
      setSetAsDefault(false)
      triggerToast("New card added and tokenized successfully")
    } catch (err: any) {
      console.error("Failed to add card:", err)
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Could not save card. Please check details and try again."
      setErrorMessage(msg)
    } finally {
      setIsSavingCard(false)
    }
  }

  const formatCardNumber = (val: string) => {
    const v = val.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }
    if (parts.length) {
      return parts.join(" ")
    }
    return v
  }

  const formatExpiry = (val: string) => {
    const v = val.replace(/\D/g, "")
    if (v.length >= 2) {
      return `${v.slice(0, 2)}/${v.slice(2, 4)}`
    }
    return v
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
          Payment method
        </h1>

        {/* Top Right Add Button */}
        <button
          onClick={() => {
            setErrorMessage(null)
            setShowAddModal(true)
          }}
          className="w-9 h-9 rounded-full bg-[#FFCC00] hover:bg-[#f5a623] text-black flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer"
          title="Add Payment Method"
          aria-label="Add Payment Method"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col justify-between">
        <div className="flex flex-col gap-4">
          {/* Toast Notification */}
          {showSuccessToast && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span className="text-sm font-medium">{showSuccessToast}</span>
            </div>
          )}

          {/* Global Error Banner */}
          {errorMessage && !showAddModal && (
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-center gap-3 text-red-700 dark:text-red-400 text-sm animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-yellow-500" />
              <span className="text-xs">Loading payment methods...</span>
            </div>
          ) : (
            /* Payment Methods List */
            <div className="flex flex-col gap-3.5">
              {methods.map((method) => {
                const isDefault = method.isDefault

                return (
                  <div
                    key={method.id}
                    className={`relative rounded-2xl sm:rounded-3xl p-4 sm:p-5 border transition-all ${
                      isDefault
                        ? "bg-[#FFF9E6] dark:bg-amber-400/10 border-amber-300 dark:border-amber-400/30 shadow-xs"
                        : "bg-white dark:bg-[#1c1c20] border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left Icon & Details */}
                      <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 pr-2">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                            method.type === "wallet"
                              ? "bg-yellow-400 text-black"
                              : method.type === "card"
                                ? "bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {method.type === "wallet" && (
                            <Wallet className="w-6 h-6" />
                          )}
                          {method.type === "card" && (
                            <CreditCard className="w-6 h-6" />
                          )}
                          {method.type === "cash" && (
                            <Banknote className="w-6 h-6" />
                          )}
                        </div>

                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-gray-900 dark:text-white truncate">
                              {method.title}
                            </span>
                            {isDefault && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFCC00] text-black uppercase tracking-wider shrink-0 shadow-2xs">
                                DEFAULT
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {method.subtitle}
                          </span>
                        </div>
                      </div>

                      {/* Right Menu Dots */}
                      <div className="relative shrink-0">
                        <button
                          onClick={() =>
                            setActiveMenuId(
                              activeMenuId === method.id ? null : method.id,
                            )
                          }
                          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                          aria-label="Payment method options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === method.id && (
                          <>
                            <div
                              className="fixed inset-0 z-20"
                              onClick={() => setActiveMenuId(null)}
                            />
                            <div className="absolute right-0 top-10 w-44 bg-white dark:bg-[#202024] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                              {!isDefault && (
                                <button
                                  onClick={() => handleSetDefault(method.id)}
                                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5 text-amber-500" />
                                  Set as default
                                </button>
                              )}

                              {method.type === "card" && (
                                <button
                                  onClick={() => handleDeleteMethod(method.id)}
                                  className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete card
                                </button>
                              )}

                              {isDefault && method.type !== "card" && (
                                <div className="px-4 py-2 text-xs text-gray-400 italic">
                                  Primary payment mode
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          onClick={() => {
            setErrorMessage(null)
            setShowAddModal(true)
          }}
          className="w-full py-4 rounded-2xl bg-[#FFCC00] hover:bg-[#f5a623] text-gray-950 font-bold text-base transition-all duration-200 mt-8 shadow-sm active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Add Payment Method</span>
        </button>
      </div>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-white/10 animate-in slide-in-from-bottom duration-300 ease-out relative max-h-[90dvh] overflow-y-auto pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-7">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black shadow-2xs">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  Add Debit / Credit Card
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form
              onSubmit={handleAddCardSubmit}
              className="flex flex-col gap-4"
            >
              {/* Card Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Card Number
                </label>
                <div className="flex items-center bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20">
                  <input
                    type="text"
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) =>
                      setCardNumber(formatCardNumber(e.target.value))
                    }
                    placeholder="0000 0000 0000 0000"
                    required
                    className="w-full bg-transparent outline-none text-sm font-mono font-medium text-gray-900 dark:text-white placeholder:text-gray-400"
                    autoFocus
                  />
                  <div className="flex gap-1 shrink-0 text-[10px] font-bold text-gray-400">
                    VISA / MC / VERVE
                  </div>
                </div>
              </div>

              {/* Card Holder Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  className="w-full bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-yellow-400"
                />
              </div>

              {/* Expiry & CVV */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) =>
                      setCardExpiry(formatExpiry(e.target.value))
                    }
                    placeholder="MM/YY"
                    required
                    className="w-full bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 outline-none text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-yellow-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                    CVV
                  </label>
                  <input
                    type="password"
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) =>
                      setCardCvv(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="•••"
                    required
                    className="w-full bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 outline-none text-sm font-mono text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-yellow-400"
                  />
                </div>
              </div>

              {/* Set as Default Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={setAsDefault}
                  onChange={(e) => setSetAsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FFCC00] focus:ring-[#FFCC00] cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Set as default payment method
                </span>
              </label>

              {/* Security Banner */}
              <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1">
                <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>
                  Your card information is encrypted and PCI-DSS compliant.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  disabled={isSavingCard}
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCard}
                  className="flex-1 py-3.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5a623] disabled:opacity-50 text-gray-950 font-bold text-sm cursor-pointer transition-all shadow-xs flex items-center justify-center gap-2"
                >
                  {isSavingCard ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Card</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
