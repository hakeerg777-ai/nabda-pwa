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
  where,
  Timestamp,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { Message, UserProfile } from "@/lib/types"

// Rate limiting: max 8 messages per 5 seconds
const RATE_LIMIT_MAX = 8
const RATE_LIMIT_WINDOW_MS = 5000
const MESSAGES_PER_PAGE = 100

export interface RoomMessage extends Message {
  createdAt: Timestamp | null
}

/**
 * Room Chat Hook - Session-Based Messages System (Like Yalla Live/Yalla Ludo)
 * 
 * Features:
 * - Messages are stored in Firestore (for real-time sync between users in room)
 * - Users only see messages from AFTER they entered the room (session-based)
 * - When user leaves and re-enters, they start a fresh session
 * - Messages are visible only to users currently in the room
 * - No persistent history - each entry is a new session
 */
export function useRoomChat(roomId: string | null, currentUser: UserProfile | null) {
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  
  // Session start time - when user entered the room
  const sessionStartRef = useRef<Date | null>(null)
  
  // Rate limiting
  const recentSendsRef = useRef<number[]>([])

  // Real-time listener for messages - SESSION BASED
  useEffect(() => {
    if (!roomId || !currentUser || !isFirebaseConfigured || !db) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    
    // Record session start time (when user enters the room)
    // This is the key for session-based chat
    const sessionStart = new Date()
    sessionStartRef.current = sessionStart

    // Listen to messages ONLY from session start time onwards
    // This creates the Yalla Live behavior - users don't see old messages
    const messagesQuery = query(
      collection(db, "roomMessages", roomId, "messages"),
      where("createdAt", ">=", Timestamp.fromDate(sessionStart)),
      orderBy("createdAt", "asc"),
      limit(MESSAGES_PER_PAGE)
    )

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs: RoomMessage[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        roomId,
        ...doc.data(),
      } as RoomMessage))
      
      setMessages(msgs)
      setLoading(false)
    }, (error) => {
      console.error("[v0] Room chat listener error:", error)
      setLoading(false)
    })

    // Cleanup on unmount or room change
    return () => {
      unsubscribe()
      sessionStartRef.current = null
    }
  }, [roomId, currentUser?.uid])

  /**
   * Send a message to the room
   * Uses Firestore for real-time sync between users in the room
   */
  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!roomId || !currentUser || !text.trim() || sending || !isFirebaseConfigured || !db) {
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
      // Add message to Firestore subcollection
      const messagesRef = collection(db, "roomMessages", roomId, "messages")
      await addDoc(messagesRef, {
        senderId: currentUser.uid,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        senderPhotoURL: currentUser.photoURL ?? null,
        senderColor: currentUser.color,
        text: text.trim(),
        createdAt: serverTimestamp(),
      })

      // Update room's lastMessage
      const roomRef = doc(db, "rooms", roomId)
      await updateDoc(roomRef, {
        lastMessage: text.trim().substring(0, 60),
        lastMessageAt: serverTimestamp(),
      })

      recentSendsRef.current.push(Date.now())
      return true
    } catch (error) {
      console.error("[v0] Send message error:", error)
      return false
    } finally {
      setSending(false)
    }
  }, [roomId, currentUser, sending])

  return {
    messages,
    loading,
    sending,
    sendMessage,
  }
}
