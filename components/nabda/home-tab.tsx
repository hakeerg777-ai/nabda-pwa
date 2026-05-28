"use client"

import { useState, useEffect } from "react"
import { useRooms, MAIN_ROOM_ID } from "@/hooks/use-rooms"
import { ROOM_ICONS } from "@/lib/constants"
import { formatRelative } from "@/lib/constants"
import { RoomChat } from "./room-chat"
import { RoomProfile } from "./room-profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Plus, Users, Loader2, Star, Crown, LogIn } from "lucide-react"
import type { UserProfile, Room } from "@/lib/types"
import { UserAvatar } from "./avatar-upload"

interface HomeTabProps {
  currentUser: UserProfile
  onRoomCountChange?: (count: number) => void
  onRoomStateChange?: (isInRoom: boolean) => void
}

export function HomeTab({ currentUser, onRoomCountChange, onRoomStateChange }: HomeTabProps) {
  const [activeRoom, setActiveRoom] = useState<Room | null>(null)
  const [viewingRoomProfile, setViewingRoomProfile] = useState<Room | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newRoom, setNewRoom] = useState({ name: "", desc: "", icon: "🎮" })
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)

  const { 
    allPublicRooms, 
    myRooms, 
    loading, 
    createRoom, 
    joinRoom,
    isMember 
  } = useRooms(currentUser)

  // Notify parent of room count
  useEffect(() => {
    onRoomCountChange?.(myRooms.length)
  }, [myRooms.length, onRoomCountChange])

  // Notify parent when entering/exiting a room
  useEffect(() => {
    const isInRoom = activeRoom !== null
    onRoomStateChange?.(isInRoom)
  }, [activeRoom, onRoomStateChange])

  const handleCreate = async () => {
    if (!newRoom.name.trim()) return
    setCreating(true)
    const room = await createRoom(newRoom.name, newRoom.desc, newRoom.icon)
    if (room) {
      setShowCreate(false)
      setNewRoom({ name: "", desc: "", icon: "🎮" })
      setActiveRoom(room)
    }
    setCreating(false)
  }

  const handleJoinAndEnter = async (room: Room) => {
    setJoining(room.id)
    await joinRoom(room.id)
    setActiveRoom({ ...room, memberCount: room.memberCount + 1 })
    setJoining(null)
  }

  const handleOpenRoom = (room: Room) => {
    // If user is a member, open the chat directly
    if (isMember(room.id)) {
      setActiveRoom(room)
    } else {
      // If not a member, show room profile first
      setViewingRoomProfile(room)
    }
  }

  const handleRoomHeaderClick = (room: Room) => {
    // When clicking on room name/avatar in chat, show profile
    setViewingRoomProfile(room)
  }

  // Get main room (always first)
  const mainRoom = allPublicRooms.find(r => r.id === MAIN_ROOM_ID)
  const otherRooms = allPublicRooms.filter(r => r.id !== MAIN_ROOM_ID)

  if (activeRoom) {
    return (
      <RoomChat 
        room={activeRoom} 
        currentUser={currentUser} 
        onBack={() => setActiveRoom(null)}
        onRoomHeaderClick={() => handleRoomHeaderClick(activeRoom)}
      />
    )
  }

  if (viewingRoomProfile) {
    return (
      <RoomProfile
        room={viewingRoomProfile}
        currentUser={currentUser}
        onBack={() => setViewingRoomProfile(null)}
        onEnterChat={() => {
          setActiveRoom(viewingRoomProfile)
          setViewingRoomProfile(null)
        }}
      />
    )
  }

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-5 py-4 bg-gradient-to-l from-primary/15 via-purple-500/10 to-transparent border-b border-white/5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>✨</span><span>نبضة</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date().toLocaleDateString("ar-SA", { weekday: "long", month: "long", day: "numeric" })}
            </p>
          </div>
          <UserAvatar
            emojiAvatar={currentUser.avatar}
            color={currentUser.color}
            photoURL={currentUser.photoURL}
            username={currentUser.username}
            size="md"
          />
        </div>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Main Room - Always First */}
            {mainRoom && (
              <div className="mb-6">
                <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span>الغرفة الرئيسية</span>
                </h2>
                <Card
                  className="cursor-pointer hover:scale-[1.01] transition-transform bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-transparent border-amber-500/30 overflow-hidden"
                  onClick={() => handleOpenRoom(mainRoom)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 bg-gradient-to-br from-amber-500/40 to-purple-500/30 border-2 border-amber-500/30"
                    >
                      {mainRoom.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base flex items-center gap-1.5">
                        {mainRoom.name}
                        <Crown className="w-4 h-4 text-amber-500" />
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {mainRoom.description || "غرفة نبضة الرئيسية"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {mainRoom.memberCount} عضو
                      </p>
                    </div>
                    {!isMember(mainRoom.id) && (
                      <Badge variant="outline" className="bg-primary/20 text-primary border-primary/30">
                        <LogIn className="w-3 h-3 ml-1" />
                        انضم
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* My Joined Rooms */}
            {myRooms.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span>🏠</span><span>غرفي ({myRooms.length})</span>
                  </h2>
                </div>
                <div className="space-y-3">
                  {myRooms.filter(r => r.id !== MAIN_ROOM_ID).map((room) => (
                    <Card
                      key={room.id}
                      className="cursor-pointer hover:scale-[1.02] transition-transform bg-card/50 border-white/10 overflow-hidden"
                      onClick={() => setActiveRoom(room)}
                      style={{ borderColor: `${room.color}30`, background: `linear-gradient(135deg, ${room.color}10, transparent)` }}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${room.color}40, ${room.color}15)` }}
                        >
                          {room.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base flex items-center gap-1.5">
                            {room.name}
                            {!room.isPublic && (
                              <span className="text-[10px] font-medium bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full border border-indigo-500/30">
                                💬 خاص
                              </span>
                            )}
                          </p>
                          {room.lastMessage && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {room.lastMessage}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {room.memberCount}
                            {room.lastMessageAt && (
                              <span className="mr-2">{formatRelative(room.lastMessageAt)}</span>
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* All Public Rooms */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>🌍</span><span>جميع الغرف ({otherRooms.length})</span>
                </h2>
                <Button
                  size="sm"
                  onClick={() => setShowCreate(true)}
                  className="h-8 gap-1 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                  غرفة جديدة
                </Button>
              </div>

              {otherRooms.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-4xl mb-2">🌍</p>
                  <p className="text-sm">لا توجد غرف حتى الآن</p>
                  <p className="text-xs mt-1">كن أول من ينشئ غرفة!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {otherRooms.map((room) => {
                    const userIsMember = isMember(room.id)
                    return (
                      <Card
                        key={room.id}
                        className="cursor-pointer hover:scale-[1.02] transition-transform bg-card/50 border-white/10"
                        onClick={() => handleOpenRoom(room)}
                      >
                        <CardContent className="p-4 flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ background: `linear-gradient(135deg, ${room.color}40, ${room.color}15)` }}
                          >
                            {room.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold">{room.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{room.description}</p>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Users className="w-3 h-3" />{room.memberCount} عضو
                            </p>
                          </div>
                          {userIsMember ? (
                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              منضم
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleJoinAndEnter(room)
                              }}
                              disabled={joining === room.id}
                              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 flex-shrink-0"
                              variant="outline"
                            >
                              {joining === room.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "انضم"}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Room Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-white/10 w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>إنشاء غرفة جديدة</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>اسم الغرفة</Label>
              <Input
                placeholder="مثل: غرفة الألعاب"
                value={newRoom.name}
                onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>الوصف (اختياري)</Label>
              <Input
                placeholder="وصف قصير للغرفة"
                value={newRoom.desc}
                onChange={(e) => setNewRoom({ ...newRoom, desc: e.target.value })}
                className="bg-white/5 border-white/10"
              />
            </div>
            <div className="space-y-2">
              <Label>أيقونة الغرفة</Label>
              <div className="flex flex-wrap gap-2">
                {ROOM_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewRoom({ ...newRoom, icon })}
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all",
                      newRoom.icon === icon
                        ? "bg-primary/30 border-2 border-primary scale-110"
                        : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                    )}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={!newRoom.name.trim() || creating}
              className="w-full bg-gradient-to-l from-primary to-blue-500"
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
              {creating ? "جاري الإنشاء..." : "إنشاء الغرفة 🏠"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
