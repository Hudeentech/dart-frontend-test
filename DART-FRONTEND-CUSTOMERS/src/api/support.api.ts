import { apiClient } from './client'

export interface SupportTicketPayload {
  category: string
  description: string
  subject?: string
  orderId?: string
}

export interface SupportTicket {
  id: string
  ticketNumber: string
  userId: string
  category: string
  subject?: string
  description: string
  status: string
  priority: string
  orderId?: string
  createdAt: string
  updatedAt: string
}

export const supportApi = {
  /**
   * Submit a new support ticket / issue report
   */
  createTicket: async (payload: SupportTicketPayload): Promise<SupportTicket> => {
    return apiClient.post<SupportTicket>('support/tickets', payload)
  },

  /**
   * List all tickets submitted by current user
   */
  listTickets: async (): Promise<SupportTicket[]> => {
    return apiClient.get<SupportTicket[]>('support/tickets')
  },

  /**
   * Get details of a single ticket
   */
  getTicket: async (id: string): Promise<SupportTicket> => {
    return apiClient.get<SupportTicket>(`support/tickets/${id}`)
  },

  /**
   * Get supported issue categories
   */
  getCategories: async (): Promise<string[]> => {
    return apiClient.get<string[]>('support/categories')
  },
}
