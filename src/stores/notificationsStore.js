import { create } from 'zustand'

/**
 * Notifications store.
 *
 * Holds two related collections:
 *
 *   - `toasts`    — transient items the ToastProvider renders at the bottom
 *                   of the screen. Auto-dismiss after `TOAST_DURATION_MS`.
 *   - `history`   — last N notifications shown in the bell dropdown.
 *
 * A notification is an object shaped like:
 *   {
 *     id: string,            // unique per instance
 *     type: 'friend_request' | 'friend_accepted' | 'generic',
 *     title: string,
 *     body?: string,
 *     avatarUrl?: string,
 *     href?: string,         // where to navigate on click
 *     createdAt: ISO string,
 *     read: boolean,
 *   }
 */

const TOAST_DURATION_MS = 5000
const MAX_HISTORY = 30

let nextId = 1
const makeId = () => `n-${Date.now()}-${nextId++}`

export const useNotificationsStore = create((set, get) => ({
  toasts: [],
  history: [],
  unreadCount: 0,

  /** Push a new notification — shows a toast and prepends to history. */
  add: (partial) => {
    const notification = {
      id: makeId(),
      type: 'generic',
      createdAt: new Date().toISOString(),
      read: false,
      ...partial,
    }
    const showToast = localStorage.getItem('settings:notification') !== 'false'
    set((state) => ({
      toasts: showToast ? [...state.toasts, notification] : state.toasts,
      history: [notification, ...state.history].slice(0, MAX_HISTORY),
      unreadCount: state.unreadCount + 1,
    }))
    return notification.id
  },

  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  markAllRead: () =>
    set((state) => ({
      history: state.history.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  markRead: (id) =>
    set((state) => {
      let unreadCount = state.unreadCount
      const history = state.history.map((n) => {
        if (n.id === id && !n.read) {
          unreadCount = Math.max(0, unreadCount - 1)
          return { ...n, read: true }
        }
        return n
      })
      return { history, unreadCount }
    }),

  clearHistory: () => set({ history: [], unreadCount: 0 }),

  reset: () => set({ toasts: [], history: [], unreadCount: 0 }),
}))

export const toastDurationMs = TOAST_DURATION_MS

// Helper for direct (non-hook) usage from services.
export const notifyAdd = (partial) =>
  useNotificationsStore.getState().add(partial)
