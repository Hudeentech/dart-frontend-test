import { useState, useRef, useEffect, useCallback } from "react"
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
  Paperclip,
  FileText,
  Download,
} from "lucide-react"
import {
  formatAudioDuration,
  generateVoiceNoteFallbackBlob,
} from "../utils/audio"
import { chatApi, getChatSocket } from "../api/chat.api"
import { useAuth } from "../context/AuthContext"
import { useRider } from "../context/RiderContext"
import { navigate } from "../hooks/router"
import { STATUS_BUCKET, canAccept, fullName, timeAgo } from "../utils/format"
import type { ChatContact } from "../types/api.types"

type Tab = "All" | "Conversation" | "Updates" | "Supports"

interface ChatMessage {
  id: string
  clientMessageId?: string
  sender: "user" | "other"
  senderRole?: "user" | "other" | "rider" | "customer"
  senderId?: string
  type: "text" | "audio" | "image" | "file"
  text?: string
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string
  fileName?: string
  fileSize?: number
  fileUrl?: string
  time: string
  reactions?: string[]
  isPinned?: boolean
  isEdited?: boolean
}

const createClientMessageId = () =>
  globalThis.crypto?.randomUUID?.() ||
  `message-${Date.now()}-${Math.random().toString(36).slice(2)}`

function upsertMessage(
  messages: ChatMessage[],
  incoming: ChatMessage,
): ChatMessage[] {
  const index = messages.findIndex(
    (message) =>
      message.id === incoming.id ||
      (!!incoming.clientMessageId &&
        message.clientMessageId === incoming.clientMessageId),
  )
  const updated =
    index < 0
      ? [...messages, incoming]
      : messages.map((message, messageIndex) =>
          messageIndex === index ? { ...message, ...incoming } : message,
        )
  const seenIds = new Set<string>()
  return updated.filter((message) => {
    if (seenIds.has(message.id)) return false
    seenIds.add(message.id)
    return true
  })
}

function reconcileSentMessage(
  messages: ChatMessage[],
  temporaryId: string,
  saved: ChatMessage,
): ChatMessage[] {
  const temporary = messages.find((message) => message.id === temporaryId)
  return upsertMessage(
    messages,
    {
      ...temporary,
      ...saved,
      clientMessageId: temporary?.clientMessageId,
      sender: "user",
      time: saved.time || temporary?.time || "Just now",
    },
  )
}

// Emojis matching user's design reference
const REACTION_EMOJIS = ["👍", "🙂", "😊", "😒", "💖", "😄", "🙃", "👌"]
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
  initialChatId?: string
  onChatOpenChange?: (isOpen: boolean) => void
}

