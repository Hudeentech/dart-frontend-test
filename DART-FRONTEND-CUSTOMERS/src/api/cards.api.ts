import { apiClient } from './client'

export interface SavedCard {
  id: string
  userId: string
  cardType: 'mastercard' | 'visa' | 'verve'
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
  /**
   * Fetch payment overview (wallet balance + saved cards)
   */
  getPaymentOverview: async (): Promise<PaymentOverview> => {
    return apiClient.get<PaymentOverview>('payments/methods')
  },

  /**
   * List all saved cards for the current user
   */
  listCards: async (): Promise<SavedCard[]> => {
    return apiClient.get<SavedCard[]>('payments/cards')
  },

  /**
   * Save and tokenize a new card
   */
  saveCard: async (payload: SaveCardPayload): Promise<SavedCard> => {
    return apiClient.post<SavedCard>('payments/cards', payload)
  },

  /**
   * Set card as default payment method
   */
  setDefaultCard: async (cardId: string): Promise<SavedCard[]> => {
    return apiClient.patch<SavedCard[]>(`payments/cards/${cardId}/default`, {})
  },

  /**
   * Delete a saved card
   */
  deleteCard: async (cardId: string): Promise<{ success: boolean; message: string }> => {
    return apiClient.delete<{ success: boolean; message: string }>(`payments/cards/${cardId}`)
  },
}
