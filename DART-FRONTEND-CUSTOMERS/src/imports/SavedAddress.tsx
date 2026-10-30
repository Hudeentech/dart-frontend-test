import React, { useState, useEffect } from "react"
import {
  ArrowLeft,
  Plus,
  Home,
  Briefcase,
  MapPin,
  MoreVertical,
  Check,
  Trash2,
  Edit3,
  X,
  Navigation,
  Loader2,
} from "lucide-react"
import { userApi } from "../api/user.api"
import CustomDeleteModal from "../components/CustomDeleteModal"
import SwipeToDeleteItem from "../components/SwipeToDeleteItem"

interface SavedAddressProps {
  onBack: () => void
}

export interface AddressItem {
  id: string
  label: string
  type: "home" | "work" | "other"
  address: string
  state: string
  isDefault: boolean
}

export default function SavedAddress({ onBack }: SavedAddressProps) {
  const [addresses, setAddresses] = useState<AddressItem[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isClearingAddresses, setIsClearingAddresses] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const loadAddresses = async () => {
      try {
        setIsLoading(true)
        setLoadError(null)
        const serverAddrs = await userApi.getAddresses()
        if (Array.isArray(serverAddrs)) {
          const mapped: AddressItem[] = serverAddrs.map((a) => ({
            id: a.id,
            label: a.title || "Saved Location",
            type: a.title?.toLowerCase().includes("work")
              ? "work"
              : a.title?.toLowerCase().includes("home")
                ? "home"
                : "other",
            address: a.street,
            state: a.state,
            isDefault: Boolean(a.isDefault),
          }))
          setAddresses(mapped)
        }
      } catch (e) {
        setLoadError("Could not load your saved addresses. Please try again.")
        console.error("[SavedAddress] Failed to load addresses:", e)
      } finally {
        setIsLoading(false)
      }
    }

    loadAddresses()
  }, [])

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [modalMode, setModalMode] = useState<"add" | "edit" | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Form State
  const [formLabel, setFormLabel] = useState<string>("Home")
  const [formType, setFormType] = useState<"home" | "work" | "other">("home")
  const [formAddress, setFormAddress] = useState<string>("")
  const [formState, setFormState] = useState<string>("Lagos State")
  const [formIsDefault, setFormIsDefault] = useState<boolean>(false)

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const openAddModal = () => {
    setModalMode("add")
    setEditingId(null)
    setFormLabel("Home")
    setFormType("home")
    setFormAddress("")
    setFormState("Edo State")
    setFormIsDefault(false)
  }

  const openEditModal = (addr: AddressItem) => {
    setActiveMenuId(null)
    setModalMode("edit")
    setEditingId(addr.id)
    setFormLabel(addr.label)
    setFormType(addr.type)
    setFormAddress(addr.address)
    setFormState(addr.state)
    setFormIsDefault(addr.isDefault)
  }

  const handleSetDefault = (id: string) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === id,
      })),
    )
    setActiveMenuId(null)
    triggerToast("Default address updated")
  }

  const [deletePrompt, setDeletePrompt] = useState<{
    isOpen: boolean
    title: string
    message: string
    itemCount?: number
    confirmText?: string
    onConfirm: () => Promise<void> | void
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  })

  const handleDelete = async (id: string) => {
    try {
      await userApi.deleteAddress(id)
    } catch (e) {
      triggerToast("Could not remove this address. Please try again.")
      console.error("[SavedAddress] Failed to delete address:", e)
      return
    }
    setAddresses((prev) => prev.filter((a) => a.id !== id))
    setActiveMenuId(null)
    triggerToast("Address removed")
  }

  const promptDeleteAddress = (id: string, label?: string) => {
    setActiveMenuId(null)
    setDeletePrompt({
      isOpen: true,
      title: "Delete saved address?",
      message: `Are you sure you want to remove "${label || "this address"}" from your saved locations?`,
      itemCount: 1,
      confirmText: "Delete Address",
      onConfirm: async () => {
        setDeletePrompt((prev) => ({ ...prev, isOpen: false }))
        await handleDelete(id)
      },
    })
  }

  const executeClearAll = async () => {
    setIsClearingAddresses(true)
    const results = await Promise.allSettled(
      addresses.map((address) => userApi.deleteAddress(address.id)),
    )
    const removedIds = new Set(
      addresses
        .filter((_, index) => results[index].status === "fulfilled")
        .map((address) => address.id),
    )
    setAddresses((current) => current.filter((address) => !removedIds.has(address.id)))
    setIsClearingAddresses(false)

    const failures = results.filter((result) => result.status === "rejected").length
    if (failures > 0) {
      triggerToast(`Could not clear ${failures} address${failures === 1 ? "" : "es"}. Please retry.`)
      console.error("[SavedAddress] Failed to clear all saved addresses:", results)
    } else {
      triggerToast("All saved addresses cleared")
    }
  }

  const promptClearAll = () => {
    if (addresses.length === 0) return
    setDeletePrompt({
      isOpen: true,
      title: "Clear all saved addresses?",
      message: "Are you sure you want to clear all your saved locations? This cannot be undone.",
      itemCount: addresses.length,
      confirmText: "Clear All",
      onConfirm: async () => {
        setDeletePrompt((prev) => ({ ...prev, isOpen: false }))
        await executeClearAll()
      },
    })
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formAddress.trim()) {
      alert("Please enter a valid street address")
      return
    }

    if (modalMode === "add") {
      if (addresses.length >= 5) {
        triggerToast("You can save up to 5 addresses. Remove one to add another.")
        return
      }

      setIsSavingAddress(true)
      try {
        const res = await userApi.createAddress({
          title: formLabel || "Saved Address",
          street: formAddress.trim(),
          city: formAddress.split(",")[0]?.trim() || "City",
          state: formState,
          latitude: 6.5244,
          longitude: 3.3792,
          isDefault: formIsDefault || addresses.length === 0,
        })
        const newAddr: AddressItem = {
          id: res.id,
          label: formLabel || "Saved Address",
          type: formType,
          address: formAddress.trim(),
          state: formState,
          isDefault: formIsDefault || addresses.length === 0,
        }
        setAddresses((prev) =>
          newAddr.isDefault
            ? [...prev.map((address) => ({ ...address, isDefault: false })), newAddr]
            : [...prev, newAddr],
        )
        triggerToast("New address added")
      } catch (e) {
        triggerToast("Could not save this address. Please try again.")
        console.error("[SavedAddress] Failed to create address:", e)
        return
      } finally {
        setIsSavingAddress(false)
      }
    } else if (modalMode === "edit" && editingId) {
      setAddresses((prev) =>
        prev.map((a) => {
          if (a.id === editingId) {
            return {
              ...a,
              label: formLabel,
              type: formType,
              address: formAddress.trim(),
              state: formState,
              isDefault: formIsDefault,
            }
          }
          return formIsDefault ? { ...a, isDefault: false } : a
        }),
      )
      triggerToast("Address updated")
    }

    setModalMode(null)
  }

  const handleUseCurrentLocation = () => {
    setFormAddress("Campus Road, Auchi Poly Main Gate")
    setFormState("Edo State")
    triggerToast("Current location detected")
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
          Saved address
        </h1>

        {/* Top Right Add Button */}
        <button
          onClick={openAddModal}
          disabled={addresses.length >= 5}
          className="w-9 h-9 rounded-full bg-[#FFCC00] hover:bg-[#f5a623] text-black flex items-center justify-center shadow-xs transition-transform active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          title="Add New Address"
          aria-label="Add New Address"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col justify-between">
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {addresses.length} of 5 saved
            </p>
            {addresses.length > 0 && (
              <button
                type="button"
                onClick={promptClearAll}
                disabled={isClearingAddresses}
                className="text-xs font-semibold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
              >
                {isClearingAddresses ? "Clearing..." : "Clear all"}
              </button>
            )}
          </div>

          {loadError && (
            <div role="alert" className="p-3 rounded-xl bg-red-50 dark:bg-red-500/10 text-xs text-red-700 dark:text-red-300">
              {loadError}
            </div>
          )}

          {isLoading && (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" aria-label="Loading saved addresses" />
            </div>
          )}

          {/* Toast Notification */}
          {toastMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center gap-2.5 text-emerald-800 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-150 shadow-xs">
              <Check className="w-4 h-4 stroke-[3]" />
              <span className="text-xs font-medium">{toastMessage}</span>
            </div>
          )}

          {/* Grouped Addresses Card */}
          {!isLoading && addresses.length > 0 && <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl sm:rounded-3xl overflow-hidden divide-y divide-gray-100 dark:divide-white/5 shadow-xs transition-colors">
            {addresses.map((addr) => {
              const isDefault = addr.isDefault

              return (
                <SwipeToDeleteItem
                  key={addr.id}
                  onDelete={() => promptDeleteAddress(addr.id, addr.label)}
                  deleteLabel="Delete"
                >
                  <div
                    className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors relative"
                  >
                    <div className="flex items-center gap-3.5 sm:gap-4 min-w-0 pr-2">
                      {/* Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0">
                        {addr.type === "home" && <Home className="w-5 h-5" />}
                        {addr.type === "work" && (
                          <Briefcase className="w-5 h-5" />
                        )}
                        {addr.type === "other" && <MapPin className="w-5 h-5" />}
                      </div>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                            {addr.label}
                          </span>
                          {isDefault && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFCC00] text-black uppercase tracking-wider shrink-0 shadow-2xs">
                              DEFAULT
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                          {addr.address}, {addr.state}
                        </span>
                      </div>
                    </div>

                    {/* Three Dots Menu */}
                    <div className="relative shrink-0">
                      <button
                        onClick={() =>
                          setActiveMenuId(
                            activeMenuId === addr.id ? null : addr.id,
                          )
                        }
                        className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors cursor-pointer"
                        aria-label="Address options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {/* Dropdown Menu */}
                      {activeMenuId === addr.id && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setActiveMenuId(null)}
                          />
                          <div className="absolute right-0 top-10 w-44 bg-white dark:bg-[#202024] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                            {!isDefault && (
                              <button
                                onClick={() => handleSetDefault(addr.id)}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5 text-amber-500" />
                                Set as default
                              </button>
                            )}

                            <button
                              onClick={() => openEditModal(addr)}
                              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-blue-500" />
                              Edit address
                            </button>

                            <button
                              onClick={() => promptDeleteAddress(addr.id, addr.label)}
                              className="w-full px-4 py-2.5 text-left text-xs font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete address
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </SwipeToDeleteItem>
              )
            })}
          </div>}

          {!isLoading && addresses.length === 0 && !loadError && (
            <div className="rounded-2xl bg-gray-50 dark:bg-white/[0.04] px-5 py-8 text-center">
              <MapPin className="w-6 h-6 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                No saved addresses yet
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Save up to 5 locations to use them faster when booking deliveries.
              </p>
            </div>
          )}

          {/* Add New Address Outline Button Card */}
          <button
            onClick={openAddModal}
            disabled={addresses.length >= 5 || isLoading}
            className="w-full py-4 px-6 rounded-2xl border border-dashed border-gray-200 dark:border-white/15 hover:border-amber-400 dark:hover:border-amber-400 bg-white/50 dark:bg-white/[0.02] text-sm font-semibold text-gray-800 dark:text-gray-200 flex items-center justify-center gap-2 transition-all group cursor-pointer hover:shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
            <span>{addresses.length >= 5 ? "Address limit reached (5)" : "Add New Address"}</span>
          </button>
        </div>
      </div>

      {/* Add / Edit Address Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-[32px] sm:rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-white/10 animate-in slide-in-from-bottom duration-300 ease-out relative max-h-[90dvh] overflow-y-auto pb-[max(1.75rem,env(safe-area-inset-bottom,0px))] sm:pb-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {modalMode === "add" ? "Add New Address" : "Edit Address"}
              </h3>
              <button
                onClick={() => setModalMode(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              {/* Type selector (Home, Work, Other) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                  Address Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["home", "work", "other"] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setFormType(type)
                        if (type === "home") setFormLabel("Home")
                        if (type === "work") setFormLabel("Work")
                        if (
                          type === "other" &&
                          (formLabel === "Home" || formLabel === "Work")
                        )
                          setFormLabel("Other")
                      }}
                      className={`py-2.5 px-3 rounded-xl border text-xs font-semibold capitalize transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        formType === type
                          ? "border-[#FFCC00] bg-amber-50/60 dark:bg-amber-400/10 text-gray-950 dark:text-white shadow-xs"
                          : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"
                      }`}
                    >
                      {type === "home" && <Home className="w-3.5 h-3.5" />}
                      {type === "work" && <Briefcase className="w-3.5 h-3.5" />}
                      {type === "other" && <MapPin className="w-3.5 h-3.5" />}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Label Name */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  Label / Name
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g Home, Office, Mom's house"
                  required
                  className="w-full bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-yellow-400"
                />
              </div>

              {/* Street Address */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    Street Address
                  </label>
                  <button
                    type="button"
                    onClick={handleUseCurrentLocation}
                    className="text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Navigation className="w-3 h-3" />
                    Use current
                  </button>
                </div>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g 14 Poly road, Auchi"
                  required
                  className="w-full bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 outline-none text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-yellow-400"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                  State
                </label>
                <select
                  value={formState}
                  onChange={(e) => setFormState(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#202024] border border-gray-200 dark:border-white/10 rounded-xl px-3.5 py-3 outline-none text-sm text-gray-900 dark:text-white cursor-pointer focus:border-yellow-400"
                >
                  <option value="Edo State">Edo State</option>
                  <option value="Lagos State">Lagos State</option>
                  <option value="Abuja (FCT)">Abuja (FCT)</option>
                  <option value="Rivers State">Rivers State</option>
                  <option value="Oyo State">Oyo State</option>
                  <option value="Delta State">Delta State</option>
                </select>
              </div>

              {/* Set as Default Toggle */}
              <label className="flex items-center gap-2.5 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-[#FFCC00] focus:ring-[#FFCC00] cursor-pointer"
                />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Set as default delivery address
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  type="button"
                  disabled={isSavingAddress}
                  onClick={() => setModalMode(null)}
                  className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold text-sm hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="flex-1 py-3.5 rounded-xl bg-[#FFCC00] hover:bg-[#f5a623] text-gray-950 font-bold text-sm cursor-pointer transition-all shadow-xs disabled:opacity-50"
                >
                  {isSavingAddress ? "Saving..." : "Save Address"}
                </button>
              </div>
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
