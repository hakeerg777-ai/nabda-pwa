import type { FieldValue, Timestamp } from "firebase/firestore"

// ==================== ROLES ====================
export type UserRole = "user" | "moderator" | "admin" | "owner"

// Role hierarchy: owner > admin > moderator > user
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  user: 0,
  moderator: 1,
  admin: 2,
  owner: 3,
}

// ==================== BADGES ====================
export interface Badge {
  id: string
  name: string
  nameAr: string
  icon: string
  description: string
  descriptionAr: string
  category: "admin" | "activity" | "achievement" | "special"
  rarity: "common" | "rare" | "epic" | "legendary"
  color: string
  bgColor: string
  level?: number // Badge level (1-5)
}

export interface UserBadge {
  badgeId: string
  grantedAt: string
  grantedBy?: string // UID of admin who granted the badge
  level: number // Badge level (1-5)
}

// ==================== USER ====================
export interface UserProfile {
  uid: string
  username: string
  email: string
  avatar: string       // emoji character (fallback)
  photoURL?: string    // رابط صورة البروفايل الحقيقية (ImgBB) — اختياري
  color: string        // hex color
  bio: string
  level: number
  xp: number
  coins: number        // User currency
  messagesSent: number
  friends: string[]    // array of uids
  badges: UserBadge[]  // Array of user badges with metadata
  joinDate: string
  dailyLogin: string
  createdAt: Timestamp | FieldValue | string
  // Role system
  role: UserRole
  // Protection flags (only for owner)
  isProtected?: boolean  // Cannot be deleted/banned/modified
  isBanned?: boolean
  banReason?: string
  bannedAt?: string
  bannedBy?: string
}

// ==================== ROOM ====================
export interface Room {
  id: string
  name: string
  description: string
  icon: string
  ownerId: string
  ownerName: string
  color: string
  isPublic: boolean
  memberCount: number
  members: string[]       // array of UIDs — required for Firestore queries & rules
  lastMessage?: string
  lastMessageAt?: Timestamp | null
  createdAt: Timestamp | FieldValue
}

// ==================== MESSAGE ====================
export interface Message {
  id: string
  roomId: string
  senderId: string
  senderName: string
  senderAvatar: string
  senderPhotoURL?: string  // رابط صورة المُرسِل الحقيقية (اختياري)
  senderColor: string
  text: string
  createdAt: Timestamp | null
}

// ==================== PRESENCE ====================
export interface PresenceData {
  online: boolean
  lastSeen: number  // Unix timestamp
  username?: string
}

// ==================== PAGINATION ====================
export interface MessagePage {
  messages: Message[]
  hasMore: boolean
  oldestDoc: any  // Firestore DocumentSnapshot for pagination cursor
}
