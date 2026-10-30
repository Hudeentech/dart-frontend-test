import { apiClient } from "./client"
import type {
  CompleteProfilePayload,
  CreateTicketPayload,
  LedgerEntry,
  NotificationsResponse,
  AppNotification,
  Rating,
  SubmitNinPayload,
  SupportTicket,
  TrackingInfo,
  UpdateUserPayload,
  User,
  VerificationStatus,
  WalletAccount,
  WithdrawPayload,
} from "../types/api.types"

/** /users/* */
export const usersApi = {
  me: () => apiClient.get<User>("users/me"),
  update: (payload: UpdateUserPayload) => apiClient.patch<User>("users/me", payload),
  completeProfile: (payload: CompleteProfilePayload) => apiClient.patch<User>("users/me/complete-profile", payload),
  verification: () => apiClient.get<VerificationStatus>("users/verification"),
  submitNin: (payload: SubmitNinPayload) => apiClient.post<any>("users/verification/nin", payload),
}

/** /wallet/* */
export const walletApi = {
  get: () => apiClient.get<WalletAccount>("wallet"),
  getWallet: () => apiClient.get<WalletAccount>("wallet"),
  transactions: () => apiClient.get<LedgerEntry[]>("wallet/transactions"),
  getTransactions: () => apiClient.get<LedgerEntry[]>("wallet/transactions"),
  deposit: (payload: { amount: number; paymentMethod?: string; reference?: string }) =>
    apiClient.post<{ success: boolean; transaction?: any; balance?: number; reference?: string }>("wallet/deposit", payload),
  withdraw: (payload: WithdrawPayload) =>
    apiClient.post<{ success: boolean; withdrawal?: any; transaction?: any; balance?: number; reference?: string }>("wallet/withdraw", payload),
}

/** /notifications/* */
export const notificationsApi = {
  list: (params?: { type?: string; unreadOnly?: boolean; limit?: number }) =>
    apiClient.get<NotificationsResponse>("notifications", { params }),
  markRead: (id: string) => apiClient.patch<AppNotification>(`notifications/${id}/read`),
  markAllRead: () => apiClient.post<{ success: boolean; count: number }>("notifications/read-all"),
  remove: (id: string) => apiClient.delete<{ success: boolean }>(`notifications/${id}`),
  clear: () => apiClient.delete<{ success: boolean; count: number }>("notifications"),
}

/** /ratings/* */
export const ratingsApi = {
  forRider: (riderUserId: string) => apiClient.get<Rating[]>(`ratings/rider/${riderUserId}`, { anonymous: true }),
}

/** /support/* */
export const supportApi = {
  categories: () => apiClient.get<any>("support/categories", { anonymous: true }),
  tickets: () => apiClient.get<SupportTicket[]>("support/tickets"),
  ticket: (id: string) => apiClient.get<SupportTicket>(`support/tickets/${id}`),
  create: (payload: CreateTicketPayload) => apiClient.post<SupportTicket>("support/tickets", payload),
}

/** /tracking/* (public) */
export const trackingApi = {
  get: (trackingId: string) => apiClient.get<TrackingInfo>(`tracking/${trackingId}`, { anonymous: true }),
}
