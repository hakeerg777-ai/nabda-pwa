"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
  writeBatch,
  doc,
  increment,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { Message, UserProfile } from "@/lib/types"

const PAGE_SIZE = 30  // Load 30 messages at a time — optimizes Firestore reads

// Client-side rate limiting: max 3 messages per 3 seconds
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 3000

/**
 * Realtime chat hook with:
 * - Live listener for new messages (onSnapshot)
 * - Pagination for history (getDocs)
 * - Optimized Firestore reads
 * - paginationCursorRef: stable cursor used only in loadMore
 * - oldestDocRef: tracks realtime window boundary only
 */
export function useChat(roomId: string | null, currentUser: UserProfile | null) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [sending, setSending] = useState(false)
  // Tracks the oldest doc in the realtime window (for boundary awareness only)
  const oldestDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)
  // Stable pagination cursor — only updated inside loadMore, not touched by realtime updates
  const paginationCursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null)
  const unsubRef = useRef<(() => void) | null>(null)
  // Rate limiting: track timestamps of recent sends
  const recentSendsRef = useRef<number[]>([])

  useEffect(() => {
    if (!roomId || !isFirebaseConfigured || !db) {
      setMessages([])
      setLoading(false)
      return
    }

    setLoading(true)
    setMessages([])
    // Reset both cursors when room changes
    oldestDocRef.current = null
    paginationCursorRef.current = null

    // Listen to the latest PAGE_SIZE messages in realtime
    const q = query(
      collection(db, "rooms", roomId, "messages"),
      orderBy("createdAt", "desc"),
      limit(PAGE_SIZE)
    )

    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, "id">),
      }))

      // Reverse to show oldest first
      setMessages(msgs.reverse())

      // Update realtime window boundary
      if (snap.docs.length > 0) {
        oldestDocRef.current = snap.docs[snap.docs.length - 1]
      }

      // Only set the pagination cursor on the first snapshot load
      // (before any loadMore calls). Realtime updates must not overwrite it.
      if (!paginationCursorRef.current && snap.docs.length > 0) {
        paginationCursorRef.current = snap.docs[snap.docs.length - 1]
      }

      setHasMore(snap.docs.length === PAGE_SIZE)
      setLoading(false)
    }, (err) => {
      console.error("Chat listener error:", err)
      setLoading(false)
    })

    unsubRef.current = unsub
    return () => unsub()
  }, [roomId])

  /**
   * Load older messages (pagination)
   * Uses getDocs (not onSnapshot) to avoid extra listeners = less cost
   * Uses paginationCursorRef (stable) — unaffected by realtime updates
   */
  const loadMore = useCallback(async () => {
    if (!roomId || !paginationCursorRef.current || loadingMore || !isFirebaseConfigured || !db) return

    setLoadingMore(true)
    try {
      const q = query(
        collection(db, "rooms", roomId, "messages"),
        orderBy("createdAt", "desc"),
        startAfter(paginationCursorRef.current),
        limit(PAGE_SIZE)
      )

      const snap = await getDocs(q)
      const older: Message[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Message, "id">),
      })).reverse()

      if (snap.docs.length > 0) {
        // Advance the pagination cursor to fetch even older messages next time
        paginationCursorRef.current = snap.docs[snap.docs.length - 1]
        setMessages((prev) => [...older, ...prev])
      }

      setHasMore(snap.docs.length === PAGE_SIZE)
    } finally {
      setLoadingMore(false)
    }
  }, [roomId, loadingMore])

  /**
   * Send a message
   * Uses a batch write: 2 writes (message + room update) = cost-efficient
   * Client-side rate limiting: max 3 messages per 3 seconds
   */
  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!roomId || !currentUser || !text.trim() || sending || !isFirebaseConfigured || !db) return false

    // Rate limiting — purge timestamps outside the window, then check count
    const now = Date.now()
    recentSendsRef.current = recentSendsRef.current.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    )
    if (recentSendsRef.current.length >= RATE_LIMIT_MAX) {
      console.warn("Rate limit: too many messages sent too quickly")
      return false
    }

    setSending(true)
    try {
      const batch = writeBatch(db)

      // 1. Add message to subcollection
      const msgRef = doc(collection(db, "rooms", roomId, "messages"))
      batch.set(msgRef, {
        senderId: currentUser.uid,
        senderName: currentUser.username,
        senderAvatar: currentUser.avatar,
        senderPhotoURL: currentUser.photoURL ?? null,
        senderColor: currentUser.color,
        text: text.trim(),
        createdAt: serverTimestamp(),
      })

      // 2. Update room's last message preview
      const roomRef = doc(db, "rooms", roomId)
      batch.update(roomRef, {
        lastMessage: text.trim().substring(0, 60),
        lastMessageAt: serverTimestamp(),
      })

      // 3. Update user message count + XP (separate write, non-blocking)
      const userRef = doc(db, "users", currentUser.uid)
      batch.update(userRef, {
        messagesSent: increment(1),
        xp: increment(5),
      })

      await batch.commit()
      // Record successful send timestamp for rate limiting
      recentSendsRef.current.push(Date.now())
      return true
    } catch (err) {
      console.error("Send message error:", err)
      return false
    } finally {
      setSending(false)
    }
  }, [roomId, currentUser, sending])

  return { messages, loading, loadingMore, hasMore, sending, loadMore, sendMessage }
}
