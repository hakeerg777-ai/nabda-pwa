/**
 * lib/upload.ts
 * ─────────────────────────────────────────────────────────────
 * رفع الصور إلى ImgBB (مجاني بالكامل، لا يحتاج بطاقة ائتمانية)
 * الرابط: https://api.imgbb.com
 *
 * لا يُستخدم Firebase Storage إطلاقاً.
 * يُحفظ فقط رابط URL في Firestore.
 * ─────────────────────────────────────────────────────────────
 */

// ============================
// الثوابت والإعدادات
// ============================
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY ?? ""
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload"

/** الحد الأقصى لحجم الصورة قبل الضغط (2MB) */
const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024

/** الحد الأقصى لحجم الصورة بعد الضغط (800KB) */
const COMPRESSED_MAX_SIZE = 800 * 1024

/** أبعاد الصورة القصوى بعد الضغط */
const MAX_DIMENSION = 512

/** أنواع الملفات المسموح بها فقط */
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]

// ============================
// الأنواع
// ============================
export interface UploadResult {
  url: string       // الرابط المباشر للصورة
  thumbUrl: string  // رابط الـ thumbnail
  deleteUrl: string // رابط الحذف (اختياري)
}

export interface UploadError {
  code: "FILE_TOO_LARGE" | "INVALID_TYPE" | "UPLOAD_FAILED" | "NO_API_KEY" | "COMPRESS_FAILED"
  message: string
}

// ============================
// التحقق من الملف
// ============================
function validateFile(file: File): UploadError | null {
  if (!IMGBB_API_KEY) {
    return {
      code: "NO_API_KEY",
      message: "مفتاح ImgBB غير موجود. أضف NEXT_PUBLIC_IMGBB_API_KEY في ملف .env.local",
    }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      code: "INVALID_TYPE",
      message: "نوع الملف غير مدعوم. استخدم JPG أو PNG أو WebP فقط.",
    }
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      code: "FILE_TOO_LARGE",
      message: `حجم الصورة كبير جداً (الحد الأقصى ${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB).`,
    }
  }

  return null
}

// ============================
// ضغط الصورة (Canvas API)
// ============================
export async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)

      // احسب الأبعاد الجديدة مع الحفاظ على النسبة
      let { width, height } = img
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width)
          width = MAX_DIMENSION
        } else {
          width = Math.round((width * MAX_DIMENSION) / height)
          height = MAX_DIMENSION
        }
      }

      const canvas = document.createElement("canvas")
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext("2d")
      if (!ctx) {
        reject(new Error("Canvas context unavailable"))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      // ابدأ بجودة 0.85 ثم انخفض إذا لزم
      let quality = 0.85
      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Compression failed"))
              return
            }
            if (blob.size <= COMPRESSED_MAX_SIZE || quality <= 0.3) {
              resolve(blob)
            } else {
              quality -= 0.1
              tryCompress()
            }
          },
          "image/jpeg",
          quality
        )
      }

      tryCompress()
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error("Image load failed"))
    }

    img.src = objectUrl
  })
}

// ============================
// رفع الصورة إلى ImgBB
// ============================
export async function uploadImageToImgBB(file: File): Promise<UploadResult> {
  // 1. تحقق من الملف
  const validationError = validateFile(file)
  if (validationError) {
    throw validationError
  }

  // 2. اضغط الصورة
  let compressedBlob: Blob
  try {
    compressedBlob = await compressImage(file)
  } catch {
    throw {
      code: "COMPRESS_FAILED",
      message: "فشل ضغط الصورة، حاول مجدداً.",
    } as UploadError
  }

  // 3. حوّل إلى Base64 (للإرسال فقط - لا يُحفظ في Firestore)
  const base64 = await blobToBase64(compressedBlob)

  // 4. أرسل لـ ImgBB
  const formData = new FormData()
  formData.append("key", IMGBB_API_KEY)
  formData.append("image", base64)
  formData.append("expiration", "") // بدون انتهاء صلاحية

  let response: Response
  try {
    response = await fetch(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    })
  } catch {
    throw {
      code: "UPLOAD_FAILED",
      message: "فشل الاتصال بخادم الرفع. تحقق من الاتصال بالإنترنت.",
    } as UploadError
  }

  if (!response.ok) {
    throw {
      code: "UPLOAD_FAILED",
      message: `فشل الرفع (${response.status}). تحقق من صلاحية مفتاح ImgBB.`,
    } as UploadError
  }

  const data = await response.json()

  if (!data.success) {
    throw {
      code: "UPLOAD_FAILED",
      message: data.error?.message ?? "فشل الرفع، حاول مجدداً.",
    } as UploadError
  }

  return {
    url: data.data.display_url as string,
    thumbUrl: (data.data.thumb?.url ?? data.data.display_url) as string,
    deleteUrl: data.data.delete_url as string,
  }
}

// ============================
// مساعد: Blob → Base64
// ============================
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // أزل رأس data URL (data:image/jpeg;base64,...)
      resolve(result.split(",")[1])
    }
    reader.onerror = () => reject(new Error("FileReader failed"))
    reader.readAsDataURL(blob)
  })
}

// ============================
// إنشاء معاينة محلية (قبل الرفع)
// ============================
export function createLocalPreview(file: File): string {
  return URL.createObjectURL(file)
}

export function revokeLocalPreview(url: string) {
  URL.revokeObjectURL(url)
}
