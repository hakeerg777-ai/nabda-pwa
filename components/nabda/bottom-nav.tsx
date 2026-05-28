"use client"

import { Home, Users, User, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/types"
import { hasPermission } from "@/lib/constants"

type Tab = "home" | "friends" | "profile" | "admin"

interface BottomNavProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  userRole?: UserRole
}

export function BottomNav({ activeTab, onTabChange, userRole = "user" }: BottomNavProps) {
  const showAdmin = hasPermission(userRole, "moderator")

  const TABS = [
    { id: "home" as Tab, label: "الرئيسية", icon: Home, show: true },
    { id: "friends" as Tab, label: "الأصدقاء", icon: Users, show: true },
    { id: "profile" as Tab, label: "حسابي", icon: User, show: true },
    { id: "admin" as Tab, label: "الإدارة", icon: Shield, show: showAdmin },
  ].filter(tab => tab.show)

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-white/10">
      <div className="flex">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors relative",
              activeTab === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground",
              id === "admin" && "text-yellow-500"
            )}
          >
            <Icon className={cn(
              "w-5 h-5",
              activeTab === id && "fill-primary/20",
              id === "admin" && activeTab === id && "fill-yellow-500/20"
            )} />
            <span className="text-[10px] font-medium">{label}</span>
            {activeTab === id && (
              <span className={cn(
                "absolute bottom-1 w-1 h-1 rounded-full",
                id === "admin" ? "bg-yellow-500" : "bg-primary"
              )} />
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
