import { io } from 'socket.io-client'
import { tokenStorage } from './apiClient'

/**
 * Thin wrapper around socket.io-client.
 *
 * - Single connection per browser tab
 * - Authenticates via the JWT access token stored in localStorage
 * - `on(event, handler)` returns an unsubscribe function so callers
 *   can wire subscriptions inside useEffect without manual cleanup.
 *
 * Backend side: see `app/services/realtime_service.ts` — each user is
 * auto-joined to room `user:{userId}` and can be emitted to via
 * `realtimeService.emitToUser(...)`.
 */
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333/api/v1'

// Socket.IO lives at the server root, not at /api/v1 — strip the path.
const SOCKET_URL = (() => {
  try {
    const url = new URL(API_BASE_URL)
    return `${url.protocol}//${url.host}`
  } catch {
    return 'http://localhost:3333'
  }
})()

class SocketService {
  constructor() {
    this.socket = null
    /** Listeners for local connection-state changes (online dot). */
    this.connectionListeners = new Set()
  }

  connect() {
    if (this.socket?.connected) return this.socket
    const token = tokenStorage.getToken()
    if (!token) return null

    // Reuse an existing disconnected instance if present; re-auth with
    // the latest token and re-open.
    if (this.socket) {
      this.socket.auth = { token }
      this.socket.connect()
      return this.socket
    }

    this.socket = io(SOCKET_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      auth: { token },
      autoConnect: true,
      reconnection: true,
    })

    this.socket.on('connect', () => {
      if (import.meta.env.DEV) console.debug('[socket] connected', this.socket.id)
      this.connectionListeners.forEach((fn) => fn(true))
    })

    // Single-session enforcement: nếu tài khoản đăng nhập ở thiết bị khác,
    // server emit event này → tự động logout tab hiện tại.
    this.socket.on('auth:session_replaced', () => {
      console.warn('[socket] Session replaced — logging out.')
      // Hiện thông báo trước khi logout
      if (typeof window !== 'undefined') {
        alert('Tài khoản của bạn đã đăng nhập ở thiết bị khác. Bạn sẽ bị đăng xuất.')
        tokenStorage.clear()
        window.location.replace('/login')
      }
    })
    
    // Debug: Listen to ALL incoming events from the server
    this.socket.onAny((eventName, ...args) => {
      console.log(`[Socket Debug] Received event from server: "${eventName}"`, args);
    });
    this.socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.debug('[socket] disconnected', reason)
      this.connectionListeners.forEach((fn) => fn(false))
    })
    this.socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) console.debug('[socket] error', err.message)
      this.connectionListeners.forEach((fn) => fn(false))
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.removeAllListeners()
      this.socket.disconnect()
      this.socket = null
    }
    this.connectionListeners.forEach((fn) => fn(false))
  }

  /**
   * Subscribe to local connection state changes.
   * Handler is called with `true` on connect, `false` on disconnect.
   * @returns unsubscribe function
   */
  onConnectionChange(handler) {
    this.connectionListeners.add(handler)
    // Fire immediately with the current state so subscribers don't have
    // to wait for the next connect/disconnect event.
    handler(this.isConnected())
    return () => {
      this.connectionListeners.delete(handler)
    }
  }

  /**
   * Subscribe to a server event.
   * @returns unsubscribe function
   */
  on(event, handler) {
    if (!this.socket) this.connect()
    if (!this.socket) return () => {}
    this.socket.on(event, handler)
    return () => {
      this.socket?.off(event, handler)
    }
  }

  emit(event, payload) {
    this.socket?.emit(event, payload)
  }

  /**
   * Emit a typing indicator to the given conversation. Server will
   * relay to all other members of the room.
   */
  emitTyping(conversationId, typing) {
    if (!this.socket?.connected) return
    this.socket.emit(typing ? 'typing:start' : 'typing:stop', {
      conversationId,
    })
  }

  isConnected() {
    return Boolean(this.socket?.connected)
  }
}

export const socketService = new SocketService()
