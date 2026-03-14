import { analytics } from '../mocks/analytics.mock'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export const analyticsService = {
  async getAnalytics() {
    await delay(600)
    return analytics
  },

  async getTotalMessages() {
    await delay(300)
    return analytics.totalMessages
  },

  async getActiveUsers() {
    await delay(300)
    return analytics.activeUsers
  },

  async getTotalGroups() {
    await delay(300)
    return analytics.totalGroups
  },

  async getMessagesPerDay() {
    await delay(400)
    return analytics.messagesPerDay
  },

  async getMessagesByType() {
    await delay(400)
    return analytics.messagesByType
  },

  async getActiveUsersTrend() {
    await delay(400)
    return analytics.activeUsersTrend
  },

  async getTopGroups() {
    await delay(400)
    return analytics.topGroups
  },

  async getUserActivity() {
    await delay(400)
    return analytics.userActivity
  },
}
