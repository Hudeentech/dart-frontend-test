export type FlowScreen =
  | "details"
  | "destination"
  | "add_location"
  | "choose_rider"
  | "all_riders"
  | "confirm_delivery"
  | "payment_method"
  | "package_status"
  | "success"

export interface PackageDraft {
  id: string
  packageName: string
  category: "Electronics" | "Documents" | "Clothes" | "Others" | string
  weight: "light" | "medium" | "heavy" | string
  isFragile: boolean
  fromLocation: string
  toLocation: string
  estimatedFee: string
  selectedRiderId?: string
  selectedPaymentMethod?: "wallet" | "card" | "cash"
  step: FlowScreen
  updatedAt: string
  dateFormatted?: string
}

export const DRAFTS_STORAGE_KEY = "dart_package_drafts"

/**
 * Retrieve all saved package drafts from local storage
 */
export const getPackageDrafts = (): PackageDraft[] => {
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn("[Drafts] Failed to load drafts:", err)
    return []
  }
}

/**
 * Save or update a package draft
 */
export const savePackageDraft = (
  draft: Omit<PackageDraft, "id" | "updatedAt"> & { id?: string },
): PackageDraft => {
  try {
    const drafts = getPackageDrafts()
    const id = draft.id || `draft-${Date.now()}`
    const existingIdx = drafts.findIndex((d) => d.id === id)

    const now = new Date()
    const dateFormatted = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

    const newDraft: PackageDraft = {
      ...draft,
      id,
      updatedAt: now.toISOString(),
      dateFormatted,
    }

    if (existingIdx >= 0) {
      drafts[existingIdx] = newDraft
    } else {
      drafts.unshift(newDraft)
    }

    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
    // Dispatch custom window event so open tabs/components react instantly
    window.dispatchEvent(new Event("dart_drafts_updated"))
    return newDraft
  } catch (err) {
    console.warn("[Drafts] Failed to save draft:", err)
    return draft as PackageDraft
  }
}

/**
 * Delete a draft by its ID
 */
export const deletePackageDraft = (id: string): void => {
  try {
    const drafts = getPackageDrafts().filter((d) => d.id !== id)
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
    window.dispatchEvent(new Event("dart_drafts_updated"))
  } catch (err) {
    console.warn("[Drafts] Failed to delete draft:", err)
  }
}

/**
 * Helper to get a user-friendly label for where they left off
 */
export const getDraftStepLabel = (step: FlowScreen): string => {
  switch (step) {
    case "details":
      return "Package Details"
    case "destination":
    case "add_location":
      return "Delivery Location"
    case "choose_rider":
    case "all_riders":
      return "Choose Rider"
    case "confirm_delivery":
      return "Confirm Delivery"
    case "payment_method":
      return "Payment Method"
    default:
      return "Draft"
  }
}
