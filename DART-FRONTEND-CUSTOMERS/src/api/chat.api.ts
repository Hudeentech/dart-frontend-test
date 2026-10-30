import { apiClient, ApiError } from "./client"
import { ApiChatContact, ApiChatMessage } from "../types/api.types"
import { io, Socket } from "socket.io-client"

let socketInstance: Socket | null = null

/**
 * Get or initialize real-time Socket.io connection for chat
 */
export function getChatSocket(): Socket {
  if (!socketInstance) {
    const baseUrl =
      import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1"
    const socketHost = baseUrl.replace(/\/api(\/v\d+)?\/?$/, "")

    socketInstance = io(`${socketHost}/chat`, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ["websocket", "polling"],
      auth: {
        token: localStorage.getItem("dart_access_token"),
      },
    })

    socketInstance.on("connect", () => {
      console.log("[ChatSocket] Connected to real-time chat server")
    })

    socketInstance.on("connect_error", (err) => {
      console.warn("[ChatSocket] Connection warning (fallback to REST):", err.message)
    })
  }

  return socketInstance
}

export interface SendMessagePayload {
  type: "text" | "audio" | "image"
  clientMessageId?: string
  text?: string
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string
}

/**
 * Chat & Real-Time Messaging API Service
 */
export const chatApi = {
  /**
   * List conversation contacts for user with optional category filter
   */
  listChats: async (
    category?: string,
    search?: string,
  ): Promise<ApiChatContact[]> => {
    return apiClient.get<ApiChatContact[]>("chats", {
      params: {
        ...(category && category !== "All" ? { category } : {}),
        ...(search ? { search } : {}),
      },
    })
  },

  /**
   * Get single conversation details
   */
  getChat: async (chatId: string): Promise<ApiChatContact> => {
    return apiClient.get<ApiChatContact>(`chats/${chatId}`)
  },

  /**
   * Get messages history for a chat
   */
  getChatMessages: async (
    chatId: string,
    limit?: number,
  ): Promise<ApiChatMessage[]> => {
    return apiClient.get<ApiChatMessage[]>(`chats/${chatId}/messages`, {
      params: limit ? { limit } : undefined,
    })
  },

  /**
   * Send a message in a chat thread
   */
  sendMessage: async (
    chatId: string,
    payload: SendMessagePayload,
  ): Promise<ApiChatMessage> => {
    try {
      return await apiClient.post<ApiChatMessage>(
        `chats/${chatId}/messages`,
        payload,
      )
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
      return apiClient.post<ApiChatMessage>(
        `chats/${chatId}/messages`,
        legacyPayload,
      )
    }
  },

  /**
   * Add or toggle emoji reaction
   */
  reactMessage: async (
    chatId: string,
    messageId: string,
    emoji: string,
  ): Promise<ApiChatMessage> => {
    return apiClient.post<ApiChatMessage>(
      `chats/${chatId}/messages/${messageId}/react`,
      { emoji },
    )
  },

  /**
   * Pin or unpin a message
   */
  pinMessage: async (
    chatId: string,
    messageId: string,
    isPinned: boolean,
  ): Promise<ApiChatMessage> => {
    return apiClient.patch<ApiChatMessage>(
      `chats/${chatId}/messages/${messageId}/pin`,
      { isPinned },
    )
  },

  /**
   * Edit message text
   */
  editMessage: async (
    chatId: string,
    messageId: string,
    text: string,
  ): Promise<ApiChatMessage> => {
    return apiClient.patch<ApiChatMessage>(
      `chats/${chatId}/messages/${messageId}`,
      { text },
    )
  },

}
