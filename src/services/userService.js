import { users, currentUser } from '../mocks/users.mock'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const userService = {
  async login(email, password) {
    await delay(800)
    const user = users.find((u) => u.email === email && u.password === password)
    if (!user) {
      throw new Error('Invalid email or password')
    }
    localStorage.setItem('currentUser', JSON.stringify(user))
    return { user, token: 'mock-jwt-token-' + user.id }
  },

  async register(data) {
    await delay(800)
    const exists = users.find((u) => u.email === data.email)
    if (exists) {
      throw new Error('Email already registered')
    }
    const newUser = {
      id: 'user-' + Date.now(),
      name: data.name,
      email: data.email,
      password: data.password,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${data.email}`,
      status: 'online',
      bio: '',
      role: 'Member',
      createdAt: new Date().toISOString(),
    }
    users.push(newUser)
    localStorage.setItem('currentUser', JSON.stringify(newUser))
    return { user: newUser, token: 'mock-jwt-token-' + newUser.id }
  },

  async logout() {
    await delay(300)
    localStorage.removeItem('currentUser')
    return true
  },

  async getCurrentUser() {
    await delay(300)
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      return JSON.parse(stored)
    }
    return currentUser
  },

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

  async getUserProfile() {
    await delay(400)
    const stored = localStorage.getItem('currentUser')
    if (stored) {
      return JSON.parse(stored)
    }
    return currentUser
  },

  async updateProfile(data) {
    await delay(600)
    const stored = localStorage.getItem('currentUser')
    const user = stored ? JSON.parse(stored) : currentUser
    const updated = { ...user, ...data }
    localStorage.setItem('currentUser', JSON.stringify(updated))
    return updated
  },

  async updateStatus(status) {
    await delay(300)
    const stored = localStorage.getItem('currentUser')
    const user = stored ? JSON.parse(stored) : currentUser
    const updated = { ...user, status }
    localStorage.setItem('currentUser', JSON.stringify(updated))
    return updated
  },
}
