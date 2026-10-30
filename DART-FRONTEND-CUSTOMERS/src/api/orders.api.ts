import { apiClient } from "./client"
import {
  DeliveryQuoteRequest,
  DeliveryQuoteResponse,
  Order,
} from "../types/api.types"

/**
 * Orders & Pricing API Service
 * Handles server-calculated authoritative delivery quotes, order lifecycle, and tracking.
 */
export const ordersApi = {
  /**
   * Calculate authoritative delivery price quote
   */
  calculateQuote: async (
    payload: DeliveryQuoteRequest,
  ): Promise<DeliveryQuoteResponse> => {
    return apiClient.post<DeliveryQuoteResponse>("orders/quote", payload)
  },

  /**
   * List orders for the current user
   */
  listOrders: async (): Promise<Order[]> => {
    return apiClient.get<Order[]>("orders")
  },

  /**
   * Get specific order details by ID
   */
  getOrder: async (orderId: string): Promise<Order> => {
    return apiClient.get<Order>(`orders/${orderId}`)
  },

  /**
   * Customer selects an available rider for their order
   */
  selectRider: async (
    orderId: string,
    riderProfileId: string,
  ): Promise<Order> => {
    return apiClient.post<Order>(`orders/${orderId}/select-rider`, {
      riderProfileId,
    })
  },

  /**
   * Cancel an order and release holds
   */
  cancelOrder: async (orderId: string, reason?: string): Promise<Order> => {
    return apiClient.post<Order>(`orders/${orderId}/cancel`, { reason })
  },

  /**
   * Customer views the delivery confirmation handover code
   */
  getHandoverCode: async (orderId: string): Promise<{
    code: string
    expiresAt: string
  }> => {
    return apiClient.get<{ code: string; expiresAt: string }>(
      `orders/${orderId}/handover-code`,
    )
  },

  /**
   * Customer confirms delivery receipt
   */
  confirmReceipt: async (orderId: string): Promise<Order> => {
    return apiClient.post<Order>(`orders/${orderId}/confirm-receipt`)
  },

  /**
   * Process payment for an order (WALLET, CARD, CASH_ON_DELIVERY)
   */
  processPayment: async (
    orderId: string,
    payload: {
      paymentMethod: "WALLET" | "CARD" | "CASH_ON_DELIVERY"
      cardId?: string
      saveCard?: boolean
      callbackUrl?: string
    },
  ): Promise<any> => {
    return apiClient.post(`orders/${orderId}/payment`, payload)
  },

  /**
   * Get live package status, tracking metrics, and rider info
   */
  getLiveStatus: async (orderId: string): Promise<any> => {
    return apiClient.get(`orders/${orderId}/live-status`)
  },

  /**
   * Simulate or trigger rider accepting delivery task
   */
  simulateRiderAccept: async (orderId: string): Promise<any> => {
    return apiClient.post(`orders/${orderId}/accept-rider`)
  },

  /**
   * Customer reassigns order to another rider
   */
  reassignRider: async (
    orderId: string,
    riderId?: string,
  ): Promise<any> => {
    return apiClient.post(`orders/${orderId}/reassign-rider`, { riderId })
  },

  /**
   * Customer extends wait time for assigned rider
   */
  extendWait: async (orderId: string): Promise<any> => {
    return apiClient.post(`orders/${orderId}/extend-wait`)
  },

  /**
   * Customer deletes a completed or cancelled package order
   */
  deleteOrder: async (orderId: string): Promise<{ success: boolean; message?: string }> => {
    return apiClient.delete<{ success: boolean; message?: string }>(`orders/${orderId}`)
  },
}

