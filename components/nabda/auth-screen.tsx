"use client"

import { useState } from "react"
import { AVATARS, COLORS } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  onRegister: (username: string, email: string, password: string, avatar: string, color: string) => Promise<{ success: boolean; error?: string }>
  loading?: boolean
}

export function AuthScreen({ onLogin, onRegister, loading }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true)
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    avatar: "😎",
    color: COLORS[0],
  })
  const [error, setError] = useState("")
  const [showAvatars, setShowAvatars] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setError("")
    setSubmitting(true)

    try {
      if (isLogin) {
        if (!form.email || !form.password) {
          setError("يرجى تعبئة جميع الحقول")
          return
        }
        const result = await onLogin(form.email, form.password)
        if (!result.success) setError(result.error || "حدث خطأ")
      } else {
        if (!form.username || !form.email || !form.password) {
          setError("يرجى تعبئة جميع الحقول")
          return
        }
        if (form.password.length < 6) {
          setError("كلمة المرور 6 أحرف على الأقل")
          return
        }
        const result = await onRegister(form.username, form.email, form.password, form.avatar, form.color)
        if (!result.success) setError(result.error || "حدث خطأ")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <Card className="w-full max-w-md bg-card/50 backdrop-blur-xl border-white/10 shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="text-5xl mb-2">✨</div>
          <h1 className="text-3xl font-bold bg-gradient-to-l from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
            نبضة
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isLogin ? "أهلاً بعودتك!" : "انضم إلى المجتمع"}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Avatar Picker - Register Only */}
          {!isLogin && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">اختر أفاتارك</Label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowAvatars(!showAvatars)}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl border-2 border-primary/50 hover:scale-105 transition-transform"
                  style={{ background: `linear-gradient(135deg, ${form.color}60, ${form.color}20)` }}
                >
                  {form.avatar}
                </button>
                <span className="text-sm text-muted-foreground">اضغط لتغيير الأفاتار</span>
              </div>

              {showAvatars && (
                <div className="p-3 bg-muted/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => { setForm({ ...form, avatar: a }); setShowAvatars(false) }}
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all",
                          form.avatar === a
                            ? "bg-primary/30 border-2 border-primary scale-110"
                            : "bg-white/5 border-2 border-transparent hover:bg-white/10"
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={cn(
                          "w-7 h-7 rounded-full border-2 transition-all",
                          form.color === c ? "border-white scale-125" : "border-transparent"
                        )}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username" className="text-muted-foreground">اسم المستخدم</Label>
              <Input
                id="username"
                placeholder="اسم مميز"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" className="text-muted-foreground">البريد الإلكتروني</Label>
            <Input
              id="email"
              type="email"
              placeholder="example@email.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground">كلمة المرور</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="bg-white/5 border-white/10 focus:border-primary/50"
            />
          </div>

          {error && (
            <div className="text-destructive text-sm text-center p-3 bg-destructive/10 rounded-xl animate-in fade-in">
              {error}
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || loading}
            className="w-full h-12 text-base font-bold bg-gradient-to-l from-primary to-blue-500 hover:opacity-90"
          >
            {submitting ? "جاري..." : isLogin ? "🚀 تسجيل الدخول" : "✨ إنشاء حساب"}
          </Button>

          <Button
            variant="outline"
            onClick={() => { setIsLogin(!isLogin); setError("") }}
            className="w-full h-12 border-primary/30 text-primary hover:bg-primary/10"
          >
            {isLogin ? "حساب جديد؟ سجّل الآن" : "لديك حساب؟ ادخل"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
