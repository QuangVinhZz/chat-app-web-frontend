import { socketService } from './socketService'
import { notifyAdd } from '../stores/notificationsStore'

/**
 * Frontend notification wiring.
 *
 * Subscribes to realtime events and turns them into:
 *   1. An in-app toast (via notificationsStore.toasts)
 *   2. A bell-dropdown history entry (via notificationsStore.history)
 *   3. A native browser Notification when the tab is hidden and the
 *      user has granted permission (best-effort, no FCM / service worker).
 *
 * Idempotent — `init()` is safe to call multiple times.
 */

let unsubs = []
let initialized = false

const MAX_NATIVE_TITLE = 60
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s)

async function maybeRequestPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      // Ignore — some browsers throw on secondary requests.
    }
  }
}

function showNative(notification) {
  if (localStorage.getItem('settings:notification') === 'false') return
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return
  // Only fire native notifications when the tab isn't focused — otherwise
  // the in-app toast is enough and doubling up is annoying.
  if (typeof document !== 'undefined' && !document.hidden) return
  try {
    new Notification(truncate(notification.title, MAX_NATIVE_TITLE), {
      body: notification.body,
      icon: notification.avatarUrl || undefined,
      tag: notification.type + (notification.href || ''),
    })
  } catch {
    // Swallow — native Notification is best-effort.
  }
}

function push(notification) {
  notifyAdd(notification)
  showNative(notification)
}

export const notificationService = {
  init() {
    if (initialized) return
    initialized = true

    // Ask for permission once, lazily. Users can always revoke and the
    // in-app bell/toasts still work.
    void maybeRequestPermission()

    unsubs.push(
      // Someone sent us a friend request.
      socketService.on('friend:request:received', (payload) => {
        const name = payload?.from?.name || 'Someone'
        push({
          type: 'friend_request',
          title: 'New friend request',
          body: `${name} sent you a friend request.`,
          avatarUrl: payload?.from?.avatarUrl,
          href: '/friends',
        })
      }),

      // Our pending request was accepted.
      socketService.on('friend:request:accepted', (payload) => {
        const name = payload?.by?.name || 'Someone'
        push({
          type: 'friend_accepted',
          title: 'Friend request accepted',
          body: `${name} is now your friend.`,
          avatarUrl: payload?.by?.avatarUrl,
          href: '/friends',
        })
      })
    )
  },

  stop() {
    for (const off of unsubs) off?.()
    unsubs = []
    initialized = false
  },
}
