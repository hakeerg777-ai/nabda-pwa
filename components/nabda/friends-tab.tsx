"use client"

import { useState, useEffect } from "react"
import { useFriends } from "@/hooks/use-friends"
import { getLevelInfo } from "@/lib/constants"
import { PrivateChat } from "./private-chat"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { MessageCircle, X, UserPlus, Check, Loader2, Search } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { UserAvatar } from "./avatar-upload"

interface FriendsTabProps {
  currentUser: UserProfile
  updateProfile: (u: Partial<UserProfile>) => Promise<void>
}

interface ActiveChat {
  chatId: string
  otherUser: UserProfile
}

export function FriendsTab({ currentUser, updateProfile }: FriendsTabProps) {
  const [search, setSearch] = useState("")
  const [friends, setFriends] = useState<UserProfile[]>([])
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null)
  const [loadingDM, setLoadingDM] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)

  const { searchResults, searching, searchUsers, addFriend, removeFriend, getFriendProfiles, getOrCreateDM } =
    useFriends(currentUser, updateProfile)

  // Load friend profiles on mount / when friends list changes
  useEffect(() => {
    getFriendProfiles().then(setFriends)
  }, [currentUser.friends.join(","), getFriendProfiles])

  const handleSearch = (value: string) => {
    setSearch(value)
    searchUsers(value)
  }

  const handleAdd = async (uid: string) => {
    setAdding(uid)
    await addFriend(uid)
    // Refresh friends list
    const updatedFriends = await getFriendProfiles()
    setFriends(updatedFriends)
    setAdding(null)
  }

  const handleOpenDM = async (friend: UserProfile) => {
    setLoadingDM(friend.uid)
    const chatId = await getOrCreateDM(friend.uid)
    if (chatId) {
      setActiveChat({ chatId, otherUser: friend })
    }
    setLoadingDM(null)
  }

  const handleStartChatFromSearch = async (user: UserProfile) => {
    // First add as friend if not already
    if (!currentUser.friends.includes(user.uid)) {
      await addFriend(user.uid)
    }
    // Then open DM
    await handleOpenDM(user)
    setSearch("")
  }

  if (activeChat) {
    return (
      <PrivateChat
        chatId={activeChat.chatId}
        otherUser={activeChat.otherUser}
        currentUser={currentUser}
        onBack={() => setActiveChat(null)}
      />
    )
  }

  return (
    <div className="p-4 pt-6 pb-20">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <span>👥</span><span>الأصدقاء والرسائل</span>
      </h1>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث عن مستخدم بالاسم..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="pr-10 bg-white/5 border-white/10 focus:border-primary/50"
        />
      </div>

      {/* Search Results */}
      {search.length > 1 && (
        <div className="mb-6">
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            <span>🔍</span><span>نتائج البحث</span>
          </h2>
          {searching ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : searchResults.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">لا توجد نتائج</p>
          ) : (
            <div className="space-y-3">
              {searchResults.map((user) => {
                const levelInfo = getLevelInfo(user.xp)
                const isFriend = currentUser.friends.includes(user.uid)
                return (
                  <Card key={user.uid} className="bg-card/50 border-white/10">
                    <CardContent className="p-4 flex items-center gap-3">
                      <UserAvatar
                        emojiAvatar={user.avatar}
                        color={user.color}
                        photoURL={user.photoURL}
                        username={user.username}
                        size="md"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold">{user.username}</p>
                        <p className="text-xs text-muted-foreground">
                          {levelInfo.current.icon} {levelInfo.current.title}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {/* Start Chat Button */}
                        <Button
                          size="sm"
                          onClick={() => handleStartChatFromSearch(user)}
                          disabled={loadingDM === user.uid}
                          className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 border border-indigo-500/30 gap-1"
                          variant="outline"
                        >
                          {loadingDM === user.uid ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <MessageCircle className="w-4 h-4" />
                          )}
                          محادثة
                        </Button>
                        {!isFriend && (
                          <Button
                            size="sm"
                            onClick={() => handleAdd(user.uid)}
                            disabled={adding === user.uid}
                            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 gap-1"
                            variant="outline"
                          >
                            {adding === user.uid ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                          </Button>
                        )}
                        {isFriend && (
                          <div className="flex items-center gap-1 text-xs text-emerald-500 px-2">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Friends List */}
      <h2 className="text-base font-bold mb-3 flex items-center gap-2">
        <span>💛</span><span>أصدقائي ({friends.length})</span>
      </h2>

      {friends.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <p className="text-4xl mb-2">👥</p>
          <p className="text-sm">لا أصدقاء بعد</p>
          <p className="text-xs mt-1">ابحث عن أشخاص وابدأ محادثة!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => {
            const levelInfo = getLevelInfo(friend.xp)
            return (
              <Card key={friend.uid} className="bg-card/50 border-white/10">
                <CardContent className="p-4 flex items-center gap-3">
                  <UserAvatar
                    emojiAvatar={friend.avatar}
                    color={friend.color}
                    photoURL={friend.photoURL}
                    username={friend.username}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold">{friend.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {levelInfo.current.icon} {levelInfo.current.title}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDM(friend)}
                      disabled={loadingDM === friend.uid}
                      className="w-9 h-9 text-primary hover:bg-primary/10"
                    >
                      {loadingDM === friend.uid
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <MessageCircle className="w-4 h-4" />
                      }
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeFriend(friend.uid)}
                      className="w-9 h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
