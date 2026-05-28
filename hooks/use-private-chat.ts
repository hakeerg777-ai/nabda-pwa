"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  limit,
  Timestamp,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { Message, UserProfile } from "@/lib/types"

const RATE_LIMIT_MAX = 8
const RATE_LIMIT_WINDOW_MS = 5000
const MESSAGES_PER_PAGE = 50

interface PrivateMessage extends Message {
  createdAt: Timestamp | null
}

/**
 * Private Chat Hook - Persistent Messages System
 * 
 * Features:
 * - Messages stored in Firestore privateChats/{chatId}/messages
 * - Messages are permanent and persist forever
 * - Real-time updates via onSnapshot
 * - Chat history is always available
 */
export function usePrivateChat(chatId: string, currentUser: UserProfile | null) {
  const [messages, setMessages] = useState<PrivateMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const recentSendsRef = useRef<number[]>([])

  // Real-time listener for messages (private chats use Firestore for persistence)
  useEffect(() => {
    if (!chatId || !currentUser || !isFirebaseConfigured || !db) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)

    // Listen to messages in the privateChats collection
    const messagesQuery = query(
      collection(db, "privateChats", chatId, "messages"),
      orderBy("createdAt", "asc"),
      limit(MESSAGES_PER_PAGE)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: PrivateMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        roomId: chatId,
        ...doc.data(),
      } as PrivateMessage))
      
      setMessages(msgs)
      setLoading(false)
    }, (error) => {
      console.error("[v0] Private chat listener error:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [chatId, currentUser?.uid])

  // Send a message
  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!chatId || !currentUser || !text.trim() || sending || !isFirebaseConfigured || !db) {
      return false
    }

    // Rate limiting
    const now = Date.now()
    recentSendsRef.current = recentSendsRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    )
    if (recentSendsRef.current.length >= RATE_LIMIT_MAX) {
      return false
    }

    setSending(true)
    try {
      // Add message to subcollection
      const messagesRef = collection(db, "privateChats", chatId, "messages")
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        senderPhotoURL: currentUser.photoURL ?? null,
        senderColor: currentUser.color,
        text: text.trim(),
        createdAt: serverTimestamp(),
      })

      // Update the DM room's lastMessage (if it exists in rooms collection)
      try {
        const roomRef = doc(db, "rooms", chatId)
        await updateDoc(roomRef, {
          lastMessage: text.trim().substring(0, 60),
          lastMessageAt: serverTimestamp(),
        })
      } catch {
        // Room might not exist, that's okay
      }

      recentSendsRef.current.push(Date.now())
      return true
    } catch (error) {
      console.error("[v0] Send private message error:", error)
      return false
    } finally {
      setSending(false)
    }
  }, [chatId, currentUser, sending])

  return { messages, loading, sending, sendMessage }
}
