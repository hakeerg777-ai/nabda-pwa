"use client"

import { useState, useEffect } from "react"
import { doc, onSnapshot, collection, query, where, getDocs } from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import { useRooms } from "@/hooks/use-rooms"
import { getLevelInfo, ROLE_CONFIG, getBadgeById, formatRelative } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ArrowRight,
  Users,
  Crown,
  Shield,
  User,
  LogIn,
  LogOut,
  MessageCircle,
  Calendar,
  Loader2,
  Star,
} from "lucide-react"
import type { UserProfile, Room } from "@/lib/types"
import { UserAvatar } from "./avatar-upload"

interface RoomProfileProps {
  room: Room
  currentUser: UserProfile
  onBack: () => void
  onEnterChat: () => void
}

export function RoomProfile({ room, currentUser, onBack, onEnterChat }: RoomProfileProps) {
  const [members, setMembers] = useState<UserProfile[]>([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [joining, setJoining] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [roomData, setRoomData] = useState<Room>(room)

  const { joinRoom, leaveRoom, isMember } = useRooms(currentUser)

  const userIsMember = isMember(roomData.id)
  const isOwner = roomData.ownerId === currentUser.uid
  const isMainRoom = (roomData as any).isMain === true

  // Real-time listener for room data (member count, members array)
  useEffect(() => {
    if (!isFirebaseConfigured || !db) return

    const roomRef = doc(db, "rooms", room.id)
    const unsubscribe = onSnapshot(roomRef, async (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data()
        setRoomData({ id: snapshot.id, ...data } as Room)
        
        // Fetch member profiles when members array changes
        const memberIds = data.members || []
        if (memberIds.length === 0) {
          setMembers([])
          setLoadingMembers(false)
          return
        }

        // Firestore "in" query supports up to 30 items
        const chunks: string[][] = []
        for (let i = 0; i < memberIds.length; i += 30) {
          chunks.push(memberIds.slice(i, i + 30))
        }

        const results: UserProfile[] = []
        for (const chunk of chunks) {
          const q = query(collection(db, "users"), where("uid", "in", chunk))
          const snap = await getDocs(q)
          snap.docs.forEach((d) => results.push(d.data() as UserProfile))
        }

        // Sort: owner first, then admins, then by level
        results.sort((a, b) => {
          if (a.uid === data.ownerId) return -1
          if (b.uid === data.ownerId) return 1
          const roleOrder = { owner: 4, admin: 3, moderator: 2, user: 1 }
          const aRole = roleOrder[a.role as keyof typeof roleOrder] || 1
          const bRole = roleOrder[b.role as keyof typeof roleOrder] || 1
          if (aRole !== bRole) return bRole - aRole
          return b.level - a.level
        })

        setMembers(results)
        setLoadingMembers(false)
      }
    }, (error) => {
      console.error("[v0] Room profile listener error:", error)
      setLoadingMembers(false)
    })

    return () => unsubscribe()
  }, [room.id])

  const handleJoin = async () => {
    setJoining(true)
    await joinRoom(roomData.id)
    setJoining(false)
    // Enter chat after joining
    onEnterChat()
  }

  const handleLeave = async () => {
    if (isOwner && !isMainRoom) return // Can't leave if owner (except main room)
    setLeaving(true)
    await leaveRoom(roomData.id)
    setLeaving(false)
    onBack()
  }

  const getRoleIcon = (role: string, uid: string) => {
    if (uid === roomData.ownerId) {
      return <Crown className="w-4 h-4 text-amber-500" />
    }
    switch (role) {
      case "admin":
        return <Shield className="w-4 h-4 text-red-500" />
      case "moderator":
        return <Shield className="w-4 h-4 text-blue-500" />
      default:
        return <User className="w-4 h-4 text-muted-foreground" />
    }
  }

  const getRoleLabel = (role: string, uid: string) => {
    if (uid === roomData.ownerId) return "مالك الغرفة"
    return ROLE_CONFIG[role as keyof typeof ROLE_CONFIG]?.nameAr || "مستخدم"
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with room image */}
      <div
        className="relative px-4 pt-4 pb-6"
        style={{ background: `linear-gradient(135deg, ${roomData.color}30, ${roomData.color}10, transparent)` }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="absolute top-4 right-4 text-primary hover:bg-primary/10"
        >
          <ArrowRight className="w-6 h-6" />
        </Button>

        <div className="flex flex-col items-center pt-8">
          {/* Room Avatar */}
          <div
            className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl border-4 cursor-pointer hover:scale-105 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${roomData.color}50, ${roomData.color}20)`,
              borderColor: `${roomData.color}50`,
            }}
          >
            {roomData.icon}
          </div>

          {/* Room Name */}
          <h1 className="text-2xl font-bold mt-4 flex items-center gap-2">
            {roomData.name}
            {isMainRoom && <Star className="w-5 h-5 text-amber-500" />}
          </h1>

          {/* Room Description */}
          {roomData.description && (
            <p className="text-muted-foreground text-center mt-2 text-sm max-w-xs">
              {roomData.description}
            </p>
          )}

          {/* Room Stats */}
          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{roomData.memberCount}</span>
              <span className="text-muted-foreground">عضو</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-muted-foreground" />
            <div className="flex items-center gap-1.5 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {roomData.createdAt ? formatRelative(roomData.createdAt) : "جديدة"}
              </span>
            </div>
          </div>

          {/* Room Type Badge */}
          <div className="mt-3">
            {roomData.isPublic ? (
              <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                🌍 غرفة عامة
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30">
                🔒 غرفة خاصة
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-4 border-b border-white/10">
        <div className="flex gap-3">
          {userIsMember ? (
            <>
              <Button
                onClick={onEnterChat}
                className="flex-1 bg-gradient-to-l from-primary to-blue-500 gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                دخول الغرفة
              </Button>
              {!isOwner && (
                <Button
                  onClick={handleLeave}
                  disabled={leaving}
                  variant="outline"
                  className="bg-destructive/20 hover:bg-destructive/30 text-destructive border-destructive/30"
                >
                  {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                </Button>
              )}
            </>
          ) : (
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="flex-1 bg-gradient-to-l from-primary to-blue-500 gap-2"
            >
              {joining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {joining ? "جاري الانضمام..." : "انضمام للغرفة"}
            </Button>
          )}
        </div>
      </div>

      {/* Members List - Real-time */}
      <div className="flex-1 px-4 py-4">
        <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <span>الأعضاء ({members.length})</span>
        </h2>

        {loadingMembers ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">لا يوجد أعضاء بعد</p>
            <p className="text-xs mt-1">كن أول من ينضم!</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-420px)]">
            <div className="space-y-3 pb-20">
              {members.map((member) => {
                const levelInfo = getLevelInfo(member.xp)
                const isRoomOwner = member.uid === roomData.ownerId

                return (
                  <Card
                    key={member.uid}
                    className={`bg-card/50 border-white/10 ${
                      isRoomOwner ? "border-amber-500/30 bg-amber-500/5" : ""
                    }`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <UserAvatar
                        emojiAvatar={member.avatar}
                        color={member.color}
                        photoURL={member.photoURL}
                        username={member.username}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold truncate">{member.username}</span>
                          {getRoleIcon(member.role, member.uid)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {levelInfo.current.icon} Lv.{levelInfo.current.level}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {getRoleLabel(member.role, member.uid)}
                          </span>
                        </div>
                        {/* User Badges */}
                        {member.badges && member.badges.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {member.badges.slice(0, 3).map((userBadge, idx) => {
                              const badge = getBadgeById(userBadge.badgeId)
                              if (!badge) return null
                              return (
                                <span
                                  key={idx}
                                  className="text-xs px-1.5 py-0.5 rounded-full"
                                  style={{
                                    background: badge.bgColor,
                                    color: "white",
                                  }}
                                >
                                  {badge.icon}
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                      {isRoomOwner && (
                        <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">
                          <Crown className="w-3 h-3 ml-1" />
                          مالك
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
