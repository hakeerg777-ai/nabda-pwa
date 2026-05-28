"use client"

import { useState, useCallback } from "react"
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
  setDoc,
  increment,
  writeBatch,
  limit,
  serverTimestamp,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { UserProfile } from "@/lib/types"

export function useFriends(currentUser: UserProfile | null, updateProfile: (u: Partial<UserProfile>) => Promise<void>) {
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)

  const searchUsers = useCallback(async (term: string) => {
    if (!currentUser || term.length < 2 || !isFirebaseConfigured || !db) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      // Firestore prefix search: username >= term AND username < term + '\uf8ff'
      const q = query(
        collection(db, "users"),
        where("username", ">=", term),
        where("username", "<=", term + "\uf8ff"),
        limit(10)
      )
      const snap = await getDocs(q)
      const results = snap.docs
        .map((d) => d.data() as UserProfile)
        .filter((u) => u.uid !== currentUser.uid)

      setSearchResults(results)
    } finally {
      setSearching(false)
    }
  }, [currentUser])

  const addFriend = useCallback(async (friendUid: string): Promise<void> => {
    if (!currentUser || !isFirebaseConfigured || !db) return

    const batch = writeBatch(db)
    const userRef = doc(db, "users", currentUser.uid)

    batch.update(userRef, {
      friends: arrayUnion(friendUid),
      xp: increment(30),
    })

    await batch.commit()
  }, [currentUser])

  const removeFriend = useCallback(async (friendUid: string): Promise<void> => {
    if (!currentUser || !isFirebaseConfigured || !db) return

    const userRef = doc(db, "users", currentUser.uid)
    await updateDoc(userRef, { friends: arrayRemove(friendUid) })
  }, [currentUser])

  const getFriendProfiles = useCallback(async (): Promise<UserProfile[]> => {
    if (!currentUser || currentUser.friends.length === 0 || !isFirebaseConfigured || !db) return []

    // Firestore "in" query supports up to 30 items
    const chunks: string[][] = []
    for (let i = 0; i < currentUser.friends.length; i += 30) {
      chunks.push(currentUser.friends.slice(i, i + 30))
    }

    const results: UserProfile[] = []
    for (const chunk of chunks) {
      const q = query(collection(db, "users"), where("uid", "in", chunk))
      const snap = await getDocs(q)
      snap.docs.forEach((d) => results.push(d.data() as UserProfile))
    }
    return results
  }, [currentUser])

  /**
   * Get or create a private chat between two users
   * Uses deterministic ID to avoid duplicates
   * Stores messages in privateChats/{chatId}/messages for persistence
   */
  const getOrCreateDM = useCallback(async (friendUid: string): Promise<string> => {
    if (!currentUser || !isFirebaseConfigured || !db) return ""

    // Deterministic DM ID: sorted UIDs joined
    const sorted = [currentUser.uid, friendUid].sort()
    const chatId = `dm_${sorted[0]}_${sorted[1]}`

    // Check if the chat already exists in rooms collection (for backward compatibility)
    const roomRef = doc(db, "rooms", chatId)
    const roomSnap = await getDoc(roomRef)

    if (!roomSnap.exists()) {
      // Get friend's profile for room name
      const friendSnap = await getDoc(doc(db, "users", friendUid))
      const friend = friendSnap.exists() ? friendSnap.data() as UserProfile : null

      // Create the DM room
      await setDoc(roomRef, {
        id: chatId,
        name: friend?.username || "محادثة خاصة",
        description: "محادثة خاصة",
        icon: friend?.avatar || "💬",
        ownerId: currentUser.uid,
        ownerName: currentUser.username,
        color: "#6366f1",
        isPublic: false,
        memberCount: 2,
        members: [currentUser.uid, friendUid],
        lastMessage: "",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    }

    return chatId
  }, [currentUser])

  return { searchResults, searching, searchUsers, addFriend, removeFriend, getFriendProfiles, getOrCreateDM }
}
