/**
 * DART.ng Customer API Data Models & Enums
 * Authoritative contracts matching the DART NestJS backend.
 */

export type UserRole = "CUSTOMER" | "RIDER" | "BUSINESS" | "ADMIN"

export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED"

export type VerificationType = "PHONE_OTP" | "EMAIL_OTP" | "PASSWORD_RESET"

export type PackageCategory = "DOCUMENT" | "PARCEL" | "FOOD" | "ELECTRONICS" | "CLOTHING" | "FRAGILE_ITEM" | "OTHER"

export type OrderStatus = "DRAFT" | "RIDER_REQUESTED" | "RIDER_SELECTED" | "PAYMENT_PENDING" | "PAYMENT_CONFIRMED" | "RIDER_ASSIGNED" | "RIDER_ACCEPTED" | "PICKUP_PENDING" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "CUSTOMER_CONFIRMED" | "SETTLED" | "CANCELLED" | "EXPIRED" | "FAILED" | "DISPUTED"

export type PaymentMethod = "WALLET" | "CARD" | "BANK_TRANSFER" | "CASH_ON_DELIVERY"

export interface User {
  id: string
  memberId?: string
  email?: string | null
  phoneNumber?: string | null
  firstName?: string | null
  lastName?: string | null
  gender?: string | null
  profileImageUrl?: string | null
  role: UserRole
  status: AccountStatus
  isPhoneVerified?: boolean
  isEmailVerified?: boolean
  isProfileComplete: boolean
  createdAt?: string
  updatedAt?: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  tokenType?: string
  expiresIn?: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
  message?: string
}

export interface OtpRequestPayload {
  identifier: string // phone number (+234...) or email
  type: VerificationType
  channel?: 'sms' | 'whatsapp'
  purpose?: 'login' | 'signup'
}

export interface OtpRequestResponse {
  success: boolean
  message: string
  devCode?: string // provided by backend in development mode
  whatsappUrl?: string
  channel?: 'sms' | 'whatsapp'
}

export interface OtpVerifyPayload {
  identifier: string
  code: string
  type: VerificationType
  purpose?: 'login' | 'signup'
  password?: string
}

export interface OtpVerifyResponse {
  success: boolean
  message: string
  user?: User
  tokens?: AuthTokens
}

export interface CustomerSignupPayload {
  email?: string
  phoneNumber?: string
  password?: string
}

export interface LoginPayload {
  identifier?: string
  email?: string
  phoneNumber?: string
  password?: string
  rememberMe?: boolean
}

export interface GoogleAuthPayload {
  tokenOrId: string
  email?: string
  firstName?: string
  lastName?: string
  profileImageUrl?: string
}

export interface CompleteProfilePayload {
  firstName: string
  lastName: string
  phoneNumber?: string
  email?: string
  profileImageUrl?: string
  gender?: string
}

export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  profileImageUrl?: string
  gender?: string
}

export interface OnboardingPayload {
  firstName: string
  lastName: string
  gender?: string
  profileImageUrl?: string
  phoneNumber?: string
  verifyNow?: boolean
}

export interface OnboardingResponse {
  message: string
  user: User
}

export interface Address {
  id: string
  userId?: string
  title?: string | null
  street: string
  city: string
  state: string
  postalCode?: string | null
  country?: string
  latitude: number
  longitude: number
  contactName?: string | null
  contactPhone?: string | null
  isDefault?: boolean
  createdAt?: string
}

export interface CreateAddressPayload {
  title?: string
  street: string
  city: string
  state: string
  postalCode?: string
  latitude: number
  longitude: number
  contactName?: string
  contactPhone?: string
  isDefault?: boolean
}

export interface PackageItem {
  id?: string
  name: string
  quantity?: number
  unitPrice?: number
}

export interface Package {
  id: string
  creatorId: string
  name: string
  description?: string | null
  category: PackageCategory
  weightKg: number
  isFragile: boolean
  isSensitive: boolean
  photoUrl?: string | null
  valueAmount?: number | null
  items?: PackageItem[]
  order?: Order
  createdAt: string
  updatedAt: string
}

export interface CreatePackagePayload {
  name: string
  description?: string
  category?: PackageCategory
  weightKg: number
  isFragile?: boolean
  isSensitive?: boolean
  photoUrl?: string
  valueAmount?: number
  items?: { name: string; quantity?: number; unitPrice?: number }[]
  pickupAddress: CreateAddressPayload
  destinationAddress: CreateAddressPayload
}

export interface DeliveryQuoteRequest {
  pickupLat: number
  pickupLng: number
  destLat: number
  destLng: number
  weightKg: number
  category?: PackageCategory
  isFragile?: boolean
}

export interface DeliveryQuoteResponse {
  basePrice: number
  distancePrice: number
  weightPrice: number
  surgePrice: number
  totalPrice: number
  platformFee: number
  riderSettlementFee: number
  distanceKm: number
  estimatedMinutes: number
  expiresAt: string
}

