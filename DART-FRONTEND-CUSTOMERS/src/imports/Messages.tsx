import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import {
  Edit,
  Search,
  Filter,
  Phone,
  MoreVertical,
  ArrowLeft,
  Camera,
  Mic,
  Send,
  Play,
  Pause,
  CheckCheck,
  ChevronRight,
  Copy,
  Pin,
  Pencil,
  Plus,
  X,
  MoreHorizontal,
  Check,
  MessageSquare,
  MessageCircle,
  Bell,
  Headphones,
} from "lucide-react"
import {
  formatAudioDuration,
  generateVoiceNoteFallbackBlob,
} from "../utils/audio"
import RateRiderModal from "../components/RateRiderModal"
import { chatApi, getChatSocket } from "../api"
import { ordersApi } from "../api/orders.api"
import { ApiChatContact, Order } from "../types/api.types"
import { useAuth } from "../context/AuthContext"

type Tab = "All" | "Conversation" | "Updates" | "Supports"

interface ChatMessage {
  id: string
  clientMessageId?: string
  sender: "user" | "other"
  type: "text" | "audio"
  text?: string
  audioUrl?: string
  audioDuration?: number
  time: string
  reactions?: string[]
  isPinned?: boolean
  isEdited?: boolean
}

interface ChatContact {
  id: string
  name: string
  avatar: string
  role?: string
  rating?: string
  online?: boolean
  package?: {
    title: string
    trackingId: string
    icon: string
  }
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
}

// Emojis matching user's screenshot
const REACTION_EMOJIS = ["👍", "🙂", "😊", "😒", "💖", "😄", "🙃", "👌"]
const createClientMessageId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `message-${Date.now()}-${Math.random().toString(36).slice(2)}`

const upsertMessage = (
  messages: ChatMessage[],
  message: ChatMessage,
  clientMessageId?: string,
): ChatMessage[] => {
  const index = messages.findIndex(
    (item) =>
      item.id === message.id ||
      (!!clientMessageId && item.clientMessageId === clientMessageId),
  )
  const updated =
    index < 0
      ? [...messages, message]
      : messages.map((item, itemIndex) =>
          itemIndex === index ? { ...item, ...message } : item,
        )
  const seenIds = new Set<string>()
  return updated.filter((item) => {
    if (seenIds.has(item.id)) return false
    seenIds.add(item.id)
    return true
  })
}

const mergeMessages = (
  current: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] =>
  incoming.reduce(
    (messages, message) =>
      upsertMessage(messages, message, message.clientMessageId),
    current,
  )
const EXTRA_REACTION_EMOJIS = [
  "❤️",
  "🔥",
  "🎉",
  "🙏",
  "👏",
  "😂",
  "😍",
  "⚡",
  "🚀",
  "💯",
]

const FILTER_OPTIONS: {
  id: Tab
  label: string
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { id: "All", label: "All", icon: MessageSquare },
  { id: "Conversation", label: "Conversation", icon: MessageCircle },
  { id: "Updates", label: "Updates", icon: Bell },
  { id: "Supports", label: "Supports", icon: Headphones },
]

export interface MessagesProps {
  onChatOpenChange?: (isOpen: boolean) => void
}

