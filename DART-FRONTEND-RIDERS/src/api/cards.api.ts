import { apiClient } from "./client"

export interface SavedCard {
  id: string
  userId: string
  cardType: "mastercard" | "visa" | "verve"
  last4: string
  expMonth: string
  expYear: string
  cardHolder?: string
  token?: string
  provider: string
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface SaveCardPayload {
  cardNumber: string
  cardHolder?: string
  expiry: string
  cvv?: string
  setAsDefault?: boolean
}

export interface PaymentOverview {
  walletBalance: number
  walletCurrency: string
  cards: SavedCard[]
  allowCashOnDelivery: boolean
}

export const cardsApi = {
  getPaymentOverview: async (): Promise<PaymentOverview> => {
    return apiClient.get<PaymentOverview>("payments/methods")
  },
  listCards: async (): Promise<SavedCard[]> => {
    return apiClient.get<SavedCard[]>("payments/cards")
  },
  saveCard: async (payload: SaveCardPayload): Promise<SavedCard> => {
    return apiClient.post<SavedCard>("payments/cards", payload)
  },
  setDefaultCard: async (cardId: string): Promise<SavedCard[]> => {
    return apiClient.patch<SavedCard[]>(`payments/cards/${cardId}/default`, {})
  },
  deleteCard: async (cardId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`payments/cards/${cardId}`)
  },
}
