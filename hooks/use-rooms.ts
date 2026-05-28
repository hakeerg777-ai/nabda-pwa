"use client"

import { useState, useEffect, useCallback } from "react"
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  getDoc,
  setDoc,
  getDocs,
  serverTimestamp,
  increment,
  writeBatch,
  limit,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore"
import { db, isFirebaseConfigured } from "@/lib/firebase"
import type { Room, UserProfile } from "@/lib/types"
import { OWNER_CONFIG } from "@/lib/constants"

const COLORS = [
  "#a855f7", "#8b5cf6", "#ec4899", "#f59e0b",
  "#10b981", "#3b82f6", "#ef4444", "#14b8a6",
]

// Main Room configuration - this room always exists
export const MAIN_ROOM_ID = "main_room_nabda"
export const MAIN_ROOM_CONFIG = {
  id: MAIN_ROOM_ID,
  name: "الغرفة الرئيسية",
  description: "غرفة نبضة الرئيسية - مرحباً بالجميع!",
  icon: "🌟",
  color: "#a855f7",
  isMain: true,
  isPublic: true,
}

export function useRooms(currentUser: UserProfile | null) {
  const [allPublicRooms, setAllPublicRooms] = useState<Room[]>([])
  const [myRooms, setMyRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  // Ensure Main Room exists
  const ensureMainRoom = useCallback(async () => {
    if (!isFirebaseConfigured || !db) return

    const mainRoomRef = doc(db, "rooms", MAIN_ROOM_ID)
    const snap = await getDoc(mainRoomRef)

    if (!snap.exists()) {
      // Create the main room with owner as the admin
      await setDoc(mainRoomRef, {
        id: MAIN_ROOM_ID,
        name: MAIN_ROOM_CONFIG.name,
        description: MAIN_ROOM_CONFIG.description,
        icon: MAIN_ROOM_CONFIG.icon,
        color: MAIN_ROOM_CONFIG.color,
        ownerId: OWNER_CONFIG.uid,
        ownerName: "المالك",
        isPublic: true,
        isMain: true, // Flag to prevent deletion
        memberCount: 0,
        members: [],
        lastMessage: "مرحباً بكم في نبضة! 🎉",
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      })
    }
  }, [])

  // Listen to ALL public rooms (not just joined ones)
  // This is the KEY FIX - show all rooms to all users
  useEffect(() => {
    if (!currentUser || !isFirebaseConfigured || !db) {
      setAllPublicRooms([])
      setMyRooms([])
      setLoading(false)
      return
    }

    // First ensure main room exists
    ensureMainRoom().catch(err => {
      console.error("[v0] Error ensuring main room:", err)
    })

    // Query 1: Get ALL public rooms (simplified - no compound index needed)
    // Sort client-side instead of using orderBy to avoid index requirements
    const allPublicQuery = query(
      collection(db, "rooms"),
      where("isPublic", "==", true),
      limit(50)
    )

    // Query 2: Get user's rooms they are member of (both public and private)
    const myRoomsQuery = query(
      collection(db, "rooms"),
      where("members", "array-contains", currentUser.uid),
      limit(50)
    )

    let publicLoaded = false
    let myRoomsLoaded = false
    let publicRoomsData: Room[] = []
    let myRoomsData: Room[] = []

    // Helper to sort rooms by lastMessageAt
    const sortByLastMessage = (rooms: Room[]) => {
      return [...rooms].sort((a, b) => {
        const aTime = a.lastMessageAt?.toDate?.()?.getTime() || 
                      (a.lastMessageAt ? new Date(a.lastMessageAt as unknown as string).getTime() : 0)
        const bTime = b.lastMessageAt?.toDate?.()?.getTime() || 
                      (b.lastMessageAt ? new Date(b.lastMessageAt as unknown as string).getTime() : 0)
        return bTime - aTime
      })
    }

    const mergeAndUpdate = () => {
      if (!publicLoaded || !myRoomsLoaded) return

      // Set all public rooms (sorted by lastMessageAt)
      setAllPublicRooms(sortByLastMessage(publicRoomsData))

      // Set "my rooms" - rooms user is member of (sorted by lastMessageAt)
      setMyRooms(sortByLastMessage(myRoomsData))
      setLoading(false)
    }

    // Listener for all public rooms
    const unsubPublic = onSnapshot(allPublicQuery, (snap) => {
      publicRoomsData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Room))
      publicLoaded = true
      mergeAndUpdate()
    }, (error) => {
      console.error("[v0] Public rooms listener error:", error)
      publicLoaded = true
      publicRoomsData = []
      mergeAndUpdate()
    })

    // Listener for user's rooms (both public and private they're member of)
    const unsubMyRooms = onSnapshot(myRoomsQuery, (snap) => {
      myRoomsData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Room))
      myRoomsLoaded = true
      mergeAndUpdate()
    }, (error) => {
      console.error("[v0] My rooms listener error:", error)
      myRoomsLoaded = true
      myRoomsData = []
      mergeAndUpdate()
    })

    return () => {
      unsubPublic()
      unsubMyRooms()
    }
  }, [currentUser?.uid, ensureMainRoom])

  // Create a new room
  const createRoom = useCallback(async (
    name: string,
    description: string,
    icon: string
  ): Promise<Room | null> => {
    if (!currentUser || !isFirebaseConfigured || !db) return null

    const batch = writeBatch(db)
    const roomRef = doc(collection(db, "rooms"))

    const newRoom: Omit<Room, "id"> = {
      name: name.trim(),
      description: description.trim(),
      icon,
      ownerId: currentUser.uid,
      ownerName: currentUser.username,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      isPublic: true,
      memberCount: 1,
      members: [currentUser.uid],
      lastMessage: "تم إنشاء الغرفة 🎉",
      lastMessageAt: serverTimestamp() as any,
      createdAt: serverTimestamp() as any,
    }

    batch.set(roomRef, newRoom)

    // Increment user XP
    const userRef = doc(db, "users", currentUser.uid)
    batch.update(userRef, { xp: increment(30) })

    await batch.commit()
    return { id: roomRef.id, ...newRoom } as Room
  }, [currentUser])

  // Join a room
  const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!currentUser || !isFirebaseConfigured || !db) return false

    const roomRef = doc(db, "rooms", roomId)
    await updateDoc(roomRef, {
      members: arrayUnion(currentUser.uid),
      memberCount: increment(1),
    })

    return true
  }, [currentUser])

  // Leave a room
  const leaveRoom = useCallback(async (roomId: string): Promise<boolean> => {
    if (!currentUser || !isFirebaseConfigured || !db) return false

    // Don't allow leaving the main room (but can still be member)
    const roomRef = doc(db, "rooms", roomId)
    const snap = await getDoc(roomRef)
    
    if (snap.exists()) {
      const roomData = snap.data()
      // Can't leave if you're the owner (unless it's the main room)
      if (roomData.ownerId === currentUser.uid && !roomData.isMain) {
        return false
      }
    }

    await updateDoc(roomRef, {
      members: arrayRemove(currentUser.uid),
      memberCount: increment(-1),
    })

    return true
  }, [currentUser])

  // Get room members with their profiles
  const getRoomMembers = useCallback(async (roomId: string): Promise<UserProfile[]> => {
    if (!isFirebaseConfigured || !db) return []

    const roomRef = doc(db, "rooms", roomId)
    const roomSnap = await getDoc(roomRef)
    
    if (!roomSnap.exists()) return []
    
    const roomData = roomSnap.data()
    const memberIds = roomData.members || []
    
    if (memberIds.length === 0) return []

    // Firestore "in" query supports up to 30 items
    const chunks: string[][] = []
    for (let i = 0; i < memberIds.length; i += 30) {
      chunks.push(memberIds.slice(i, i + 30))
    }

    const results: UserProfile[] = []
    for (const chunk of chunks) {
      const q = query(collection(db, "users"), where("uid", "in", chunk))
      const snap = await getDocs(q)
      snap.docs.forEach((d) => results.push(d.data() as UserProfile))
    }
    
    return results
  }, [])

  // Check if user is member of a room
  const isMember = useCallback((roomId: string): boolean => {
    const room = allPublicRooms.find(r => r.id === roomId)
    return room?.members?.includes(currentUser?.uid || "") || false
  }, [allPublicRooms, currentUser?.uid])

  return {
    allPublicRooms,  // All public rooms (for browsing/exploring)
    myRooms,         // Rooms user has joined
    loading,
    createRoom,
    joinRoom,
    leaveRoom,
    getRoomMembers,
    isMember,
    ensureMainRoom,
  }
}