export default function Messages({ onChatOpenChange }: MessagesProps = {}) {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("All")
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [contacts, setContacts] = useState<ApiChatContact[]>([])
  const [activeDeliveries, setActiveDeliveries] = useState<Order[]>([])
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({})

  useEffect(() => {
    onChatOpenChange?.(activeChat !== null)
    return () => {
      onChatOpenChange?.(false)
    }
  }, [activeChat, onChatOpenChange])

  // Fetch active contacts and orders from backend API
  const fetchContactsAndOrders = useCallback(async () => {
    try {
      const [chatsRes, ordersRes] = await Promise.allSettled([
        chatApi.listChats(activeTab, searchQuery),
        ordersApi.listOrders(),
      ])

      if (chatsRes.status === "fulfilled" && Array.isArray(chatsRes.value)) {
        setContacts(chatsRes.value)
      } else {
        setContacts([])
      }

      if (ordersRes.status === "fulfilled" && Array.isArray(ordersRes.value)) {
        const inTransit = ordersRes.value.filter(
          (o) =>
            o.status === "IN_TRANSIT" ||
            o.status === "PICKED_UP" ||
            o.status === "RIDER_ASSIGNED" ||
            o.status === "RIDER_ACCEPTED",
        )
        setActiveDeliveries(inTransit)
      } else {
        setActiveDeliveries([])
      }
    } catch (err) {
      console.warn("Failed to load messages or orders:", err)
      setContacts([])
      setActiveDeliveries([])
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    fetchContactsAndOrders()
    const refreshTimer = window.setInterval(fetchContactsAndOrders, 10000)
    return () => window.clearInterval(refreshTimer)
  }, [fetchContactsAndOrders])

  // Text input & voice recording state
  const [inputText, setInputText] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const isSendingMessageRef = useRef(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] =
    useState<string | null>(null)

  // Context Menu & Reaction State
  const [selectedMessageForMenu, setSelectedMessageForMenu] =
    useState<ChatMessage | null>(null)
  const [showExtraEmojis, setShowExtraEmojis] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Long press detection for mobile
  const longPressTimerRef = useRef<number | null>(null)
  const [isRateRiderOpen, setIsRateRiderOpen] = useState(false)

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const recordingTimerRef = useRef<number | null>(null)
  const chatBottomRef = useRef<HTMLDivElement | null>(null)

  // Show temporary toast feedback
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current))
    }, 2200)
  }

  // Scroll to bottom when messages update or chat opens
  const scrollToBottom = useCallback(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (activeChat) {
      scrollToBottom()
    }
  }, [activeChat, messagesByChat, scrollToBottom])

  // Fetch chat messages and connect Socket.io when activeChat opens
  useEffect(() => {
    if (!activeChat) return

    // 1. Fetch initial message history from backend
    chatApi
      .getChatMessages(activeChat)
      .then((msgs) => {
        if (msgs && Array.isArray(msgs) && msgs.length > 0) {
          const formatted: ChatMessage[] = msgs.map((m) => ({
            id: m.id,
            clientMessageId: m.clientMessageId,
            sender:
              (m.senderId && m.senderId === user?.id
                ? "user"
                : (m.sender as "user" | "other") ||
                  (m.senderRole === "user" ? "user" : "other")),
            type: m.type === "audio" ? "audio" : "text",
            text: m.text,
            audioUrl: m.audioUrl,
            audioDuration: m.audioDuration,
            time:
              m.time ||
              (m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Just now"),
            reactions: m.reactions || [],
            isPinned: m.isPinned,
            isEdited: m.isEdited,
          }))
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: mergeMessages(prev[activeChat] || [], formatted),
          }))
          setTimeout(scrollToBottom, 50)
        }
      })
      .catch((err) => {
        console.warn("Using local messages cache/seed:", err)
      })

    // 2. Connect to WebSocket room for real-time bi-directional messaging
    const socket = getChatSocket()
    socket.emit("join_chat", { chatId: activeChat })

    const handleNewMessage = (msg: any) => {
      if (msg.chatId === activeChat) {
        setMessagesByChat((prev) => {
          const formatted: ChatMessage = {
            id: msg.id,
            clientMessageId: msg.clientMessageId,
            sender:
              (msg.senderId && msg.senderId === user?.id
                ? "user"
                : msg.sender ||
                  (msg.senderRole === "user" ? "user" : "other")),
            type: msg.type || "text",
            text: msg.text,
            audioUrl: msg.audioUrl,
            audioDuration: msg.audioDuration,
            time:
              msg.time ||
              new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
            reactions: msg.reactions || [],
            isPinned: msg.isPinned,
            isEdited: msg.isEdited,
          }
          return {
            ...prev,
            [activeChat]: upsertMessage(
              prev[activeChat] || [],
              formatted,
              msg.clientMessageId,
            ),
          }
        })
        setTimeout(scrollToBottom, 50)
      }
    }

    const handleMessageReacted = ({ messageId, emoji, reactions }: any) => {
      setMessagesByChat((prev) => {
        const list = prev[activeChat] || []
        return {
          ...prev,
          [activeChat]: list.map((m) => {
            if (m.id !== messageId) return m
            if (Array.isArray(reactions)) return { ...m, reactions }
            const currentReactions = m.reactions || []
            const updated = currentReactions.includes(emoji)
              ? currentReactions.filter((r) => r !== emoji)
              : [...currentReactions, emoji]
            return { ...m, reactions: updated }
          }),
        }
      })
    }

    const handleMessagePinned = ({ messageId, isPinned }: any) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [activeChat]: (prev[activeChat] || []).map((m) =>
          m.id === messageId ? { ...m, isPinned } : m,
        ),
      }))
    }

    const handleMessageEdited = ({ messageId, text }: any) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [activeChat]: (prev[activeChat] || []).map((m) =>
          m.id === messageId ? { ...m, text, isEdited: true } : m,
        ),
      }))
    }

    const handleMessageDeleted = ({ messageId }: any) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== messageId),
      }))
    }

    socket.on("new_message", handleNewMessage)
    socket.on("message_reacted", handleMessageReacted)
    socket.on("message_pinned", handleMessagePinned)
    socket.on("message_edited", handleMessageEdited)
    socket.on("message_deleted", handleMessageDeleted)

    return () => {
      socket.emit("leave_chat", { chatId: activeChat })
      socket.off("new_message", handleNewMessage)
      socket.off("message_reacted", handleMessageReacted)
      socket.off("message_pinned", handleMessagePinned)
      socket.off("message_edited", handleMessageEdited)
      socket.off("message_deleted", handleMessageDeleted)
    }
  }, [activeChat, scrollToBottom, user?.id])

  // Clean up recording timer and audio tracks on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current)
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  // Send a text message (or finish editing if in edit mode)
  const handleSendText = () => {
    if (!activeChat) return

    if (editingMessageId) {
      const trimmed = inputText.trim()
      if (!trimmed) return
      const chatId = activeChat
      const messageId = editingMessageId
      const originalMessage = messagesByChat[chatId]?.find(
        (message) => message.id === messageId,
      )
      const originalText =
        originalMessage?.text ?? editingText
      setMessagesByChat((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((m) =>
          m.id === messageId
            ? { ...m, text: trimmed, isEdited: true }
            : m,
        ),
      }))
      setEditingMessageId(null)
      setEditingText("")
      setInputText("")
      chatApi
        .editMessage(chatId, messageId, trimmed)
        .then(() => showToast("Message edited"))
        .catch((err) => {
          console.warn("Failed to edit message:", err)
          setMessagesByChat((prev) => ({
            ...prev,
            [chatId]: (prev[chatId] || []).map((message) =>
              message.id === messageId
                ? {
                    ...message,
                    text: originalText,
                    isEdited: originalMessage?.isEdited,
                  }
                : message,
            ),
          }))
          showToast("Message could not be edited. Please try again.")
        })
      return
    }

    const textToSend = inputText.trim()
    if (!textToSend) return
    if (isSendingMessageRef.current) return
    isSendingMessageRef.current = true
    setIsSendingMessage(true)

    const tempId = createClientMessageId()
    const newMessage: ChatMessage = {
      id: tempId,
      clientMessageId: tempId,
      sender: "user",
      type: "text",
      text: textToSend,
      time: "Just now",
    }

    setMessagesByChat((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMessage],
    }))

    setInputText("")
    setTimeout(scrollToBottom, 50)

    chatApi
      .sendMessage(activeChat, {
        type: "text",
        text: textToSend,
        clientMessageId: tempId,
      })
      .then((saved) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: upsertMessage(
            prev[activeChat] || [],
            {
              ...newMessage,
              id: saved.id,
              time: saved.time || newMessage.time,
            },
            tempId,
          ),
        }))
      })
      .catch((err) => {
        console.warn("Failed to persist message:", err)
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
        }))
        showToast("Message could not be sent. Please try again.")
      })
      .finally(() => {
        isSendingMessageRef.current = false
        setIsSendingMessage(false)
      })
  }

  // Quick suggestion click
  const handleQuickSuggestion = (text: string) => {
    if (!activeChat) return
    if (isSendingMessageRef.current) return
    isSendingMessageRef.current = true
    setIsSendingMessage(true)
    const tempId = createClientMessageId()
    const newMessage: ChatMessage = {
      id: tempId,
      clientMessageId: tempId,
      sender: "user",
      type: "text",
      text,
      time: "Just now",
    }

    setMessagesByChat((prev) => ({
      ...prev,
      [activeChat]: [...(prev[activeChat] || []), newMessage],
    }))

    setTimeout(scrollToBottom, 50)

    chatApi
      .sendMessage(activeChat, { type: "text", text, clientMessageId: tempId })
      .then((saved) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: upsertMessage(
            prev[activeChat] || [],
            {
              ...newMessage,
              id: saved.id,
              time: saved.time || newMessage.time,
            },
            tempId,
          ),
        }))
      })
      .catch((err) => {
        console.warn("Failed to persist suggested message:", err)
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
        }))
        showToast("Message could not be sent. Please try again.")
      })
      .finally(() => {
        isSendingMessageRef.current = false
        setIsSendingMessage(false)
      })
  }

  // Start WhatsApp-style voice note recording
  const startVoiceRecording = async () => {
    try {
      setIsRecording(true)
      setRecordingSeconds(0)
      audioChunksRef.current = []

      // Start recording timer
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1)
      }, 1000)

      // Attempt to access user microphone
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          })
          mediaStreamRef.current = stream

          const mimeType = MediaRecorder.isTypeSupported("audio/webm")
            ? "audio/webm"
            : MediaRecorder.isTypeSupported("audio/mp4")
              ? "audio/mp4"
              : ""

          const recorder = mimeType
            ? new MediaRecorder(stream, { mimeType })
            : new MediaRecorder(stream)
          mediaRecorderRef.current = recorder

          recorder.ondataavailable = (e) => {
            if (e.data && e.data.size > 0) {
              audioChunksRef.current.push(e.data)
            }
          }

          recorder.start(100)
        } catch (micErr) {
          console.warn(
            "Microphone permission denied or not supported; using simulated audio fallback:",
            micErr,
          )
        }
      }
    } catch (err) {
      console.error("Error initializing voice recorder:", err)
    }
  }

  // Cancel recording and discard voice note
  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      try {
        mediaRecorderRef.current.stop()
      } catch (e) {
        console.error(e)
      }
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop())
      mediaStreamRef.current = null
    }

    mediaRecorderRef.current = null
    audioChunksRef.current = []
    setIsRecording(false)
    setRecordingSeconds(0)
  }

  // Stop recording and send voice note into chat
  const sendVoiceRecording = () => {
    if (!activeChat) return

    const duration = Math.max(1, recordingSeconds)

    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    const finalizeAndSend = (audioUrl: string) => {
      const tempId = createClientMessageId()
      const newVoiceMessage: ChatMessage = {
        id: tempId,
        clientMessageId: tempId,
        sender: "user",
        type: "audio",
        audioUrl,
        audioDuration: duration,
        time: "Just now",
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChat]: [...(prev[activeChat] || []), newVoiceMessage],
      }))

      setIsRecording(false)
      setRecordingSeconds(0)
      mediaRecorderRef.current = null
      setTimeout(scrollToBottom, 50)

      chatApi
        .sendMessage(activeChat, {
          type: "audio",
          audioUrl,
          audioDuration: duration,
          clientMessageId: tempId,
        })
        .then((saved) => {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: upsertMessage(
              prev[activeChat] || [],
              { ...newVoiceMessage, id: saved.id },
              tempId,
            ),
          }))
        })
        .catch((err) => {
          console.warn("Failed to persist voice message:", err)
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
          }))
          showToast("Voice message could not be sent. Please try again.")
        })
    }

    // If active MediaRecorder with chunks exists
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.onstop = () => {
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach((track) => track.stop())
          mediaStreamRef.current = null
        }

        if (audioChunksRef.current.length > 0) {
          const mimeType = mediaRecorderRef.current?.mimeType || "audio/webm"
          const blob = new Blob(audioChunksRef.current, { type: mimeType })
          const reader = new FileReader()
          reader.onloadend = () => {
            if (typeof reader.result === "string") {
              finalizeAndSend(reader.result)
            } else {
              showToast("Voice message could not be prepared. Please try again.")
              setIsRecording(false)
            }
          }
          reader.onerror = () => {
            console.error("Failed to read recorded voice message:", reader.error)
            showToast("Voice message could not be prepared. Please try again.")
            setIsRecording(false)
          }
          reader.readAsDataURL(blob)
        } else {
          const fallbackUrl = generateVoiceNoteFallbackBlob(duration)
          finalizeAndSend(fallbackUrl)
        }
      }

      try {
        mediaRecorderRef.current.stop()
      } catch {
        const fallbackUrl = generateVoiceNoteFallbackBlob(duration)
        finalizeAndSend(fallbackUrl)
      }
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop())
        mediaStreamRef.current = null
      }
      const fallbackUrl = generateVoiceNoteFallbackBlob(duration)
      finalizeAndSend(fallbackUrl)
    }
  }

  // Message Context Menu Actions
  const handleOpenContextMenu = (
    msg: ChatMessage,
    e?: React.MouseEvent | React.TouchEvent,
  ) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setSelectedMessageForMenu(msg)
    setShowExtraEmojis(false)
  }

  const handleCloseContextMenu = () => {
    setSelectedMessageForMenu(null)
    setShowExtraEmojis(false)
  }

  // Add/toggle an emoji reaction on the selected message
  const handleAddReaction = (emoji: string) => {
    if (!selectedMessageForMenu || !activeChat) return

    chatApi
      .reactMessage(activeChat, selectedMessageForMenu.id, emoji)
      .catch((err) => {
        console.warn("Failed to react to message via API:", err)
      })

    setMessagesByChat((prev) => {
      const currentList = prev[activeChat] || []
      return {
        ...prev,
        [activeChat]: currentList.map((msg) => {
          if (msg.id !== selectedMessageForMenu.id) return msg
          const currentReactions = msg.reactions || []
          const exists = currentReactions.includes(emoji)
          const updatedReactions = exists
            ? currentReactions.filter((r) => r !== emoji)
            : [...currentReactions, emoji]
          return {
            ...msg,
            reactions: updatedReactions,
          }
        }),
      }
    })

    handleCloseContextMenu()
    showToast(`Reaction added ${emoji}`)
  }

  // Copy message text
  const handleCopyMessage = () => {
    if (!selectedMessageForMenu) return
    const textToCopy =
      selectedMessageForMenu.type === "text"
        ? selectedMessageForMenu.text || ""
        : `Voice note (${formatAudioDuration(selectedMessageForMenu.audioDuration || 0)})`

    navigator.clipboard.writeText(textToCopy)
    handleCloseContextMenu()
    showToast("Copied to clipboard")
  }

  // Pin / Unpin message
  const handleTogglePinMessage = () => {
    if (!selectedMessageForMenu || !activeChat) return
    const chatId = activeChat
    const messageId = selectedMessageForMenu.id
    const willPin = !selectedMessageForMenu.isPinned

    const updatePinnedState = (isPinned: boolean) => {
      setMessagesByChat((prev) => ({
        ...prev,
        [chatId]: (prev[chatId] || []).map((msg) =>
          msg.id === messageId ? { ...msg, isPinned } : msg,
        ),
      }))
    }

    updatePinnedState(willPin)
    chatApi.pinMessage(chatId, messageId, willPin).catch((err) => {
        console.warn("Failed to pin message via API:", err)
        updatePinnedState(!willPin)
        showToast("Message could not be updated. Please try again.")
      })

    handleCloseContextMenu()
    showToast(willPin ? "Message pinned" : "Message unpinned")
  }

  // Start editing message
  const handleStartEditMessage = () => {
    if (!selectedMessageForMenu) return
    if (selectedMessageForMenu.type !== "text") {
      showToast("Voice notes cannot be edited")
      handleCloseContextMenu()
      return
    }

    setEditingMessageId(selectedMessageForMenu.id)
    setEditingText(selectedMessageForMenu.text || "")
    setInputText(selectedMessageForMenu.text || "")
    handleCloseContextMenu()
  }

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditingText("")
    setInputText("")
  }

  // Long press touch handlers
  const handleTouchStart = (msg: ChatMessage) => {
    longPressTimerRef.current = window.setTimeout(() => {
      handleOpenContextMenu(msg)
    }, 450)
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const currentContact = useMemo<ChatContact | null>(() => {
    if (!activeChat) return null
    const found = contacts.find((c) => c.id === activeChat)
    if (found) {
      return {
        id: found.id,
        name: found.name,
        avatar:
          found.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(found.name)}&background=ffcc00&color=000000`,
        role: found.role || "Rider",
        rating: found.rating || "5.0",
        online: found.online ?? true,
        package: found.package,
        lastMessage: found.lastMessage,
        lastMessageTime: found.lastMessageTime
          ? new Date(found.lastMessageTime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : undefined,
        unreadCount: found.unreadCount,
      }
    }

    const orderMatch = activeDeliveries.find(
      (o) => `order-${o.id}` === activeChat || o.id === activeChat,
    )
    if (orderMatch) {
      const riderName = orderMatch.rider
        ? `${orderMatch.rider.firstName} ${orderMatch.rider.lastName}`.trim()
        : "Dart Rider"
      return {
        id: `order-${orderMatch.id}`,
        name: riderName,
        avatar:
          orderMatch.rider?.profileImageUrl ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(riderName)}&background=ffcc00&color=000000`,
        role: "Delivery Rider",
        rating: "5.0",
        online: true,
        package: {
          title: orderMatch.package?.name || "Delivery Package",
          trackingId: orderMatch.trackingId || orderMatch.orderNumber || "TRK-ACTIVE",
          icon: "📦",
        },
      }
    }

    return null
  }, [activeChat, contacts, activeDeliveries])
  const currentMessages = activeChat
    ? mergeMessages([], messagesByChat[activeChat] || [])
    : []
  const pinnedMessage = currentMessages.find((m) => m.isPinned)

  // Active Chat Screen
  if (activeChat && currentContact) {
    return (
      <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors relative">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 overflow-hidden transition-colors relative">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-yellow-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Chat Header */}
          <div className="px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white dark:bg-[#161618] z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  cancelVoiceRecording()
                  setActiveChat(null)
                  setSelectedMessageForMenu(null)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-white/5 text-gray-800 dark:text-white transition-colors cursor-pointer"
                title="Back to conversations"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0 relative">
                <img
                  src={currentContact.avatar}
                  alt={currentContact.name}
                  className="w-full h-full object-cover"
                />
                {currentContact.online && (
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#161618]" />
                )}
              </div>
              <div>
                <h2 className="font-semibold text-sm text-gray-900 dark:text-white leading-tight">
                  {currentContact.name}
                </h2>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>{" "}
                  {currentContact.rating} • {currentContact.role}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-full transition-colors cursor-pointer"
                title="Call rider"
              >
                <Phone className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsRateRiderOpen(true)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-full transition-colors cursor-pointer"
                title="Rate rider or options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pinned Message Bar (if any pinned) */}
          {pinnedMessage && (
            <div className="bg-amber-50/90 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs transition-colors">
              <div className="flex items-center gap-2 overflow-hidden">
                <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 fill-amber-500/20" />
                <span className="font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                  Pinned:
                </span>
                <span className="text-amber-900/80 dark:text-amber-200/80 truncate">
                  {pinnedMessage.type === "text"
                    ? pinnedMessage.text
                    : `Voice note (${formatAudioDuration(pinnedMessage.audioDuration || 0)})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!activeChat) return
                  const chatId = activeChat
                  const messageId = pinnedMessage.id
                  setMessagesByChat((prev) => ({
                    ...prev,
                    [chatId]: (prev[chatId] || []).map((m) =>
                      m.id === messageId ? { ...m, isPinned: false } : m,
                    ),
                  }))
                  showToast("Message unpinned")
                  chatApi.pinMessage(chatId, messageId, false).catch((err) => {
                    console.warn("Failed to unpin message via API:", err)
                    setMessagesByChat((prev) => ({
                      ...prev,
                      [chatId]: (prev[chatId] || []).map((m) =>
                        m.id === messageId ? { ...m, isPinned: true } : m,
                      ),
                    }))
                    showToast("Message could not be updated. Please try again.")
                  })
                }}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-900 text-[11px] font-medium ml-2 shrink-0 cursor-pointer"
              >
                Unpin
              </button>
            </div>
          )}

          {/* Chat Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 dark:bg-[#121214] flex flex-col gap-4">
            {/* Tracking banner */}
            {currentContact.package && (
              <div className="bg-white dark:bg-[#1c1c20] rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center font-bold text-lg text-gray-500">
                    {currentContact.package.icon || "📦"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {currentContact.package.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tracking ID: {currentContact.package.trackingId}
                    </p>
                  </div>
                </div>
                <button className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors">
                  View Details
                </button>
              </div>
            )}

            {currentMessages.length > 0 && (
              <div className="flex justify-center my-1">
                <span className="text-[10px] uppercase font-medium tracking-wider text-gray-400 dark:text-gray-500 bg-gray-200/50 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                  Today
                </span>
              </div>
            )}

            {currentMessages.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-400 dark:text-gray-500 my-auto">
                <div className="w-12 h-12 rounded-full bg-yellow-400/10 text-yellow-600 dark:text-yellow-400 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                  Send a message to {currentContact.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mt-1">
                  Coordinate pickup or drop-off directly with your delivery partner.
                </p>
              </div>
            )}

            {/* Render conversation messages */}
            {currentMessages.map((msg) => {
              const isUser = msg.sender === "user"

              return (
                <div
                  key={msg.id}
                  onContextMenu={(e) => handleOpenContextMenu(msg, e)}
                  onTouchStart={() => handleTouchStart(msg)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className={`flex gap-2 max-w-[85%] sm:max-w-[78%] group relative ${
                    isUser ? "self-end flex-row-reverse" : "self-start"
                  }`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex-shrink-0 mt-auto overflow-hidden">
                      <img
                        src={currentContact.avatar}
                        alt={currentContact.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="relative group/bubble">
                    {/* Message Action Trigger Button (hover on desktop or tap) */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenContextMenu(msg, e)}
                      className={`absolute top-1.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity z-10 w-6 h-6 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 flex items-center justify-center cursor-pointer text-gray-700 dark:text-gray-300 ${
                        isUser ? "-left-7" : "-right-7"
                      }`}
                      title="React or more options"
                    >
                      <MoreHorizontal className="w-3.5 h-3.5" />
                    </button>

                    {msg.type === "text" ? (
                      <div
                        className={`p-2 rounded-2xl relative select-text transition-shadow ${
                          isUser
                            ? "bg-yellow-400 text-gray-900 rounded-br-xs font-medium shadow-2xs"
                            : "bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-bl-xs text-gray-900 dark:text-white shadow-2xs"
                        } ${msg.isPinned ? "ring-2 ring-amber-400/80" : ""}`}
                      >
                        {msg.isPinned && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-800 dark:text-amber-400 font-semibold mb-1">
                            <Pin className="w-3 h-3 fill-current" />
                            <span>Pinned</span>
                          </div>
                        )}

                        <p className="text-sm leading-relaxed">{msg.text}</p>

                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          {msg.isEdited && (
                            <span className="text-[9px] italic text-gray-600/70 dark:text-gray-400/70">
                              (edited)
                            </span>
                          )}
                          <span
                            className={`text-[9.5px] ${
                              isUser
                                ? "text-gray-800/80"
                                : "text-gray-400 dark:text-gray-500"
                            }`}
                          >
                            {msg.time}
                          </span>
                          {isUser && (
                            <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500 inline-block" />
                          )}
                        </div>

                        {/* Floating Reactions Pill */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div
                            onClick={(e) => handleOpenContextMenu(msg, e)}
                            className="absolute -bottom-2 right-2 bg-white dark:bg-[#1e1e22] px-2 py-0.5 rounded-full border border-gray-100 dark:border-white/10 shadow-xs flex items-center gap-0.5 text-xs cursor-pointer hover:scale-105 transition-transform"
                          >
                            {msg.reactions.map((emoji, idx) => (
                              <span key={idx}>{emoji}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      /* WhatsApp-Style Voice Note Bubble */
                      <div className="relative">
                        <WhatsAppVoiceNote
                          key={msg.id}
                          messageId={msg.id}
                          audioUrl={msg.audioUrl || ""}
                          duration={msg.audioDuration || 4}
                          isUser={isUser}
                          time={msg.time}
                          currentPlayingId={currentlyPlayingAudioId}
                          setCurrentPlayingId={setCurrentlyPlayingAudioId}
                        />

                        {/* Floating Reactions Pill on Audio Note */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div
                            onClick={(e) => handleOpenContextMenu(msg, e)}
                            className="absolute -bottom-2 right-2 bg-white dark:bg-[#1e1e22] px-2 py-0.5 rounded-full border border-gray-100 dark:border-white/10 shadow-xs flex items-center gap-0.5 text-xs cursor-pointer hover:scale-105 transition-transform"
                          >
                            {msg.reactions.map((emoji, idx) => (
                              <span key={idx}>{emoji}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div ref={chatBottomRef} />
          </div>

          {/* Quick reply suggestion pills */}
          {!isRecording && (
            <div className="px-4 pt-2.5 pb-1 bg-white dark:bg-[#161618] border-t border-gray-100 dark:border-white/5">
              <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                {[
                  "Call me",
                  "I'm outside",
                  "What's your ETA?",
                  "Item received, thank you!",
                ].map((phrase, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleQuickSuggestion(phrase)}
                    className="px-3 py-1.5 rounded-full border border-gray-200 dark:border-white/10 hover:border-yellow-400 dark:hover:border-yellow-400 text-xs whitespace-nowrap text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-yellow-50/50 dark:hover:bg-yellow-400/10 transition-all cursor-pointer shrink-0"
                  >
                    {phrase}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editing message indicator */}
          {editingMessageId && (
            <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/20 border-t border-yellow-200/80 dark:border-yellow-400/20 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-300 font-medium">
                <Pencil className="w-3.5 h-3.5" />
                <span>Editing message</span>
              </div>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-gray-500 hover:text-gray-800 dark:hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Bottom Input Area / WhatsApp Voice Note Recorder */}
          <div className="p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-white dark:bg-[#161618] border-t border-gray-100 dark:border-white/5">
            {isRecording ? (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-white/10 dark:bg-[#202024] animate-in fade-in duration-200">
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition-colors cursor-pointer shrink-0 active:scale-95"
                  title="Cancel recording"
                  aria-label="Cancel recording"
                >
                  <X className="w-5 h-5 stroke-[2]" />
                </button>

                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-200">
                      <span className="h-2 w-2 rounded-full bg-red-500" />
                      Recording voice message
                    </span>
                    <span className="font-mono text-xs font-medium text-gray-600 dark:text-gray-300">
                      {formatAudioDuration(recordingSeconds)}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-label="Recording in progress"
                    className="h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10"
                  >
                    <div
                      className="h-full rounded-full bg-red-500 transition-[width] duration-1000"
                      style={{
                        width: `${Math.min(100, (recordingSeconds / 60) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={sendVoiceRecording}
                  className="w-10 h-10 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-black rounded-full shrink-0 transition-all active:scale-90 cursor-pointer"
                  title="Send voice note"
                  aria-label="Finish and send voice message"
                >
                  <Send className="w-5 h-5 stroke-[2.2] ml-0.5" />
                </button>
              </div>
            ) : (
              /* Regular Text Input Bar with Dynamic Mic <-> Send Transition */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full flex-shrink-0 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                  title="Attach photo"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <div className="flex-1 bg-gray-50 dark:bg-[#202024] rounded-full flex items-center px-4 py-2 border border-transparent focus-within:border-yellow-400 transition-colors">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSendText()
                      }
                    }}
                    placeholder={
                      editingMessageId
                        ? "Edit your message..."
                        : `Message ${currentContact.name}...`
                    }
                    className="bg-transparent w-full focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>

                {/* Dynamic Button: Changes to Send icon when typing (or editing), Mic icon when empty */}
                {inputText.trim().length > 0 || editingMessageId ? (
                  <button
                    type="button"
                    onClick={handleSendText}
                  disabled={isSendingMessage}
                  aria-busy={isSendingMessage}
                  className="w-10 h-10 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-black rounded-full flex-shrink-0 cursor-pointer transition-all duration-200 active:scale-95 shadow-sm animate-in zoom-in-75"
                    title={editingMessageId ? "Save edit" : "Send message"}
                  >
                    {editingMessageId ? (
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    ) : (
                      <Send className="w-5 h-5 stroke-[2.2] ml-0.5" />
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startVoiceRecording}
                    className="w-10 h-10 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-black rounded-full flex-shrink-0 cursor-pointer transition-all duration-200 active:scale-90 hover:scale-105 shadow-sm"
                    title="Tap to record voice note (WhatsApp style)"
                  >
                    <Mic className="w-5 h-5 stroke-[2.2]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* WhatsApp-Style Message Context Menu & Reaction Modal Overlay */}
          {/* ========================================================= */}
          {selectedMessageForMenu && (
            <div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-black/50 animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
              onClick={handleCloseContextMenu}
            >
              {/* Active Highlighted Message Preview & Reaction Bar */}
              <div
                onClick={(e) => e.stopPropagation()}
                className="max-w-md w-full flex flex-col items-center my-auto py-4 animate-in zoom-in-95 duration-200"
              >
                <div
                  className={`p-3.5 sm:p-4 rounded-3xl max-w-[92%] sm:max-w-[80%] shadow-[0_15px_35px_rgba(0,0,0,0.25)] max-h-40 overflow-y-auto ${
                    selectedMessageForMenu.sender === "user"
                      ? "bg-yellow-400 text-gray-900 rounded-br-xs font-medium ring-4 ring-yellow-400/30"
                      : "bg-white dark:bg-[#1c1c20] text-gray-900 dark:text-white rounded-bl-xs border border-gray-100 dark:border-white/10"
                  }`}
                >
                  {selectedMessageForMenu.type === "text" ? (
                    <p className="text-sm sm:text-base leading-snug break-words">
                      {selectedMessageForMenu.text}
                    </p>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-950 text-white flex items-center justify-center">
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Voice Note</p>
                        <p className="text-xs text-gray-700">
                          {formatAudioDuration(
                            selectedMessageForMenu.audioDuration || 0,
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 1. Emoji Reaction Bar (Mobile-friendly, no overflow, touch-optimized) */}
                <div className="mt-3 relative w-full flex flex-col items-center px-2">
                  <div className="bg-white dark:bg-[#1e1e22] shadow-2xl rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 border border-gray-100 dark:border-white/10 flex items-center justify-center gap-1 sm:gap-2 max-w-full overflow-x-auto no-scrollbar touch-pan-x">
                    {REACTION_EMOJIS.map((emoji) => {
                      const isSelected =
                        selectedMessageForMenu.reactions?.includes(emoji)
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleAddReaction(emoji)}
                          className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-xl sm:text-2xl leading-none hover:scale-125 active:scale-110 transition-transform cursor-pointer rounded-full shrink-0 touch-manipulation ${
                            isSelected ? "bg-yellow-400/20 scale-110" : ""
                          }`}
                          title={`React ${emoji}`}
                        >
                          <span>{emoji}</span>
                        </button>
                      )
                    })}

                    {/* Plus Button to toggle additional emojis */}
                    <button
                      type="button"
                      onClick={() => setShowExtraEmojis((prev) => !prev)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-transform hover:scale-110 cursor-pointer shrink-0 ml-0.5 touch-manipulation"
                      title="More emojis"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

                  {/* Extra Emojis Popover (Responsive 5-column grid that fits all mobile screens) */}
                  {showExtraEmojis && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white dark:bg-[#1e1e22] shadow-2xl rounded-2xl p-2.5 sm:p-3 border border-gray-100 dark:border-white/10 grid grid-cols-5 gap-1.5 sm:gap-2 z-30 animate-in zoom-in-90 duration-150 max-w-[calc(100vw-2.5rem)]">
                      {EXTRA_REACTION_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => handleAddReaction(emoji)}
                          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-xl hover:scale-125 active:scale-125 hover:bg-gray-100 dark:hover:bg-white/10 transition-transform cursor-pointer touch-manipulation"
                        >
                          <span>{emoji}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. Action Menu Card */}
                <div className="w-64 sm:w-72 max-w-[calc(100vw-3rem)] mt-3 bg-white dark:bg-[#1e1e22] rounded-2xl shadow-2xl border border-gray-100 dark:border-white/10 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 shrink-0">
                  {/* Copy Row */}
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer transition-colors touch-manipulation"
                  >
                    <span>Copy</span>
                    <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400 stroke-[2]" />
                  </button>

                  {/* Pin Row */}
                  <button
                    type="button"
                    onClick={handleTogglePinMessage}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer transition-colors touch-manipulation"
                  >
                    <span>
                      {selectedMessageForMenu.isPinned ? "Unpin" : "Pin"}
                    </span>
                    <Pin
                      className={`w-4 h-4 stroke-[2] ${
                        selectedMessageForMenu.isPinned
                          ? "text-amber-500 fill-amber-500"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                  </button>

                  {selectedMessageForMenu.sender === "user" &&
                    selectedMessageForMenu.type === "text" && (
                      <button
                        type="button"
                        onClick={handleStartEditMessage}
                        className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer transition-colors touch-manipulation"
                      >
                        <span>Edit</span>
                        <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400 stroke-[2]" />
                      </button>
                    )}
                </div>
              </div>
            </div>
          )}

          {/* Rate Rider Modal */}
          <RateRiderModal
            isOpen={isRateRiderOpen}
            onClose={() => setIsRateRiderOpen(false)}
            riderName={currentContact.name}
            onSubmit={() => showToast("Rating submitted, thank you!")}
          />
        </div>
      </div>
    )
  }

  // Messages List & Hub Screen
  return (
    <div className="flex-1 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-y-auto transition-colors">
      <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col min-h-full bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 relative pb-24 md:pb-12 transition-colors">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-3 sm:pb-4 flex items-center justify-between bg-white dark:bg-[#161618] sticky top-0 z-10 border-b border-gray-100 dark:border-white/5">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Messages
          </h1>
          <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black shadow-xs transition-colors cursor-pointer">
            <Edit className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Search Bar with External Yellow Filter Button */}
        <div className="px-3.5 sm:px-6 my-3 sm:my-4 flex items-center gap-2.5">
          {/* Search Component */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-100 dark:border-white/10 rounded-xl leading-5 bg-gray-50 dark:bg-[#202024] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-yellow-500 sm:text-sm"
              placeholder="Search conversations"
            />
          </div>

          {/* Yellow Filter Button Outside Search Component with Modal */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black shadow-xs transition-transform active:scale-95 cursor-pointer touch-manipulation shrink-0 relative"
              title="Filter conversations"
              aria-label="Filter conversations"
              aria-expanded={isFilterOpen}
            >
              <Filter className="w-5 h-5 stroke-[2.2]" />
              {activeTab !== "All" && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-black ring-2 ring-yellow-400" />
              )}
            </button>

            {/* Custom Modal Popup (matching Packages screen add button modal) */}
            {isFilterOpen && (
              <>
                {/* Backdrop for closing when clicking outside */}
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsFilterOpen(false)}
                />

                {/* Dropdown Action Menu matching Packages screen */}
                <div className="absolute right-0 top-full mt-2 w-56 sm:w-60 bg-white dark:bg-[#1a1a1e] rounded-2xl shadow-[0_12px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.5)] border border-gray-100 dark:border-white/10 z-50 overflow-hidden divide-y divide-gray-100 dark:divide-white/5 animate-in fade-in zoom-in-95 duration-150">
                  {FILTER_OPTIONS.map(({ id, label, icon: Icon }) => {
                    const isSelected = activeTab === id
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => {
                          setActiveTab(id)
                          setIsFilterOpen(false)
                        }}
                        className="w-full flex items-center justify-between px-4.5 py-3.5 sm:py-4 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`transition-colors shrink-0 ${
                              isSelected
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-gray-900 dark:text-gray-100 group-hover:text-yellow-600 dark:group-hover:text-yellow-400"
                            }`}
                          >
                            <Icon className="w-5 h-5 stroke-[1.8]" />
                          </div>
                          <span
                            className={`text-[15px] tracking-tight ${
                              isSelected
                                ? "font-semibold text-yellow-600 dark:text-yellow-400"
                                : "font-normal sm:font-medium text-gray-800 dark:text-gray-100"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-yellow-500 stroke-[2.5]" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active filter pill if not All */}
        {activeTab !== "All" && (
          <div className="px-3.5 sm:px-6 mb-3 flex items-center gap-2 animate-in fade-in duration-150">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Filtered by:
            </span>
            <button
              type="button"
              onClick={() => setActiveTab("All")}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-black shadow-2xs hover:bg-yellow-500 cursor-pointer active:scale-95 transition-all"
              title="Reset to All"
            >
              <span>{activeTab}</span>
              <X className="w-3 h-3 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-3.5 sm:px-6 pb-6">
          {/* Updates section (Visible if activeTab is All or Updates) */}
          {/* Updates section (Visible if activeTab is All or Updates) */}
          {(activeTab === "All" || activeTab === "Updates") && activeDeliveries.length > 0 && (
            <>
              <h2 className="text-sm font-semibold mb-4 text-gray-500 dark:text-gray-400">
                Updates
              </h2>

              {/* Updates List */}
              <div className="space-y-3 mb-6">
                {activeDeliveries.map((delivery) => {
                  const pkgName =
                    delivery.package?.name ||
                    `Package #${delivery.trackingId || delivery.orderNumber || delivery.id.slice(-6)}`
                  const statusLabel = delivery.status.replace(/_/g, " ")
                  const chatId = `order-${delivery.id}`
                  return (
                    <div
                      key={delivery.id}
                      onClick={() => setActiveChat(chatId)}
                      className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-gray-200 dark:hover:border-white/10 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-yellow-400/10 dark:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs">
                          <span>DART</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold bg-yellow-400 text-black px-2 py-0.5 rounded uppercase shadow-2xs">
                              {statusLabel}
                            </span>
                          </div>
                          <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                            {pkgName}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {delivery.destinationAddress?.city || "In delivery"} • Tracking:{" "}
                            {delivery.trackingId || delivery.orderNumber || "Pending"}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {/* Conversations section (Visible if activeTab is All or Conversation) */}
          {(activeTab === "All" || activeTab === "Conversation") && (
            <>
              <h2 className="text-sm font-semibold mb-4 text-gray-500 dark:text-gray-400">
                Conversations
              </h2>

              {contacts.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-3">
                    <MessageCircle className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    No active conversations
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mt-1">
                    When you book a rider or receive a delivery update, your conversation will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contacts.map((contact) => {
                    const lastMsg = contact.lastMessage || "Start a conversation"
                    const isVoice = lastMsg.toLowerCase().includes("voice note")
                    const time = contact.lastMessageTime
                      ? new Date(contact.lastMessageTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""
                    const unread = (contact.unreadCount ?? 0) > 0

                    return (
                      <div
                        key={contact.id}
                        onClick={() => setActiveChat(contact.id)}
                        className="flex items-center justify-between p-3 rounded-2xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 -mx-3 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex-shrink-0 relative">
                            <img
                              src={
                                contact.avatar ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  contact.name,
                                )}&background=ffcc00&color=000000`
                              }
                              alt={contact.name}
                              className="w-full h-full object-cover"
                            />
                            {contact.online && (
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-[#161618] rounded-full"></div>
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                              {contact.name}
                            </h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate w-48 flex items-center gap-1">
                              {isVoice && (
                                <Mic className="w-3.5 h-3.5 text-blue-500 inline-block shrink-0" />
                              )}
                              <span>{lastMsg}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {time && <span className="text-xs text-gray-400">{time}</span>}
                          {unread && (
                            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Updates Tab Empty State when there are no active deliveries */}
          {activeTab === "Updates" && activeDeliveries.length === 0 && (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500">
              <Bell className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No active delivery updates
              </p>
              <p className="text-xs text-gray-400 mt-1">
                When you have a package in transit, real-time updates will appear here.
              </p>
            </div>
          )}

          {/* Supports Section (Visible when activeTab is Supports) */}
          {activeTab === "Supports" && (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500">
              <Headphones className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No active support conversations
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Contact customer care for help with orders or deliveries
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * WhatsApp Voice Note Component
 * Includes Play/Pause button, interactive waveform seek scrubber, playback timing, and blue double-check marks.
 */
function WhatsAppVoiceNote({
  messageId,
  audioUrl,
  duration,
  isUser,
  time,
  currentPlayingId,
  setCurrentPlayingId,
}: {
  messageId: string
  audioUrl: string
  duration: number
  isUser: boolean
  time: string
  currentPlayingId: string | null
  setCurrentPlayingId: (id: string | null) => void
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [actualDuration, setActualDuration] = useState(0)
  const [playbackError, setPlaybackError] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Pause if another audio note starts playing
  useEffect(() => {
    if (currentPlayingId !== messageId && isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    }
  }, [currentPlayingId, messageId, isPlaying])

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      setCurrentPlayingId(null)
    } else {
      if (audioRef.current.ended) audioRef.current.currentTime = 0
      setPlaybackError(false)
      setCurrentPlayingId(messageId)
      audioRef.current
        .play()
        .catch((err) => {
          console.error("Voice message playback failed:", err)
          setPlaybackError(true)
          setCurrentPlayingId(null)
        })
    }
  }

  return (
    <div
      className={`p-3 rounded-2xl min-w-[240px] sm:min-w-[280px] shadow-2xs ${
        isUser
          ? "bg-yellow-400 text-gray-950 rounded-br-xs"
          : "bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-bl-xs text-gray-900 dark:text-white"
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          disabled={!audioUrl}
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 cursor-pointer shadow-xs ${
            isUser
              ? "bg-gray-950 text-white hover:bg-gray-900"
              : "bg-yellow-400 text-gray-950 hover:bg-yellow-500"
          }`}
          title={
            audioUrl
              ? isPlaying
                ? "Pause voice note"
                : "Play voice note"
              : "Voice note unavailable"
          }
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onLoadedMetadata={(event) => {
            const loadedDuration = event.currentTarget.duration
            if (Number.isFinite(loadedDuration) && loadedDuration > 0) {
              setActualDuration(loadedDuration)
            }
          }}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => {
            setIsPlaying(false)
            setCurrentTime(0)
            setCurrentPlayingId(null)
          }}
          onError={() => {
            setIsPlaying(false)
            console.error("Voice message audio could not be loaded.")
          }}
          className="hidden"
        />
        {/* Audio playback progress */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="relative flex h-5 w-full items-center">
            <div
              className={`h-1.5 w-full overflow-hidden rounded-full ${
                isUser ? "bg-gray-950/20" : "bg-gray-300 dark:bg-white/20"
              }`}
            >
              <div
                className={`h-full rounded-full ${
                  isUser ? "bg-gray-950" : "bg-yellow-500"
                }`}
                style={{
                  width: `${Math.min(
                    100,
                    (currentTime / (actualDuration || duration || 1)) * 100,
                  )}%`,
                }}
              />
            </div>
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute h-3 w-3 -translate-x-1/2 rounded-full border-2 ${
                isUser
                  ? "border-gray-950 bg-yellow-400"
                  : "border-yellow-600 bg-white dark:bg-gray-100"
              }`}
              style={{
                left: `${Math.min(
                  100,
                  (currentTime / (actualDuration || duration || 1)) * 100,
                )}%`,
              }}
            />
            <input
              type="range"
              min={0}
              max={actualDuration || duration || 1}
              step={0.1}
              value={Math.min(currentTime, actualDuration || duration || 1)}
              onChange={(event) => {
                const nextTime = Number(event.target.value)
                if (audioRef.current) audioRef.current.currentTime = nextTime
                setCurrentTime(nextTime)
              }}
              aria-label="Voice note playback progress"
              disabled={playbackError}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </div>

          {/* Time & Read status row */}
          <div className="flex items-center justify-between text-[10px] mt-0.5">
            <span
              className={`font-mono font-medium ${
                isUser ? "text-gray-800" : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {playbackError
                ? "Audio unavailable"
                : formatAudioDuration(
                    isPlaying || currentTime > 0
                      ? currentTime
                      : actualDuration || duration,
                  )}
            </span>
            <div className="flex items-center gap-1.5">
              <span
                className={`${
                  isUser
                    ? "text-gray-800/80"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              >
                {time}
              </span>
              {isUser ? (
                <CheckCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />
              ) : (
                <Mic className="w-3 h-3 text-blue-500 inline-block" />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
