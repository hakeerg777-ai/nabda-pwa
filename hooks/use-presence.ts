"use client"

import { useEffect, useRef } from "react"
import { ref, set, onDisconnect, onValue, serverTimestamp, off } from "firebase/database"
import { rtdb, isFirebaseConfigured } from "@/lib/firebase"
import type { PresenceData } from "@/lib/types"

const PRESENCE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Presence hook - uses Firebase Realtime Database
 * Very cheap: only writes on connect/disconnect
 * Free tier: 1GB storage, 10GB/month transfer — more than enough
 */
export function usePresence(uid: string | null, username?: string) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (!uid || !isFirebaseConfigured || !rtdb) return

    const presenceRef = ref(rtdb, `presence/${uid}`)
    const connectedRef = ref(rtdb, ".info/connected")

    const unsub = onValue(connectedRef, (snap) => {
      if (!snap.val()) return

      // When connected: set online
      set(presenceRef, {
        online: true,
        lastSeen: Date.now(),
        username: username || "",
      } satisfies PresenceData)

      // When disconnected: set offline automatically (server-side)
      onDisconnect(presenceRef).set({
        online: false,
        lastSeen: serverTimestamp(),
        username: username || "",
      })
    })

    // Heartbeat every 2 minutes to keep presence fresh
    intervalRef.current = setInterval(() => {
      set(presenceRef, {
        online: true,
        lastSeen: Date.now(),
        username: username || "",
      })
    }, 2 * 60 * 1000)

    return () => {
      off(connectedRef)
      unsub()
      if (intervalRef.current) clearInterval(intervalRef.current)
      // Mark offline on cleanup
      set(presenceRef, { online: false, lastSeen: Date.now() })
    }
  }, [uid, username])
}

/**
 * Hook to watch a single user's presence
 */
export function useUserPresence(uid: string | null) {
  const presenceRef = uid && rtdb ? ref(rtdb, `presence/${uid}`) : null

  // Returns a subscribe function — use with useEffect in components
  const subscribe = (callback: (data: PresenceData | null) => void) => {
    if (!presenceRef || !isFirebaseConfigured) {
      callback(null)
      return () => {}
    }
    const unsub = onValue(presenceRef, (snap) => {
      callback(snap.val() as PresenceData | null)
    })
    return () => off(presenceRef)
  }

  return { subscribe }
}