export function MessagesPage({ initialChatId, onChatOpenChange }: MessagesProps = {}) {
  const { user } = useAuth()
  const { orders } = useRider()
  const [activeTab, setActiveTab] = useState<Tab>("All")
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [activeChat, setActiveChat] = useState<string | null>(initialChatId || null)
  const [contacts, setContacts] = useState<ChatContact[]>([])
  const [messagesByChat, setMessagesByChat] = useState<Record<string, ChatMessage[]>>({})
  const [viewingImageUrl, setViewingImageUrl] = useState<string | null>(null)

  useEffect(() => {
    if (initialChatId) {
      setActiveChat(initialChatId)
    }
  }, [initialChatId])

  // Real active or incoming delivery order (in transit, picked up, rider assigned/accepted, etc.)
  const activeOrder = orders.find(
    (o) =>
      (activeChat && (`order-${o.id}` === activeChat || o.id === activeChat)) ||
      STATUS_BUCKET[o.status] === "active" ||
      canAccept(o.status),
  )

  // Synthesize contacts list: combine active order's customer with any chats from API
  const allContacts: ChatContact[] = []

  contacts.forEach((contact) => {
    allContacts.push(contact)
  })

  if (activeOrder) {
    const activeOrderChatId = `order-${activeOrder.id}`
    if (
      !allContacts.some(
        (contact) =>
          contact.id === activeOrderChatId ||
          Boolean(
            activeOrder.customer?.id &&
              contact.contactId === activeOrder.customer.id,
          ),
      )
    ) {
      const cName = fullName(activeOrder.customer, "Customer")
      allContacts.unshift({
        id: activeOrderChatId,
        contactId: activeOrder.customer?.id || activeOrder.id,
        name: cName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=ffcc00&color=000000`,
        role: "Customer",
        rating: "5.0",
        online: true,
        category: "Conversation",
        package: {
          title: activeOrder.package?.name || "Active Delivery Package",
          trackingId: activeOrder.trackingId || activeOrder.orderNumber || "TRK-ACTIVE",
          icon: "📦",
        },
        lastMessage: `Delivery in progress (${activeOrder.status.replace(/_/g, " ").toLowerCase()})`,
        lastMessageTime: timeAgo(activeOrder.updatedAt || activeOrder.createdAt),
        unreadCount: 0,
      })
    }
  }

  // Filter contacts by active tab and search query
  const filteredContacts = allContacts.filter((c) => {
    if (activeTab === "Conversation" && c.category && c.category !== "Conversation") return false
    if (activeTab === "Updates" && c.category && c.category !== "Updates") return false
    if (activeTab === "Supports" && c.category && c.category !== "Supports") return false
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      return (
        c.name.toLowerCase().includes(q) ||
        (c.package?.title && c.package.title.toLowerCase().includes(q)) ||
        (c.package?.trackingId && c.package.trackingId.toLowerCase().includes(q))
      )
    }
    return true
  })

  useEffect(() => {
    onChatOpenChange?.(activeChat !== null)
    return () => {
      onChatOpenChange?.(false)
    }
  }, [activeChat, onChatOpenChange])

  // Fetch active contacts from backend API
  const fetchContacts = useCallback(async () => {
    try {
      const res = await chatApi.listChats(activeTab, searchQuery)
      if (res && Array.isArray(res)) {
        setContacts(res)
      }
    } catch {
      // Best-effort fallback
    }
  }, [activeTab, searchQuery])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    const interval = window.setInterval(fetchContacts, 5000)
    return () => window.clearInterval(interval)
  }, [fetchContacts])

  // File and Image upload refs
  const imageInputRef = useRef<HTMLInputElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Text input & voice recording state
  const [inputText, setInputText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [currentlyPlayingAudioId, setCurrentlyPlayingAudioId] = useState<string | null>(null)

  // Context Menu & Reaction State
  const [selectedMessageForMenu, setSelectedMessageForMenu] = useState<ChatMessage | null>(null)
  const [showExtraEmojis, setShowExtraEmojis] = useState(false)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [customerModalOpen, setCustomerModalOpen] = useState(false)

  // Long press detection for mobile
  const longPressTimerRef = useRef<number | null>(null)

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

    const formatIncoming = (m: any): ChatMessage => {
      const isMine =
        Boolean(user?.id && m.senderId === user.id) ||
        m.senderRole === "rider" ||
        (m.sender === "user" && m.senderRole !== "customer")
      return {
        id: m.id,
        clientMessageId: m.clientMessageId,
        sender: isMine ? "user" : "other",
        senderRole: m.senderRole,
        senderId: m.senderId,
        type:
          m.type === "audio"
            ? "audio"
            : m.type === "image"
              ? "image"
              : m.type === "file"
                ? "file"
                : "text",
        text: m.text,
        audioUrl: m.audioUrl,
        audioDuration: m.audioDuration,
        imageUrl: m.imageUrl,
        fileName: m.fileName,
        fileSize: m.fileSize,
        fileUrl: m.fileUrl,
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
      }
    }

    const loadMessages = async () => {
      try {
        const msgs = await chatApi.getChatMessages(activeChat)
        if (msgs && Array.isArray(msgs)) {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: msgs.reduce(
              (messages: ChatMessage[], message: any) =>
                upsertMessage(messages, formatIncoming(message)),
              prev[activeChat] || [],
            ),
          }))
          setTimeout(scrollToBottom, 50)
        }
      } catch {}
    }

    // 1. Initial message history fetch
    loadMessages()

    // 2. Fallback polling every 3 seconds to guarantee freshness
    const pollInterval = setInterval(loadMessages, 3000)

    // 3. Connect to WebSocket room for real-time bi-directional messaging
    try {
      const socket = getChatSocket()
      socket.emit("join_chat", { chatId: activeChat })

      const handleNewMessage = (msg: any) => {
        const matches =
          msg.chatId === activeChat ||
          msg.chatId === activeChat.replace("order-", "") ||
          `order-${msg.chatId}` === activeChat

        if (matches) {
          setMessagesByChat((prev) => {
            const existing = prev[activeChat] || []
            return {
              ...prev,
              [activeChat]: upsertMessage(existing, formatIncoming(msg)),
            }
          })
          setTimeout(scrollToBottom, 50)
        }
      }

      const handleMessageReacted = ({ messageId, emoji }: any) => {
        setMessagesByChat((prev) => {
          const list = prev[activeChat] || []
          return {
            ...prev,
            [activeChat]: list.map((m) => {
              if (m.id !== messageId) return m
              const reactions = m.reactions || []
              const updated = reactions.includes(emoji)
                ? reactions.filter((r) => r !== emoji)
                : [...reactions, emoji]
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
        clearInterval(pollInterval)
        socket.emit("leave_chat", { chatId: activeChat })
        socket.off("new_message", handleNewMessage)
        socket.off("message_reacted", handleMessageReacted)
        socket.off("message_pinned", handleMessagePinned)
        socket.off("message_edited", handleMessageEdited)
        socket.off("message_deleted", handleMessageDeleted)
      }
    } catch {
      return () => clearInterval(pollInterval)
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

  // Handle Photo/Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChat) return

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const tempId = createClientMessageId()
      const newMsg: ChatMessage = {
        id: tempId,
        clientMessageId: tempId,
        sender: "user",
        type: "image",
        imageUrl: dataUrl,
        text: file.name,
        time: "Just now",
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChat]: [...(prev[activeChat] || []), newMsg],
      }))
      setTimeout(scrollToBottom, 50)
      showToast("Photo uploaded")

      chatApi
        .sendMessage(activeChat, {
          type: "image",
          clientMessageId: tempId,
          imageUrl: dataUrl,
          text: file.name,
        })
        .then((saved: any) => {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: reconcileSentMessage(
              prev[activeChat] || [],
              tempId,
              saved,
            ),
          }))
        })
        .catch((error) => {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
          }))
          console.warn("Failed to send image message:", error)
          showToast("Photo could not be sent. Please try again.")
        })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Handle Document / File Attachment Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeChat) return

    if (file.type.startsWith("image/")) {
      handleImageUpload(e)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const tempId = createClientMessageId()
      const newMsg: ChatMessage = {
        id: tempId,
        clientMessageId: tempId,
        sender: "user",
        type: "file",
        fileName: file.name,
        fileSize: file.size,
        fileUrl: dataUrl,
        time: "Just now",
      }

      setMessagesByChat((prev) => ({
        ...prev,
        [activeChat]: [...(prev[activeChat] || []), newMsg],
      }))
      setTimeout(scrollToBottom, 50)
      showToast("File uploaded")

      chatApi
        .sendMessage(activeChat, {
          type: "file",
          clientMessageId: tempId,
          fileName: file.name,
          fileSize: file.size,
          fileUrl: dataUrl,
        })
        .then((saved: any) => {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: reconcileSentMessage(
              prev[activeChat] || [],
              tempId,
              saved,
            ),
          }))
        })
        .catch((error) => {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
          }))
          console.warn("Failed to send file message:", error)
          showToast("File could not be sent. Please try again.")
        })
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  // Send a text message (or finish editing if in edit mode)
  const handleSendText = () => {
    if (!activeChat) return

    if (editingMessageId) {
      const trimmed = inputText.trim()
      if (!trimmed) return
      chatApi.editMessage(activeChat, editingMessageId, trimmed).catch(() => {})
      setMessagesByChat((prev) => ({
        ...prev,
        [activeChat]: (prev[activeChat] || []).map((m) =>
          m.id === editingMessageId ? { ...m, text: trimmed, isEdited: true } : m,
        ),
      }))
      setEditingMessageId(null)
      setInputText("")
      showToast("Message edited")
      return
    }

    const textToSend = inputText.trim()
    if (!textToSend) return

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
      .then((saved: any) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: reconcileSentMessage(
            prev[activeChat] || [],
            tempId,
            saved,
          ),
        }))
      })
      .catch((error) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
        }))
        console.warn("Failed to send message:", error)
        showToast("Message could not be sent. Please try again.")
      })
  }

  // Quick suggestion click
  const handleQuickSuggestion = (text: string) => {
    if (!activeChat) return
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
      .sendMessage(activeChat, {
        type: "text",
        text,
        clientMessageId: tempId,
      })
      .then((saved: any) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: reconcileSentMessage(
            prev[activeChat] || [],
            tempId,
            saved,
          ),
        }))
      })
      .catch((error) => {
        setMessagesByChat((prev) => ({
          ...prev,
          [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
        }))
        console.warn("Failed to send suggested message:", error)
        showToast("Message could not be sent. Please try again.")
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
        } catch {
          // Graceful fallback to synthesized modulated audio
        }
      }
    } catch {
      // Ignored
    }
  }

  // Cancel recording and discard voice note
  const cancelVoiceRecording = () => {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current)
      recordingTimerRef.current = null
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop()
      } catch {}
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
          clientMessageId: tempId,
          audioUrl,
          audioDuration: duration,
        })
        .then((saved: any) => {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: reconcileSentMessage(
              prev[activeChat] || [],
              tempId,
              saved,
            ),
          }))
        })
        .catch((error) => {
          setMessagesByChat((prev) => ({
            ...prev,
            [activeChat]: (prev[activeChat] || []).filter((m) => m.id !== tempId),
          }))
          console.warn("Failed to send voice note:", error)
          showToast("Voice note could not be sent. Please try again.")
        })
    }

    // If active MediaRecorder with chunks exists
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
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
              showToast("Voice note could not be prepared. Please try again.")
              setIsRecording(false)
            }
          }
          reader.onerror = () => {
            console.error("Failed to read recorded voice note:", reader.error)
            showToast("Voice note could not be prepared. Please try again.")
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

    chatApi.reactMessage(activeChat, selectedMessageForMenu.id, emoji).catch(() => {})

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
        : selectedMessageForMenu.type === "image"
          ? selectedMessageForMenu.imageUrl || ""
          : selectedMessageForMenu.type === "file"
            ? selectedMessageForMenu.fileName || selectedMessageForMenu.fileUrl || ""
            : `Voice note (${formatAudioDuration(selectedMessageForMenu.audioDuration || 0)})`

    navigator.clipboard.writeText(textToCopy)
    handleCloseContextMenu()
    showToast("Copied to clipboard")
  }

  // Pin / Unpin message
  const handleTogglePinMessage = () => {
    if (!selectedMessageForMenu || !activeChat) return
    const willPin = !selectedMessageForMenu.isPinned

    chatApi.pinMessage(activeChat, selectedMessageForMenu.id, willPin).catch(() => {})

    setMessagesByChat((prev) => ({
      ...prev,
      [activeChat]: (prev[activeChat] || []).map((msg) =>
        msg.id === selectedMessageForMenu.id ? { ...msg, isPinned: willPin } : msg,
      ),
    }))

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
    setInputText(selectedMessageForMenu.text || "")
    handleCloseContextMenu()
  }

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingMessageId(null)
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

  const currentContact = activeChat
    ? allContacts.find((c) => c.id === activeChat) ||
      (() => {
        const orderId = activeChat.replace("order-", "")
        const matched = orders.find((o) => o.id === orderId)
        if (matched) {
          const cName = fullName(matched.customer, "Customer")
          return {
            id: activeChat,
            contactId: matched.customer?.id || matched.id,
            name: cName,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(cName)}&background=ffcc00&color=000000`,
            role: "Customer" as const,
            rating: "5.0",
            online: true,
            package: {
              title: matched.package?.name || "Active Delivery Package",
              trackingId: matched.trackingId || matched.orderNumber || "TRK-ACTIVE",
              icon: "📦",
            },
            lastMessage: "Delivery in progress",
            unreadCount: 0,
          }
        }
        return null
      })()
    : null
  const currentMessages = activeChat ? messagesByChat[activeChat] || [] : []
  const pinnedMessage = currentMessages.find((m) => m.isPinned)

  // Active Chat Screen
  if (activeChat && currentContact) {
    return (
      <div className="flex-1 min-h-0 flex flex-col bg-[#fcfcfc] dark:bg-[#0c0c0e] h-full overflow-hidden transition-colors relative">
        <div className="w-full max-w-4xl 2xl:max-w-5xl mx-auto flex flex-col h-full min-h-0 bg-transparent border-0 md:border-x border-gray-200/70 dark:border-white/5 overflow-hidden transition-colors relative">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gray-900/90 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-yellow-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Chat Header - Fixed / Non-scrolling at top */}
          <div className="shrink-0 px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 flex items-center justify-between border-b border-gray-100 dark:border-white/5 bg-white dark:bg-[#161618] z-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  cancelVoiceRecording()
                  setActiveChat(null)
                  setSelectedMessageForMenu(null)
                  if (initialChatId) {
                    navigate("/messages", { replace: true })
                  }
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
              <a
                href={activeOrder?.customer?.phoneNumber ? `tel:${activeOrder.customer.phoneNumber}` : "tel:08000000000"}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-full transition-colors cursor-pointer"
                title="Call customer"
              >
                <Phone className="w-4 h-4" />
              </a>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(true)}
                className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 rounded-full transition-colors cursor-pointer"
                title="Customer details"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pinned Message Bar (if any pinned) - Fixed under header */}
          {pinnedMessage && (
            <div className="shrink-0 bg-amber-50/90 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs transition-colors z-20">
              <div className="flex items-center gap-2 overflow-hidden">
                <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 fill-amber-500/20" />
                <span className="font-semibold text-amber-800 dark:text-amber-300 shrink-0">
                  Pinned:
                </span>
                <span className="text-amber-900/80 dark:text-amber-200/80 truncate">
                  {pinnedMessage.type === "text"
                    ? pinnedMessage.text
                    : pinnedMessage.type === "image"
                      ? "Photo"
                      : pinnedMessage.type === "file"
                        ? pinnedMessage.fileName || "File"
                        : `Voice note (${formatAudioDuration(pinnedMessage.audioDuration || 0)})`}
                </span>
              </div>
              <button
                onClick={() => {
                  setMessagesByChat((prev) => ({
                    ...prev,
                    [activeChat]: (prev[activeChat] || []).map((m) =>
                      m.id === pinnedMessage.id ? { ...m, isPinned: false } : m,
                    ),
                  }))
                  showToast("Message unpinned")
                }}
                className="text-amber-700 dark:text-amber-400 hover:text-amber-900 text-[11px] font-medium ml-2 shrink-0 cursor-pointer"
              >
                Unpin
              </button>
            </div>
          )}

          {/* Chat Messages Area - Only scrollable container */}
          <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-gray-50 dark:bg-[#121214] flex flex-col gap-4 overscroll-contain">
            {/* Tracking banner (Only if contact has package) */}
            {currentContact.package && (
              <div className="bg-white dark:bg-[#1c1c20] rounded-xl p-3 flex items-center justify-between border border-gray-100 dark:border-white/5 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-white/5 rounded-lg flex items-center justify-center font-bold text-lg text-gray-500">
                    {currentContact.package?.icon || "📦"}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white">
                      {currentContact.package?.title || "Active Delivery Package"}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Tracking ID: {currentContact.package?.trackingId || activeOrder?.trackingId || "TRK-ACTIVE"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setCustomerModalOpen(true)}
                  className="bg-yellow-400 hover:bg-yellow-500 text-black text-xs font-semibold px-3 py-1.5 rounded-full cursor-pointer transition-colors"
                >
                  View Details
                </button>
              </div>
            )}

            {/* Empty state if no messages in thread */}
            {currentMessages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-gray-400">
                <MessageCircle className="w-12 h-12 text-yellow-400/80 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-sm text-gray-700 dark:text-gray-300">
                  Conversation with {currentContact.name}
                </p>
                <p className="text-xs text-gray-400 mt-1 max-w-xs">
                  Send a text, photo, voice note, or choose a quick reply below.
                </p>
              </div>
            ) : (
              <div className="flex justify-center my-1">
                <span className="text-[10px] uppercase font-medium tracking-wider text-gray-400 dark:text-gray-500 bg-gray-200/50 dark:bg-white/5 px-2.5 py-0.5 rounded-full">
                  Today
                </span>
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
                        className={`p-3 rounded-2xl relative select-text transition-shadow ${
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
                    ) : msg.type === "image" ? (
                      /* Image Message Bubble */
                      <div
                        className={`p-1.5 rounded-2xl relative transition-shadow ${
                          isUser
                            ? "bg-yellow-400 text-gray-900 rounded-br-xs shadow-2xs"
                            : "bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-bl-xs text-gray-900 dark:text-white shadow-2xs"
                        } ${msg.isPinned ? "ring-2 ring-amber-400/80" : ""}`}
                      >
                        <div
                          className="rounded-xl overflow-hidden max-h-64 max-w-xs cursor-pointer group/img relative"
                          onClick={() => setViewingImageUrl(msg.imageUrl || null)}
                        >
                          <img
                            src={msg.imageUrl}
                            alt="Sent attachment"
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 flex items-center justify-center transition-colors">
                            <span className="opacity-0 group-hover/img:opacity-100 bg-black/60 text-white text-[11px] px-2.5 py-1 rounded-full backdrop-blur-xs font-medium transition-opacity">
                              Click to view
                            </span>
                          </div>
                        </div>

                        {msg.text && msg.text !== msg.fileName && (
                          <p className="text-xs px-2 pt-1.5 leading-relaxed font-medium">{msg.text}</p>
                        )}

                        <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
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
                    ) : msg.type === "file" ? (
                      /* File / Document Attachment Bubble */
                      <div
                        className={`p-3 rounded-2xl relative select-text transition-shadow min-w-[220px] ${
                          isUser
                            ? "bg-yellow-400 text-gray-900 rounded-br-xs font-medium shadow-2xs"
                            : "bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-bl-xs text-gray-900 dark:text-white shadow-2xs"
                        } ${msg.isPinned ? "ring-2 ring-amber-400/80" : ""}`}
                      >
                        <div className="flex items-center gap-3 bg-black/5 dark:bg-white/5 p-2.5 rounded-xl">
                          <div className="w-9 h-9 rounded-lg bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 flex items-center justify-center shrink-0">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate">
                              {msg.fileName || "Document attachment"}
                            </p>
                            <p className="text-[10px] text-gray-600 dark:text-gray-400">
                              {msg.fileSize ? `${Math.round(msg.fileSize / 1024)} KB` : "File"}
                            </p>
                          </div>
                          {msg.fileUrl && (
                            <a
                              href={msg.fileUrl}
                              download={msg.fileName || "attachment"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 hover:bg-black/20 flex items-center justify-center shrink-0 text-gray-800 dark:text-white"
                              title="Download file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center justify-end gap-1.5 mt-1 px-1">
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

          {/* Bottom Fixed Area: Quick replies + Editing Indicator + Input Bar - Non-scrolling pinned at bottom */}
          <div className="shrink-0 flex flex-col bg-white dark:bg-[#161618] border-t border-gray-100 dark:border-white/5 z-20">
            {/* Quick reply suggestion pills */}
            {!isRecording && (
              <div className="px-4 pt-2.5 pb-1">
                <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                  {[
                    "I'm on my way",
                    "I have arrived at your gate",
                    "Please have confirmation code ready",
                    "Package delivered safely ✅",
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
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-200/80 dark:border-yellow-400/20 flex items-center justify-between text-xs">
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

            {/* Bottom Input Area / WhatsApp Voice Note Recorder & Attachments */}
            <div className="p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              {/* Hidden file pickers */}
              <input
                type="file"
                ref={imageInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
              <input
                type="file"
                ref={fileInputRef}
                accept="*/*"
                className="hidden"
                onChange={handleFileUpload}
              />

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

                {/* Stop and Send Button */}
                <button
                  type="button"
                  onClick={sendVoiceRecording}
                  className="w-10 h-10 flex items-center justify-center bg-yellow-400 hover:bg-yellow-500 text-black rounded-full shrink-0 shadow-md transition-all active:scale-90 cursor-pointer"
                  title="Send voice note"
                  aria-label="Finish and send voice message"
                >
                  <Send className="w-5 h-5 stroke-[2.2] ml-0.5" />
                </button>
              </div>
            ) : (
              /* Regular Text Input Bar with Camera, Paperclip Attachment & Dynamic Mic <-> Send Transition */
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full flex-shrink-0 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                  title="Attach photo"
                >
                  <Camera className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full flex-shrink-0 text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                  title="Attach document or file"
                >
                  <Paperclip className="w-5 h-5" />
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
          </div>

          {/* WhatsApp-Style Message Context Menu & Reaction Modal Overlay */}
          {selectedMessageForMenu && (
            <div
              className="fixed inset-0 z-50 flex flex-col items-center justify-center p-3 sm:p-4 backdrop-blur-md bg-black/50 animate-in fade-in duration-200 overflow-y-auto overscroll-contain"
              onClick={handleCloseContextMenu}
            >
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
                  ) : selectedMessageForMenu.type === "image" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-200 shrink-0">
                        <img
                          src={selectedMessageForMenu.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Photo</p>
                        <p className="text-xs text-gray-500">React or options below</p>
                      </div>
                    </div>
                  ) : selectedMessageForMenu.type === "file" ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-800 dark:text-yellow-400 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{selectedMessageForMenu.fileName || "File attachment"}</p>
                        <p className="text-xs text-gray-500">{selectedMessageForMenu.fileSize ? `${Math.round(selectedMessageForMenu.fileSize / 1024)} KB` : "File"}</p>
                      </div>
                    </div>
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

                {/* 1. Emoji Reaction Bar */}
                <div className="mt-3 relative w-full flex flex-col items-center px-2">
                  <div className="bg-white dark:bg-[#1e1e22] shadow-2xl rounded-full px-2.5 sm:px-4 py-1.5 sm:py-2 border border-gray-100 dark:border-white/10 flex items-center justify-center gap-1 sm:gap-2 max-w-full overflow-x-auto no-scrollbar touch-pan-x">
                    {REACTION_EMOJIS.map((emoji) => {
                      const isSelected = selectedMessageForMenu.reactions?.includes(emoji)
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

                    <button
                      type="button"
                      onClick={() => setShowExtraEmojis((prev) => !prev)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-transform hover:scale-110 cursor-pointer shrink-0 ml-0.5 touch-manipulation"
                      title="More emojis"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>

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
                  <button
                    type="button"
                    onClick={handleCopyMessage}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer transition-colors touch-manipulation"
                  >
                    <span>Copy</span>
                    <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400 stroke-[2]" />
                  </button>

                  <button
                    type="button"
                    onClick={handleTogglePinMessage}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer transition-colors touch-manipulation"
                  >
                    <span>{selectedMessageForMenu.isPinned ? "Unpin" : "Pin"}</span>
                    <Pin
                      className={`w-4 h-4 stroke-[2] ${
                        selectedMessageForMenu.isPinned
                          ? "text-amber-500 fill-amber-500"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    />
                  </button>

                  <button
                    type="button"
                    onClick={handleStartEditMessage}
                    className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 cursor-pointer transition-colors touch-manipulation"
                  >
                    <span>Edit</span>
                    <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400 stroke-[2]" />
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* Customer Details Modal Sheet */}
          {customerModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
              <div
                className="fixed inset-0 -z-10"
                onClick={() => setCustomerModalOpen(false)}
              />
              <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-[#1c1c1e] border border-gray-200 dark:border-white/10 p-5 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Customer Information
                  </h3>
                  <button
                    onClick={() => setCustomerModalOpen(false)}
                    className="flex size-7 items-center justify-center rounded-lg border border-gray-300 dark:border-white/15 text-gray-500"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <img
                    src={currentContact.avatar}
                    alt={currentContact.name}
                    className="size-12 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                      {currentContact.name}
                    </h4>
                    <p className="text-xs text-gray-400">
                      {currentContact.role} · ⭐ {currentContact.rating}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl p-3 bg-gray-50 dark:bg-white/5 space-y-1 text-xs">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {currentContact.package?.title}
                  </p>
                  <p className="text-gray-400">
                    Tracking ID: {currentContact.package?.trackingId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-yellow-400 text-black font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )}
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
          <button
            onClick={() => showToast("Select a conversation to start messaging")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-yellow-400 hover:bg-yellow-500 text-black shadow-xs transition-colors cursor-pointer"
          >
            <Edit className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Search Bar with External Yellow Filter Button */}
        <div className="px-3.5 sm:px-6 my-3 sm:my-4 flex items-center gap-2.5">
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

            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-transparent"
                  onClick={() => setIsFilterOpen(false)}
                />

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
          {(activeTab === "All" || activeTab === "Updates") && (
            <>
              <h2 className="text-sm font-semibold mb-3 text-gray-500 dark:text-gray-400">
                Updates
              </h2>

              {activeOrder ? (
                <div
                  onClick={() => setActiveChat(`order-${activeOrder.id}`)}
                  className="bg-white dark:bg-[#1c1c20] border border-gray-100 dark:border-white/5 rounded-2xl p-4 mb-6 flex items-center justify-between cursor-pointer hover:border-yellow-400/50 dark:hover:border-yellow-400/30 transition-all shadow-2xs group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-400/10 dark:bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-xs group-hover:scale-105 transition-transform">
                      <span>DART</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold bg-yellow-400 text-black px-2 py-0.5 rounded uppercase shadow-2xs">
                          {activeOrder.status.replace(/_/g, "-")}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {activeOrder.trackingId || activeOrder.orderNumber}
                        </span>
                      </div>
                      <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                        {activeOrder.package?.name || "Active Delivery Package"}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        CTA {activeOrder.estimatedMinutes || 12}mins • {activeOrder.distanceKm || 1.2}km away
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-yellow-600 dark:text-yellow-400 hidden sm:inline">
                      Message
                    </span>
                    <ChevronRight className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ) : activeTab === "Updates" ? (
                <div className="bg-gray-50 dark:bg-white/5 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-6 text-center">
                  <Bell className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    No active delivery in transit
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    When you accept an order, live delivery tracking and customer chat will appear here.
                  </p>
                </div>
              ) : null}
            </>
          )}

          {/* Conversations section (Visible if activeTab is All or Conversation) */}
          {(activeTab === "All" || activeTab === "Conversation") && (
            <>
              <h2 className="text-sm font-semibold mb-4 text-gray-500 dark:text-gray-400">
                Conversations
              </h2>

              {filteredContacts.length > 0 ? (
                <div className="space-y-2">
                  {filteredContacts.map((contact) => {
                    const lastMsg = contact.lastMessage || "Start conversation..."
                    const isVoice = lastMsg.toLowerCase().includes("voice note")
                    const time = contact.lastMessageTime
                      ? typeof contact.lastMessageTime === "string" && !contact.lastMessageTime.includes("T")
                        ? contact.lastMessageTime
                        : timeAgo(contact.lastMessageTime as string)
                      : "Just now"
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
                              src={contact.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=ffcc00&color=000000`}
                              alt={contact.name}
                              className="w-full h-full object-cover"
                            />
                            {(contact.online ?? true) && (
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
                          <span className="text-xs text-gray-400">{time}</span>
                          {unread && (
                            <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-14 text-center text-gray-400 dark:text-gray-500 bg-gray-50/50 dark:bg-white/2 rounded-2xl p-8 border border-dashed border-gray-200 dark:border-white/10">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    No active conversations yet
                  </p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                    When you accept an order or receive customer messages, your conversation threads will appear here.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Supports Section (Visible when activeTab is Supports) */}
          {activeTab === "Supports" && (
            <div className="py-16 text-center text-gray-400 dark:text-gray-500">
              <Headphones className="w-10 h-10 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                No active fleet support conversations
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Dispatch and courier support lines are open 24/7
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Photo Preview Lightbox Modal */}
      {viewingImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setViewingImageUrl(null)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-3">
            <a
              href={viewingImageUrl}
              download="dart-attachment.jpg"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Download photo"
            >
              <Download className="w-5 h-5" />
            </a>
            <button
              type="button"
              onClick={() => setViewingImageUrl(null)}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <img
            src={viewingImageUrl}
            alt="Full preview"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
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
        .catch((error) => {
          console.error("Voice note playback failed:", error)
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
            console.error("Voice note audio could not be loaded.")
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

export default MessagesPage
