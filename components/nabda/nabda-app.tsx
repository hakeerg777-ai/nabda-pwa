"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { usePresence } from "@/hooks/use-presence"
import { hasPermission } from "@/lib/constants"
import { SplashScreen } from "./splash-screen"
import { AuthScreen } from "./auth-screen"
import { HomeTab } from "./home-tab"
import { FriendsTab } from "./friends-tab"
import { ProfileTab } from "./profile-tab"
import { AdminDashboard } from "./admin-dashboard"
import { BottomNav } from "./bottom-nav"
import { PWAInstallBanner } from "./pwa-install-banner"
import { AlertTriangle, Settings } from "lucide-react"

type Tab = "home" | "friends" | "profile" | "admin"

function ConfigurationError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 text-center border border-border">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Firebase غير مُعد</h1>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          لم يتم إعداد Firebase بعد. يرجى إضافة متغيرات البيئة المطلوبة في إعدادات Vercel.
        </p>
        
        <div className="bg-secondary/50 rounded-lg p-4 text-right mb-6">
          <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            المتغيرات المطلوبة:
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 font-mono">
            <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
            <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
            <li>NEXT_PUBLIC_FIREBASE_DATABASE_URL</li>
            <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
            <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
            <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
            <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
            <li>NEXT_PUBLIC_IMGBB_API_KEY</li>
            <li className="text-primary">NEXT_PUBLIC_OWNER_UID (للـ Owner)</li>
            <li className="text-primary">NEXT_PUBLIC_OWNER_EMAIL (للـ Owner)</li>
          </ul>
        </div>

        <p className="text-sm text-muted-foreground">
          احصل على هذه القيم من{" "}
          <a
            href="https://console.firebase.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Firebase Console
          </a>
        </p>
      </div>
    </div>
  )
}

function BannedScreen({ reason }: { reason?: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-2xl p-8 text-center border border-destructive/30">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold text-destructive mb-2">تم حظر حسابك</h1>
        <p className="text-muted-foreground mb-4 leading-relaxed">
          لا يمكنك استخدام التطبيق حالياً.
        </p>
        {reason && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-muted-foreground">السبب: {reason}</p>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          إذا كنت تعتقد أن هذا خطأ، تواصل مع الإدارة.
        </p>
      </div>
    </div>
  )
}

export function NabdaApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home")
  const [roomCount, setRoomCount] = useState(0)
  const [isInRoom, setIsInRoom] = useState(false)

  const { user, profile, loading, configError, register, login, logout, updateUserProfile } = useAuth()

  usePresence(user?.uid ?? null, profile?.username)

  if (loading) return <SplashScreen />
  if (configError) return <ConfigurationError />
  if (!user || !profile) return <AuthScreen onLogin={login} onRegister={register} />
  if (profile.isBanned) return <BannedScreen reason={profile.banReason} />

  const userRole = profile.role || "user"
  const showAdminTab = hasPermission(userRole, "moderator")

  return (
    <div className={`min-h-screen bg-background ${!isInRoom ? 'pb-16' : ''}`}>
      <div className={activeTab === "home" ? "block" : "hidden"}>
        <HomeTab
          currentUser={profile}
          onRoomCountChange={setRoomCount}
          onRoomStateChange={setIsInRoom}
        />
      </div>

      {activeTab === "friends" && (
        <FriendsTab currentUser={profile} updateProfile={updateUserProfile} />
      )}
      {activeTab === "profile" && (
        <ProfileTab
          currentUser={profile}
          onUpdateProfile={updateUserProfile}
          onLogout={logout}
          roomCount={roomCount}
        />
      )}
      {activeTab === "admin" && showAdminTab && (
        <AdminDashboard currentUser={profile} onBack={() => setActiveTab("home")} />
      )}

      {!isInRoom && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          userRole={userRole}
        />
      )}

      {/* PWA Install Banner — يظهر فقط للزوار الجدد */}
      <PWAInstallBanner />
    </div>
  )
}
