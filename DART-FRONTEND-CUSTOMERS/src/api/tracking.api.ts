import { apiClient } from "./client"
import { TrackingTimelineResponse } from "../types/api.types"

/**
 * Public Tracking API Service
 * Handles parcel delivery milestone lookups.
 */
export const trackingApi = {
  /**
   * Get delivery timeline for a given trackingId
   */
  getTracking: async (
    trackingId: string,
  ): Promise<TrackingTimelineResponse> => {
    return apiClient.get<TrackingTimelineResponse>(
      `tracking/${encodeURIComponent(trackingId.trim())}`,
    )
  },
}
