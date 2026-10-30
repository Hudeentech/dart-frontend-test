import { io, Socket } from "socket.io-client"
import { apiClient, ApiError } from "./client"
import type { ChatContact, ChatMessage } from "../types/api.types"

let socket: Socket | null = null

/** Socket.io connection to the backend `/chat` namespace */
export function getChatSocket(): Socket {
  if (!socket) {
    const host = apiClient.baseUrl.replace(/\/api(\/v\d+)?\/?$/, "")
    socket = io(`${host}/chat`, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      auth: { token: apiClient.getAccessToken() },
    })
  }
  return socket
}

export function disconnectChatSocket() {
  socket?.disconnect()
  socket = null
}

/** /chats/* */
export const chatApi = {
  list: (category?: string, search?: string) =>
    apiClient.get<ChatContact[]>("chats", {
      params: { category: category && category !== "All" ? category : undefined, search },
    }),
  listChats: (category?: string, search?: string) =>
    apiClient.get<ChatContact[]>("chats", {
      params: { category: category && category !== "All" ? category : undefined, search },
    }),
  get: (id: string) => apiClient.get<ChatContact>(`chats/${id}`),
  messages: (id: string, limit?: number) => apiClient.get<ChatMessage[]>(`chats/${id}/messages`, { params: { limit } }),
  getChatMessages: (id: string, limit?: number) => apiClient.get<ChatMessage[]>(`chats/${id}/messages`, { params: { limit } }),
  sendMessage: async (
    id: string,
    payload: {
      type?: string
      clientMessageId?: string
      text?: string
      audioUrl?: string
      audioDuration?: number
      imageUrl?: string
      fileName?: string
      fileSize?: number
      fileUrl?: string
    },
  ) => {
    try {
      return await apiClient.post<ChatMessage>(`chats/${id}/messages`, payload)
    } catch (error) {
      if (
        !(error instanceof ApiError) ||
        error.statusCode !== 400 ||
        !/property clientMessageId should not exist/i.test(error.message) ||
        !payload.clientMessageId
      ) {
        throw error
      }

      console.warn(
        "[ChatApi] Backend does not support client message IDs yet; retrying without idempotency metadata.",
      )
      const { clientMessageId: _clientMessageId, ...legacyPayload } = payload
      return apiClient.post<ChatMessage>(`chats/${id}/messages`, legacyPayload)
    }
  },
  react: (id: string, messageId: string, emoji: string) =>
    apiClient.post<ChatMessage>(`chats/${id}/messages/${messageId}/react`, { emoji }),
  reactMessage: (id: string, messageId: string, emoji: string) =>
    apiClient.post<ChatMessage>(`chats/${id}/messages/${messageId}/react`, { emoji }),
  pin: (id: string, messageId: string, isPinned: boolean) =>
    apiClient.patch<ChatMessage>(`chats/${id}/messages/${messageId}/pin`, { isPinned }),
  pinMessage: (id: string, messageId: string, isPinned: boolean) =>
    apiClient.patch<ChatMessage>(`chats/${id}/messages/${messageId}/pin`, { isPinned }),
  edit: (id: string, messageId: string, text: string) =>
    apiClient.patch<ChatMessage>(`chats/${id}/messages/${messageId}`, { text }),
  editMessage: (id: string, messageId: string, text: string) =>
    apiClient.patch<ChatMessage>(`chats/${id}/messages/${messageId}`, { text }),
}
