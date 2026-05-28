"use client"

import { useState, useEffect, useRef } from "react"
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from "firebase/auth"
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore"
import { auth, db, isFirebaseConfigured } from "@/lib/firebase"
import type { UserProfile } from "@/lib/types"
import { OWNER_CONFIG } from "@/lib/constants"

export function useAuth() {
  const [user, setUser] = useState<FirebaseUser | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [configError, setConfigError] = useState<boolean>(false)
  // Keep a ref to the profile unsubscribe so we can clean it up
  const profileUnsubRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // If Firebase is not configured, stop loading and show config error
    if (!isFirebaseConfigured || !auth || !db) {
      setLoading(false)
      setConfigError(true)
      return
    }

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)

      // Tear down previous profile listener if user changed
      if (profileUnsubRef.current) {
        profileUnsubRef.current()
        profileUnsubRef.current = null
      }

      if (firebaseUser) {
        // Real-time profile listener — profile stays in sync across devices
        const profileRef = doc(db, "users", firebaseUser.uid)
        const profileUnsub = onSnapshot(profileRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile)
          } else {
            setProfile(null)
          }
          setLoading(false)
        }, (err) => {
          console.error("Profile listener error:", err)
          setLoading(false)
        })
        profileUnsubRef.current = profileUnsub
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      authUnsub()
      if (profileUnsubRef.current) profileUnsubRef.current()
    }
  }, [])

  /**
   * Check username uniqueness before creating account.
   * Uses a Firestore query — requires the composite index on username field.
   */
  const isUsernameTaken = async (username: string): Promise<boolean> => {
    if (!db) return false
    const q = query(
      collection(db, "users"),
      where("username", "==", username),
      limit(1)
    )
    const snap = await getDocs(q)
    return !snap.empty
  }

  const register = async (
    username: string,
    email: string,
    password: string,
    avatar: string,
    color: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !db) {
      return { success: false, error: "Firebase غير مُعد بشكل صحيح" }
    }
    setError(null)
    try {
      // Skip username uniqueness check if Firestore index doesn't exist yet
      // This prevents the app from failing for new Firebase projects
      try {
        const taken = await isUsernameTaken(username.trim())
        if (taken) {
          return { success: false, error: "اسم المستخدم مستخدم مسبقاً، اختر اسماً آخر" }
        }
      } catch {
        // If index doesn't exist, continue - username check is optional for new projects
      }

      const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(firebaseUser, { displayName: username.trim() })

      // Check if this is the owner account
      const isOwner = 
        (OWNER_CONFIG.uid && firebaseUser.uid === OWNER_CONFIG.uid) ||
        (OWNER_CONFIG.email && email.toLowerCase() === OWNER_CONFIG.email.toLowerCase())

      const userProfile: UserProfile = {
        uid: firebaseUser.uid,
        username: username.trim(),
        email,
        avatar,
        color,
        bio: "",
        level: isOwner ? 100 : 1,
        xp: isOwner ? 999999 : 50,
        coins: isOwner ? 999999 : 0,
        messagesSent: 0,
        friends: [],
        badges: isOwner ? [
          // Owner gets all badges at max level
          { badgeId: "owner", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "admin", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "moderator", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "active_user", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "top_user", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "chat_master", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "vip", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "verified", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "premium", grantedAt: new Date().toISOString(), level: 5 },
          { badgeId: "early_user", grantedAt: new Date().toISOString(), level: 5 },
        ] : [],
        joinDate: new Date().toISOString(),
        dailyLogin: new Date().toDateString(),
        createdAt: serverTimestamp() as any,
        role: isOwner ? "owner" : "user",
        isProtected: isOwner,
      }

      await setDoc(doc(db, "users", firebaseUser.uid), userProfile)
      // onSnapshot listener will pick up the new profile automatically
      return { success: true }
    } catch (err: any) {
      const msg = getAuthError(err.code)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!auth || !db) {
      return { success: false, error: "Firebase غير مُعد بشكل صحيح" }
    }
    setError(null)
    try {
      const { user: firebaseUser } = await signInWithEmailAndPassword(auth, email, password)

      // Update daily login XP — one getDoc read, cheap
      const profileRef = doc(db, "users", firebaseUser.uid)
      const snap = await getDoc(profileRef)
      if (snap.exists()) {
        const data = snap.data() as UserProfile
        const today = new Date().toDateString()
        if (data.dailyLogin !== today) {
          // Daily XP update — bounded +50 XP, won't conflict with the Firestore rule
          await updateDoc(profileRef, {
            dailyLogin: today,
            xp: (data.xp || 0) + 50,
          })
          // onSnapshot will propagate the update automatically
        }
      }
      return { success: true }
    } catch (err: any) {
      const msg = getAuthError(err.code)
      setError(msg)
      return { success: false, error: msg }
    }
  }

  const logout = async () => {
    if (!auth) return
    await signOut(auth)
    // onAuthStateChanged will tear down the profile listener and set profile to null
  }

  const updateUserProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !db) return
    const ref = doc(db, "users", user.uid)
    await updateDoc(ref, updates)
    // onSnapshot will merge the update into local profile state automatically
  }

  return { user, profile, loading, error, configError, register, login, logout, updateUserProfile }
}

function getAuthError(code: string): string {
  switch (code) {
    case "auth/email-already-in-use": return "البريد الإلكتروني مستخدم مسبقاً"
    case "auth/invalid-email": return "البريد الإلكتروني غير صالح"
    case "auth/weak-password": return "كلمة المرور ضعيفة (6 أحرف على الأقل)"
    case "auth/user-not-found": return "لا يوجد حساب بهذا البريد"
    case "auth/wrong-password": return "كلمة المرور غير صحيحة"
    case "auth/invalid-credential": return "البريد أو كلمة المرور غير صحيحة"
    case "auth/too-many-requests": return "محاولات كثيرة، حاول لاحقاً"
    default: return "حدث خطأ، حاول مجدداً"
  }
}