export interface Order {
  id: string
  orderNumber: string
  trackingId: string
  customerId: string
  riderId?: string | null
  packageId: string
  package?: Package
  pickupAddress: Address
  destinationAddress: Address
  status: OrderStatus
  paymentMethod: PaymentMethod
  basePrice: number | string
  distancePrice: number | string
  weightPrice: number | string
  surgePrice: number | string
  totalPrice: number | string
  platformFee: number | string
  distanceKm: number
  estimatedMinutes: number
  rider?: {
    id: string
    firstName?: string
    lastName?: string
    phoneNumber?: string
    profileImageUrl?: string
    riderProfile?: {
      averageRating: number
      totalDeliveries: number
      vehicleType: string
      plateNumber?: string
    }
  }
  deliveryEvents?: {
    id: string
    status: OrderStatus
    description: string
    createdAt: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface WalletAccount {
  id: string
  userId: string
  currency: string
  balance: number | string
  totalBalance?: number | string
  availableBalance?: number | string
  holdsBalance: number | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface LedgerTransaction {
  id: string
  reference: string
  type: string
  description: string
  amount: number | string
  currency: string
  createdAt: string
}

export interface AvailableRider {
  id: string
  userId: string
  vehicleType: string
  plateNumber?: string | null
  isVerified?: boolean
  averageRating: number
  totalDeliveries: number
  currentLat?: number | null
  currentLng?: number | null
  distanceKm?: number
  user: {
    id: string
    firstName?: string | null
    lastName?: string | null
    profileImageUrl?: string | null
    phoneNumber?: string | null
  }
  availability?: {
    status: string
  }
}

export interface TrackingTimelineResponse {
  trackingId: string
  orderNumber: string
  status: OrderStatus
  estimatedMinutes: number
  distanceKm: number
  category: PackageCategory
  pickupAddress: {
    city: string
    state: string
    street: string
  }
  destinationAddress: {
    city: string
    state: string
    street: string
  }
  events: {
    status: OrderStatus
    description: string
    timestamp: string
  }[]
  courier?: string
}

export interface ApiNotification {
  id: string
  userId: string
  title: string
  message: string
  type: string // "ORDER_UPDATE", "PAYMENT", "SYSTEM"
  data?: any
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: ApiNotification[]
  unreadCount: number
}

export interface VerificationStatusResponse {
  userId: string
  progressPercentage: number
  isEmailVerified: boolean
  isPhoneVerified: boolean
  isProfileComplete: boolean
  isNinVerified: boolean
  email: string
  phoneNumber: string
  identityProfile: {
    kycStatus: "NOT_SUBMITTED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED"
    ninMasked?: string | null
    idType?: string | null
    verifiedAt?: string | null
  }
  hasAddress: boolean
  addressCount: number
}

export interface SubmitNinPayload {
  nin: string
  idCardImage?: string
  idType?: string
}

export interface SubmitNinResponse {
  message: string
  verification: VerificationStatusResponse
}

export interface ApiChatContact {
  id: string
  userId?: string
  contactId?: string
  name: string
  avatar: string
  role: string
  rating: string
  online: boolean
  category: "Conversation" | "Updates" | "Supports"
  package?: {
    title: string
    trackingId: string
    icon: string
  }
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
}

export interface ApiChatMessage {
  id: string
  chatId: string
  clientMessageId?: string
  senderId?: string
  senderRole?: "user" | "other" | "rider" | "customer"
  sender?: "user" | "other"
  type: "text" | "audio" | "image" | "file"
  text?: string
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string
  time?: string
  reactions?: string[]
  isPinned?: boolean
  isEdited?: boolean
  createdAt?: string
}
export interface InboundPackage {
  id: string
  userId?: string
  trackingId: string
  title: string
  store?: string
  category: string
  courier: string
  shippedDate: string
  estimatedArrival: string
  fromLocation: string
  toLocation: string
  status: "In-Transit" | "Pending" | "Delivered" | "Ready for pickup" | "Cancelled"
  isArrived?: boolean
  arrivedDate?: string
  pickupTerminal?: string
  fragileNote?: string
  tracks?: any[]
  payUrl?: string
  createdAt?: string
  updatedAt?: string
}

export interface LinkInboundPackagePayload {
  trackingId: string
  title: string
  store?: string
  category?: string
  courier: string
  shippedDate?: string
  estimatedArrival?: string
  fromLocation?: string
  toLocation?: string
  status?: string
  isArrived?: boolean
  arrivedDate?: string
  pickupTerminal?: string
  fragileNote?: string
  tracks?: any[]
  payUrl?: string
}

export interface InboundTrackingResponse {
  success: boolean
  data: Array<{
    mailNo: string
    courier: string
    title: string
    category: string
    origin: string
    destination: string
    payUrl?: string
    tracks: Array<{
      actionName: string
      msgEng: string
      time: string
      location?: string
      scanSource?: string
    }>
  }>
}
