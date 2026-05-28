/**
 * components/nabda/avatar-upload.tsx
 * ─────────────────────────────────────────────────────────────
 * مكوّن واجهة رفع صورة البروفايل
 *
 * يعرض:
 *  - صورة البروفايل الحالية (صورة حقيقية أو emoji fallback)
 *  - زر "تغيير صورة البروفايل"
 *  - مؤشر تحميل أثناء الرفع
 *  - رسالة خطأ عند الفشل
 *
 * لا يحتوي على أي منطق رفع — كل ذلك في useUploadAvatar
 * ─────────────────────────────────────────────────────────────
 */
"use client"

import { useCallback, useState } from "react"
import { Camera, Loader2, AlertCircle, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useUploadAvatar } from "@/hooks/use-upload-avatar"

// ============================
// الأنواع
// ============================
interface AvatarUploadProps {
  /** معرّف المستخدم في Firestore */
  userId: string
  /** emoji الحالي (fallback عند عدم وجود صورة) */
  emojiAvatar: string
  /** لون المستخدم (للخلفية الـ gradient) */
  color: string
  /** رابط صورة البروفايل الحالية إن وُجدت */
  currentPhotoURL?: string | null
  /** عند نجاح الرفع يستقبل الرابط الجديد */
  onPhotoUploaded?: (url: string) => void
  /** تعطيل الرفع (مثلاً خارج وضع التعديل) */
  disabled?: boolean
  /** حجم الدائرة */
  size?: "sm" | "md" | "lg"
}

// ============================
// أحجام
// ============================
const SIZE_CONFIG = {
  sm: { circle: "w-14 h-14", emoji: "text-2xl", badge: "w-5 h-5", badgeIcon: "w-2.5 h-2.5" },
  md: { circle: "w-20 h-20", emoji: "text-4xl", badge: "w-6 h-6", badgeIcon: "w-3 h-3" },
  lg: { circle: "w-28 h-28", emoji: "text-5xl", badge: "w-8 h-8", badgeIcon: "w-4 h-4" },
}

// ============================
// المكوّن
// ============================
export function AvatarUpload({
  userId,
  emojiAvatar,
  color,
  currentPhotoURL,
  onPhotoUploaded,
  disabled = false,
  size = "md",
}: AvatarUploadProps) {
  const [imgError, setImgError] = useState(false)
  const sizes = SIZE_CONFIG[size]

  const { uploading, error, localPreview, triggerFilePicker, clearError } = useUploadAvatar({
    userId,
    onSuccess: (url) => {
      setImgError(false)
      onPhotoUploaded?.(url)
    },
  })

  // الصورة المعروضة: معاينة محلية > رابط Firestore > emoji fallback
  const displayPhoto = localPreview ?? (imgError ? null : currentPhotoURL)
  const hasPhoto = Boolean(displayPhoto)

  const handleClick = useCallback(() => {
    if (disabled || uploading) return
    clearError()
    triggerFilePicker()
  }, [disabled, uploading, clearError, triggerFilePicker])

  return (
    <div className="flex flex-col items-center gap-2">
      {/* ─── دائرة الصورة ─── */}
      <div className="relative">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || uploading}
          className={cn(
            sizes.circle,
            "rounded-full flex items-center justify-center border-2 transition-all overflow-hidden",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            disabled
              ? "cursor-default"
              : "cursor-pointer hover:opacity-90 active:scale-95"
          )}
          style={{
            borderColor: `${color}80`,
            background: hasPhoto
              ? undefined
              : `linear-gradient(135deg, ${color}40, ${color}15)`,
          }}
          aria-label="تغيير صورة البروفايل"
        >
          {hasPhoto ? (
            /* صورة حقيقية */
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayPhoto!}
              alt="صورة البروفايل"
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            /* emoji fallback */
            <span className={sizes.emoji} role="img" aria-label="avatar">
              {emojiAvatar}
            </span>
          )}

          {/* طبقة شفافة عند الـ hover (تظهر فقط عندما لا يكون disabled) */}
          {!disabled && (
            <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors rounded-full flex items-center justify-center">
              {!uploading && (
                <Camera className="w-5 h-5 text-white opacity-0 hover:opacity-100 transition-opacity drop-shadow" />
              )}
            </div>
          )}
        </button>

        {/* ─── شارة الكاميرا / التحميل ─── */}
        {!disabled && (
          <div
            className={cn(
              sizes.badge,
              "absolute -bottom-1 -right-1 rounded-full",
              "flex items-center justify-center",
              uploading
                ? "bg-yellow-500 border-2 border-background"
                : "bg-primary border-2 border-background"
            )}
          >
            {uploading ? (
              <Loader2 className={cn(sizes.badgeIcon, "text-white animate-spin")} />
            ) : (
              <Camera className={cn(sizes.badgeIcon, "text-white")} />
            )}
          </div>
        )}
      </div>

      {/* ─── نص الحالة ─── */}
      {uploading && (
        <p className="text-xs text-muted-foreground animate-pulse">
          جاري رفع الصورة...
        </p>
      )}

      {/* ─── رسالة الخطأ ─── */}
      {error && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 border border-destructive/20 rounded-lg max-w-[220px]">
          <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
          <p className="text-xs text-destructive leading-snug flex-1">{error}</p>
          <button
            type="button"
            onClick={clearError}
            className="text-destructive/60 hover:text-destructive"
            aria-label="إغلاق"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}

// ============================
// مكوّن عرض الصورة فقط (بدون رفع) — للشات والأصدقاء
// ============================
interface UserAvatarProps {
  /** emoji الحالي (fallback) */
  emojiAvatar: string
  /** لون المستخدم */
  color: string
  /** رابط الصورة الحقيقية */
  photoURL?: string | null
  /** اسم المستخدم (للـ alt) */
  username?: string
  size?: "xs" | "sm" | "md" | "lg"
  className?: string
}

const DISPLAY_SIZE = {
  xs: { circle: "w-6 h-6", emoji: "text-xs" },
  sm: { circle: "w-8 h-8", emoji: "text-sm" },
  md: { circle: "w-10 h-10", emoji: "text-lg" },
  lg: { circle: "w-14 h-14", emoji: "text-2xl" },
}

export function UserAvatar({
  emojiAvatar,
  color,
  photoURL,
  username,
  size = "sm",
  className,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false)
  const sizes = DISPLAY_SIZE[size]
  const hasPhoto = photoURL && !imgError

  return (
    <div
      className={cn(
        sizes.circle,
        "rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden",
        className
      )}
      style={
        hasPhoto
          ? undefined
          : { background: `linear-gradient(135deg, ${color}60, ${color}20)` }
      }
    >
      {hasPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoURL!}
          alt={username ?? "صورة المستخدم"}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className={sizes.emoji} role="img" aria-label="avatar">
          {emojiAvatar}
        </span>
      )}
    </div>
  )
}
