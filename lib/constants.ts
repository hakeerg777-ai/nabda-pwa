import type { Badge, UserRole } from "./types"

export const AVATARS = [
  "😎", "🦁", "🐯", "🦊", "🐼", "🦋", "🌟", "🎭",
  "🦄", "🐉", "🌈", "⚡", "🎯", "🔮", "🎸",
]

export const COLORS = [
  "#a855f7", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
]

export const ROOM_ICONS = [
  "🎮", "🎵", "🎨", "📚", "💪", "🍕",
  "🌍", "⚽", "🎬", "🎯", "🌸", "🔮",
]

export const LEVELS = [
  { level: 1, xp: 0,     title: "مبتدئ",  icon: "🌱" },
  { level: 2, xp: 100,   title: "ناشئ",    icon: "🌿" },
  { level: 3, xp: 250,   title: "متطور",   icon: "🍀" },
  { level: 4, xp: 500,   title: "متمرس",   icon: "⚡" },
  { level: 5, xp: 1000,  title: "خبير",    icon: "🔥" },
  { level: 6, xp: 2000,  title: "أسطورة",  icon: "💎" },
  { level: 7, xp: 4000,  title: "بطل",     icon: "🏆" },
  { level: 8, xp: 8000,  title: "ملك",     icon: "👑" },
]

// ==================== BADGES SYSTEM ====================
export const BADGES: Badge[] = [
  // Admin Badges
  {
    id: "owner",
    name: "Owner",
    nameAr: "المالك",
    icon: "👑",
    description: "The supreme owner of the application",
    descriptionAr: "المالك الأعلى للتطبيق",
    category: "admin",
    rarity: "legendary",
    color: "#FFD700",
    bgColor: "linear-gradient(135deg, #FFD700, #FFA500)",
  },
  {
    id: "admin",
    name: "Admin",
    nameAr: "مدير",
    icon: "🛡️",
    description: "System administrator with full control",
    descriptionAr: "مدير النظام مع صلاحيات كاملة",
    category: "admin",
    rarity: "legendary",
    color: "#EF4444",
    bgColor: "linear-gradient(135deg, #EF4444, #DC2626)",
  },
  {
    id: "moderator",
    name: "Moderator",
    nameAr: "مشرف",
    icon: "🔧",
    description: "Community moderator",
    descriptionAr: "مشرف المجتمع",
    category: "admin",
    rarity: "epic",
    color: "#3B82F6",
    bgColor: "linear-gradient(135deg, #3B82F6, #2563EB)",
  },
  // Activity Badges
  {
    id: "active_user",
    name: "Active User",
    nameAr: "مستخدم نشط",
    icon: "🔥",
    description: "Consistently active in the community",
    descriptionAr: "نشط باستمرار في المجتمع",
    category: "activity",
    rarity: "common",
    color: "#F59E0B",
    bgColor: "linear-gradient(135deg, #F59E0B, #D97706)",
  },
  {
    id: "top_user",
    name: "Top User",
    nameAr: "مستخدم متميز",
    icon: "⭐",
    description: "One of the top contributors",
    descriptionAr: "أحد أفضل المساهمين",
    category: "activity",
    rarity: "rare",
    color: "#FBBF24",
    bgColor: "linear-gradient(135deg, #FBBF24, #F59E0B)",
  },
  {
    id: "chat_master",
    name: "Chat Master",
    nameAr: "سيد الدردشة",
    icon: "💬",
    description: "Sent over 1000 messages",
    descriptionAr: "أرسل أكثر من 1000 رسالة",
    category: "activity",
    rarity: "rare",
    color: "#10B981",
    bgColor: "linear-gradient(135deg, #10B981, #059669)",
  },
  // Achievement Badges
  {
    id: "vip",
    name: "VIP",
    nameAr: "VIP",
    icon: "🏆",
    description: "Very Important Person status",
    descriptionAr: "شخص مهم جداً",
    category: "achievement",
    rarity: "epic",
    color: "#A855F7",
    bgColor: "linear-gradient(135deg, #A855F7, #9333EA)",
  },
  {
    id: "verified",
    name: "Verified",
    nameAr: "موثق",
    icon: "🎖️",
    description: "Verified account",
    descriptionAr: "حساب موثق",
    category: "achievement",
    rarity: "rare",
    color: "#06B6D4",
    bgColor: "linear-gradient(135deg, #06B6D4, #0891B2)",
  },
  {
    id: "premium",
    name: "Premium",
    nameAr: "مميز",
    icon: "💎",
    description: "Premium membership",
    descriptionAr: "عضوية مميزة",
    category: "achievement",
    rarity: "epic",
    color: "#EC4899",
    bgColor: "linear-gradient(135deg, #EC4899, #DB2777)",
  },
  {
    id: "early_user",
    name: "Early User",
    nameAr: "مستخدم مبكر",
    icon: "🚀",
    description: "Joined in the early days",
    descriptionAr: "انضم في الأيام الأولى",
    category: "special",
    rarity: "rare",
    color: "#8B5CF6",
    bgColor: "linear-gradient(135deg, #8B5CF6, #7C3AED)",
  },
]

// Get badge by ID
export function getBadgeById(id: string): Badge | undefined {
  return BADGES.find(b => b.id === id)
}

// Get badges by category
export function getBadgesByCategory(category: Badge["category"]): Badge[] {
  return BADGES.filter(b => b.category === category)
}

// ==================== ROLE SYSTEM ====================
export const ROLE_CONFIG: Record<UserRole, { name: string; nameAr: string; color: string; icon: string }> = {
  user: { name: "User", nameAr: "مستخدم", color: "#6B7280", icon: "👤" },
  moderator: { name: "Moderator", nameAr: "مشرف", color: "#3B82F6", icon: "🔧" },
  admin: { name: "Admin", nameAr: "مدير", color: "#EF4444", icon: "🛡️" },
  owner: { name: "Owner", nameAr: "المالك", color: "#FFD700", icon: "👑" },
}

// Owner configuration - Your account details
export const OWNER_CONFIG = {
  // Your Firebase UID
  uid: "pP3NVTKFILeu6qjZNpwLfMoiynJ3",
  // Your Email
  email: "hakeerg000@gmail.com",
}

// Check if user can manage another user based on role hierarchy
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    user: 0,
    moderator: 1,
    admin: 2,
    owner: 3,
  }
  return hierarchy[managerRole] > hierarchy[targetRole]
}

// Check if user has permission for an action
export function hasPermission(role: UserRole, requiredRole: UserRole): boolean {
  const hierarchy: Record<UserRole, number> = {
    user: 0,
    moderator: 1,
    admin: 2,
    owner: 3,
  }
  return hierarchy[role] >= hierarchy[requiredRole]
}

export function getLevelInfo(xp: number) {
  let current = LEVELS[0]
  let next = LEVELS[1]
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i]
      next = LEVELS[i + 1] || LEVELS[i]
      break
    }
  }
  const progress =
    next.xp > current.xp
      ? Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100)
      : 100
  return { current, next, progress }
}

export function formatTime(ts: any): string {
  if (!ts) return ""
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`
}

export function formatRelative(ts: any): string {
  if (!ts) return ""
  const d = ts?.toDate ? ts.toDate() : new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return "الآن"
  if (diff < 3600000) return `${Math.floor(diff / 60000)} د`
  if (diff < 86400000) return formatTime(ts)
  return d.toLocaleDateString("ar")
}
