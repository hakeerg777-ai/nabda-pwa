"use client"

import { useState, useEffect } from "react"
import { X, Download, Share } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

export function PWAInstallBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    setIsStandalone(standalone)

    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      setDismissed(true)
      return
    }

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener("beforeinstallprompt", handler)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleAndroidInstall = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const { outcome } = await installPrompt.userChoice
    if (outcome === "accepted") setInstallPrompt(null)
    dismiss()
  }

  const dismiss = () => {
    setDismissed(true)
    sessionStorage.setItem("pwa-banner-dismissed", "1")
  }

  if (isStandalone || dismissed) return null
  if (!installPrompt && !isIOS) return null

  if (showIOSGuide) {
    return (
      <div
        className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm"
        onClick={() => setShowIOSGuide(false)}
        data-pwa-install-banner
      >
        <div
          className="w-full max-w-sm bg-card border border-white/10 rounded-t-3xl p-6 pb-10 mx-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-center mb-4 text-4xl">⬇️</div>
          <h3 className="text-lg font-bold text-center text-foreground mb-4">
            أضف نبضة لشاشتك الرئيسية
          </h3>
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">1</span>
              <span>اضغط زر <strong className="text-foreground">المشاركة</strong> <Share className="inline w-4 h-4 text-blue-400" /> في شريط Safari أسفل الشاشة</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">2</span>
              <span>اختر <strong className="text-foreground">"إضافة إلى الشاشة الرئيسية"</strong></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">3</span>
              <span>اضغط <strong className="text-foreground">"إضافة"</strong> في أعلى اليمين ✅</span>
            </li>
          </ol>
          <button
            onClick={() => setShowIOSGuide(false)}
            className="mt-6 w-full py-3 rounded-2xl bg-primary text-white font-semibold text-sm"
          >
            فهمت!
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      data-pwa-install-banner
      className="fixed bottom-20 left-3 right-3 z-[9998] flex items-center gap-3
                 bg-card/95 backdrop-blur-xl border border-white/10
                 rounded-2xl px-4 py-3 shadow-2xl shadow-black/40"
    >
      <img src="/icons/icon-96x96.png" alt="نبضة" className="w-11 h-11 rounded-xl flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">ثبّت نبضة</p>
        <p className="text-xs text-muted-foreground">تجربة أفضل بدون متصفح</p>
      </div>
      {isIOS ? (
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-xl flex-shrink-0"
        >
          <Share className="w-3.5 h-3.5" />
          كيفية التثبيت
        </button>
      ) : (
        <button
          onClick={handleAndroidInstall}
          className="flex items-center gap-1.5 bg-primary text-white text-xs font-semibold px-3 py-2 rounded-xl flex-shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          تثبيت
        </button>
      )}
      <button onClick={dismiss} className="text-muted-foreground flex-shrink-0 p-1">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
