import { useState } from "react"
import { ArrowLeft, Navigation, MapPin, X, Loader2 } from "lucide-react"
import { userApi } from "../api/user.api"

export default function Location({
  onNext,
  onBack,
}: {
  onNext?: () => void
  onBack?: () => void
}) {
  const [selectedLocation, setSelectedLocation] = useState("Auchi, Edo State")
  const [isSaving, setIsSaving] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [locationCoordinates, setLocationCoordinates] = useState<{
    latitude: number
    longitude: number
  } | null>(null)

  const handleSelect = (loc: string) => {
    setSelectedLocation(loc)
    setLocationCoordinates(null)
    setLocationError(null)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Location access is not available in this browser.")
      return
    }

    setIsLocating(true)
    setLocationError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationCoordinates({
          latitude: coords.latitude,
          longitude: coords.longitude,
        })
        setSelectedLocation(
          `Current location (${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)})`,
        )
        setIsLocating(false)
      },
      (error) => {
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Allow location access in your browser, or enter your location manually."
            : "Could not get your location. Enter it manually instead.",
        )
        setIsLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  const handleContinue = async () => {
    setIsSaving(true)
    try {
      // Save as user's primary/default address
      const parts = selectedLocation.split(",")
      const city = parts[0]?.trim() || "Auchi"
      const state = parts[1]?.trim() || "Edo State"

      await userApi.createAddress({
        title: "Home",
        street: selectedLocation,
        city,
        state,
        latitude: locationCoordinates?.latitude ?? 7.0682,
        longitude: locationCoordinates?.longitude ?? 6.2736,
        isDefault: true,
      })
    } catch (e) {
      console.warn("[Location] Address save note:", e)
    } finally {
      setIsSaving(false)
      onNext?.()
    }
  }

  return (
    <div className="flex flex-col w-full bg-transparent relative">
      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors mb-6 -ml-2 text-gray-800 dark:text-white cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
          Where are you based?
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-normal">
          This helps us match you with top-rated riders near you.
        </p>
      </div>

      {/* Use Current Location Button */}
      <button
        onClick={handleUseCurrentLocation}
        disabled={isLocating}
        type="button"
        className="flex items-center gap-3.5 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl p-4 mb-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-2xs w-full text-left group cursor-pointer disabled:opacity-60"
      >
        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
          <Navigation className="w-5 h-5 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-gray-900 dark:text-white text-base group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors">
            {isLocating ? "Finding your location..." : "Use my current location"}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Allow location access or enter it manually below
          </span>
        </div>
      </button>

      {/* Or Divider */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px bg-gray-200 dark:bg-white/10 flex-1" />
        <span className="text-gray-400 text-xs uppercase tracking-wider font-semibold">
          Or search manually
        </span>
        <div className="h-px bg-gray-200 dark:bg-white/10 flex-1" />
      </div>

      {/* Search Input */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
          City or State
        </label>
        <div className="flex items-center gap-3 bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3.5 focus-within:border-yellow-400 focus-within:ring-2 focus-within:ring-yellow-400/20 transition-all shadow-2xs">
          <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            type="text"
            value={selectedLocation}
            onChange={(e) => {
              setSelectedLocation(e.target.value)
              setLocationCoordinates(null)
              setLocationError(null)
            }}
            className="w-full bg-transparent outline-none text-gray-900 dark:text-white font-medium text-base"
          />
          {selectedLocation && (
            <button
              onClick={() => setSelectedLocation("")}
              className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {locationError && (
          <p role="alert" className="mb-5 text-xs text-red-600 dark:text-red-400">
            {locationError}
          </p>
        )}
      </div>

      {/* Suggestions */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
          Suggestions
        </h2>
        <div className="bg-white dark:bg-[#18181b] border border-gray-200 dark:border-white/10 rounded-2xl overflow-hidden shadow-2xs divide-y divide-gray-100 dark:divide-white/5">
          {[
            "Auchi, Igbe Road, Edo State",
            "Lekki Phase 1, Lagos State",
            "Ikeja GRA, Lagos State",
            "Auchi Delta Terminal, Edo State",
          ].map((suggestion, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="flex items-center gap-3.5 w-full p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-left group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-yellow-500 transition-colors" />
              </div>
              <span className="font-medium text-gray-900 dark:text-white text-sm">
                {suggestion}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-auto pt-2">
        <button
          onClick={handleContinue}
          disabled={isSaving}
          className="w-full h-14 bg-yellow-400 hover:bg-yellow-500 text-gray-950 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xs hover:shadow-md active:scale-[0.99] text-base cursor-pointer disabled:opacity-60"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Saving Address...</span>
            </>
          ) : (
            <span>Continue</span>
          )}
        </button>
      </div>
    </div>
  )
}
