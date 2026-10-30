import { apiClient } from "./client"
import type { ConfirmDeliveryPayload, Order, PickupResponse } from "../types/api.types"

/** /orders/* endpoints available to riders */
export const ordersApi = {
  /** GET /orders — orders where the rider is assigned */
  list: () => apiClient.get<Order[]>("orders"),

  /** GET /orders/:id */
  get: (id: string) => apiClient.get<Order>(`orders/${id}`),

  /** GET /orders/:id/live-status */
  liveStatus: (id: string) => apiClient.get<Record<string, any>>(`orders/${id}/live-status`),

  /** POST /orders/:id/accept — RIDER_ASSIGNED | PAYMENT_CONFIRMED -> PICKUP_PENDING */
  accept: (id: string) => apiClient.post<Order>(`orders/${id}/accept`),

  /** POST /orders/:id/pickup — PICKUP_PENDING -> PICKED_UP (generates handover code) */
  pickup: (id: string) => apiClient.post<PickupResponse>(`orders/${id}/pickup`),

  /** POST /orders/:id/confirm-delivery — PICKED_UP | IN_TRANSIT -> SETTLED */
  confirmDelivery: (id: string, payload: ConfirmDeliveryPayload) =>
    apiClient.post<Order>(`orders/${id}/confirm-delivery`, payload),

  /** POST /orders/:id/cancel — allowed before IN_TRANSIT */
  cancel: (id: string, reason: string) => apiClient.post<Order>(`orders/${id}/cancel`, { reason }),
}
