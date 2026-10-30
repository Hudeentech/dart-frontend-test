import { apiClient } from "./client"
import type {
  RiderAvailability,
  RiderProfile,
  RiderStatus,
  UpdateRiderProfilePayload,
} from "../types/api.types"

/** /riders/* endpoints */
export const ridersApi = {
  /** GET /riders/profile */
  getProfile: () => apiClient.get<RiderProfile>("riders/profile"),

  /** PATCH /riders/profile */
  updateProfile: (payload: UpdateRiderProfilePayload) => apiClient.patch<RiderProfile>("riders/profile", payload),

  /** POST /riders/availability */
  setAvailability: (status: RiderStatus) =>
    apiClient.post<RiderAvailability>("riders/availability", { status }),

  /** POST /riders/location */
  updateLocation: (latitude: number, longitude: number) =>
    apiClient.post<RiderProfile>("riders/location", { latitude, longitude }),

  /** GET /riders/available (public — useful for seeing nearby competition) */
  findAvailable: (params?: { latitude?: number; longitude?: number; maxDistanceKm?: number }) =>
    apiClient.get<(RiderProfile & { distanceKm?: number })[]>("riders/available", { params, anonymous: true }),
}
