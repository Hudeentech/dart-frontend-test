import { apiClient } from "./client"
import { CreatePackagePayload, Package } from "../types/api.types"

/**
 * Packages API Service
 * Handles package registration, draft orders, and package history.
 */
export const packagesApi = {
  /**
   * Create a package with items, addresses, and initial drafted order
   */
  createPackage: async (payload: CreatePackagePayload): Promise<Package> => {
    return apiClient.post<Package>("packages", payload)
  },

  /**
   * List packages created by the current user
   */
  listPackages: async (): Promise<Package[]> => {
    return apiClient.get<Package[]>("packages")
  },

  /**
   * Get specific package details by ID
   */
  getPackage: async (packageId: string): Promise<Package> => {
    return apiClient.get<Package>(`packages/${packageId}`)
  },

  // ----------------------------------------------------
  // INBOUND PACKAGES
  // ----------------------------------------------------

  /**
   * Link an external inbound shipment to customer profile
   */
  linkInboundPackage: async (
    payload: any,
  ): Promise<any> => {
    return apiClient.post<any>("packages/inbound", payload)
  },

  /**
   * List all linked inbound packages for the current customer
   */
  listInboundPackages: async (): Promise<any[]> => {
    return apiClient.get<any[]>("packages/inbound")
  },

  /**
   * Get details of a single linked inbound package
   */
  getInboundPackage: async (id: string): Promise<any> => {
    return apiClient.get<any>(`packages/inbound/${id}`)
  },

  /**
   * Unlink an inbound package from customer account
   */
  unlinkInboundPackage: async (id: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`packages/inbound/${id}`)
  },

  /**
   * Live lookup of waybill milestones and courier status
   */
  trackInboundPackage: async (trackingId: string): Promise<any> => {
    return apiClient.get<any>(`packages/inbound/track/${encodeURIComponent(trackingId.trim())}`)
  },
}
