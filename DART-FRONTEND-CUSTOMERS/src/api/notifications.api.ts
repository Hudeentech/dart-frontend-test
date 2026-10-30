import { apiClient } from "./client"
import { ApiNotification, NotificationsResponse } from "../types/api.types"

export interface ListNotificationsParams {
  type?: string
  unreadOnly?: boolean
  limit?: number
}

/**
 * Notifications API Service
 * Handles fetching user notifications, real-time unread counts,
 * and synchronizing read / clear states.
 */
export const notificationsApi = {
  /**
   * Get notifications and unread count
   */
  getNotifications: async (
    params?: ListNotificationsParams,
  ): Promise<NotificationsResponse> => {
    return apiClient.get<NotificationsResponse>("notifications", {
      params: params as Record<string, any>,
    })
  },

  /**
   * Mark a single notification as read
   */
  markAsRead: async (id: string): Promise<ApiNotification> => {
    return apiClient.patch<ApiNotification>(`notifications/${id}/read`)
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (): Promise<{ success: boolean; count: number }> => {
    return apiClient.post<{ success: boolean; count: number }>(
      "notifications/read-all",
    )
  },

  /**
   * Delete a specific notification by ID
   */
  deleteNotification: async (id: string): Promise<{ success: boolean }> => {
    return apiClient.delete<{ success: boolean }>(`notifications/${id}`)
  },

  /**
   * Clear all notifications for the user
   */
  clearNotifications: async (): Promise<{ success: boolean; count: number }> => {
    return apiClient.delete<{ success: boolean; count: number }>(
      "notifications",
    )
  },
}
