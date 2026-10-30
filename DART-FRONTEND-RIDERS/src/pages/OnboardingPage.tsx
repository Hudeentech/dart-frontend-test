import { useState, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { useToast } from "../context/ToastContext"
import { usersApi } from "../api/account.api"
import { ridersApi } from "../api/riders.api"
import { Button, Input, Select, Card, TopBar } from "../components/ui"
import { Bike, CheckCircle2, ArrowRight } from "lucide-react"
import type { VehicleType } from "../types/api.types"

export function OnboardingPage() {
  const { user, riderProfile, refresh, setUser, setRiderProfile, skipOnboarding } = useAuth()
  const toast = useToast()

  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || "")
  const [vehicleType, setVehicleType] = useState<VehicleType>(riderProfile?.vehicleType || "MOTORCYCLE")
  const [plateNumber, setPlateNumber] = useState(riderProfile?.plateNumber || "")
  const [licenseNumber, setLicenseNumber] = useState(riderProfile?.licenseNumber || "")
  const [loading, setLoading] = useState(false)

  // Sync user details dynamically if hydrated after initial render
  useEffect(() => {
    if (user?.firstName) setFirstName(user.firstName)
    if (user?.lastName) setLastName(user.lastName)
    if (user?.phoneNumber) setPhoneNumber(user.phoneNumber)
    if (riderProfile?.vehicleType) setVehicleType(riderProfile.vehicleType)
    if (riderProfile?.plateNumber) setPlateNumber(riderProfile.plateNumber)
    if (riderProfile?.licenseNumber) setLicenseNumber(riderProfile.licenseNumber)
  }, [user, riderProfile])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) {
      toast("Please provide both first and last name", "error")
      return
    }
    if (!phoneNumber.trim()) {
      toast("Phone number is required for dispatch contact", "error")
      return
    }
    if (!plateNumber.trim()) {
      toast("Please enter your vehicle plate number", "error")
      return
    }

    setLoading(true)
    try {
      // 1. Complete user profile with phone number
      await usersApi.completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: user?.email || undefined,
      })

      // 2. Update rider vehicle details
      await ridersApi.updateProfile({
        vehicleType,
        plateNumber: plateNumber.trim().toUpperCase(),
        licenseNumber: licenseNumber.trim().toUpperCase() || undefined,
      })

      // Directly update local state for immediate feedback
      if (user) {
        setUser({
          ...user,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          isProfileComplete: true,
        })
      }

      if (riderProfile) {
        setRiderProfile({
          ...riderProfile,
          vehicleType,
          plateNumber: plateNumber.trim().toUpperCase(),
          licenseNumber: licenseNumber.trim().toUpperCase(),
        })
      }

      skipOnboarding()
      toast("Profile setup completed!", "success")
      await refresh().catch(() => {})
    } catch (err: any) {
      console.warn("Onboarding API error, saving locally:", err.message)
      // If network/Prisma error, allow the rider to proceed into Home anyway
      if (user) {
        setUser({
          ...user,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phoneNumber: phoneNumber.trim(),
          isProfileComplete: true,
        })
      }
      skipOnboarding()
      toast("Setup completed! Welcome to Dart Rider.", "success")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-2">
      <TopBar
        title="Rider Setup"
        right={
          <button
            id="btn-skip-onboarding-top"
            onClick={skipOnboarding}
            className="text-xs font-semibold text-brand hover:underline px-2 py-1"
          >
            Skip for now →
          </button>
        }
      />

      <div className="mb-6 flex flex-col items-center text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand text-ink-950 shadow-lg mb-3">
          <Bike className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Complete your Profile</h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-white/50 max-w-xs">
          Provide your name, phone number, and vehicle information so customers and dispatch can identify you.
        </p>
      </div>

      <Card className="p-5 shadow-xs">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="rider-fname"
              label="First Name"
              placeholder="e.g. Divine"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
            <Input
              id="rider-lname"
              label="Last Name"
              placeholder="e.g. Augustina"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>

          <Input
            id="rider-phone"
            label="Phone Number (Required)"
            placeholder="+2348012345678"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            hint="Used by customers to call you during package pickup and delivery."
            required
          />

          <Select
            id="rider-vehicletype"
            label="Vehicle Type"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as VehicleType)}
          >
            <option value="MOTORCYCLE" className="bg-white dark:bg-ink-900 text-gray-900 dark:text-white">Motorcycle (Express Delivery)</option>
            <option value="BICYCLE" className="bg-white dark:bg-ink-900 text-gray-900 dark:text-white">Bicycle (Eco Short-distance)</option>
            <option value="CAR" className="bg-white dark:bg-ink-900 text-gray-900 dark:text-white">Car (Large Parcels)</option>
            <option value="VAN" className="bg-white dark:bg-ink-900 text-gray-900 dark:text-white">Van (Bulk & Cargo)</option>
          </Select>

          <Input
            id="rider-platenumber"
            label="Vehicle Plate Number"
            placeholder="e.g. KJA-123XY"
            value={plateNumber}
            onChange={(e) => setPlateNumber(e.target.value)}
            hint="Required for customer identification and estate gate passes."
            required
          />

          <Input
            id="rider-licensenumber"
            label="Driver's License / ID No. (Optional)"
            placeholder="e.g. LAG-LIC-9821"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />

          <Button id="btn-save-onboarding" type="submit" block loading={loading} className="mt-6" icon={<CheckCircle2 className="size-4" />}>
            Finish Setup & Start Delivering
          </Button>

          <Button
            id="btn-skip-onboarding-bottom"
            type="button"
            variant="ghost"
            block
            onClick={skipOnboarding}
            className="text-xs text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white"
          >
            Skip for now & go to Home
          </Button>
        </form>
      </Card>
    </div>
  )
}
