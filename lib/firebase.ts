import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getAuth, type Auth } from "firebase/auth"
import { getFirestore, type Firestore } from "firebase/firestore"
import { getDatabase, type Database } from "firebase/database"

// Firebase Configuration for Pulse-13 Project
const firebaseConfig = {
  apiKey: "AIzaSyA1r379GTy3LOe0nVChsNTai-V8LEFlK3g",
  authDomain: "pulse-13.firebaseapp.com",
  databaseURL: "https://pulse-13-default-rtdb.firebaseio.com",
  projectId: "pulse-13",
  storageBucket: "pulse-13.firebasestorage.app",
  messagingSenderId: "1039353554550",
  appId: "1:1039353554550:web:79254c6e04cb1c0db7e157",
  measurementId: "G-ZM1P327H3C",
}

// Check if Firebase is properly configured
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.authDomain
)

// Prevent duplicate initialization in Next.js dev mode (HMR)
let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let rtdb: Database | null = null

if (isFirebaseConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
  auth = getAuth(app)
  db = getFirestore(app)
  rtdb = getDatabase(app)  // Realtime Database للـ Presence system
}

export { auth, db, rtdb }
export default app

