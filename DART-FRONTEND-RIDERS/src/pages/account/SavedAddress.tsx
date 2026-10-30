import { useState } from "react"
import {
  ArrowLeft,
  Plus,
  MapPin,
  Check,
  Trash2,
  X,
  MoreVertical,
  Navigation,
} from "lucide-react"

interface SavedAddressProps {
  onBack: () => void
}

interface HubItem {
  id: string
  label: string
  address: string
  radius: string
  isDefault: boolean
}

export default function SavedAddress({ onBack }: SavedAddressProps) {
  const [hubs, setHubs] = useState<HubItem[]>([
    {
      id: "hub-1",
      label: "Primary Base Hub",
      address: "Area 1 Fct Abuja",
      radius: "10 km",
      isDefault: true,
    },
    {
      id: "hub-2",
      label: "Secondary Hub",
      address: "Wuse 2, Abuja",
      radius: "15 km",
      isDefault: false,
    },
  ])

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Form State
  const [hubLabel, setHubLabel] = useState("Central Abuja")
  const [hubAddress, setHubAddress] = useState("")
  const [hubRadius, setHubRadius] = useState("10 km")

  const triggerToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleSetDefault = (id: string) => {
    setActiveMenuId(null)
    setHubs((prev) =>
      prev.map((h) => ({
        ...h,
        isDefault: h.id === id,
      }))
    )
    triggerToast("Primary operating location updated")
  }

  const handleDelete = (id: string) => {
    setActiveMenuId(null)
    setHubs((prev) => prev.filter((h) => h.id !== id))
    triggerToast("Location removed")
  }

  const handleAddHub = (e: React.FormEvent) => {
    e.preventDefault()
    if (!hubAddress.trim()) return
    const newHub: HubItem = {
      id: `hub-${Date.now()}`,
      label: hubLabel,
      address: hubAddress.trim(),
      radius: hubRadius,
      isDefault: false,
    }
    setHubs((prev) => [...prev, newHub])
    setShowAddModal(false)
    setHubAddress("")
    triggerToast("Operating hub added!")
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
          Operating Location
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Banner */}
        <div className="bg-[#121214] dark:bg-[#18181b] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-yellow-400 tracking-wider uppercase block mb-1">
              DISPATCH RADIUS & BASE
            </span>
            <h3 className="text-lg font-bold text-white">
              Intra-City Delivery Coverage
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              Orders within your designated radius will be prioritized to your feed.
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
            <Navigation className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            Configured Locations
          </h2>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-yellow-400 bg-yellow-400 dark:bg-yellow-400/10 px-3 py-1.5 rounded-xl hover:bg-yellow-300 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Hub</span>
          </button>
        </div>

        {/* Hubs List */}
        <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
          {hubs.map((hub) => (
            <div
              key={hub.id}
              className="p-4 sm:p-5 flex items-center justify-between hover:bg-gray-50/80 dark:hover:bg-white/[0.03] transition-colors relative"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <MapPin className="w-5 h-5 text-amber-500 stroke-[1.8]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {hub.label}
                    </h4>
                    {hub.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 border border-yellow-400/30 uppercase">
                        Active Hub
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {hub.address} · Coverage: {hub.radius}
                  </p>
                </div>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() =>
                    setActiveMenuId(activeMenuId === hub.id ? null : hub.id)
                  }
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-white"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {activeMenuId === hub.id && (
                  <div className="absolute right-0 top-10 w-44 bg-white dark:bg-[#1a1a1e] rounded-2xl shadow-xl border border-gray-100 dark:border-white/10 py-1.5 z-20 animate-in fade-in duration-150">
                    {!hub.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(hub.id)}
                        className="w-full px-4 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 flex items-center gap-2"
                      >
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        Set as Active Base
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(hub.id)}
                      className="w-full px-4 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Hub Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setShowAddModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Add Operating Base Hub
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddHub} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Hub Label
                </label>
                <input
                  type="text"
                  value={hubLabel}
                  onChange={(e) => setHubLabel(e.target.value)}
                  placeholder="e.g. Central Hub"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Location / Address
                </label>
                <input
                  type="text"
                  value={hubAddress}
                  onChange={(e) => setHubAddress(e.target.value)}
                  placeholder="e.g. Area 1 Fct Abuja"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Coverage Radius
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["5 km", "10 km", "25 km"].map((rad) => (
                    <button
                      key={rad}
                      type="button"
                      onClick={() => setHubRadius(rad)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition ${
                        hubRadius === rad
                          ? "bg-yellow-400 border-yellow-400 text-black font-bold"
                          : "bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {rad}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-semibold text-black text-sm transition shadow-sm cursor-pointer mt-2"
              >
                Save Location
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
