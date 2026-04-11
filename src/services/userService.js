import { apiClient, tokenStorage } from './apiClient'
import { authService } from './authService'
import { users, currentUser } from '../mocks/users.mock'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * User service.
 *
 * Auth-related methods are delegated to authService so there is a
 * single source of truth for session handling. Profile and "me"
 * endpoints talk to the real backend. Other list/search helpers
 * still fall back to the in-repo mocks until the corresponding UI
 * is wired up.
 */
export const userService = {
  // --- auth passthrough (kept for backwards compatibility) -----------------
  async login(email, password) {
    const data = await authService.login(email, password)
    return { user: data.user, token: data.token }
  },

  async register(data) {
    return authService.register(data)
  },

  async logout() {
    return authService.logout()
  },

  // --- profile -------------------------------------------------------------
  async getCurrentUser() {
    const stored = tokenStorage.getUser()
    if (stored) return stored
    const data = await apiClient.get('/user/me')
    tokenStorage.setUser(data.user)
    return data.user
  },

  async getUserProfile() {
    const data = await apiClient.get('/user/me')
    tokenStorage.setUser(data.user)
    return data.user
  },

  async updateProfile(payload) {
    const data = await apiClient.put('/user/profile', {
      name: payload.name,
      bio: payload.bio,
    })
    tokenStorage.setUser(data.user)
    return data.user
  },

  async updateAvatar(file) {
    const form = new FormData()
    form.append('avatar', file)
    const data = await apiClient.put('/user/avatar', form, { isForm: true })
    tokenStorage.setUser(data.user)
    return data.user
  },

  async searchUsers({ q, type = 'auto', page = 1, limit = 20 } = {}) {
    const data = await apiClient.get('/users/search', {
      query: { q, type, page, limit },
    })
    return {
      users: data?.users ?? [],
      meta: data?.meta ?? null,
    }
  },

  // --- still mocked (chat list / contacts) --------------------------------
  async getUsers() {
    await delay(500)
    return users.filter((u) => u.id !== currentUser.id)
  },

  async getUserById(userId) {
    await delay(300)
    const user = users.find((u) => u.id === userId)
    if (!user) {
      throw new Error('User not found')
    }
    return user
  },
}
