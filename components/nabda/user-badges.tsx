"use client"

import { getBadgeById, ROLE_CONFIG } from "@/lib/constants"
import type { UserBadge, UserRole, Badge } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface BadgeDisplayProps {
  badge: Badge
  level?: number
  size?: "xs" | "sm" | "md" | "lg"
  showTooltip?: boolean
  animate?: boolean
  className?: string
}

const sizeClasses = {
  xs: "w-5 h-5 text-[10px]",
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-sm",
  lg: "w-10 h-10 text-base",
}

export function BadgeDisplay({
  badge,
  level = 1,
  size = "sm",
  showTooltip = true,
  animate = false,
  className,
}: BadgeDisplayProps) {
  const rarityGlow = {
    common: "shadow-md",
    rare: "shadow-lg shadow-blue-500/30",
    epic: "shadow-lg shadow-purple-500/40",
    legendary: "shadow-xl shadow-yellow-500/50",
  }

  const content = (
    <div
      className={cn(
        "relative rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300",
        sizeClasses[size],
        rarityGlow[badge.rarity],
        animate && badge.rarity === "legendary" && "animate-badge-pulse",
        className
      )}
      style={{ background: badge.bgColor }}
    >
      <span className="relative z-10">{badge.icon}</span>
      
      {/* Level indicator for leveled badges */}
      {level > 1 && (
        <span
          className="absolute -bottom-0.5 -right-0.5 text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center bg-background border border-white/20"
          style={{ color: badge.color }}
        >
          {level}
        </span>
      )}
      
      {/* Shine effect for legendary badges */}
      {badge.rarity === "legendary" && animate && (
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-badge-shine" />
        </div>
      )}
    </div>
  )

  if (!showTooltip) return content

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-white/10">
          <div className="text-center">
            <p className="font-bold text-sm" style={{ color: badge.color }}>
              {badge.nameAr}
            </p>
            <p className="text-xs text-muted-foreground">{badge.descriptionAr}</p>
            {level > 1 && (
              <p className="text-xs text-primary mt-1">المستوى {level}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface UserBadgesProps {
  badges: UserBadge[]
  maxDisplay?: number
  size?: "xs" | "sm" | "md" | "lg"
  showTooltip?: boolean
  className?: string
}

export function UserBadges({
  badges,
  maxDisplay = 5,
  size = "sm",
  showTooltip = true,
  className,
}: UserBadgesProps) {
  if (!badges || badges.length === 0) return null

  const displayBadges = badges.slice(0, maxDisplay)
  const remaining = badges.length - maxDisplay

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {displayBadges.map((userBadge) => {
        const badge = getBadgeById(userBadge.badgeId)
        if (!badge) return null
        return (
          <BadgeDisplay
            key={userBadge.badgeId}
            badge={badge}
            level={userBadge.level}
            size={size}
            showTooltip={showTooltip}
            animate={badge.rarity === "legendary"}
          />
        )
      })}
      {remaining > 0 && (
        <span className="text-xs text-muted-foreground mr-1">+{remaining}</span>
      )}
    </div>
  )
}

interface RoleBadgeProps {
  role: UserRole
  size?: "xs" | "sm" | "md" | "lg"
  showLabel?: boolean
  className?: string
}

export function RoleBadge({
  role,
  size = "sm",
  showLabel = false,
  className,
}: RoleBadgeProps) {
  if (role === "user") return null

  const config = ROLE_CONFIG[role]

  return (
    <TooltipProvider>
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 border transition-all",
              size === "xs" && "px-1.5 py-0.5 text-[10px]",
              size === "sm" && "px-2 py-0.5 text-xs",
              size === "md" && "px-2.5 py-1 text-sm",
              size === "lg" && "px-3 py-1.5 text-base",
              role === "owner" && "animate-badge-pulse",
              className
            )}
            style={{
              backgroundColor: `${config.color}20`,
              borderColor: `${config.color}50`,
              color: config.color,
            }}
          >
            <span>{config.icon}</span>
            {showLabel && <span className="font-medium">{config.nameAr}</span>}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-card border-white/10">
          <p className="font-bold" style={{ color: config.color }}>
            {config.nameAr}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface UserNameWithBadgesProps {
  username: string
  role: UserRole
  badges?: UserBadge[]
  showBadges?: boolean
  maxBadges?: number
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}

export function UserNameWithBadges({
  username,
  role,
  badges = [],
  showBadges = true,
  maxBadges = 3,
  size = "sm",
  className,
}: UserNameWithBadgesProps) {
  return (
    <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
      <span className="font-bold">{username}</span>
      <RoleBadge role={role} size={size} />
      {showBadges && badges.length > 0 && (
        <UserBadges badges={badges} maxDisplay={maxBadges} size={size} />
      )}
    </div>
  )
}
