"use client"

import { useState } from "react"
import { getLevelInfo, AVATARS, COLORS, getBadgeById, ROLE_CONFIG } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { Edit2, Save, X, LogOut, MessageCircle, Users, Home, Coins, Shield } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { AvatarUpload } from "./avatar-upload"
import { UserBadges, RoleBadge, BadgeDisplay } from "./user-badges"

interface ProfileTabProps {
  currentUser: UserProfile
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>
  onLogout: () => Promise<void>
  roomCount: number
}

export function ProfileTab({ currentUser, onUpdateProfile, onLogout, roomCount }: ProfileTabProps) {
  const [editing, setEditing] = useState(false)
  const [showAvatars, setShowAvatars] = useState(false)
  const [showAllBadges, setShowAllBadges] = useState(false)
  const [editForm, setEditForm] = useState({
    username: currentUser.username,
    bio: currentUser.bio,
    avatar: currentUser.avatar,
    color: currentUser.color,
  })
  const [saving, setSaving] = useState(false)

  const levelInfo = getLevelInfo(currentUser.xp)
  const roleConfig = ROLE_CONFIG[currentUser.role || "user"]

  const handleSave = async () => {
    setSaving(true)
    await onUpdateProfile({
      username: editForm.username,
      bio: editForm.bio,
      avatar: editForm.avatar,
      color: editForm.color,
    })
    setEditing(false)
    setSaving(false)
  }

  const stats = [
    { label: "الرسائل", value: currentUser.messagesSent, icon: MessageCircle },
    { label: "الأصدقاء", value: currentUser.friends.length, icon: Users },
    { label: "الغرف", value: roomCount, icon: Home },
    { label: "العملات", value: currentUser.coins || 0, icon: Coins },
  ]

  return (
    <div className="pb-4">
      {/* Profile Header */}
      <div className="px-5 py-6 bg-gradient-to-l from-primary/20 via-purple-500/10 to-transparent">
        <div className="flex items-start gap-4 mb-4">

          {/* صورة البروفايل */}
          <div className="flex flex-col items-center gap-1">
            <AvatarUpload
              userId={currentUser.uid}
              emojiAvatar={editing ? editForm.avatar : currentUser.avatar}
              color={editing ? editForm.color : currentUser.color}
              currentPhotoURL={currentUser.photoURL}
              disabled={!editing}
              size="md"
              onPhotoUploaded={(url) => {
                void url
              }}
            />
            {editing && (
              <button
                type="button"
                onClick={() => setShowAvatars(!showAvatars)}
                className="text-xs text-primary underline underline-offset-2 mt-1"
              >
                تغيير الـ emoji
              </button>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {editing ? (
              <Input
                value={editForm.username}
                onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                className="h-9 bg-white/5 border-white/20 mb-2 font-bold text-lg"
              />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{currentUser.username}</h2>
                <RoleBadge role={currentUser.role || "user"} size="sm" />
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {levelInfo.current.icon} {levelInfo.current.title} · مستوى {levelInfo.current.level}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              انضم: {new Date(currentUser.joinDate).toLocaleDateString("ar")}
            </p>
            
            {/* Display badges inline */}
            {currentUser.badges && currentUser.badges.length > 0 && (
              <div className="mt-2">
                <UserBadges 
                  badges={currentUser.badges} 
                  maxDisplay={5} 
                  size="sm" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Avatar/Color picker */}
        {editing && showAvatars && (
          <div className="mb-4 p-3 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground mb-2">اختر emoji للبروفايل:</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => { setEditForm({ ...editForm, avatar: a }); setShowAvatars(false) }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all",
                    editForm.avatar === a ? "bg-primary/30 border-2 border-primary scale-110" : "bg-white/5 border-2 border-transparent"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mb-2">اختر لوناً:</p>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setEditForm({ ...editForm, color: c })}
                  className={cn("w-7 h-7 rounded-full border-2 transition-all", editForm.color === c ? "border-white scale-125" : "border-transparent")}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {editing ? (
          <Input
            placeholder="اكتب شيئاً عن نفسك..."
            value={editForm.bio}
            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
            className="bg-white/5 border-white/20 mb-3"
          />
        ) : currentUser.bio ? (
          <p className="text-sm text-muted-foreground mb-3">{currentUser.bio}</p>
        ) : null}

        {/* Edit buttons */}
        {editing ? (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm" className="gap-1 bg-primary/20 text-primary border border-primary/30" variant="outline">
              <Save className="w-4 h-4" />{saving ? "جاري الحفظ..." : "حفظ"}
            </Button>
            <Button onClick={() => setEditing(false)} size="sm" variant="outline" className="gap-1 border-white/10">
              <X className="w-4 h-4" />إلغاء
            </Button>
          </div>
        ) : (
          <Button onClick={() => setEditing(true)} size="sm" variant="outline" className="gap-1 border-white/10 text-muted-foreground">
            <Edit2 className="w-4 h-4" />تعديل الملف
          </Button>
        )}
      </div>

      {/* XP Bar */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">التقدم للمستوى {levelInfo.next.level}</span>
          <span className="text-xs text-muted-foreground">{currentUser.xp} / {levelInfo.next.xp} XP</span>
        </div>
        <Progress value={levelInfo.progress} className="h-2" />
      </div>

      {/* Stats */}
      <div className="px-5 py-4 grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="bg-card/50 border-white/10">
            <CardContent className="p-3 text-center">
              <Icon className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badges Section */}
      {currentUser.badges && currentUser.badges.length > 0 && (
        <div className="px-5 py-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              الشارات ({currentUser.badges.length})
            </h3>
            {currentUser.badges.length > 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllBadges(!showAllBadges)}
                className="text-xs text-primary"
              >
                {showAllBadges ? "عرض أقل" : "عرض الكل"}
              </Button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(showAllBadges ? currentUser.badges : currentUser.badges.slice(0, 6)).map((userBadge) => {
              const badge = getBadgeById(userBadge.badgeId)
              if (!badge) return null
              return (
                <Card key={userBadge.badgeId} className="bg-card/50 border-white/10">
                  <CardContent className="p-3 flex flex-col items-center gap-2">
                    <BadgeDisplay
                      badge={badge}
                      level={userBadge.level}
                      size="lg"
                      animate={true}
                    />
                    <div className="text-center">
                      <p className="text-xs font-medium" style={{ color: badge.color }}>
                        {badge.nameAr}
                      </p>
                      {userBadge.level > 1 && (
                        <p className="text-[10px] text-muted-foreground">
                          المستوى {userBadge.level}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="px-5 mt-4">
        <Button
          onClick={onLogout}
          variant="outline"
          className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 gap-2"
        >
          <LogOut className="w-4 h-4" />
          تسجيل الخروج
        </Button>
      </div>
    </div>
  )
}
