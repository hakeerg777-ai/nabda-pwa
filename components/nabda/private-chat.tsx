"use client"

import { useState, useRef, useEffect } from "react"
import { usePrivateChat } from "@/hooks/use-private-chat"
import { formatTime } from "@/lib/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowRight, Send, Loader2, Lock } from "lucide-react"
import type { UserProfile } from "@/lib/types"
import { UserAvatar } from "./avatar-upload"

interface PrivateChatProps {
  chatId: string
  otherUser: UserProfile
  currentUser: UserProfile
  onBack: () => void
}

export function PrivateChat({ chatId, otherUser, currentUser, onBack }: PrivateChatProps) {
  const [text, setText] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  const { messages, loading, sending, sendMessage } = usePrivateChat(chatId, currentUser)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages, autoScroll])

  const handleSend = async () => {
    if (!text.trim() || sending) return
    const ok = await sendMessage(text)
    if (ok) {
      setText("")
      setAutoScroll(true)
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-l from-indigo-500/15 via-purple-500/10 to-transparent">
        <Button variant="ghost" size="icon" onClick={onBack} className="text-primary hover:bg-primary/10">
          <ArrowRight className="w-6 h-6" />
        </Button>
        <div className="flex items-center gap-3 flex-1 justify-center">
          <UserAvatar
            emojiAvatar={otherUser.avatar}
            color={otherUser.color}
            photoURL={otherUser.photoURL}
            username={otherUser.username}
            size="sm"
          />
          <div className="text-center">
            <h2 className="font-bold text-lg">{otherUser.username}</h2>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              محادثة خاصة
            </p>
          </div>
        </div>
        <div className="w-10" />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4"
        onScroll={(e) => {
          const el = e.currentTarget
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
          setAutoScroll(atBottom)
        }}
      >
        {/* Persistent Chat Notice */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs text-emerald-400">
            <Lock className="w-3 h-3" />
            <span>الرسائل محفوظة بشكل دائم</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-muted-foreground">
            <UserAvatar
              emojiAvatar={otherUser.avatar}
              color={otherUser.color}
              photoURL={otherUser.photoURL}
              username={otherUser.username}
              size="lg"
            />
            <p className="text-sm mt-2">ابدأ محادثة مع {otherUser.username}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((msg, idx) => {
              const isMe = msg.senderId === currentUser.uid
              const prevMsg = messages[idx - 1]
              const showSender = !isMe && prevMsg?.senderId !== msg.senderId

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2 items-end ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {/* Avatar */}
                  <UserAvatar
                    emojiAvatar={msg.senderAvatar}
                    color={msg.senderColor}
                    photoURL={(msg as any).senderPhotoURL ?? null}
                    username={msg.senderName}
                    size="sm"
                    className="mb-0.5"
                  />

                  {/* Bubble */}
                  <div className={`max-w-[70%] flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    {showSender && (
                      <span className="text-xs text-muted-foreground px-1 mb-1">{msg.senderName}</span>
                    )}
                    <div
                      className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                        isMe
                          ? "bg-gradient-to-l from-indigo-500 to-purple-500 text-white rounded-br-sm"
                          : "bg-white/10 text-foreground rounded-bl-sm"
                      }`}
                    >
                      {msg.text}
                      <p className="text-[10px] opacity-60 mt-1 text-left">
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-background/90 backdrop-blur">
        <div className="flex gap-3">
          <Input
            placeholder="اكتب رسالة..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            className="flex-1 bg-white/5 border-white/10 focus:border-primary/50"
            disabled={sending}
          />
          <Button
            onClick={handleSend}
            size="icon"
            disabled={!text.trim() || sending}
            className="w-11 h-11 bg-gradient-to-l from-indigo-500 to-purple-500 hover:opacity-90 flex-shrink-0"
          >
            {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 rotate-180" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
