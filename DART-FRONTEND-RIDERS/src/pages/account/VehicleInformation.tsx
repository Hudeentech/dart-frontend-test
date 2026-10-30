import { useState } from "react"
import {
  ArrowLeft,
  Bike,
  ShieldCheck,
  Check,
  Edit3,
  X,
  FileText,
  Calendar,
} from "lucide-react"
import { useAuth } from "../../context/AuthContext"

interface VehicleInformationProps {
  onBack: () => void
}

export default function VehicleInformation({
  onBack,
}: VehicleInformationProps) {
  const { riderProfile } = useAuth()

  const [vehicleModel, setVehicleModel] = useState("Bajaj Boxer 150")
  const [plateNumber, setPlateNumber] = useState(
    riderProfile?.plateNumber || "ABC 232 XY"
  )
  const [vehicleType, setVehicleType] = useState("Motorcycle / Dispatch Bike")
  const [year, setYear] = useState("2023")

  const [showEditModal, setShowEditModal] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Edit Temp State
  const [editModel, setEditModel] = useState(vehicleModel)
  const [editPlate, setEditPlate] = useState(plateNumber)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    setVehicleModel(editModel)
    setPlateNumber(editPlate)
    setShowEditModal(false)
    showToast("Vehicle details updated successfully!")
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
          Vehicle Information
        </h1>
        <div className="w-10" />
      </div>

      <div className="flex-1 px-3.5 sm:px-8 py-5 sm:py-6 max-w-xl mx-auto w-full flex flex-col gap-6">
        {/* Hero Card */}
        <div className="bg-[#121214] dark:bg-[#18181b] text-white rounded-3xl p-5 sm:p-6 shadow-md border border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-yellow-400 tracking-wider uppercase block mb-1">
              FLEET REGISTERED VEHICLE
            </span>
            <h3 className="text-xl font-bold text-white">
              {vehicleModel}
            </h3>
            <p className="text-xs text-gray-400 mt-1 font-mono">
              Plate: {plateNumber} · {vehicleType}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-yellow-400/20 text-yellow-400 flex items-center justify-center">
            <Bike className="w-6 h-6 stroke-[2]" />
          </div>
        </div>

        {/* Details List */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Vehicle Specifications
            </h2>
            <button
              type="button"
              onClick={() => {
                setEditModel(vehicleModel)
                setEditPlate(plateNumber)
                setShowEditModal(true)
              }}
              className="flex items-center gap-1.5 text-xs font-bold text-black dark:text-yellow-400 bg-yellow-400 dark:bg-yellow-400/10 px-3 py-1.5 rounded-xl hover:bg-yellow-300 transition-colors cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Details</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl overflow-hidden divide-y divide-gray-50 dark:divide-white/5 transition-colors">
            {/* Model */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <Bike className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Make & Model
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                    {vehicleModel}
                  </span>
                </div>
              </div>
            </div>

            {/* Plate Number */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <FileText className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    License Plate Number
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block font-mono">
                    {plateNumber}
                  </span>
                </div>
              </div>
            </div>

            {/* Year */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-600 dark:text-gray-300 shrink-0 border border-gray-100 dark:border-white/10">
                  <Calendar className="w-5 h-5 stroke-[1.8]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Year of Manufacture
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block font-mono">
                    {year}
                  </span>
                </div>
              </div>
            </div>

            {/* Roadworthiness Status */}
            <div className="p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 border border-emerald-200/50 dark:border-emerald-500/20">
                  <ShieldCheck className="w-5 h-5 stroke-[2]" />
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                    Roadworthiness Inspection
                  </span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white mt-0.5 block">
                    Passed & Insured (Valid till Dec 2026)
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                <Check className="w-3 h-3 stroke-[3]" /> Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            onClick={() => setShowEditModal(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="w-full sm:max-w-md bg-white dark:bg-[#18181b] rounded-t-3xl sm:rounded-3xl p-6 relative z-10 border border-gray-100 dark:border-white/10 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-gray-900 dark:text-white">
                Edit Vehicle Information
              </h3>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Make & Model
                </label>
                <input
                  type="text"
                  value={editModel}
                  onChange={(e) => setEditModel(e.target.value)}
                  placeholder="e.g. Bajaj Boxer 150"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5 block">
                  Plate Number
                </label>
                <input
                  type="text"
                  value={editPlate}
                  onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC 232 XY"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#121214] text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-yellow-400 font-mono uppercase"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-semibold text-black text-sm transition shadow-sm cursor-pointer mt-2"
              >
                Save Vehicle Info
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
