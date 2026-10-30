/**
 * DART Rider API types — mirrors the NestJS/Prisma backend shapes.
 * Prisma Decimal fields arrive as strings, so money is typed `number | string`.
 */

export type Money = number | string

export type UserRole = "CUSTOMER" | "RIDER" | "BUSINESS" | "ADMIN"
export type AccountStatus = "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED" | "DEACTIVATED"
export type RiderStatus = "OFFLINE" | "ONLINE" | "BUSY" | "ON_DELIVERY"
export type VehicleType = "MOTORCYCLE" | "BICYCLE" | "CAR" | "VAN"
export type KycStatus = "NOT_SUBMITTED" | "PENDING_REVIEW" | "VERIFIED" | "REJECTED"

export type OrderStatus =
  | "DRAFT"
  | "RIDER_REQUESTED"
  | "RIDER_SELECTED"
  | "PAYMENT_PENDING"
  | "PAYMENT_CONFIRMED"
  | "RIDER_ASSIGNED"
  | "RIDER_ACCEPTED"
  | "PICKUP_PENDING"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CUSTOMER_CONFIRMED"
  | "SETTLED"
  | "CANCELLED"
  | "EXPIRED"
  | "FAILED"
  | "DISPUTED"

// ---------- Auth ----------

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn?: number | string
}

export interface RiderAvailability {
  id: string
  riderProfileId: string
  status: RiderStatus
  updatedAt: string
}

export interface RiderProfile {
  id: string
  userId: string
  vehicleType: VehicleType
  plateNumber?: string | null
  licenseNumber?: string | null
  isVerified: boolean
  averageRating: number
  totalDeliveries: number
  currentLat?: number | null
  currentLng?: number | null
  lastLocationAt?: string | null
  availability?: RiderAvailability | null
  user?: Partial<User>
  createdAt?: string
  updatedAt?: string
}

export interface User {
  id: string
  email?: string | null
  phoneNumber?: string | null
  firstName?: string | null
  lastName?: string | null
  role: UserRole
  status?: AccountStatus
  isProfileComplete?: boolean
  isPhoneVerified?: boolean
  isEmailVerified?: boolean
  profileImageUrl?: string | null
  gender?: string | null
  riderProfile?: RiderProfile | null
  createdAt?: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
  message?: string
}

export interface LoginPayload {
  identifier: string
  password: string
  rememberMe?: boolean
}

export interface RiderSignupPayload {
  email?: string
  phoneNumber?: string
  password: string
  fullName?: string
}

export interface GoogleAuthPayload {
  tokenOrId: string
  email?: string
  firstName?: string
  lastName?: string
  profileImageUrl?: string
}

// ---------- Users ----------

export interface UpdateUserPayload {
  firstName?: string
  lastName?: string
  phoneNumber?: string
  profileImageUrl?: string
  gender?: string
}

export interface CompleteProfilePayload {
  firstName: string
  lastName: string
  phoneNumber?: string
  email?: string
  profileImageUrl?: string
  gender?: string
}

export interface IdentityProfile {
  kycStatus: KycStatus
  ninMasked?: string | null
  idType?: string | null
  verifiedAt?: string | null
  rejectionReason?: string | null
}

export interface VerificationStatus {
  progress?: number
  isEmailVerified?: boolean
  isPhoneVerified?: boolean
  isProfileComplete?: boolean
  isNinVerified?: boolean
  hasAddress?: boolean
  identityProfile?: IdentityProfile | null
  [key: string]: unknown
}

export interface SubmitNinPayload {
  nin: string
  idType?: "NIN" | "VOTERS_CARD" | "DRIVERS_LICENSE" | "PASSPORT"
  idCardImage?: string
}

// ---------- Riders ----------

export interface UpdateRiderProfilePayload {
  vehicleType?: VehicleType
  plateNumber?: string
  licenseNumber?: string
}

// ---------- Orders ----------

