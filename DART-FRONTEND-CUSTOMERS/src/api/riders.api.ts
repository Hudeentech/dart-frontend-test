import { apiClient } from "./client"
import { AvailableRider } from "../types/api.types"

export interface FindRidersQuery {
  latitude?: number
  longitude?: number
  vehicleType?: string
  maxDistanceKm?: number
}

export interface CreateRatingPayload {
  orderId: string
  score: number
  review?: string
  tags?: string[]
}

/**
 * Riders API Service
 * Handles discovery of available riders and public ratings.
 */
export const ridersApi = {
  /**
   * Discover available and eligible riders near pickup coordinates
   */
  findAvailable: async (query?: FindRidersQuery): Promise<AvailableRider[]> => {
    return apiClient.get<AvailableRider[]>("riders/available", {
      params: query as Record<string, any>,
    })
  },

  /**
   * Get ratings and reviews for a rider
   */
  getRiderRatings: async (riderUserId: string): Promise<any> => {
    return apiClient.get<any>(`ratings/rider/${riderUserId}`)
  },

  /**
   * Submit rating and feedback for a rider/order
   */
  submitRating: async (payload: CreateRatingPayload): Promise<any> => {
    return apiClient.post<any>("ratings", payload)
  },
}
