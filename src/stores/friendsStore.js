import { create } from 'zustand'
import { friendService } from '../services/friendService'
import { socketService } from '../services/socketService'

/**
 * Lightweight friends store.
 *
 * Holds just enough state for cross-component sync (e.g. Sidebar badge
 * with the count of incoming friend requests). FriendsPage still owns
 * its own detailed lists — this store is only for counts + actions that
 * need to propagate globally.
 */
// Keep a reference to the current set of subscribe callbacks so we can
// tear them down on logout without re-importing the store in the service.
let unsubs = []

export const useFriendsStore = create((set, get) => ({
  receivedCount: 0,
  friendsCount: 0,

  setCounts: ({ receivedCount, friendsCount }) =>
    set((state) => ({
      receivedCount: receivedCount ?? state.receivedCount,
      friendsCount: friendsCount ?? state.friendsCount,
    })),

  /** Fetch fresh counts from the backend. Safe to call whenever. */
  refresh: async () => {
    try {
      const [friends, received] = await Promise.all([
        friendService.list(),
        friendService.getReceivedRequests(),
      ])
      set({ friendsCount: friends.length, receivedCount: received.length })
    } catch {
      // Ignore — Sidebar badge is best-effort.
    }
  },

  /**
   * Start global realtime subscriptions. Idempotent — safe to call
   * multiple times. FriendsPage maintains its own detailed lists and
   * subscribes separately for row-level updates.
   */
  startRealtime: () => {
    if (unsubs.length > 0) return
    const bump = (delta) =>
      set((state) => ({ receivedCount: Math.max(0, state.receivedCount + delta) }))

    unsubs.push(
      // Incoming request → badge up.
      socketService.on('friend:request:received', () => bump(+1)),
      // Addressee or requester cancelled/handled → badge down.
      socketService.on('friend:request:cancelled', () => bump(-1)),
      // When the user themselves accepts/rejects, their own list UI updates
      // immediately; we still refresh the store so the badge stays consistent.
      socketService.on('friend:added', () => get().refresh()),
      // When the OTHER side accepts my pending request → friendsCount++.
      socketService.on('friend:request:accepted', () => get().refresh()),
      socketService.on('friend:unfriended', () => get().refresh()),
      socketService.on('friend:blocked', () => get().refresh()),
      socketService.on('friend:blocked-by', () => get().refresh())
    )
  },

  stopRealtime: () => {
    for (const off of unsubs) off?.()
    unsubs = []
  },

  reset: () => {
    for (const off of unsubs) off?.()
    unsubs = []
    set({ receivedCount: 0, friendsCount: 0 })
  },
}))
