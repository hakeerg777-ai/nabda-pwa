/**
 * hooks/use-upload-avatar.ts
 * ─────────────────────────────────────────────────────────────
 * Hook يدير كامل دورة حياة رفع صورة البروفايل:
 *   1. اختيار الملف + تحقق
 *   2. معاينة محلية فورية
 *   3. ضغط الصورة + رفعها لـ ImgBB
 *   4. حفظ الرابط في Firestore (users/{uid}/photoURL)
 *   5. إدارة حالات التحميل والخطأ
 * ─────────────────────────────────────────────────────────────
 */
"use client"

import { useState, useCallback, useRef } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import {
  uploadImageToImgBB,
  createLocalPreview,
  revokeLocalPreview,
  type UploadError,
} from "@/lib/upload"

// ============================
// منع الـ spam: مدة الانتظار بين رفعين (30 ثانية)
// ============================
const UPLOAD_COOLDOWN_MS = 30_000

interface UseUploadAvatarOptions {
  userId: string
  onSuccess?: (photoURL: string) => void
  onError?: (error: string) => void
}

interface UseUploadAvatarReturn {
  /** حالة التحميل */
  uploading: boolean
  /** رسالة الخطأ إن وُجد */
  error: string | null
  /** معاينة محلية مؤقتة (قبل انتهاء الرفع) */
  localPreview: string | null
  /** الرابط النهائي بعد الرفع */
  uploadedUrl: string | null
  /** دالة: افتح نافذة اختيار الملف */
  triggerFilePicker: () => void
  /** مسح رسالة الخطأ */
  clearError: () => void
  /** مسح المعاينة المحلية */
  clearPreview: () => void
}

export function useUploadAvatar({
  userId,
  onSuccess,
  onError,
}: UseUploadAvatarOptions): UseUploadAvatarReturn {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null)

  // مرجع لـ input[type=file] — لا نضيفه للـ DOM مباشرة
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  // وقت آخر رفع ناجح (لمنع الـ spam)
  const lastUploadRef = useRef<number>(0)

  // ========================
  // تنظيف المعاينة المحلية
  // ========================
  const clearPreview = useCallback(() => {
    if (localPreview) {
      revokeLocalPreview(localPreview)
      setLocalPreview(null)
    }
  }, [localPreview])

  const clearError = useCallback(() => setError(null), [])

  // ========================
  // معالجة اختيار الملف
  // ========================
  const handleFileSelect = useCallback(
    async (file: File) => {
      // منع الـ spam
      const now = Date.now()
      if (now - lastUploadRef.current < UPLOAD_COOLDOWN_MS) {
        const remaining = Math.ceil((UPLOAD_COOLDOWN_MS - (now - lastUploadRef.current)) / 1000)
        const msg = `انتظر ${remaining} ثانية قبل رفع صورة أخرى`
        setError(msg)
        onError?.(msg)
        return
      }

      // مسح الأخطاء السابقة
      setError(null)

      // 1. أنشئ معاينة محلية فورية
      clearPreview()
      const preview = createLocalPreview(file)
      setLocalPreview(preview)

      // 2. ابدأ الرفع
      setUploading(true)
      try {
        const result = await uploadImageToImgBB(file)

        // 3. احفظ الرابط في Firestore فقط (لا base64)
        await updateDoc(doc(db, "users", userId), {
          photoURL: result.url,
        })

        // 4. حدّث الحالة
        setUploadedUrl(result.url)
        lastUploadRef.current = Date.now()

        // 5. استدعِ callback النجاح
        onSuccess?.(result.url)
      } catch (err: unknown) {
        const uploadErr = err as UploadError
        const msg =
          uploadErr?.message ?? "فشل رفع الصورة، حاول مجدداً"
        setError(msg)
        onError?.(msg)

        // إذا فشل الرفع، أزل المعاينة المحلية
        clearPreview()
      } finally {
        setUploading(false)
      }
    },
    [userId, onSuccess, onError, clearPreview]
  )

  // ========================
  // فتح نافذة اختيار الملف
  // ========================
  const triggerFilePicker = useCallback(() => {
    if (uploading) return

    // أنشئ input مؤقت إذا لم يكن موجوداً
    if (!fileInputRef.current) {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = "image/jpeg,image/jpg,image/png,image/webp"
      input.style.display = "none"
      fileInputRef.current = input

      input.addEventListener("change", (e) => {
        const target = e.target as HTMLInputElement
        const file = target.files?.[0]
        if (file) {
          handleFileSelect(file)
        }
        // أعد تهيئة القيمة حتى يمكن إعادة اختيار نفس الملف
        input.value = ""
      })
    }

    fileInputRef.current.click()
  }, [uploading, handleFileSelect])

  return {
    uploading,
    error,
    localPreview,
    uploadedUrl,
    triggerFilePicker,
    clearError,
    clearPreview,
  }
}
