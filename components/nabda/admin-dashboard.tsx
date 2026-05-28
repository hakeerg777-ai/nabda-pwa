"use client"

import { useState, useEffect, useCallback } from "react"
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  where,
  getCountFromServer,
  onSnapshot,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore"
import { ref, get } from "firebase/database"
import { db, rtdb } from "@/lib/firebase"
import { BADGES, ROLE_CONFIG, canManageUser, hasPermission, getBadgeById } from "@/lib/constants"
import type { UserProfile, UserRole, UserBadge, Badge } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge as UIBadge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  ArrowRight,
  Search,
  Users,
  MessageCircle,
  Shield,
  Ban,
  Trash2,
  Edit2,
  Award,
  Plus,
  X,
  Loader2,
  RefreshCw,
  UserCheck,
  Activity,
  Crown,
} from "lucide-react"
import { UserAvatar } from "./avatar-upload"
import { BadgeDisplay, RoleBadge, UserBadges } from "./user-badges"

interface AdminDashboardProps {
  currentUser: UserProfile
  onBack: () => void
}

interface Stats {
  totalUsers: number
  totalMessages: number
  totalRooms: number
  onlineUsers: number
}

export function AdminDashboard({ currentUser, onBack }: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalMessages: 0,
    totalRooms: 0,
    onlineUsers: 0,
  })
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [badgeDialogOpen, setBadgeDialogOpen] = useState(false)
  const [banDialogOpen, setBanDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [banReason, setBanReason] = useState("")
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null)
  const [hasMore, setHasMore] = useState(true)

  const isOwner = currentUser.role === "owner"
  const isAdmin = currentUser.role === "admin" || isOwner

  // Load stats
  const loadStats = useCallback(async () => {
    if (!db) return
    try {
      // Total users
      const usersSnap = await getCountFromServer(collection(db, "users"))
      // Total messages (estimate from all rooms)
      const roomsSnap = await getCountFromServer(collection(db, "rooms"))
      // Online users from RTDB
      let onlineCount = 0
      if (rtdb) {
        const presenceRef = ref(rtdb, "presence")
        const presenceSnap = await get(presenceRef)
        if (presenceSnap.exists()) {
          const presence = presenceSnap.val()
          onlineCount = Object.values(presence).filter((p: any) => p.online).length
        }
      }

      setStats({
        totalUsers: usersSnap.data().count,
        totalMessages: 0, // Would need aggregation
        totalRooms: roomsSnap.data().count,
        onlineUsers: onlineCount,
      })
    } catch (error) {
      console.error("Error loading stats:", error)
    }
  }, [])

  // Load users
  const loadUsers = useCallback(async (reset = false) => {
    if (!db) return
    setLoading(true)
    try {
      let q = query(
        collection(db, "users"),
        orderBy("createdAt", "desc"),
        limit(20)
      )

      if (!reset && lastDoc) {
        q = query(
          collection(db, "users"),
          orderBy("createdAt", "desc"),
          startAfter(lastDoc),
          limit(20)
        )
      }

      const snap = await getDocs(q)
      const newUsers = snap.docs.map(d => d.data() as UserProfile)
      
      if (reset) {
        setUsers(newUsers)
        setFilteredUsers(newUsers)
      } else {
        setUsers(prev => [...prev, ...newUsers])
        setFilteredUsers(prev => [...prev, ...newUsers])
      }
      
      setLastDoc(snap.docs[snap.docs.length - 1] || null)
      setHasMore(snap.docs.length === 20)
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoading(false)
    }
  }, [lastDoc])

  // Search users
  const searchUsers = useCallback(async (query: string) => {
    if (!db || !query.trim()) {
      setFilteredUsers(users)
      return
    }

    const lowerQuery = query.toLowerCase()
    const filtered = users.filter(
      u =>
        u.username.toLowerCase().includes(lowerQuery) ||
        u.email.toLowerCase().includes(lowerQuery) ||
        u.uid.toLowerCase().includes(lowerQuery)
    )
    setFilteredUsers(filtered)

    // Also search in database if no local results
    if (filtered.length === 0) {
      try {
        const q = query(
          collection(db, "users"),
          where("username", ">=", query),
          where("username", "<=", query + "\uf8ff"),
          limit(10)
        )
        const snap = await getDocs(q as any)
        const searchResults = snap.docs.map(d => d.data() as UserProfile)
        setFilteredUsers(searchResults)
      } catch (error) {
        // Ignore search errors
      }
    }
  }, [users])

  useEffect(() => {
    loadUsers(true)
    loadStats()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchUsers(searchQuery)
      } else {
        setFilteredUsers(users)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, users])

  // Change user role
  const changeUserRole = async (user: UserProfile, newRole: UserRole) => {
    if (!db || !canManageUser(currentUser.role, user.role)) return
    if (user.isProtected && !isOwner) return

    setActionLoading(true)
    try {
      await updateDoc(doc(db, "users", user.uid), { role: newRole })
      
      // Update local state
      const updateUser = (u: UserProfile) =>
        u.uid === user.uid ? { ...u, role: newRole } : u
      setUsers(prev => prev.map(updateUser))
      setFilteredUsers(prev => prev.map(updateUser))
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...selectedUser, role: newRole })
      }
    } catch (error) {
      console.error("Error changing role:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Ban/Unban user
  const toggleBan = async (user: UserProfile, ban: boolean, reason?: string) => {
    if (!db || !canManageUser(currentUser.role, user.role)) return
    if (user.isProtected) return

    setActionLoading(true)
    try {
      const updates: Partial<UserProfile> = {
        isBanned: ban,
        ...(ban && {
          banReason: reason || "",
          bannedAt: new Date().toISOString(),
          bannedBy: currentUser.uid,
        }),
        ...(!ban && {
          banReason: "",
          bannedAt: "",
          bannedBy: "",
        }),
      }

      await updateDoc(doc(db, "users", user.uid), updates)
      
      const updateUser = (u: UserProfile) =>
        u.uid === user.uid ? { ...u, ...updates } : u
      setUsers(prev => prev.map(updateUser))
      setFilteredUsers(prev => prev.map(updateUser))
      setBanDialogOpen(false)
      setBanReason("")
    } catch (error) {
      console.error("Error toggling ban:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Delete user
  const deleteUser = async (user: UserProfile) => {
    if (!db || !canManageUser(currentUser.role, user.role)) return
    if (user.isProtected) return

    setActionLoading(true)
    try {
      await deleteDoc(doc(db, "users", user.uid))
      
      setUsers(prev => prev.filter(u => u.uid !== user.uid))
      setFilteredUsers(prev => prev.filter(u => u.uid !== user.uid))
      setDeleteDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error("Error deleting user:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Add badge to user
  const addBadge = async (user: UserProfile, badgeId: string, level: number = 1) => {
    if (!db || !hasPermission(currentUser.role, "moderator")) return

    setActionLoading(true)
    try {
      const existingBadges = user.badges || []
      const badgeIndex = existingBadges.findIndex(b => b.badgeId === badgeId)
      
      let newBadges: UserBadge[]
      if (badgeIndex >= 0) {
        // Update existing badge level
        newBadges = existingBadges.map((b, i) =>
          i === badgeIndex ? { ...b, level } : b
        )
      } else {
        // Add new badge
        newBadges = [
          ...existingBadges,
          {
            badgeId,
            grantedAt: new Date().toISOString(),
            grantedBy: currentUser.uid,
            level,
          },
        ]
      }

      await updateDoc(doc(db, "users", user.uid), { badges: newBadges })
      
      const updateUser = (u: UserProfile) =>
        u.uid === user.uid ? { ...u, badges: newBadges } : u
      setUsers(prev => prev.map(updateUser))
      setFilteredUsers(prev => prev.map(updateUser))
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...selectedUser, badges: newBadges })
      }
    } catch (error) {
      console.error("Error adding badge:", error)
    } finally {
      setActionLoading(false)
    }
  }

  // Remove badge from user
  const removeBadge = async (user: UserProfile, badgeId: string) => {
    if (!db || !hasPermission(currentUser.role, "moderator")) return

    setActionLoading(true)
    try {
      const newBadges = (user.badges || []).filter(b => b.badgeId !== badgeId)
      await updateDoc(doc(db, "users", user.uid), { badges: newBadges })
      
      const updateUser = (u: UserProfile) =>
        u.uid === user.uid ? { ...u, badges: newBadges } : u
      setUsers(prev => prev.map(updateUser))
      setFilteredUsers(prev => prev.map(updateUser))
      if (selectedUser?.uid === user.uid) {
        setSelectedUser({ ...selectedUser, badges: newBadges })
      }
    } catch (error) {
      console.error("Error removing badge:", error)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="text-primary">
            <ArrowRight className="w-6 h-6" />
          </Button>
          <h1 className="text-lg font-bold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            لوحة التحكم
          </h1>
          <Button variant="ghost" size="icon" onClick={() => { loadUsers(true); loadStats(); }}>
            <RefreshCw className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">المستخدمين</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-white/10">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.onlineUsers}</p>
              <p className="text-xs text-muted-foreground">متصل الآن</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن مستخدم (اسم، بريد، UID)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 bg-white/5 border-white/10"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="px-4">
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          المستخدمين ({filteredUsers.length})
        </h2>

        {loading && users.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <Card
                key={user.uid}
                className={cn(
                  "bg-card/50 border-white/10 cursor-pointer hover:bg-card/70 transition-colors",
                  user.isBanned && "border-destructive/30 bg-destructive/5",
                  user.isProtected && "border-yellow-500/30 bg-yellow-500/5"
                )}
                onClick={() => setSelectedUser(user)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <UserAvatar
                    emojiAvatar={user.avatar}
                    color={user.color}
                    photoURL={user.photoURL}
                    username={user.username}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold truncate">{user.username}</p>
                      <RoleBadge role={user.role || "user"} size="xs" />
                      {user.isProtected && (
                        <Crown className="w-4 h-4 text-yellow-500" />
                      )}
                      {user.isBanned && (
                        <UIBadge variant="destructive" className="text-[10px] px-1.5 py-0">
                          محظور
                        </UIBadge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    {user.badges && user.badges.length > 0 && (
                      <div className="mt-1">
                        <UserBadges badges={user.badges} maxDisplay={4} size="xs" showTooltip={false} />
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Lv.{user.level}
                  </div>
                </CardContent>
              </Card>
            ))}

            {hasMore && (
              <Button
                variant="outline"
                className="w-full border-white/10"
                onClick={() => loadUsers()}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                تحميل المزيد
              </Button>
            )}
          </div>
        )}
      </div>

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser && !editDialogOpen && !badgeDialogOpen && !banDialogOpen && !deleteDialogOpen} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="bg-card border-white/10 w-[calc(100vw-2rem)] max-w-md rounded-2xl max-h-[90vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    emojiAvatar={selectedUser.avatar}
                    color={selectedUser.color}
                    photoURL={selectedUser.photoURL}
                    username={selectedUser.username}
                    size="lg"
                  />
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedUser.username}
                      <RoleBadge role={selectedUser.role || "user"} size="sm" />
                    </DialogTitle>
                    <DialogDescription>{selectedUser.email}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* User Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">المستوى</p>
                    <p className="font-bold">{selectedUser.level}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">XP</p>
                    <p className="font-bold">{selectedUser.xp}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">العملات</p>
                    <p className="font-bold">{selectedUser.coins || 0}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-muted-foreground text-xs">الرسائل</p>
                    <p className="font-bold">{selectedUser.messagesSent}</p>
                  </div>
                </div>

                {/* Badges */}
                {selectedUser.badges && selectedUser.badges.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">الشارات</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.badges.map((ub) => {
                        const badge = getBadgeById(ub.badgeId)
                        if (!badge) return null
                        return (
                          <div key={ub.badgeId} className="relative group">
                            <BadgeDisplay badge={badge} level={ub.level} size="md" />
                            {canManageUser(currentUser.role, selectedUser.role) && !selectedUser.isProtected && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeBadge(selectedUser, ub.badgeId)
                                }}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Ban info */}
                {selectedUser.isBanned && (
                  <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                    <p className="text-sm font-medium text-destructive">محظور</p>
                    {selectedUser.banReason && (
                      <p className="text-xs text-muted-foreground mt-1">السبب: {selectedUser.banReason}</p>
                    )}
                  </div>
                )}

                {/* Actions */}
                {canManageUser(currentUser.role, selectedUser.role) && !selectedUser.isProtected && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">الإجراءات</p>
                    
                    {/* Role Change */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">الدور:</span>
                      <Select
                        value={selectedUser.role || "user"}
                        onValueChange={(value) => changeUserRole(selectedUser, value as UserRole)}
                        disabled={actionLoading}
                      >
                        <SelectTrigger className="w-32 bg-white/5 border-white/10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">مستخدم</SelectItem>
                          <SelectItem value="moderator">مشرف</SelectItem>
                          {isOwner && <SelectItem value="admin">مدير</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-primary/30 text-primary"
                        onClick={() => setBadgeDialogOpen(true)}
                      >
                        <Award className="w-4 h-4" />
                        إضافة شارة
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "gap-1",
                          selectedUser.isBanned
                            ? "border-green-500/30 text-green-500"
                            : "border-orange-500/30 text-orange-500"
                        )}
                        onClick={() => {
                          if (selectedUser.isBanned) {
                            toggleBan(selectedUser, false)
                          } else {
                            setBanDialogOpen(true)
                          }
                        }}
                      >
                        <Ban className="w-4 h-4" />
                        {selectedUser.isBanned ? "فك الحظر" : "حظر"}
                      </Button>

                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 border-destructive/30 text-destructive"
                          onClick={() => setDeleteDialogOpen(true)}
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {selectedUser.isProtected && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-center gap-2">
                    <Crown className="w-5 h-5 text-yellow-500" />
                    <p className="text-sm text-yellow-500">حساب محمي - لا يمكن تعديله</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Badge Dialog */}
      <Dialog open={badgeDialogOpen} onOpenChange={setBadgeDialogOpen}>
        <DialogContent className="bg-card border-white/10 w-[calc(100vw-2rem)] max-w-md rounded-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              إضافة شارة
            </DialogTitle>
            <DialogDescription>
              اختر شارة لإضافتها إلى {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-4">
            {BADGES.map((badge) => {
              const userHasBadge = selectedUser?.badges?.some(b => b.badgeId === badge.id)
              return (
                <Card
                  key={badge.id}
                  className={cn(
                    "bg-white/5 border-white/10 cursor-pointer hover:bg-white/10 transition-colors",
                    userHasBadge && "opacity-50"
                  )}
                  onClick={() => {
                    if (!userHasBadge && selectedUser) {
                      addBadge(selectedUser, badge.id)
                      setBadgeDialogOpen(false)
                    }
                  }}
                >
                  <CardContent className="p-3 flex flex-col items-center gap-2">
                    <BadgeDisplay badge={badge} size="lg" showTooltip={false} />
                    <p className="text-xs font-medium text-center" style={{ color: badge.color }}>
                      {badge.nameAr}
                    </p>
                    {userHasBadge && (
                      <UIBadge variant="secondary" className="text-[10px]">موجودة</UIBadge>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent className="bg-card border-white/10 w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-500">
              <Ban className="w-5 h-5" />
              حظر المستخدم
            </DialogTitle>
            <DialogDescription>
              سيتم حظر {selectedUser?.username} من استخدام التطبيق
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Input
              placeholder="سبب الحظر (اختياري)"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="bg-white/5 border-white/10"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setBanDialogOpen(false)}
              className="border-white/10"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && toggleBan(selectedUser, true, banReason)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              تأكيد الحظر
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-card border-white/10 w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              حذف المستخدم
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف حساب {selectedUser?.username}؟ هذا الإجراء لا يمكن التراجع عنه.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-white/10"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && deleteUser(selectedUser)}
              disabled={actionLoading}
            >
              {actionLoading && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
              تأكيد الحذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
