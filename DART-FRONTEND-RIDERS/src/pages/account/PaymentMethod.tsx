import { useState, useEffect } from "react"
import {
  ArrowLeft,
  Plus,
  Wallet,
  CreditCard,
  Check,
  Trash2,
  X,
  MoreVertical,
  Building,
} from "lucide-react"
import CustomDeleteModal from "../../components/CustomDeleteModal"
import SwipeToDeleteItem from "../../components/SwipeToDeleteItem"
import { walletApi } from "../../api/account.api"
import { useAuth } from "../../context/AuthContext"
import { fullName } from "../../utils/format"

interface PaymentMethodProps {
  onBack: () => void
}

interface SettlementMethod {
  id: string
  type: "wallet" | "bank" | "card"
  title: string
  subtitle: string
  isDefault: boolean
}

export default function PaymentMethod({ onBack }: PaymentMethodProps) {
  const { user } = useAuth()
  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [methods, setMethods] = useState<SettlementMethod[]>([
    {
      id: "wallet",
      type: "wallet",
      title: "Dart Courier Wallet",
      subtitle: "Instant earnings balance available for withdrawal",
      isDefault: true,
    },
  ])

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState<boolean>(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [deletePrompt, setDeletePrompt] = useState<{
    isOpen: boolean
    title: string
    message: string
    itemCount?: number
    confirmText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })

  // Add Bank State
  const [bankName, setBankName] = useState("Guaranty Trust Bank")
  const [accountNumber, setAccountNumber] = useState("")
  const [accountName, setAccountName] = useState(fullName(user) || "")

  useEffect(() => {
    walletApi.get().then((w) => {
      if (w?.totalBalance != null) setWalletBalance(w.totalBalance)
    })
  }, [])

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleSetDefault = (id: string) => {
    setActiveMenuId(null)
    setMethods((prev) =>
      prev.map((m) => ({
        ...m,
        isDefault: m.id === id,
      }))
    )
    triggerToast("Default settlement method updated")
  }

  const promptDeleteMethod = (method: SettlementMethod) => {
    setActiveMenuId(null)
    setDeletePrompt({
      isOpen: true,
      title: "Remove bank account?",
      message: `Are you sure you want to remove ${method.title} (${method.subtitle}) as a settlement method?`,
      itemCount: 1,
      confirmText: "Remove Account",
      onConfirm: () => {
        setDeletePrompt((prev) => ({ ...prev, isOpen: false }))
        setMethods((prev) => prev.filter((m) => m.id !== method.id))
        triggerToast("Settlement account removed")
      },
    })
  }

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    if (accountNumber.length !== 10) {
      triggerToast("Account number must be 10 digits")
      return
    }
    const newMethod: SettlementMethod = {
      id: `bank-${Date.now()}`,
      type: "bank",
      title: bankName,
      subtitle: `${accountNumber} • ${accountName}`,
      isDefault: false,
    }
    setMethods((prev) => [...prev, newMethod])
    setShowAddModal(false)
    setAccountNumber("")
    triggerToast("Settlement bank account added successfully!")
  }

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
          Payment Methods
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Wallet Balance Hero Card */}
        <div className="bg-[#121214] dark:bg-[#18181b] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-yellow-400 tracking-wider uppercase block mb-1">
              COURIER AVAILABLE BALANCE
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
              ₦{walletBalance.toLocaleString("en-NG", { minimumFractionDigits: 2 })}
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              Direct earnings escrow · Settled daily to linked bank
            </p>
          </div>

          <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
            <Wallet className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Settlement Accounts
          </h2>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-yellow-400 bg-yellow-400 dark:bg-yellow-400/10 px-3 py-1.5 rounded-xl hover:bg-yellow-300 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Bank</span>
          </button>
        </div>

        {/* Payment Methods List */}
        <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
          {methods.map((method) => {
            const isWallet = method.type === "wallet"

            const content = (
              <div
                className="p-4 sm:p-5 flex items-center justify-between bg-white dark:bg-[#1c1c20] hover:bg-gray-50/80 dark:hover:bg-[#232328] transition-colors relative"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                    {isWallet ? (
                      <Wallet className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Building className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                        {method.title}
                      </h4>
                      {method.isDefault && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 border border-yellow-400/30 uppercase">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {method.subtitle}
                    </p>
                  </div>
                </div>

                {!isWallet && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMenuId(activeMenuId === method.id ? null : method.id)
                      }
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === method.id && (
                      <div className="absolute right-0 top-10 w-44 bg-white dark:bg-[#1a1a1e] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-1.5 z-20 animate-in fade-in duration-150">
                        {!method.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefault(method.id)}
                            className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            Set as Default
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => promptDeleteMethod(method)}
                          className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )

            if (isWallet) {
              return <div key={method.id}>{content}</div>
            }

            return (
              <SwipeToDeleteItem
                key={method.id}
                onDelete={() => promptDeleteMethod(method)}
                deleteLabel="Delete"
                roundedClass="rounded-none"
                bgClass="bg-white dark:bg-[#1c1c20]"
              >
                {content}
              </SwipeToDeleteItem>
            )
          })}
        </div>
      </div>

      {/* Add Bank Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setShowAddModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Add Settlement Bank Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Select Bank
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                >
                  <option value="Guaranty Trust Bank">Guaranty Trust Bank (GTB)</option>
                  <option value="Access Bank">Access Bank</option>
                  <option value="Zenith Bank">Zenith Bank</option>
                  <option value="First Bank of Nigeria">First Bank of Nigeria</option>
                  <option value="United Bank for Africa (UBA)">United Bank for Africa (UBA)</option>
                  <option value="Kuda Bank">Kuda Microfinance Bank</option>
                  <option value="OPay">OPay</option>
                  <option value="Palmpay">Palmpay</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  10-Digit NUBAN Account Number
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="0123456789"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono text-center tracking-widest"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Account Name
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. Babatunde Adeleke"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-semibold text-black text-sm transition shadow-sm cursor-pointer mt-2"
              >
                Link Bank Account
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Custom Delete Confirmation Modal */}
      <CustomDeleteModal
        isOpen={deletePrompt.isOpen}
        title={deletePrompt.title}
        message={deletePrompt.message}
        itemCount={deletePrompt.itemCount}
        confirmText={deletePrompt.confirmText}
        onCancel={() => setDeletePrompt((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={deletePrompt.onConfirm}
      />
    </div>
  )
}
