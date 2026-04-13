import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '../firebase/config'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      loading: true,
      token: null,

      initialize: () => {
        return onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const token = await firebaseUser.getIdToken()
            set({
              user: {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName,
                photoURL: firebaseUser.photoURL,
                emailVerified: firebaseUser.emailVerified,
              },
              token,
              loading: false,
            })
          } else {
            set({ user: null, token: null, loading: false })
          }
        })
      },

      getToken: async () => {
        const currentUser = auth.currentUser
        if (currentUser) {
          const token = await currentUser.getIdToken(true)
          set({ token })
          return token
        }
        return null
      },

      loginWithGoogle: async () => {
        const result = await signInWithPopup(auth, googleProvider)
        const token = await result.user.getIdToken()
        set({
          user: {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL,
          },
          token,
        })
        return result.user
      },

      loginWithGithub: async () => {
        const result = await signInWithPopup(auth, githubProvider)
        return result.user
      },

      loginWithEmail: async (email, password) => {
        const result = await signInWithEmailAndPassword(auth, email, password)
        return result.user
      },

      registerWithEmail: async (email, password, displayName) => {
        const result = await createUserWithEmailAndPassword(auth, email, password)
        await updateProfile(result.user, { displayName })
        return result.user
      },

      logout: async () => {
        await signOut(auth)
        set({ user: null, token: null })
      },
    }),
    {
      name: 'nexus-auth',
      partialize: (state) => ({ user: state.user }),
    }
  )
)

export default useAuthStore