export interface Address {
  id?: string
  title?: string | null
  street: string
  city: string
  state: string
  latitude?: number
  longitude?: number
  contactName?: string | null
  contactPhone?: string | null
}

export interface PackageInfo {
  id?: string
  name: string
  description?: string | null
  category: string
  weightKg: number
  isFragile: boolean
  isSensitive?: boolean
  photoUrl?: string | null
  valueAmount?: Money | null
  items?: { id: string; name: string; quantity: number }[]
}

export interface DeliveryEvent {
  id: string
  status: OrderStatus
  description: string
  actorId?: string | null
  createdAt: string
}

export interface Order {
  id: string
  orderNumber: string
  trackingId: string
  customerId: string
  riderId?: string | null
  status: OrderStatus
  paymentMethod?: string
  basePrice?: Money
  distancePrice?: Money
  weightPrice?: Money
  surgePrice?: Money
  totalPrice: Money
  platformFee?: Money
  riderSettlementFee?: Money
  distanceKm?: number
  estimatedMinutes?: number
  createdAt: string
  updatedAt?: string
  package?: PackageInfo
  pickupAddress?: Address
  destinationAddress?: Address
  customer?: { id: string; firstName?: string | null; lastName?: string | null; phoneNumber?: string | null }
  deliveryEvents?: DeliveryEvent[]
  handoverCode?: { id: string; isUsed: boolean; attempts: number; expiresAt: string } | null
  settlement?: { netAmount: Money; isSettled: boolean; settledAt?: string | null } | null
}

export interface PickupResponse {
  order: Order
  handoverCode?: string
}

export interface ConfirmDeliveryPayload {
  code: string
  latitude?: number
  longitude?: number
}

// ---------- Wallet ----------

export interface WalletAccount {
  id: string
  userId: string
  currency: string
  totalBalance: number
  balance: number
  holdsBalance: number
  availableBalance: number
  isActive: boolean
}

export interface LedgerEntry {
  id: string
  type: "DEBIT" | "CREDIT"
  amount: Money
  balanceBefore?: Money
  balanceAfter?: Money
  description?: string
  createdAt: string
  transaction?: {
    reference?: string
    transactionNumber?: string
    type: string
    description: string
    orderId?: string | null
  }
}

export interface WithdrawPayload {
  amount: number
  bankCode: string
  bankName?: string
  accountNumber: string
  accountName: string
  idempotencyKey?: string
}

// ---------- Notifications ----------

export interface AppNotification {
  id: string
  title: string
  message: string
  type: string
  data?: any
  isRead: boolean
  createdAt: string
}

export interface NotificationsResponse {
  notifications: AppNotification[]
  unreadCount: number
}

// ---------- Chat ----------

export interface ChatContact {
  id: string
  contactId?: string
  name: string
  avatar?: string
  role: string
  rating?: string
  online?: boolean
  category: string
  package?: { title: string; trackingId: string; icon?: string }
  lastMessage?: string
  lastMessageTime?: string
  unreadCount?: number
}

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  senderRole: "user" | "other"
  type: "text" | "audio" | "image" | "file"
  text?: string
  audioUrl?: string
  audioDuration?: number
  imageUrl?: string
  fileName?: string
  fileSize?: number
  fileUrl?: string
  reactions?: string[]
  isPinned?: boolean
  isEdited?: boolean
  createdAt: string
}

// ---------- Ratings ----------

export interface Rating {
  id: string
  score: number
  review?: string | null
  tags?: string[]
  createdAt: string
  rater?: { firstName?: string | null; profileImageUrl?: string | null }
}

// ---------- Support ----------

export interface SupportTicket {
  id: string
  ticketNumber: string
  category: string
  subject?: string | null
  description: string
  status: string
  priority: string
  orderId?: string | null
  createdAt: string
}

export interface CreateTicketPayload {
  category: string
  description: string
  subject?: string
  orderId?: string
}

// ---------- Tracking ----------

export interface TrackingInfo {
  trackingId: string
  status: OrderStatus
  events?: DeliveryEvent[]
  [key: string]: unknown
}
