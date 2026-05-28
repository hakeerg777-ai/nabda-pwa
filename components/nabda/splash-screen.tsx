"use client"

import { useEffect, useState } from "react"

export function SplashScreen() {
  const [dots, setDots] = useState(".")

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? "." : d + "."))
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-primary/10 to-secondary/10">
      <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
        <div className="text-7xl animate-bounce">✨</div>
        <h1 className="text-4xl font-black bg-gradient-to-l from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
          نبضة
        </h1>
        <p className="text-muted-foreground text-sm">جاري التحميل{dots}</p>
      </div>
    </div>
  )
}
