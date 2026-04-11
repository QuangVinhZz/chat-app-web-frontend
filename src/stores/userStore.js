import { create } from 'zustand'
import { apiClient, tokenStorage } from '../services/apiClient'
import { authService } from '../services/authService'
import { socketService } from '../services/socketService'

/**
 * Global user store.
 *
 * Single source of truth for the authenticated user profile. Any
 * component that needs the current user reads from here so that
 * updates (e.g. avatar change in ProfilePage) propagate everywhere
 * immediately.
 *
 * The underlying persistence is still `tokenStorage` (localStorage),
 * so a page refresh hydrates the store from the stored session.
 */
export const useUserStore = create((set, get) => ({
  user: tokenStorage.getUser(),
  isOnline: false,
  loading: false,

  /** Replace the current user (and mirror to localStorage). */
  setUser: (user) => {
    tokenStorage.setUser(user)
    set({ user })
    // Ensure the realtime socket is connected whenever we have a session.
    if (user) socketService.connect()
  },

  /** Shallow-merge a patch into the current user. */
  updateUser: (patch) => {
    const current = get().user
    const merged = current ? { ...current, ...patch } : patch
    tokenStorage.setUser(merged)
    set({ user: merged })
  },

  /** Re-read the user from localStorage (after login/register). */
  hydrate: () => {
    set({ user: tokenStorage.getUser() })
  },

  /** Fetch /user/me from the server. */
  loadUser: async ({ force = false } = {}) => {
    if (!force && get().user) {
      // Page reload case: we already have a user in memory but the socket
      // may still be disconnected (module just re-evaluated).
      if (tokenStorage.getToken()) socketService.connect()
      return get().user
    }
    set({ loading: true })
    try {
      const data = await apiClient.get('/user/me')
      tokenStorage.setUser(data.user)
      set({ user: data.user })
      socketService.connect()
      return data.user
    } finally {
      set({ loading: false })
    }
  },

  // `isOnline` is written by socketService.onConnectionChange (see bottom
  // of this file). Kept read-only on the store API.

  /** Logout via authService + wipe store state. */
  logout: async () => {
    try {
      await authService.logout()
    } finally {
      socketService.disconnect()
      set({ user: null, isOnline: false })
    }
  },

  /** Local-only wipe (e.g. on auth failure). */
  clear: () => {
    tokenStorage.clear()
    socketService.disconnect()
    set({ user: null, isOnline: false })
  },
}))

// --- presence driven by the socket connection state -----------------------
// The online dot in the UI now reflects whether the socket is actually
// connected, instead of polling /user/heartbeat. Registered once per module
// load (= once per app lifetime).
socketService.onConnectionChange((connected) => {
  useUserStore.setState({ isOnline: connected })
})
